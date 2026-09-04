import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:flutter_tts/flutter_tts.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import '../api.dart';
import '../live_voice.dart';
class ChatScreen extends StatefulWidget{const ChatScreen({super.key});@override State<ChatScreen> createState()=>_ChatScreenState();}
class _ChatScreenState extends State<ChatScreen>{
 final api=Api(),input=TextEditingController(),scroll=ScrollController(),speech=stt.SpeechToText(),tts=FlutterTts(),imagePicker=ImagePicker();final voicePhase=ValueNotifier<String>('ready'),voiceWords=ValueNotifier<String>('');LiveVoiceSession? liveVoice;String lastVoiceText='';bool voiceSending=false;List<Map<String,String>> messages=[];bool busy=false,listening=false,voiceMode=false,voiceRestarting=false;int coins=0;String voiceGender='female';String? attachmentName,attachmentMime,attachmentData;Map<String,dynamic>? maintenance;DateTime? quotaUntil;String quotaKind='';Timer? clock;
 @override void initState(){super.initState();clock=Timer.periodic(const Duration(seconds:1),(_){if(mounted&&(quotaUntil!=null||maintenance?['appActive']==true))setState((){});});load();}
 @override void dispose(){clock?.cancel();liveVoice?.dispose();speech.stop();tts.stop();voicePhase.dispose();voiceWords.dispose();input.dispose();scroll.dispose();super.dispose();}
 Future<void> load()async{final p=await SharedPreferences.getInstance();final saved=p.getStringList('khobragade_ai_chat')??[];for(final x in saved){final k=x.indexOf('|');if(k>0)messages.add({'role':x.substring(0,k),'content':x.substring(k+1)});}voiceMode=false;await p.setBool('kh_voice_mode',false);voiceGender=p.getString('kh_voice_gender')??'female';try{maintenance=await api.request('/system/status');}catch(_){}try{final w=await api.request('/wallet');coins=(w['coinBalance']??0) as int;}catch(_){}if(mounted)setState((){});}
 Future<void> save()async{final p=await SharedPreferences.getInstance();await p.setStringList('khobragade_ai_chat',messages.map((m)=>'${m['role']}|${m['content']}').toList());await p.setBool('kh_voice_mode',voiceMode);await p.setString('kh_voice_gender',voiceGender);}
 Future<void> setAttachmentBytes(String name,List<int> bytes)async{
  if(bytes.length>10*1024*1024){if(mounted)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('File maximum 10 MB allowed')));return;}
  final ext=name.split('.').last.toLowerCase();
  final mime={'jpg':'image/jpeg','jpeg':'image/jpeg','png':'image/png','webp':'image/webp','pdf':'application/pdf','txt':'text/plain','csv':'text/csv'}[ext]??'application/octet-stream';
  if(mounted)setState((){attachmentName=name;attachmentMime=mime;attachmentData=base64Encode(bytes);});
 }
 Future<void> pickFromCamera()async{
  final x=await imagePicker.pickImage(source:ImageSource.camera,imageQuality:92);
  if(x==null)return;
  await setAttachmentBytes(x.name,await x.readAsBytes());
 }
 Future<void> pickFromGallery()async{
  final x=await imagePicker.pickImage(source:ImageSource.gallery,imageQuality:96);
  if(x==null)return;
  await setAttachmentBytes(x.name,await x.readAsBytes());
 }
 Future<void> pickFromFiles()async{
  final r=await FilePicker.platform.pickFiles(withData:true,allowMultiple:false,type:FileType.custom,allowedExtensions:['jpg','jpeg','png','webp','pdf','txt','csv']);
  if(r==null||r.files.isEmpty)return;
  final f=r.files.first;
  if(f.bytes==null)return;
  await setAttachmentBytes(f.name,f.bytes!);
 }
 Future<void> pickAttachment()async{
  if(!mounted)return;
  await showModalBottomSheet<void>(
   context:context,
   backgroundColor:Colors.white,
   showDragHandle:true,
   shape:const RoundedRectangleBorder(borderRadius:BorderRadius.vertical(top:Radius.circular(24))),
   builder:(sheetContext)=>SafeArea(
    child:Padding(
     padding:const EdgeInsets.fromLTRB(14,0,14,18),
     child:Column(mainAxisSize:MainAxisSize.min,crossAxisAlignment:CrossAxisAlignment.start,children:[
      const Padding(padding:EdgeInsets.fromLTRB(8,4,8,8),child:Text('Add to chat',style:TextStyle(fontSize:18,fontWeight:FontWeight.w700))),
      ListTile(
       leading:const CircleAvatar(backgroundColor:Color(0xfff2f2f2),child:Icon(Icons.camera_alt_outlined,color:Colors.black87)),
       title:const Text('Camera',style:TextStyle(fontWeight:FontWeight.w600)),
       onTap:(){Navigator.pop(sheetContext);Future.microtask(pickFromCamera);},
      ),
      ListTile(
       leading:const CircleAvatar(backgroundColor:Color(0xfff2f2f2),child:Icon(Icons.photo_library_outlined,color:Colors.black87)),
       title:const Text('Photos',style:TextStyle(fontWeight:FontWeight.w600)),
       subtitle:const Text('Gallery'),
       onTap:(){Navigator.pop(sheetContext);Future.microtask(pickFromGallery);},
      ),
      ListTile(
       leading:const CircleAvatar(backgroundColor:Color(0xfff2f2f2),child:Icon(Icons.folder_outlined,color:Colors.black87)),
       title:const Text('Files',style:TextStyle(fontWeight:FontWeight.w600)),
       onTap:(){Navigator.pop(sheetContext);Future.microtask(pickFromFiles);},
      ),
     ]),
    ),
   ),
  );
 }
 Future<Map<String,dynamic>> waitJob(String id,{bool video=false})async{final max=video?360:180;final delay=video?const Duration(milliseconds:2500):const Duration(milliseconds:650);for(var i=0;i<max;i++){await Future.delayed(delay);final j=await api.request('/jobs/$id');if(j['status']=='completed')return Map<String,dynamic>.from(j['result']??{});if(j['status']=='failed')throw Exception(j['error_message']??'Generation failed');}throw Exception(video?'Video is still processing. Please try again shortly.':'Response is taking too long');}
 bool wantsImage(String t){final x=t.toLowerCase().replaceAll(RegExp(r'\s+'),' ').trim();final hasImage=RegExp(r'image|photo|picture|thumbnail|poster|logo|banner|tasveer|tasvir|pic|तस्वीर|इमेज|फोटो|चित्र|पोस्टर|लोगो|बैनर').hasMatch(x);final hasMake=RegExp(r'bana|banao|banado|bana do|banakar|banana|generate|create|make|draw|design|बना|बनाओ|बना दो|बनाकर|बनाना|जनरेट|क्रिएट|डिजाइन|डिज़ाइन').hasMatch(x);return hasImage&&hasMake;}
 bool wantsVideo(String t){final x=t.toLowerCase().replaceAll(RegExp(r'\s+'),' ').trim();final hasVideo=RegExp(r'video|reel|shorts|clip|वीडियो|रील|शॉर्ट|शॉर्ट्स|क्लिप').hasMatch(x);final hasMake=RegExp(r'bana|banao|banado|bana do|banakar|banana|generate|create|make|animate|बना|बनाओ|बना दो|बनाकर|बनाना|जनरेट|क्रिएट').hasMatch(x);return hasVideo&&hasMake;}
 String imagePrompt(String t)=>t.replaceAll(RegExp(r'(?i)^(demo\s*)?(image|photo|picture|tasveer|tasvir|तस्वीर|इमेज|फोटो|चित्र)\s*(generate|create|bana|banao|banado|जनरेट|क्रिएट|बना|बनाओ|बना दो)?\s*'), '').trim().isEmpty?t:t;
 Future<void> speak(String text,{bool continueVoice=false})async{voicePhase.value='speaking';await tts.stop();await tts.awaitSpeakCompletion(true);await tts.setLanguage(RegExp(r'[\u0900-\u097F]').hasMatch(text)?'hi-IN':'en-IN');await tts.setSpeechRate(.48);final voices=await tts.getVoices;try{final list=List<Map>.from(voices as List);final wanted=list.where((v){final n='${v['name']}'.toLowerCase();return voiceGender=='female'?RegExp('female|heera|swara|veena|zira').hasMatch(n):RegExp('male|ravi|hemant|david|mark').hasMatch(n);}).toList();if(wanted.isNotEmpty)await tts.setVoice({'name':'${wanted.first['name']}','locale':'${wanted.first['locale']}'});}catch(_){}await tts.speak(text);if(continueVoice&&voiceMode&&mounted){await Future.delayed(const Duration(milliseconds:220));if(voiceMode&&mounted){voiceRestarting=true;voicePhase.value='listening';await mic(true,0);voiceRestarting=false;}}else if(voiceMode){voicePhase.value='ready';}}
 Future<void> send([String? value,bool speakReply=false])async{final text=(value??input.text).trim();if((text.isEmpty&&attachmentData==null)||busy)return;final sentText=text.isEmpty?'Attached file: ${attachmentName??'file'}':text;setState((){messages.add({'role':'user','content':attachmentName==null?sentText:'$sentText\n📎 $attachmentName'});input.clear();busy=true;});await save();try{Map<String,dynamic> job;String spoken='';if(wantsVideo(sentText)){voicePhase.value='thinking';job=await api.request('/ai/video',method:'POST',body:{'prompt':sentText});final r=await waitJob(job['id'].toString(),video:true);final uri=(r['videoUri']??r['videoUrl']??'').toString();final answer=uri.isEmpty?'✅ Video generate ho gaya.':'[[VIDEO]]$uri';setState(()=>messages.add({'role':'assistant','content':answer}));spoken='वीडियो तैयार हो गया है।';}else if(wantsImage(sentText)){voicePhase.value='thinking';job=await api.request('/ai/photo',method:'POST',body:{'prompt':sentText});final r=await waitJob(job['id'].toString());final img=(r['imageDataUrl']??r['imageUrl']??'').toString();if(img.isEmpty)throw Exception('Image generated but image data missing');setState(()=>messages.add({'role':'assistant','content':'[[IMAGE]]$img'}));spoken='इमेज तैयार हो गई है।';}else{voicePhase.value='thinking';final history=messages.length>20?messages.sublist(messages.length-20):messages;job=await api.request('/ai/chat',method:'POST',body:{'message':sentText,'history':history,'voiceGender':voiceGender,if(attachmentData!=null)'attachmentName':attachmentName,if(attachmentData!=null)'attachmentMime':attachmentMime,if(attachmentData!=null)'attachmentData':attachmentData});final r=await waitJob(job['id'].toString());final answer=(r['answer']??r['description']??'').toString();setState(()=>messages.add({'role':'assistant','content':answer}));spoken=answer;}if((speakReply||voiceMode)&&spoken.isNotEmpty)await speak(spoken,continueVoice:false);if(mounted)setState((){attachmentName=null;attachmentMime=null;attachmentData=null;});final w=await api.request('/wallet');coins=(w['coinBalance']??coins) as int;}catch(e){final raw=e.toString().replaceFirst('Exception: ','');String msg='⚠️ $raw';if(raw.contains('IMAGE_PROVIDER_BILLING_REQUIRED'))msg='⚠️ Image generation model ko Google billing/model access chahiye.';else if(raw.contains('GEMINI_DAILY_QUOTA')){quotaKind='daily';quotaUntil=DateTime.now().add(const Duration(hours:24));msg='आज की AI उपयोग सीमा पूरी हो गई है। अगले quota reset के बाद फिर कोशिश करें।';}else if(raw.contains('VIDEO_PROVIDER_BILLING_REQUIRED'))msg='⚠️ Video generation ke liye Google billing/model access chahiye.';else if(raw.contains('GEMINI_RATE_LIMIT')||raw.contains('429')){quotaKind='minute';quotaUntil=DateTime.now().add(const Duration(minutes:1));msg='अभी बहुत requests आ गई हैं। थोड़ी देर बाद फिर कोशिश करें।';}setState(()=>messages.add({'role':'assistant','content':msg}));}finally{busy=false;await save();if(mounted)setState((){});Future.delayed(const Duration(milliseconds:40),()=>scroll.hasClients?scroll.animateTo(scroll.position.maxScrollExtent,duration:const Duration(milliseconds:140),curve:Curves.easeOut):null);}}
 Future<void> _submitVoiceWords()async{if(voiceSending||busy||!voiceMode)return;final said=lastVoiceText.trim();if(said.isEmpty)return;voiceSending=true;lastVoiceText='';await speech.stop();if(mounted)setState(()=>listening=false);voicePhase.value='thinking';try{await send(said,true);}finally{voiceSending=false;if(voiceMode&&mounted&&!busy&&!voiceRestarting){voiceRestarting=true;try{await Future.delayed(const Duration(milliseconds:220));if(voiceMode&&mounted&&!busy&&!voiceSending){voicePhase.value='listening';await mic(true,0);}}finally{voiceRestarting=false;}}}}
 Future<void> mic([bool autoSend=false,int retry=0])async{if(busy||voiceSending)return;if(listening){await speech.stop();if(mounted)setState(()=>listening=false);await Future.delayed(const Duration(milliseconds:120));}lastVoiceText='';voiceWords.value='';final ok=await speech.initialize(onStatus:(status){final active=status=='listening';if(active)voicePhase.value='listening';if(mounted)setState(()=>listening=active);if(autoSend&&voiceMode&&(status=='done'||status=='notListening')&&!busy&&!voiceSending){if(lastVoiceText.trim().isNotEmpty){Future.microtask(_submitVoiceWords);}else if(retry<3){Future.delayed(const Duration(milliseconds:450),()=>mic(true,retry+1));}}},onError:(e){if(mounted)setState(()=>listening=false);voicePhase.value='error';if(autoSend&&voiceMode&&!busy&&!voiceSending&&retry<3){Future.delayed(const Duration(milliseconds:650),()=>mic(true,retry+1));}});if(!ok){voicePhase.value='error';if(mounted)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Microphone permission / speech service unavailable')));return;}String? localeId;try{localeId=(await speech.systemLocale())?.localeId;}catch(_){}voicePhase.value='listening';if(mounted)setState(()=>listening=true);await speech.listen(localeId:localeId,listenFor:const Duration(seconds:60),pauseFor:const Duration(seconds:2),partialResults:true,listenMode:stt.ListenMode.dictation,cancelOnError:false,onResult:(r){final words=r.recognizedWords.trim();if(words.isNotEmpty){lastVoiceText=words;input.text=words;input.selection=TextSelection.collapsed(offset:input.text.length);voiceWords.value=words;if(mounted)setState((){});}if(r.finalResult&&autoSend&&lastVoiceText.isNotEmpty){Future.microtask(_submitVoiceWords);}});}
 Future<void> fresh()async{messages=[];await tts.stop();await save();if(mounted)setState((){});}
 Future<void> stopVoiceConversation()async{voiceMode=false;voicePhase.value='ready';voiceWords.value='';await liveVoice?.stop();liveVoice=null;await save();if(mounted)setState((){});}
 Future<void> openVoiceConversation()async{if(voiceMode)return;voiceMode=true;voicePhase.value='listening';voiceWords.value='';await speech.stop();await tts.stop();await save();liveVoice=LiveVoiceSession(onPhase:(p){if(mounted)voicePhase.value=p;},onWords:(w){if(mounted)voiceWords.value=w;},onError:(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e)));});try{await liveVoice!.start(voiceGender);}catch(e){voiceMode=false;voicePhase.value='error';if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.toString().replaceFirst('Exception: ',''))));return;}if(!mounted)return;await Navigator.of(context).push(MaterialPageRoute<void>(fullscreenDialog:true,builder:(_)=>_KhobragadeVoicePage(phase:voicePhase,words:voiceWords,gender:voiceGender)));if(voiceMode)await stopVoiceConversation();}
 Widget build(BuildContext context){
  final isMaintenance=maintenance != null && maintenance!['appActive'] == true;
  if(isMaintenance){
   DateTime? end;
   final endAt=maintenance!['endAt'];
   if(endAt != null){end=DateTime.tryParse(endAt.toString());}
   final left=end?.difference(DateTime.now());
   final title=(maintenance!['title'] ?? 'Scheduled Maintenance').toString();
   final message=(maintenance!['messageHi'] ?? maintenance!['message'] ?? '').toString();
   final contact=(maintenance!['contact'] ?? '').toString();
   return Scaffold(body:Center(child:Padding(padding:const EdgeInsets.all(28),child:Column(mainAxisSize:MainAxisSize.min,children:[
    const Text('🛠️',style:TextStyle(fontSize:52)),
    Text(title,textAlign:TextAlign.center,style:const TextStyle(fontSize:26,fontWeight:FontWeight.bold)),
    const SizedBox(height:12),
    Text(message,textAlign:TextAlign.center),
    if(left != null && left.inSeconds > 0)...[
     const SizedBox(height:12),
     Text('⏳ ${left.inHours.toString().padLeft(2,'0')}:${(left.inMinutes%60).toString().padLeft(2,'0')}:${(left.inSeconds%60).toString().padLeft(2,'0')}',style:const TextStyle(fontSize:22,fontWeight:FontWeight.bold)),
    ],
    if(contact.isNotEmpty)Padding(padding:const EdgeInsets.only(top:12),child:Text(contact)),
    const SizedBox(height:18),
    FilledButton(onPressed:load,child:const Text('Try Again')),
   ]))));
  }
  return Scaffold(
   backgroundColor:const Color(0xfff8f9fc),
   appBar:AppBar(
    backgroundColor:Colors.white,
    title:Row(children:[ClipRRect(borderRadius:BorderRadius.circular(7),child:Image.asset('assets/khobragade_ai_logo.png',width:30,height:30,fit:BoxFit.cover)),const SizedBox(width:8),const Text('Khobragade AI',style:TextStyle(fontWeight:FontWeight.w800))]),
    actions:[
     Center(child:Text('🪙 $coins',style:const TextStyle(fontWeight:FontWeight.bold))),
     PopupMenuButton<String>(icon:Icon(voiceGender=='female'?Icons.woman:Icons.man),onSelected:(v){voiceGender=v;save();setState((){});},itemBuilder:(_)=>const[PopupMenuItem(value:'female',child:Text('👩 Female voice')),PopupMenuItem(value:'male',child:Text('👨 Male voice'))]),
     IconButton(onPressed:fresh,icon:const Icon(Icons.add_comment_outlined)),
    ],
   ),
   body:Column(children:[
    Expanded(child:messages.isEmpty?_welcome():ListView.builder(controller:scroll,padding:const EdgeInsets.all(14),itemCount:messages.length+(busy?1:0),itemBuilder:(c,i)=>i==messages.length?_bubble({'role':'assistant','content':'•••'}):_bubble(messages[i]))),
    _composer(),
   ]),
  );
 }
 Widget _welcome()=>ListView(padding:const EdgeInsets.all(24),children:[const SizedBox(height:55),Center(child:ClipRRect(borderRadius:BorderRadius.circular(24),child:Image.asset('assets/khobragade_ai_logo.png',width:86,height:86,fit:BoxFit.cover))),const SizedBox(height:14),const Text('Khobragade AI',textAlign:TextAlign.center,style:TextStyle(fontSize:28,fontWeight:FontWeight.w800)),const SizedBox(height:10),const Text('Ask anything — general questions, study, writing, coding, business, proposals, translation, YouTube and everyday help.',textAlign:TextAlign.center,style:TextStyle(color:Colors.black54,height:1.5))]);
 Widget _bubble(Map<String,String> m){final user=m['role']=='user';final content=m['content']??'';Widget body;if(content.startsWith('[[IMAGE]]')){final d=content.substring(9);try{final b64=d.split(',').last;body=ClipRRect(borderRadius:BorderRadius.circular(12),child:Image.memory(base64Decode(b64),fit:BoxFit.contain));}catch(_){body=const Text('Image preview unavailable');}}else if(content.startsWith('[[VIDEO]]')){final url=content.substring(9);body=Column(crossAxisAlignment:CrossAxisAlignment.start,children:[const Text('✅ Video ready'),const SizedBox(height:6),SelectableText(url)]);}else{body=SelectableText(content,style:TextStyle(color:user?Colors.white:Colors.black87,height:1.45));}return Align(alignment:user?Alignment.centerRight:Alignment.centerLeft,child:Container(margin:const EdgeInsets.only(bottom:14),constraints:const BoxConstraints(maxWidth:620),padding:const EdgeInsets.all(14),decoration:BoxDecoration(color:user?Colors.black:Colors.white,border:user?null:Border.all(color:Colors.blue.shade100),borderRadius:BorderRadius.circular(18)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[body,if(!user&&!content.startsWith('[[IMAGE]]')&&!content.startsWith('[[VIDEO]]'))Row(mainAxisSize:MainAxisSize.min,children:[IconButton(onPressed:()=>speak(content),icon:const Icon(Icons.volume_up,size:18)),IconButton(onPressed:tts.stop,icon:const Icon(Icons.stop,size:18))])])));}
 Widget _composer()=>SafeArea(top:false,child:Container(color:Colors.white,padding:const EdgeInsets.all(12),child:Container(decoration:BoxDecoration(border:Border.all(color:Colors.blue,width:2),borderRadius:BorderRadius.circular(24)),padding:const EdgeInsets.symmetric(horizontal:4,vertical:3),child:Row(crossAxisAlignment:CrossAxisAlignment.center,children:[IconButton(tooltip:'Attach file',onPressed:busy?null:pickAttachment,icon:Icon(attachmentName==null?Icons.add_circle_outline:Icons.attach_file,color:attachmentName==null?Colors.green:Colors.blue)),Expanded(child:TextField(controller:input,minLines:1,maxLines:5,decoration:InputDecoration(hintText:attachmentName==null?'Message ✨ Khobragade AI…':'📎 $attachmentName — add a message',border:InputBorder.none))),IconButton(tooltip:'Voice typing',onPressed:()=>mic(false),icon:Icon(listening?Icons.mic:Icons.mic_none,color:listening?Colors.red:Colors.black87,size:27)),GestureDetector(onTap:busy?null:openVoiceConversation,child:AnimatedContainer(duration:const Duration(milliseconds:180),width:48,height:48,decoration:BoxDecoration(shape:BoxShape.circle,gradient:LinearGradient(colors:voiceMode?const[Color(0xff16a34a),Color(0xff2563eb),Color(0xffec4899)]:const[Color(0xff2563eb),Color(0xff60a5fa)]),boxShadow:[BoxShadow(color:Colors.blue.withOpacity(.28),blurRadius:12,offset:const Offset(0,4))]),child:const Icon(Icons.graphic_eq_rounded,color:Colors.white,size:30))),const SizedBox(width:5),IconButton(onPressed:busy?null:()=>send(),icon:const CircleAvatar(backgroundColor:Colors.red,child:Icon(Icons.arrow_upward,color:Colors.white))) ]))));
}

class _KhobragadeVoicePage extends StatefulWidget {
  final ValueNotifier<String> phase;
  final ValueNotifier<String> words;
  final String gender;

  const _KhobragadeVoicePage({
    required this.phase,
    required this.words,
    required this.gender,
  });

  @override
  State<_KhobragadeVoicePage> createState() => _KhobragadeVoicePageState();
}

class _KhobragadeVoicePageState extends State<_KhobragadeVoicePage>
    with SingleTickerProviderStateMixin {
  late final AnimationController animation;

  @override
  void initState() {
    super.initState();
    animation = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1350),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    animation.dispose();
    super.dispose();
  }

  String titleFor(String phase) {
    if (phase == 'speaking') return 'Khobragade AI बोल रही है';
    if (phase == 'thinking') return 'सोच रही हूँ…';
    if (phase == 'error') return 'Mic शुरू नहीं हुआ';
    return 'सुन रही हूँ…';
  }

  @override
  Widget build(BuildContext context) {
    const ring = <Color>[
      Color(0xff16a34a),
      Color(0xfffacc15),
      Color(0xffec4899),
      Color(0xffef4444),
      Color(0xff2563eb),
      Color(0xff0b0b10),
      Colors.white,
      Color(0xff16a34a),
    ];
    const bars = <Color>[
      Color(0xff16a34a),
      Color(0xfffacc15),
      Color(0xffec4899),
      Color(0xffef4444),
      Color(0xff2563eb),
      Color(0xff0b0b10),
      Colors.white,
    ];

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Stack(
          children: [
            Positioned.fill(
              child: AnimatedBuilder(
                animation: animation,
                builder: (context, _) {
                  final t = animation.value;
                  return Container(
                    decoration: BoxDecoration(
                      gradient: RadialGradient(
                        center: const Alignment(0, -.08),
                        radius: .95,
                        colors: [
                          Colors.white,
                          Colors.white,
                          const Color(0xff2563eb).withOpacity(.06 + t * .05),
                          const Color(0xffec4899).withOpacity(.07),
                          const Color(0xff16a34a).withOpacity(.05),
                        ],
                        stops: const [0, .45, .68, .84, 1],
                      ),
                    ),
                  );
                },
              ),
            ),
            Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(
                          Icons.keyboard_arrow_down_rounded,
                          size: 34,
                          color: Colors.black,
                        ),
                      ),
                      const Expanded(
                        child: Text(
                          '✨ Khobragade AI',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.w800,
                            color: Colors.black,
                          ),
                        ),
                      ),
                      SizedBox(
                        width: 48,
                        child: Center(
                          child: Text(
                            widget.gender == 'female' ? '👩' : '👨',
                            style: const TextStyle(fontSize: 22),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                ValueListenableBuilder<String>(
                  valueListenable: widget.phase,
                  builder: (context, phase, _) {
                    return AnimatedBuilder(
                      animation: animation,
                      builder: (context, _) {
                        final pulse = .94 + animation.value * .06;
                        return Transform.scale(
                          scale: pulse,
                          child: Container(
                            width: 244,
                            height: 244,
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: const SweepGradient(colors: ring),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xff2563eb).withOpacity(.20),
                                  blurRadius: 44,
                                  spreadRadius: 7,
                                ),
                                BoxShadow(
                                  color: const Color(0xffec4899).withOpacity(.12),
                                  blurRadius: 72,
                                  spreadRadius: 12,
                                ),
                              ],
                            ),
                            child: Container(
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: Colors.white,
                              ),
                              child: Center(
                                child: phase == 'thinking'
                                    ? const SizedBox(
                                        width: 64,
                                        height: 64,
                                        child: CircularProgressIndicator(strokeWidth: 7),
                                      )
                                    : Row(
                                        mainAxisSize: MainAxisSize.min,
                                        crossAxisAlignment: CrossAxisAlignment.center,
                                        children: List.generate(7, (i) {
                                          const heights = <double>[
                                            40,
                                            70,
                                            102,
                                            126,
                                            94,
                                            66,
                                            38,
                                          ];
                                          final factor =
                                              (phase == 'speaking' || phase == 'listening')
                                                  ? (.55 + animation.value * .62)
                                                  : .42;
                                          return AnimatedContainer(
                                            duration: Duration(milliseconds: 240 + i * 25),
                                            margin: const EdgeInsets.symmetric(horizontal: 4),
                                            width: 10,
                                            height: heights[i] * factor,
                                            decoration: BoxDecoration(
                                              borderRadius: BorderRadius.circular(10),
                                              color: bars[i],
                                              border: i == 6
                                                  ? Border.all(color: Colors.black12)
                                                  : null,
                                            ),
                                          );
                                        }),
                                      ),
                              ),
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
                const SizedBox(height: 34),
                ValueListenableBuilder<String>(
                  valueListenable: widget.phase,
                  builder: (context, phase, _) => Text(
                    titleFor(phase),
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: Colors.black,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                ValueListenableBuilder<String>(
                  valueListenable: widget.words,
                  builder: (context, words, _) => Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 30),
                    child: Text(
                      words.trim().isEmpty ? 'बोलिए, मैं सुन रही हूँ…' : words,
                      textAlign: TextAlign.center,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 17,
                        height: 1.45,
                        color: Colors.grey.shade700,
                      ),
                    ),
                  ),
                ),
                const Spacer(),
                Padding(
                  padding: const EdgeInsets.only(bottom: 34),
                  child: InkWell(
                    onTap: () => Navigator.of(context).pop(),
                    borderRadius: BorderRadius.circular(40),
                    child: Container(
                      width: 72,
                      height: 72,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: Color(0xff0b0b10),
                      ),
                      child: const Icon(
                        Icons.close_rounded,
                        color: Colors.white,
                        size: 32,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
