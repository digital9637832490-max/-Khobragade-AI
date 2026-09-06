import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:share_plus/share_plus.dart';
import '../api.dart';

class AppUpdateService {
  static const owner = 'digital9637832490-max';
  static const repo = '-Khobragade-AI';
  static const apkUrl = 'https://github.com/$owner/$repo/releases/latest';
  static const releasesApi = 'https://api.github.com/repos/$owner/$repo/releases/latest';

  static Future<int> _installedBuild() async {
    final info = await PackageInfo.fromPlatform();
    return int.tryParse(info.buildNumber) ?? 1;
  }

  static int _releaseBuild(Map<String,dynamic> r) {
    final direct=int.tryParse('${r['build']??''}'); if(direct!=null)return direct;
    final tag=(r['tag_name']??'').toString();
    final nums=RegExp(r'\d+').allMatches(tag).map((m)=>int.tryParse(m.group(0)!)??0).toList();
    return nums.isEmpty?0:nums.last;
  }

  static Future<Map<String,dynamic>?> latest() async {
    try{
      final d=await Api().request('/app/update');
      if((d['latestBuild']??0) is num && int.tryParse('${d['latestBuild']}')!>0) return {'build':int.parse('${d['latestBuild']}'),'version':'${d['latestVersion']??''}','html_url':'${d['apkUrl']??apkUrl}','source':'server'};
    }catch(_){}
    try{
      final res=await http.get(Uri.parse(releasesApi),headers:{'Accept':'application/vnd.github+json'}).timeout(const Duration(seconds:12));
      if(res.statusCode!=200)return null;
      final data=jsonDecode(res.body);
      return data is Map<String,dynamic>?data:null;
    }catch(_){return null;}
  }

  static Future<void> check(BuildContext context,{bool manual=false}) async {
    try {
      final r=await latest();
      if(r==null){if(manual&&context.mounted)_msg(context,'Update server se check nahi ho paya. Release page kholkar latest APK check karein.');return;}
      final current=await _installedBuild();
      final latestBuild=_releaseBuild(r);
      if(latestBuild<=current){if(manual&&context.mounted)_msg(context,'App already latest hai.');return;}
      if(!context.mounted)return;
      await showDialog(context:context,barrierDismissible:false,builder:(c)=>AlertDialog(
        title:const Text('Khobragade AI Update'),
        content:Text('Naya update available hai.\nInstalled build: $current\nNew build: $latestBuild'),
        actions:[TextButton(onPressed:()=>Navigator.pop(c),child:const Text('Later')),FilledButton(onPressed:()async{Navigator.pop(c);await downloadUpdate(url:'${r['html_url']??apkUrl}');},child:const Text('Update Now'))],
      ));
    } catch(_){if(manual&&context.mounted)_msg(context,'Update check nahi ho paya.');}
  }

  static Future<void> downloadUpdate({String? url}) async {
    final uri=Uri.parse(url??apkUrl);
    await launchUrl(uri,mode:LaunchMode.externalApplication);
  }

  static Future<void> shareApp() async {
    await Share.share('✨ Khobragade AI app\nDownload latest APK:\n$apkUrl');
  }

  static void _msg(BuildContext c,String t)=>ScaffoldMessenger.of(c).showSnackBar(SnackBar(content:Text(t)));
}
