import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'config.dart';
class Api {
  Future<Map<String,dynamic>> request(String path,{String method='GET',Map<String,dynamic>? body}) async {
    final prefs=await SharedPreferences.getInstance();
    final token=prefs.getString('token');
    final headers={'Content-Type':'application/json', if(token!=null)'Authorization':'Bearer $token'};
    final uri=Uri.parse('${Config.apiBaseUrl}$path');
    http.Response r;
    try {
      if(method=='POST'){
        r=await http.post(uri,headers:headers,body:jsonEncode(body??{})).timeout(const Duration(seconds:35));
      } else {
        r=await http.get(uri,headers:headers).timeout(const Duration(seconds:35));
      }
    } on TimeoutException {
      throw Exception('Server response timed out. Please try again.');
    } catch(e) {
      if(e is Exception) rethrow;
      throw Exception('Network connection failed.');
    }
    dynamic data;
    try { data=jsonDecode(r.body); } catch(_) { data=<String,dynamic>{}; }
    if(r.statusCode>=400){
      final error=data is Map ? (data['error']??data['message']) : null;
      throw Exception(error?.toString()??'Request failed (${r.statusCode})');
    }
    return data is Map<String,dynamic>?data:{'data':data};
  }
}
