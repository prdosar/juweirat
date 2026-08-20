class Endpoints {
  // Auth
  static const String login = '/api/auth/login';

  // Référentiels
  static const String roomCategories = '/api/room-categories';
  static const String roomCategoriesAvailable = '/api/room-categories/available';
  static const String rooms = '/api/rooms';
  static const String amenities = '/api/amenities';

  // Clients & Compagnies
  static const String clients = '/api/clients';
  static const String clientsPaged = '/api/clients/paged';
  static const String companies = '/api/companies';

  // Réservations & Paiements
  static const String reservations = '/api/reservations';
  static const String reservationsPaged = '/api/reservations/paged';
  static const String payments = '/api/payments';
  static const String paymentsPaged = '/api/payments/paged';
  static String paymentsForReservation(int resId) => '/api/payments/reservation/$resId';

  // Ventes directes, prestations & messages
  static const String ventesDirectes = '/api/ventes-directes';
  static const String ventesDirectesBatch = '/api/ventes-directes/batch';
  static const String prestations = '/api/prestations';
  static const String contactMessages = '/api/contactmessages';

  // PMS
  static const String pmsConfig = '/api/pms/config';
  static const String pmsUnits = '/api/pms/units';
  static const String pmsFolios = '/api/pms/folios';
  static const String pmsFoliosPaged = '/api/pms/folios/paged';
  static const String pmsCloturePreview = '/api/pms/cloture/preview';
  static const String pmsClotureHistory = '/api/pms/cloture/history';
  static String pmsClotureDate(String date) => '/api/pms/cloture/$date';
  static const String pmsPostings = '/api/pms/postings';
  static const String pmsFactures = '/api/pms/factures';
  static const String pmsMaintenance = '/api/pms/maintenance';
  static const String pmsMaintenanceCategories = '/api/pms/maintenance-categories';
  static const String pmsMaintenanceStaff = '/api/pms/maintenance-staff';
  static const String pmsDebiteurs = '/api/pms/debiteurs';

  // Mobile Notifications & Résumés
  static const String mobileDevices = '/api/mobile/devices';
  static const String mobileNotifications = '/api/mobile/notifications';
  static String mobileNotificationRead(String id) => '/api/mobile/notifications/$id/read';
  static const String mobileNotificationReadAll = '/api/mobile/notifications/read-all';
  static const String notificationSummary = '/api/notifications/summary';

  // Comptabilité & Trésorerie
  static const String comptaJournal = '/api/comptabilite/journal';
  static const String comptaBalance = '/api/comptabilite/balance';
  static const String comptaTva = '/api/comptabilite/tva';
  static String comptaLedger(int accountId) => '/api/comptabilite/grand-livre/$accountId';
  static const String accounts = '/api/accounts';
  static const String accountMovements = '/api/accounts/movements';
  static const String cashRegisters = '/api/cash-registers';

  // Sessions de Caisse
  static const String cashSessions = '/api/cash/sessions';
  static const String cashSessionsCurrent = '/api/cash/sessions/current';
  static String cashSessionReport(int id) => '/api/cash/sessions/$id/report';
  static String cashSessionMovements(int id) => '/api/cash/sessions/$id/movements';
  static String cashSessionClose(int id) => '/api/cash/sessions/$id/close';

  // Utilisateurs & Équipe
  static const String users = '/api/users';
  static String userById(int id) => '/api/users/$id';

  // Historique Chambre / Gouvernance
  static String pmsUnitHistory(int unitId) => '/api/pms/units/$unitId/history';
}
