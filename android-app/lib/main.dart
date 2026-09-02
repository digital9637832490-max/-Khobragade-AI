import 'package:flutter/material.dart';
import 'api.dart';
import 'cms.dart';
import 'screens/home.dart';

void main()=>runApp(const CreatorStudioApp());

class CreatorStudioApp extends StatelessWidget{
  const CreatorStudioApp({super.key});
  @override Widget build(BuildContext context)=>MaterialApp(
    title:'Creator Studio',
    theme:ThemeData(useMaterial3:true,colorSchemeSeed:Colors.indigo),
    home:const MainShell()
  );
}

class MainShell extends StatefulWidget{const MainShell({super.key});@override State<MainShell> createState()=>_MainShellState();}

class _MainShellState extends State<MainShell>{
 int i=0;
 List<Map<String,dynamic>> nav=[
  {'key':'home','label':'Home','icon':'home'},
  {'key':'create','label':'Create','icon':'auto_awesome'},
  {'key':'projects','label':'Projects','icon':'folder'},
  {'key':'coins','label':'Coins','icon':'monetization_on'},
  {'key':'profile','label':'Profile','icon':'person'},
 ];
 @override void initState(){super.initState();_loadCms();}
 Future<void> _loadCms() async{
  final item=await CmsService(Api()).item('navigation.bottom');
  final raw=item?['content']?['items'];
  if(raw is List && raw.length==5){setState(()=>nav=raw.map((e)=>Map<String,dynamic>.from(e as Map)).toList());}
 }
 IconData iconFor(String? name)=>switch(name){'home'=>Icons.home,'auto_awesome'=>Icons.auto_awesome,'folder'=>Icons.folder,'monetization_on'=>Icons.monetization_on,'person'=>Icons.person,_=>Icons.circle};
 @override Widget build(BuildContext c){
  final pages=[const HomeScreen(),const CreateScreen(),const SimpleScreen('Projects'),const SimpleScreen('Coins'),const SimpleScreen('Profile')];
  return Scaffold(body:pages[i],bottomNavigationBar:NavigationBar(selectedIndex:i,onDestinationSelected:(v)=>setState(()=>i=v),destinations:nav.map((x)=>NavigationDestination(icon:Icon(iconFor(x['icon']?.toString())),label:x['label']?.toString()??'')).toList()));
 }
}

class SimpleScreen extends StatelessWidget{final String title;const SimpleScreen(this.title,{super.key});@override Widget build(BuildContext c)=>Scaffold(appBar:AppBar(title:Text(title)),body:Center(child:Text('$title connected to shared backend')));}

class CreateScreen extends StatefulWidget{const CreateScreen({super.key});@override State<CreateScreen> createState()=>_CreateScreenState();}
class _CreateScreenState extends State<CreateScreen>{
 List<String> items=['AI Thumbnail','AI Title','AI Description','AI Tags','Photo → Video','Voice-over'];
 @override void initState(){super.initState();_load();}
 Future<void> _load()async{final item=await CmsService(Api()).item('create.tools');final raw=item?['content']?['items'];if(raw is List)setState(()=>items=raw.map((e)=>e.toString()).toList());}
 @override Widget build(BuildContext c)=>Scaffold(appBar:AppBar(title:const Text('Create')),body:GridView.count(crossAxisCount:2,padding:const EdgeInsets.all(16),children:items.map((x)=>Card(child:Center(child:Padding(padding:const EdgeInsets.all(12),child:Text(x,textAlign:TextAlign.center))))).toList()));
}
