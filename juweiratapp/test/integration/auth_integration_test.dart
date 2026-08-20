import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:juweiratapp/core/network/api_client.dart';
import 'package:juweiratapp/core/security/token_storage.dart';
import 'package:juweiratapp/features/auth/data/auth_repository.dart';

class _RealNetworkOverrides extends HttpOverrides {}

void main() {
  FlutterSecureStorage.setMockInitialValues({});

  test('Live E2E: Real API Login on https://juweirat.com/api/auth/login', () async {
    await HttpOverrides.runWithHttpOverrides(() async {
      final apiClient = ApiClient();
      final authRepo = AuthRepository(apiClient);

      final res = await authRepo.login('admin@juweirat.com', 'Admin2026x');
      expect(res.token, isNotEmpty);
      expect(res.email, equals('admin@juweirat.com'));
      expect(res.role.toLowerCase(), equals('admin'));

      final token = await TokenStorage.read();
      expect(token, equals(res.token));
    }, _RealNetworkOverrides());
  });
}
