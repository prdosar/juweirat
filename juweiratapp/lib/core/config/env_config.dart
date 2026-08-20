class EnvConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://juweirat.com',
  );

  static const String appVersion = '1.0.0+1';
  static const String erpCode = '81362.H2059';
}
