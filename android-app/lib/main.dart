import 'package:flutter/material.dart';
import 'screens/chat.dart';
void main()=>runApp(const CreatorStudioApp());
class CreatorStudioApp extends StatelessWidget{const CreatorStudioApp({super.key});@override Widget build(BuildContext context)=>MaterialApp(debugShowCheckedModeBanner:false,title:'Creator Studio',theme:ThemeData(useMaterial3:true,scaffoldBackgroundColor:const Color(0xfff8f9fc),colorScheme:ColorScheme.fromSeed(seedColor:Colors.blue)),home:const ChatScreen());}
