import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:juweiratapp/core/network/api_client.dart';
import 'package:juweiratapp/core/network/exceptions.dart';
import 'package:juweiratapp/core/security/token_storage.dart';
import 'package:juweiratapp/features/auth/data/auth_repository.dart';
import 'package:juweiratapp/features/auth/presentation/auth_notifier.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  FlutterSecureStorage.setMockInitialValues({});

  group('AuthRepository Unit & Contract Tests', () {
    late ApiClient apiClient;
    late AuthRepository authRepository;

    test('Login success parses response and saves token to storage', () async {
      final mockDio = Dio(BaseOptions(baseUrl: 'https://juweirat.com'));
      mockDio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            if (options.path == '/api/auth/login') {
              return handler.resolve(
                Response(
                  requestOptions: options,
                  statusCode: 200,
                  data: {
                    'token': 'mock-jwt-token-12345',
                    'email': 'admin@juweirat.com',
                    'fullName': 'Admin Juweirat',
                    'role': 'Admin',
                    'expiresAt': '2026-08-20T12:00:00Z',
                  },
                ),
              );
            }
            return handler.next(options);
          },
        ),
      );

      apiClient = ApiClient(customDio: mockDio);
      authRepository = AuthRepository(apiClient);

      final result = await authRepository.login('admin@juweirat.com', 'Admin2026x');

      expect(result.token, equals('mock-jwt-token-12345'));
      expect(result.email, equals('admin@juweirat.com'));
      expect(result.role, equals('Admin'));
      expect(result.fullName, equals('Admin Juweirat'));

      final storedToken = await TokenStorage.read();
      expect(storedToken, equals('mock-jwt-token-12345'));

      final isAuth = await authRepository.isAuthenticated();
      expect(isAuth, isTrue);
    });

    test('Login 401 throws AppUnauthorizedException', () async {
      final mockDio = Dio(BaseOptions(baseUrl: 'https://juweirat.com'));
      mockDio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            return handler.reject(
              DioException(
                requestOptions: options,
                response: Response(
                  requestOptions: options,
                  statusCode: 401,
                  data: {'error': 'Invalid email or password'},
                ),
              ),
            );
          },
        ),
      );

      apiClient = ApiClient(customDio: mockDio);
      authRepository = AuthRepository(apiClient);

      expect(
        () async => await authRepository.login('admin@juweirat.com', 'WrongPass'),
        throwsA(isA<AppUnauthorizedException>()),
      );
    });

    test('AuthNotifier state transitions on login and logout', () async {
      final mockDio = Dio(BaseOptions(baseUrl: 'https://juweirat.com'));
      mockDio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            return handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: {
                  'token': 'valid-jwt-token',
                  'email': 'admin@juweirat.com',
                  'fullName': 'Admin Juweirat',
                  'role': 'Admin',
                  'expiresAt': '2026-08-20T12:00:00Z',
                },
              ),
            );
          },
        ),
      );

      apiClient = ApiClient(customDio: mockDio);
      authRepository = AuthRepository(apiClient);
      final notifier = AuthNotifier(authRepository);

      expect(notifier.state.isAuthenticated, isFalse);

      final ok = await notifier.login('admin@juweirat.com', 'Admin2026x');
      expect(ok, isTrue);
      expect(notifier.state.isAuthenticated, isTrue);
      expect(notifier.state.user?.email, equals('admin@juweirat.com'));

      await notifier.logout();
      expect(notifier.state.isAuthenticated, isFalse);
    });
  });
}
