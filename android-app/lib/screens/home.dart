import 'package:flutter/material.dart';
import '../api.dart';
import '../cms.dart';

class HomeScreen extends StatefulWidget{const HomeScreen({super.key});@override State<HomeScreen> createState()=>_HomeScreenState();}
class _HomeScreenState extends State<HomeScreen>{
 List<Map<String,dynamic>> cards=[
  {'title':'Welcome Creator','subtitle':'Coin Balance loads from /wallet'},
  {'title':'Quick Create','subtitle':'Thumbnail · Title · Video'},
  {'title':'Recent Projects','subtitle':'Loads from /projects'},
  {'title':'Notifications','subtitle':'Loads from /notifications'},
 ];
 @override void initState(){super.initState();_load();}
 Future<void> _load()async{final item=await CmsService(Api()).item('home.cards');final raw=item?['content']?['items'];if(raw is List)setState(()=>cards=raw.map((e)=>Map<String,dynamic>.from(e as Map)).toList());}
 @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('Creator Studio')),body:ListView(padding:const EdgeInsets.all(16),children:cards.map((x)=>Card(child:ListTile(title:Text(x['title']?.toString()??''),subtitle:Text(x['subtitle']?.toString()??'')))).toList()));
}
