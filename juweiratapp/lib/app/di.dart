import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:juweiratapp/core/network/api_client.dart';
import 'package:juweiratapp/features/auth/data/auth_repository.dart';
import 'package:juweiratapp/core/services/repositories.dart';
import 'package:juweiratapp/core/services/polling_service.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    onUnauthorized: () {
      // Global 401 callback
    },
  );
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(apiClientProvider));
});

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  return DashboardRepository(ref.watch(apiClientProvider));
});

final reservationRepositoryProvider = Provider<ReservationRepository>((ref) {
  return ReservationRepository(ref.watch(apiClientProvider));
});

final clientRepositoryProvider = Provider<ClientRepository>((ref) {
  return ClientRepository(ref.watch(apiClientProvider));
});

final pmsRepositoryProvider = Provider<PmsRepository>((ref) {
  return PmsRepository(ref.watch(apiClientProvider));
});

final roomsRepositoryProvider = Provider<RoomsRepository>((ref) {
  return RoomsRepository(ref.watch(apiClientProvider));
});

final paymentsRepositoryProvider = Provider<PaymentsRepository>((ref) {
  return PaymentsRepository(ref.watch(apiClientProvider));
});

final notificationsRepositoryProvider = Provider<NotificationsRepository>((ref) {
  return NotificationsRepository(ref.watch(apiClientProvider));
});

final ventesDirectesRepositoryProvider = Provider<VentesDirectesRepository>((ref) {
  return VentesDirectesRepository(ref.watch(apiClientProvider));
});

final prestationsRepositoryProvider = Provider<PrestationsRepository>((ref) {
  return PrestationsRepository(ref.watch(apiClientProvider));
});

final companiesRepositoryProvider = Provider<CompaniesRepository>((ref) {
  return CompaniesRepository(ref.watch(apiClientProvider));
});

final messagesRepositoryProvider = Provider<MessagesRepository>((ref) {
  return MessagesRepository(ref.watch(apiClientProvider));
});

final accountingRepositoryProvider = Provider<AccountingRepository>((ref) {
  return AccountingRepository(ref.watch(apiClientProvider));
});

final cashSessionRepositoryProvider = Provider<CashSessionRepository>((ref) {
  return CashSessionRepository(ref.watch(apiClientProvider));
});

final usersRepositoryProvider = Provider<UsersRepository>((ref) {
  return UsersRepository(ref.watch(apiClientProvider));
});

final pollingServiceProvider = Provider<PollingService>((ref) {
  final service = PollingService(ref.watch(apiClientProvider));
  service.start();
  ref.onDispose(() => service.stop());
  return service;
});

