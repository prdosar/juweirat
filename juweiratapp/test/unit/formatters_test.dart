import 'package:flutter_test/flutter_test.dart';
import 'package:juweiratapp/core/formatters/formatters.dart';

void main() {
  group('Formatters Unit Tests', () {
    test('money formats integer into FCFA correctly', () {
      final result = money(125000);
      expect(result.contains('125'), isTrue);
      expect(result.contains('FCFA'), isTrue);
    });

    test('money returns 0 FCFA for null', () {
      expect(money(null), equals('0 FCFA'));
    });

    test('frDate formats ISO date correctly', () {
      expect(frDate('2026-08-19'), equals('19/08/2026'));
      expect(frDate(''), equals('-'));
      expect(frDate(null), equals('-'));
    });

    test('nightsBetween calculates days difference correctly', () {
      final days = nightsBetween('2026-08-19', '2026-08-22');
      expect(days, equals(3.0));
    });

    test('percent formats float correctly', () {
      expect(percent(75.55), equals('75.5%'));
      expect(percent(null), equals('0%'));
    });
  });
}
