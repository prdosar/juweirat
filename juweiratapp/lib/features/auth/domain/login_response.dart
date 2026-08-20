class LoginResponse {
  final String token;
  final String email;
  final String fullName;
  final String role;
  final String expiresAt;

  const LoginResponse({
    required this.token,
    required this.email,
    required this.fullName,
    required this.role,
    required this.expiresAt,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      token: json['token'] as String? ?? '',
      email: json['email'] as String? ?? '',
      fullName: json['fullName'] as String? ?? 'Directeur Général',
      role: json['role'] as String? ?? 'Director',
      expiresAt: json['expiresAt'] as String? ?? '',
    );
  }
}
