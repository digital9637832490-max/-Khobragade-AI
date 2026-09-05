import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:record/record.dart';
import 'package:flutter_pcm_sound/flutter_pcm_sound.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'config.dart';

class LiveVoiceSession {
  final void Function(String) onPhase;
  final void Function(String) onWords;
  final void Function(String) onError;
  final AudioRecorder _recorder=AudioRecorder();
  WebSocketChannel? _ws;
  StreamSubscription<Uint8List>? _micSub;
  StreamSubscription? _wsSub;
  bool _closed=false;
  LiveVoiceSession({required this.onPhase,required this.onWords,required this.onError});

  Future<void> start(String gender, [Map<String,dynamic>? clientContext]) async {
    _closed=false;
    if(!await _recorder.hasPermission()) throw Exception('Microphone permission denied');
    await FlutterPcmSound.setup(sampleRate:24000,channelCount:1);
    await FlutterPcmSound.setFeedThreshold(2400);
    FlutterPcmSound.setFeedCallback((_){ });
    final prefs=await SharedPreferences.getInstance();
    final token=prefs.getString('token');
    if(token==null||token.isEmpty) throw Exception('Please login again');
    final api=Uri.parse(Config.apiBaseUrl);
    final scheme=api.scheme=='https'?'wss':'ws';
    final basePath=api.path.endsWith('/api')?api.path:'${api.path}/api';
    final qp=<String,String>{'token':token,'gender':gender}; if(clientContext!=null&&clientContext.isNotEmpty) qp['context']=jsonEncode(clientContext); final uri=Uri(scheme:scheme,host:api.host,port:api.hasPort?api.port:null,path:'$basePath/live-voice',queryParameters:qp);
    _ws=WebSocketChannel.connect(uri);
    await _ws!.ready;
    _wsSub=_ws!.stream.listen(_handleMessage,onError:(e)=>_fail('Live voice connection failed'),onDone:(){if(!_closed)_fail('Live voice disconnected');});
    if (clientContext != null && clientContext.isNotEmpty && !_closed) { _ws?.sink.add(jsonEncode({'clientContext':clientContext})); }
    final stream=await _recorder.startStream(const RecordConfig(encoder:AudioEncoder.pcm16bits,sampleRate:16000,numChannels:1,autoGain:true,echoCancel:true,noiseSuppress:true,streamBufferSize:1280));
    _micSub=stream.listen((chunk){if(!_closed){_ws?.sink.add(jsonEncode({'realtimeInput':{'audio':{'data':base64Encode(chunk),'mimeType':'audio/pcm;rate=16000'}}}));}});
    onPhase('listening');
  }

  void _handleMessage(dynamic raw){
    if(_closed)return;
    try{
      final m=jsonDecode(raw is String?raw:utf8.decode(raw as List<int>)) as Map<String,dynamic>;
      final sc=m['serverContent'] as Map<String,dynamic>?;
      if(sc==null)return;
      if(sc['interrupted']==true){_resetPlayback();onPhase('listening');}
      final interim=(sc['interimInputTranscription']?['text']??'').toString().trim();
      final input=(sc['inputTranscription']?['text']??'').toString().trim();
      if(interim.isNotEmpty)onWords(interim); else if(input.isNotEmpty)onWords(input);
      final out=(sc['outputTranscription']?['text']??'').toString().trim();
      if(out.isNotEmpty)onWords(out);
      final parts=sc['modelTurn']?['parts'];
      if(parts is List){
        for(final p in parts){
          final d=p?['inlineData']?['data'];
          if(d is String&&d.isNotEmpty){
            onPhase('speaking');
            final bytes=base64Decode(d);
            final samples=<int>[];
            for(var i=0;i+1<bytes.length;i+=2){var v=bytes[i]|(bytes[i+1]<<8);if(v>=32768)v-=65536;samples.add(v);}
            FlutterPcmSound.feed(PcmArrayInt16.fromList(samples));
          }
        }
      }
      if(sc['turnComplete']==true)onPhase('listening');
    }catch(_){ }
  }
  Future<void> _resetPlayback()async{try{await FlutterPcmSound.release();await FlutterPcmSound.setup(sampleRate:24000,channelCount:1);await FlutterPcmSound.setFeedThreshold(2400);FlutterPcmSound.setFeedCallback((_){ });}catch(_){}}
  void _fail(String text){onPhase('error');onError(text);}
  Future<void> stop()async{
    _closed=true;
    try{_ws?.sink.add(jsonEncode({'realtimeInput':{'audioStreamEnd':true}}));}catch(_){}
    await _micSub?.cancel(); await _wsSub?.cancel();
    try{await _recorder.stop();}catch(_){}
    try{await FlutterPcmSound.release();}catch(_){}
    try{await _ws?.sink.close();}catch(_){}
  }
  Future<void> dispose()async{await stop();_recorder.dispose();}
}
