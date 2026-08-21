import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/auth_repository.dart';
import '../domain/login_response.dart';
import 'package:juweiratapp/app/di.dart';
import 'package:juweiratapp/core/network/api_client.dart';

class AuthState {
  final bool isAuthenticated;
  final bool isLoading;
  final String? error;
  final LoginResponse? user;

  const AuthState({
    required this.isAuthenticated,
    this.isLoading = false,
    this.error,
    this.user,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isLoading,
    String? error,
    LoginResponse? user,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      user: user ?? this.user,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;

  AuthNotifier(this._repository) : super(const AuthState(isAuthenticated: false)) {
    ApiClient.globalOnUnauthorized = () {
      logout();
    };
    checkStatus();
  }

  Future<void> checkStatus() async {
    final isAuth = await _repository.isAuthenticated();
    state = state.copyWith(isAuthenticated: isAuth);
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final user = await _repository.login(email, password);
      state = state.copyWith(isAuthenticated: true, isLoading: false, user: user);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const AuthState(isAuthenticated: false);
  }
}

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repo = ref.watch(authRepositoryProvider);
  return AuthNotifier(repo);
});
