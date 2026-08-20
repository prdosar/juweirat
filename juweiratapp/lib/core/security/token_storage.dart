import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  static const _key = 'juweirat_jwt_token';
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  static Future<void> save(String token) async {
    await _storage.write(key: _key, value: token);
  }

  static Future<String?> read() async {
    return await _storage.read(key: _key);
  }

  static Future<void> clear() async {
    await _storage.delete(key: _key);
  }
}
