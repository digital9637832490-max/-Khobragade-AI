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
    if(method=='POST'){r=await http.post(uri,headers:headers,body:jsonEncode(body??{}));}
    else{r=await http.get(uri,headers:headers);}
    final data=jsonDecode(r.body);
    if(r.statusCode>=400) throw Exception(data['error']??'Request failed');
    return data is Map<String,dynamic>?data:{'data':data};
  }
}
