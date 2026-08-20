import 'dart:io';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Security & Read-Only Defense in Depth Audit', () {
    test('Verifies no unauthorized mutation methods exist in repositories', () {
      final repoFile = File('lib/core/services/repositories.dart');
      expect(repoFile.existsSync(), isTrue, reason: 'repositories.dart must exist');

      final content = repoFile.readAsStringSync();

      // Check that repositories ONLY contain GET requests
      expect(content.contains('apiClient.post('), isFalse,
          reason: 'Repositories must not contain POST requests');
      expect(content.contains('apiClient.put('), isFalse,
          reason: 'Repositories must not contain PUT requests');
      expect(content.contains('apiClient.delete('), isFalse,
          reason: 'Repositories must not contain DELETE requests');
      expect(content.contains('apiClient.patch('), isFalse,
          reason: 'Repositories must not contain PATCH requests');
    });
  });
}
