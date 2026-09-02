import 'api.dart';

class CmsService {
  final Api api;
  CmsService(this.api);

  Future<Map<String, dynamic>?> item(String key) async {
    try {
      return await api.request('/cms/app/$key');
    } catch (_) {
      return null;
    }
  }
}
