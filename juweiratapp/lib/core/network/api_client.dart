import 'package:dio/dio.dart';
import '../config/env_config.dart';
import '../security/token_storage.dart';
import 'exceptions.dart';

class ApiClient {
  late final Dio dio;
  void Function()? onUnauthorized;

  ApiClient({Dio? customDio, this.onUnauthorized}) {
    dio = customDio ??
        Dio(
          BaseOptions(
            baseUrl: EnvConfig.apiBaseUrl,
            headers: {'Content-Type': 'application/json'},
            connectTimeout: const Duration(seconds: 15),
            receiveTimeout: const Duration(seconds: 15),
          ),
        );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await TokenStorage.read();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (DioException e, handler) async {
          if (e.response?.statusCode == 401) {
            await TokenStorage.clear();
            onUnauthorized?.call();
            handler.reject(
              DioException(
                requestOptions: e.requestOptions,
                error: AppUnauthorizedException(),
                response: e.response,
                type: e.type,
              ),
            );
            return;
          }
          handler.next(e);
        },
      ),
    );
  }

  // 100% GET methods for Read-Only assurance
  Future<dynamic> get(String path, {Map<String, dynamic>? query}) async {
    try {
      final res = await dio.get(path, queryParameters: query);
      if (res.statusCode == 204) return null;
      return res.data;
    } on DioException catch (e) {
      if (e.error is AppException) throw e.error!;
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        throw AppNetworkException('Délai d\'attente dépassé lors de la connexion au serveur.');
      }
      if (e.type == DioExceptionType.connectionError) {
        throw AppNetworkException('Impossible de joindre le serveur (${dio.options.baseUrl}).');
      }
      if (e.response?.statusCode == 401) {
        throw AppUnauthorizedException('Session expirée ou non autorisée.');
      }
      final serverMsg = e.response?.data is Map
          ? (e.response?.data['error'] ?? e.response?.data['title'] ?? e.response?.data['message'])?.toString()
          : null;
      final msg = serverMsg ?? (e.response != null ? 'Erreur HTTP ${e.response!.statusCode}' : 'Erreur réseau');
      throw AppServerException(msg, e.response?.statusCode);
    }
  }

  // Login exception (only permitted POST)
  Future<dynamic> post(String path, {dynamic data}) async {
    try {
      final res = await dio.post(path, data: data);
      return res.data;
    } on DioException catch (e) {
      if (e.error is AppException) throw e.error!;
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        throw AppNetworkException('Délai d\'attente dépassé lors de la connexion au serveur.');
      }
      if (e.type == DioExceptionType.connectionError) {
        throw AppNetworkException('Impossible de joindre le serveur (${dio.options.baseUrl}).');
      }
      if (e.response?.statusCode == 401) {
        throw AppUnauthorizedException('Identifiants incorrects (Email ou mot de passe invalide).');
      }
      if (e.response?.statusCode == 403) {
        throw AppUnauthorizedException('Accès refusé : Ce compte ne dispose pas des privilèges requis.');
      }
      final serverMsg = e.response?.data is Map
          ? (e.response?.data['error'] ?? e.response?.data['title'] ?? e.response?.data['message'])?.toString()
          : null;
      final msg = serverMsg ?? (e.response != null ? 'Erreur HTTP ${e.response!.statusCode}' : 'Erreur de connexion');
      throw AppServerException(msg, e.response?.statusCode);
    }
  }
}
