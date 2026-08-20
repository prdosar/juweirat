import '../domain/login_response.dart';
import 'package:juweiratapp/core/network/api_client.dart';
import 'package:juweiratapp/core/network/endpoints.dart';
import 'package:juweiratapp/core/security/token_storage.dart';

class AuthRepository {
  final ApiClient apiClient;

  AuthRepository(this.apiClient);

  Future<LoginResponse> login(String email, String password) async {
    final data = await apiClient.post(
      Endpoints.login,
      data: {'email': email, 'password': password},
    );
    final response = LoginResponse.fromJson(data as Map<String, dynamic>);
    await TokenStorage.save(response.token);
    return response;
  }

  Future<void> logout() async {
    await TokenStorage.clear();
  }

  Future<bool> isAuthenticated() async {
    final token = await TokenStorage.read();
    return token != null && token.isNotEmpty;
  }
}
