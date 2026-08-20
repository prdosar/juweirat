class AppException implements Exception {
  final String message;
  final int? statusCode;

  AppException(this.message, [this.statusCode]);

  @override
  String toString() => message;
}

class AppUnauthorizedException extends AppException {
  AppUnauthorizedException([String message = 'Session expirée ou non autorisée']) : super(message, 401);
}

class AppNetworkException extends AppException {
  AppNetworkException([super.message = 'Erreur de connexion réseau']);
}

class AppServerException extends AppException {
  AppServerException(super.message, [super.statusCode]);
}
