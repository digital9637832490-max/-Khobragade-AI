import 'package:flutter/material.dart';
import 'screens/home.dart';
import 'screens/chat.dart';

void main()=>runApp(const CreatorStudioApp());

class CreatorStudioApp extends StatelessWidget{
 const CreatorStudioApp({super.key});
 @override Widget build(BuildContext context)=>MaterialApp(
  debugShowCheckedModeBanner:false,
  title:'Khobragade AI',
  theme:ThemeData(useMaterial3:true,scaffoldBackgroundColor:const Color(0xfff5f7fb),colorScheme:ColorScheme.fromSeed(seedColor:const Color(0xff245ac6))),
  home:const AppShell(),
 );
}

class AppShell extends StatefulWidget{const AppShell({super.key});@override State<AppShell> createState()=>_AppShellState();}
class _AppShellState extends State<AppShell>{
 int index=0;
 final pages=const [HomeScreen(),ChatScreen()];
 @override Widget build(BuildContext context)=>Scaffold(
  body:IndexedStack(index:index,children:pages),
  bottomNavigationBar:Container(
   decoration:const BoxDecoration(color:Colors.white,boxShadow:[BoxShadow(color:Color(0x18000000),blurRadius:18,offset:Offset(0,-3))]),
   child:SafeArea(top:false,child:NavigationBar(
    selectedIndex:index,
    onDestinationSelected:(v)=>setState(()=>index=v),
    backgroundColor:Colors.white,
    indicatorColor:const Color(0xffeaf1ff),
    destinations:const [
     NavigationDestination(icon:Icon(Icons.dashboard_outlined),selectedIcon:Icon(Icons.dashboard),label:'Dashboard'),
     NavigationDestination(icon:Icon(Icons.auto_awesome_outlined),selectedIcon:Icon(Icons.auto_awesome),label:'Khobragade AI'),
    ],
   )),
  ),
 );
}
