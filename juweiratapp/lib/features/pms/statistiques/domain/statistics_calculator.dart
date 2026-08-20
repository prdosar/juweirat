class StatisticsCalculator {
  // Taux d'Occupation (TO) : Chambres Occupées / (Chambres Totales - Chambres Hors Service) * 100
  static double calculateOccupancyRate({
    required int occupiedRooms,
    required int totalRooms,
    int outOfServiceRooms = 0,
  }) {
    final availableRooms = totalRooms - outOfServiceRooms;
    if (availableRooms <= 0) return 0.0;
    return (occupiedRooms / availableRooms) * 100.0;
  }

  // Average Daily Rate (ADR / Prix Moyen Chambre) : CA Hébergement / Chambres Occupées
  static double calculateADR({
    required num caHebergement,
    required int occupiedRooms,
  }) {
    if (occupiedRooms <= 0) return 0.0;
    return caHebergement.toDouble() / occupiedRooms;
  }

  // RevPAR (Revenu par Chambre Disponible) : CA Hébergement / (Chambres Totales - HS)
  static double calculateRevPAR({
    required num caHebergement,
    required int totalRooms,
    int outOfServiceRooms = 0,
  }) {
    final availableRooms = totalRooms - outOfServiceRooms;
    if (availableRooms <= 0) return 0.0;
    return caHebergement.toDouble() / availableRooms;
  }

  // REVPAC (Revenu par Client Présent) : CA Total / Total Clients Présents (Pax)
  static double calculateREVPAC({
    required num caTotal,
    required int occupantsPax,
  }) {
    if (occupantsPax <= 0) return 0.0;
    return caTotal.toDouble() / occupantsPax;
  }

  // Taux de Remise Accordée : (CA Réel - CA Théorique) / CA Théorique * 100
  static double calculateDiscountRate({
    required num caReel,
    required num caTheorique,
  }) {
    if (caTheorique == 0) return 0.0;
    return ((caReel - caTheorique) / caTheorique) * 100.0;
  }

  // Taux de Recouvrement : Total Encaissé / Total Facturé * 100
  static double calculateRecoveryRate({
    required num totalPaid,
    required num totalInvoiced,
  }) {
    if (totalInvoiced <= 0) return 0.0;
    return (totalPaid.toDouble() / totalInvoiced.toDouble()) * 100.0;
  }
}
