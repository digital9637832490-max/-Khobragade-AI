import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../config.dart';
import '../api.dart';

class LoginScreen extends StatefulWidget {
  final VoidCallback onAuthenticated;
  const LoginScreen({super.key, required this.onAuthenticated});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final api = Api();
  final name = TextEditingController();
  final email = TextEditingController();
  final password = TextEditingController();
  bool registerMode = false;
  bool busy = false;
  String error = '';

  @override
  void dispose() {
    name.dispose();
    email.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> googleLogin() async {
    if (busy) return;
    if (Config.googleWebClientId.isEmpty) {
      setState(() => error = 'Google Sign-In is not configured yet.');
      return;
    }
    setState(() { busy = true; error = ''; });
    try {
      final google = GoogleSignIn(serverClientId: Config.googleWebClientId, scopes: const ['email', 'profile']);
      await google.signOut();
      final account = await google.signIn();
      if (account == null) return;
      final auth = await account.authentication;
      final idToken = auth.idToken;
      if (idToken == null || idToken.isEmpty) throw Exception('Google login token missing');
      final data = await api.request('/auth/google', method: 'POST', body: {'idToken': idToken});
      final token = data['token']?.toString() ?? '';
      if (token.isEmpty) throw Exception('Login token missing');
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', token);
      if (!mounted) return;
      widget.onAuthenticated();
    } catch (e) {
      if (mounted) setState(() => error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> submit() async {
    if (busy) return;
    final e = email.text.trim();
    final p = password.text;
    final n = name.text.trim();
    if (e.isEmpty || p.isEmpty || (registerMode && n.length < 2)) {
      setState(() => error = 'Please fill all required fields.');
      return;
    }
    if (registerMode && p.length < 8) {
      setState(() => error = 'Password must be at least 8 characters.');
      return;
    }
    setState(() {
      busy = true;
      error = '';
    });
    try {
      final data = await api.request(
        registerMode ? '/auth/register' : '/auth/login',
        method: 'POST',
        body: registerMode
            ? {'name': n, 'email': e, 'password': p}
            : {'email': e, 'password': p},
      );
      final token = data['token']?.toString() ?? '';
      if (token.isEmpty) throw Exception('Login token missing');
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', token);
      if (!mounted) return;
      widget.onAuthenticated();
    } catch (e) {
      if (mounted) setState(() => error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff6f8fc),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(22),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(26),
                  boxShadow: const [BoxShadow(color: Color(0x17000000), blurRadius: 28, offset: Offset(0, 10))],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      width: 70,
                      height: 70,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(colors: [Color(0xff2563eb), Color(0xff16a34a), Color(0xffec4899)]),
                      ),
                      child: const Icon(Icons.auto_awesome, color: Colors.white, size: 34),
                    ),
                    const SizedBox(height: 16),
                    const Text('✨ Khobragade AI', textAlign: TextAlign.center, style: TextStyle(fontSize: 27, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 5),
                    Text(registerMode ? 'Create your account' : 'Sign in to continue', textAlign: TextAlign.center, style: const TextStyle(color: Colors.black54)),
                    const SizedBox(height: 24),
                    if (registerMode) ...[
                      TextField(controller: name, textInputAction: TextInputAction.next, decoration: _field('Name', Icons.person_outline)),
                      const SizedBox(height: 12),
                    ],
                    TextField(controller: email, keyboardType: TextInputType.emailAddress, textInputAction: TextInputAction.next, decoration: _field('Email', Icons.email_outlined)),
                    const SizedBox(height: 12),
                    TextField(controller: password, obscureText: true, onSubmitted: (_) => submit(), decoration: _field('Password', Icons.lock_outline)),
                    if (error.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 12), child: Text(error, style: const TextStyle(color: Colors.red, fontWeight: FontWeight.w600))),
                    const SizedBox(height: 18),
                    FilledButton(
                      onPressed: busy ? null : submit,
                      style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 15), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15))),
                      child: Text(busy ? 'Please wait…' : (registerMode ? 'Create Account' : 'Login'), style: const TextStyle(fontWeight: FontWeight.w800)),
                    ),
                    const SizedBox(height: 14),
                    Row(children: const [Expanded(child: Divider()), Padding(padding: EdgeInsets.symmetric(horizontal: 12), child: Text('OR', style: TextStyle(color: Colors.black45, fontWeight: FontWeight.w700))), Expanded(child: Divider())]),
                    const SizedBox(height: 14),
                    OutlinedButton.icon(
                      onPressed: busy ? null : googleLogin,
                      icon: const Text('G', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xff4285F4))),
                      label: const Text('Continue with Google', style: TextStyle(fontWeight: FontWeight.w800, color: Colors.black87)),
                      style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 15), side: const BorderSide(color: Color(0xffd7dce5)), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15))),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: busy ? null : () => setState(() { registerMode = !registerMode; error = ''; }),
                      child: Text(registerMode ? 'Already have an account? Login' : 'New user? Create account'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _field(String label, IconData icon) => InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        filled: true,
        fillColor: const Color(0xfff8fafc),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: const BorderSide(color: Color(0xffe2e8f0))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: const BorderSide(color: Color(0xff2563eb), width: 2)),
      );
}
