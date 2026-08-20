import 'package:flutter_test/flutter_test.dart';
import 'package:juweiratapp/features/pms/statistiques/domain/statistics_calculator.dart';

void main() {
  group('StatisticsCalculator Unit Tests (100% Exact Formulas)', () {
    test('calculateOccupancyRate (TO) standard calculation', () {
      // 12 chambres occupées / (16 totales - 0 HS) * 100 = 75.0%
      final to = StatisticsCalculator.calculateOccupancyRate(
        occupiedRooms: 12,
        totalRooms: 16,
        outOfServiceRooms: 0,
      );
      expect(to, closeTo(75.0, 0.01));
    });

    test('calculateOccupancyRate (TO) with out-of-service rooms (HS)', () {
      // 10 chambres occupées / (16 totales - 2 HS) * 100 = 71.43%
      final to = StatisticsCalculator.calculateOccupancyRate(
        occupiedRooms: 10,
        totalRooms: 16,
        outOfServiceRooms: 2,
      );
      expect(to, closeTo(71.428, 0.01));
    });

    test('calculateADR (Prix Moyen Chambre)', () {
      // 450 000 FCFA / 10 chambres = 45 000 FCFA
      final adr = StatisticsCalculator.calculateADR(
        caHebergement: 450000,
        occupiedRooms: 10,
      );
      expect(adr, equals(45000.0));
    });

    test('calculateRevPAR (Revenu par Chambre Disponible)', () {
      // 450 000 FCFA / (16 - 1) = 30 000 FCFA
      final revpar = StatisticsCalculator.calculateRevPAR(
        caHebergement: 450000,
        totalRooms: 16,
        outOfServiceRooms: 1,
      );
      expect(revpar, equals(30000.0));
    });

    test('calculateREVPAC (Revenu par Client Présent)', () {
      // 520 000 FCFA / 13 personnes = 40 000 FCFA
      final revpac = StatisticsCalculator.calculateREVPAC(
        caTotal: 520000,
        occupantsPax: 13,
      );
      expect(revpac, equals(40000.0));
    });

    test('calculateDiscountRate (Taux de Remise)', () {
      // (90 000 - 100 000) / 100 000 * 100 = -10.0%
      final discount = StatisticsCalculator.calculateDiscountRate(
        caReel: 90000,
        caTheorique: 100000,
      );
      expect(discount, closeTo(-10.0, 0.01));
    });

    test('calculateRecoveryRate (Taux de Recouvrement)', () {
      // 9 500 000 / 10 000 000 * 100 = 95.0%
      final recovery = StatisticsCalculator.calculateRecoveryRate(
        totalPaid: 9500000,
        totalInvoiced: 10000000,
      );
      expect(recovery, closeTo(95.0, 0.01));
    });

    test('calculateRecoveryRate handles division by zero safely', () {
      final recovery = StatisticsCalculator.calculateRecoveryRate(
        totalPaid: 0,
        totalInvoiced: 0,
      );
      expect(recovery, equals(0.0));
    });
  });
}
