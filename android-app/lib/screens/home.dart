import 'package:flutter/material.dart';
import '../api.dart';
import '../cms.dart';

class HomeScreen extends StatefulWidget{final Future<void> Function() onLogout;const HomeScreen({super.key,required this.onLogout});@override State<HomeScreen> createState()=>_HomeScreenState();}
class _HomeScreenState extends State<HomeScreen>{
 List<Map<String,dynamic>> cards=[
  {'title':'AI Assistant','subtitle':'Ask anything with Khobragade AI','icon':'✦'},
  {'title':'Quick Create','subtitle':'Creator tools in one place','icon':'▶'},
  {'title':'Recent Projects','subtitle':'Open your recent work','icon':'▣'},
  {'title':'Notifications','subtitle':'See latest updates','icon':'●'},
 ];
 @override void initState(){super.initState();_load();}
 Future<void> _load()async{final item=await CmsService(Api()).item('home.cards');final raw=item?['content']?['items'];if(raw is List&&raw.isNotEmpty)setState(()=>cards=raw.map((e)=>Map<String,dynamic>.from(e as Map)).toList());}
 Color accent(int i)=>const [Color(0xff16a34a),Color(0xfff2b51d),Color(0xffec4899),Color(0xffef4444),Color(0xff2563eb),Color(0xff111827),Color(0xffffffff)][i%7];
 @override Widget build(BuildContext context)=>Scaffold(
  appBar:AppBar(backgroundColor:Colors.white,elevation:0,title:const Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Khobragade AI',style:TextStyle(fontWeight:FontWeight.w800)),Text('User Dashboard',style:TextStyle(fontSize:11,color:Colors.black54))]),actions:[IconButton(tooltip:'Logout',onPressed:()=>widget.onLogout(),icon:const Icon(Icons.logout_rounded))]),
  body:ListView(padding:const EdgeInsets.fromLTRB(16,18,16,24),children:[
   Container(padding:const EdgeInsets.all(20),decoration:BoxDecoration(borderRadius:BorderRadius.circular(22),gradient:const LinearGradient(colors:[Color(0xff123d96),Color(0xff2563eb),Color(0xff0aa879)]),boxShadow:const [BoxShadow(color:Color(0x252563eb),blurRadius:22,offset:Offset(0,8))]),child:const Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Dashboard',style:TextStyle(color:Colors.white,fontSize:28,fontWeight:FontWeight.w900)),SizedBox(height:5),Text('Everything important, clean and ready.',style:TextStyle(color:Colors.white70))])),
   const SizedBox(height:18),
   const Text('Quick Actions',style:TextStyle(fontSize:18,fontWeight:FontWeight.w800)),const SizedBox(height:10),
   ...List.generate(cards.length,(i){final x=cards[i];final c=accent(i);return Container(margin:const EdgeInsets.only(bottom:10),decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(17),border:Border(left:BorderSide(color:c,width:5)),boxShadow:const [BoxShadow(color:Color(0x0d000000),blurRadius:14,offset:Offset(0,4))]),child:ListTile(contentPadding:const EdgeInsets.symmetric(horizontal:14,vertical:7),leading:Container(width:43,height:43,decoration:BoxDecoration(color:c.withOpacity(.12),borderRadius:BorderRadius.circular(13)),alignment:Alignment.center,child:Text(x['icon']?.toString()??'✦',style:TextStyle(color:c,fontSize:20,fontWeight:FontWeight.bold))),title:Text(x['title']?.toString()??'',style:const TextStyle(fontWeight:FontWeight.w800)),subtitle:Text(x['subtitle']?.toString()??''),trailing:const Icon(Icons.chevron_right)));
   }),
  ]),
 );
}
