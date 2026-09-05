import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'screens/home.dart';
import 'screens/chat.dart';
import 'screens/login.dart';
import 'services/app_update_service.dart';
import 'api.dart';
import 'admin_panel.dart';

void main() => runApp(const CreatorStudioApp());

class CreatorStudioApp extends StatelessWidget {
  const CreatorStudioApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'Khobragade AI',
        theme: ThemeData(
          useMaterial3: true,
          scaffoldBackgroundColor: const Color(0xfff5f7fb),
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff245ac6)),
        ),
        home: const AuthGate(),
      );
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});
  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool loading = true;
  bool loggedIn = false;
  String role = 'user';

  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    final token=(prefs.getString('token') ?? '');
    var r=prefs.getString('account_role') ?? 'user';
    if(token.isNotEmpty){try{final me=await Api().request('/auth/me');r=(me['role']??r).toString();}catch(_){} }
    setState(() { loggedIn = token.isNotEmpty; role=r; });
    if(mounted)setState((){loading=false;});
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    if (!mounted) return;
    await prefs.remove('account_role');
    setState(() { loggedIn = false; role='user'; });
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (!loggedIn) {
      return LoginScreen(onAuthenticated: () => _check());
    }
    return role == 'admin' ? AdminPanelScreen(onLogout: _logout) : AppShell(onLogout: _logout);
  }
}

class AppShell extends StatefulWidget {
  final Future<void> Function() onLogout;
  const AppShell({super.key, required this.onLogout});
  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int index = 0;

  @override
  void initState(){
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if(mounted) AppUpdateService.check(context);
    });
  }

  @override
  Widget build(BuildContext context) {
    final pages = [HomeScreen(onLogout: widget.onLogout, onOpenChat: () => setState(() => index = 1)), const ChatScreen()];
    return Scaffold(
      body: IndexedStack(index: index, children: pages),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xffe5e5e5))),
        ),
        child: SafeArea(
          top: false,
          child: NavigationBar(
            selectedIndex: index,
            onDestinationSelected: (v) => setState(() => index = v),
            backgroundColor: Colors.white,
            elevation: 0,
            indicatorColor: const Color(0xffeeeeee),
            destinations: [
              const NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home_rounded),
                label: 'Home',
              ),
              NavigationDestination(
                icon: ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: Image.asset('assets/khobragade_ai_logo.png', width: 26, height: 26, fit: BoxFit.cover),
                ),
                selectedIcon: ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: Image.asset('assets/khobragade_ai_logo.png', width: 28, height: 28, fit: BoxFit.cover),
                ),
                label: 'Khobragade AI',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
