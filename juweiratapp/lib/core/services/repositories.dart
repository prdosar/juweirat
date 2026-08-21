import 'package:juweiratapp/core/network/api_client.dart';
import 'package:juweiratapp/core/network/endpoints.dart';
import 'package:juweiratapp/core/models/dtos.dart';
import 'package:juweiratapp/core/models/paged_result.dart';

class DashboardRepository {
  final ApiClient apiClient;
  DashboardRepository(this.apiClient);

  Future<List<RoomDto>> getRooms() async {
    final res = await apiClient.get(Endpoints.rooms);
    if (res is List) {
      return res.map((e) => RoomDto.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }

  Future<List<ReservationDto>> getRecentReservations() async {
    final res = await apiClient.get(
      Endpoints.reservationsPaged,
      query: {'pageNumber': 1, 'pageSize': 8, 'sortBy': 'CreatedAt', 'isDescending': true},
    );
    if (res is Map<String, dynamic>) {
      final paged = PagedResult.fromJson(res, (e) => ReservationDto.fromJson(e as Map<String, dynamic>));
      return paged.items;
    }
    return [];
  }

  Future<List<ClientDto>> getClients() async {
    final res = await apiClient.get(Endpoints.clients);
    if (res is List) {
      return res.map((e) => ClientDto.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }
}

class ReservationRepository {
  final ApiClient apiClient;
  ReservationRepository(this.apiClient);

  Future<PagedResult<ReservationDto>> getPaged({
    int page = 1,
    int pageSize = 10,
    String? search,
    String? status,
    String? paymentStatus,
    String? startDate,
    String? sortBy,
    bool isDescending = true,
  }) async {
    final query = <String, dynamic>{
      'pageNumber': page,
      'pageSize': pageSize,
      'isDescending': isDescending,
    };
    if (search != null && search.isNotEmpty) query['search'] = search;
    if (status != null && status.isNotEmpty) query['status'] = status;
    if (paymentStatus != null && paymentStatus.isNotEmpty) query['paymentStatus'] = paymentStatus;
    if (startDate != null && startDate.isNotEmpty) query['startDate'] = startDate;
    if (sortBy != null && sortBy.isNotEmpty) query['sortBy'] = sortBy;

    final res = await apiClient.get(Endpoints.reservationsPaged, query: query);
    if (res is Map<String, dynamic>) {
      return PagedResult.fromJson(res, (e) => ReservationDto.fromJson(e as Map<String, dynamic>));
    }
    return const PagedResult(items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false);
  }

  Future<ReservationDto?> getById(int id) async {
    final res = await apiClient.get('${Endpoints.reservations}/$id');
    if (res is Map<String, dynamic>) {
      return ReservationDto.fromJson(res);
    }
    return null;
  }
}

class ClientRepository {
  final ApiClient apiClient;
  ClientRepository(this.apiClient);

  Future<PagedResult<ClientDto>> getPaged({
    int page = 1,
    int pageSize = 10,
    String? search,
    String? documentType,
    bool? hasReservations,
  }) async {
    final query = <String, dynamic>{'pageNumber': page, 'pageSize': pageSize};
    if (search != null && search.isNotEmpty) query['search'] = search;
    if (documentType != null && documentType.isNotEmpty) query['documentType'] = documentType;
    if (hasReservations != null) query['hasReservations'] = hasReservations;

    final res = await apiClient.get(Endpoints.clientsPaged, query: query);
    if (res is Map<String, dynamic>) {
      return PagedResult.fromJson(res, (e) => ClientDto.fromJson(e as Map<String, dynamic>));
    }
    return const PagedResult(items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false);
  }

  Future<ClientDto?> getById(int id) async {
    final res = await apiClient.get('${Endpoints.clients}/$id');
    if (res is Map<String, dynamic>) {
      return ClientDto.fromJson(res);
    }
    return null;
  }

  Future<List<ReservationDto>> getReservationsByClient(int clientId) async {
    final res = await apiClient.get(
      Endpoints.reservationsPaged,
      query: {'clientId': clientId, 'pageSize': 50},
    );
    if (res is Map<String, dynamic>) {
      final paged = PagedResult.fromJson(res, (e) => ReservationDto.fromJson(e as Map<String, dynamic>));
      return paged.items;
    }
    return [];
  }
}

class PmsRepository {
  final ApiClient apiClient;
  PmsRepository(this.apiClient);

  Future<HotelConfigDto> getConfig() async {
    final res = await apiClient.get(Endpoints.pmsConfig);
    if (res is Map<String, dynamic>) return HotelConfigDto.fromJson(res);
    final today = DateTime.now().toIso8601String().substring(0, 10);
    return HotelConfigDto(
      id: 1,
      buildingName: 'Résidence Juweirat',
      ownerName: 'DG',
      city: 'Lomé',
      currencyCode: 'XOF',
      currencyDecimals: 0,
      dateHotel: today,
      resaSeq: 0,
      factureSeq: 0,
    );
  }

  Future<List<UnitDto>> getUnits() async {
    final res = await apiClient.get(Endpoints.pmsUnits);
    if (res is List) return res.map((e) => UnitDto.fromJson(e as Map<String, dynamic>)).toList();
    return [];
  }

  Future<List<FolioDto>> getActiveFolios() async {
    final res = await apiClient.get(Endpoints.pmsFolios, query: {'closed': false});
    if (res is List) return res.map((e) => FolioDto.fromJson(e as Map<String, dynamic>)).toList();
    return [];
  }

  Future<PagedResult<FolioDto>> getPagedFolios({
    int page = 1,
    int pageSize = 10,
    String? search,
    bool? closed,
    String? resaStatus,
    String? balanceStatus,
  }) async {
    final query = <String, dynamic>{'pageNumber': page, 'pageSize': pageSize};
    if (search != null && search.isNotEmpty) query['search'] = search;
    if (closed != null) query['closed'] = closed;
    if (resaStatus != null && resaStatus.isNotEmpty) query['resaStatus'] = resaStatus;
    if (balanceStatus != null && balanceStatus.isNotEmpty) query['balanceStatus'] = balanceStatus;

    final res = await apiClient.get(Endpoints.pmsFoliosPaged, query: query);
    if (res is Map<String, dynamic>) {
      return PagedResult.fromJson(res, (e) => FolioDto.fromJson(e as Map<String, dynamic>));
    }
    return const PagedResult(items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false);
  }

  Future<FolioDto?> getFolioById(int id) async {
    final res = await apiClient.get('${Endpoints.pmsFolios}/$id');
    if (res is Map<String, dynamic>) return FolioDto.fromJson(res);
    return null;
  }

  Future<CloturePreviewDto> getCloturePreview() async {
    final res = await apiClient.get(Endpoints.pmsCloturePreview);
    if (res is Map<String, dynamic>) return CloturePreviewDto.fromJson(res);
    final today = DateTime.now().toIso8601String().substring(0, 10);
    return CloturePreviewDto(dateHotel: today, estimatedActiveCount: 0, canClose: false);
  }

  Future<List<ClotureDto>> getClotureHistory({int limit = 90}) async {
    final res = await apiClient.get(Endpoints.pmsClotureHistory, query: {'limit': limit});
    if (res is List) return res.map((e) => ClotureDto.fromJson(e as Map<String, dynamic>)).toList();
    return [];
  }

  Future<List<FactureDto>> getFactures({String? search}) async {
    final query = search != null && search.isNotEmpty ? {'search': search} : null;
    final res = await apiClient.get(Endpoints.pmsFactures, query: query);
    if (res is List) return res.map((e) => FactureDto.fromJson(e as Map<String, dynamic>)).toList();
    return [];
  }

  Future<List<DebiteurDto>> getDebiteurs() async {
    final res = await apiClient.get(Endpoints.pmsDebiteurs);
    if (res is List) return res.map((e) => DebiteurDto.fromJson(e as Map<String, dynamic>)).toList();
    return [];
  }

  Future<List<MaintenanceTicketDto>> getMaintenanceTickets({String? status, String? priority}) async {
    final query = <String, dynamic>{};
    if (status != null && status.isNotEmpty) query['status'] = status;
    if (priority != null && priority.isNotEmpty) query['priority'] = priority;
    final res = await apiClient.get(Endpoints.pmsMaintenance, query: query.isNotEmpty ? query : null);
    if (res is List) return res.map((e) => MaintenanceTicketDto.fromJson(e as Map<String, dynamic>)).toList();
    return [];
  }

  Future<RoomHistoryDto?> getUnitHistory(int unitId, {int limit = 50}) async {
    final res = await apiClient.get(Endpoints.pmsUnitHistory(unitId), query: {'limit': limit});
    if (res is Map<String, dynamic>) return RoomHistoryDto.fromJson(res);
    return null;
  }
}

class RoomsRepository {
  final ApiClient apiClient;
  RoomsRepository(this.apiClient);

  Future<List<RoomCategoryDto>> getCategories() async {
    final res = await apiClient.get(Endpoints.roomCategories);
    if (res is List) return res.map((e) => RoomCategoryDto.fromJson(e as Map<String, dynamic>)).toList();
    return [];
  }

  Future<List<RoomDto>> getRooms({int? categoryId}) async {
    final query = categoryId != null ? {'categoryId': categoryId} : null;
    final res = await apiClient.get(Endpoints.rooms, query: query);
    if (res is List) return res.map((e) => RoomDto.fromJson(e as Map<String, dynamic>)).toList();
    return [];
  }
}

class PaymentsRepository {
  final ApiClient apiClient;
  PaymentsRepository(this.apiClient);

  Future<PagedResult<PaymentDto>> getPaged({
    int page = 1,
    int pageSize = 20,
    String? method,
    String? status,
  }) async {
    final query = <String, dynamic>{'pageNumber': page, 'pageSize': pageSize};
    if (method != null && method.isNotEmpty) query['method'] = method;
    if (status != null && status.isNotEmpty) query['status'] = status;

    final res = await apiClient.get(Endpoints.paymentsPaged, query: query);
    if (res is Map<String, dynamic>) {
      return PagedResult.fromJson(res, (e) => PaymentDto.fromJson(e as Map<String, dynamic>));
    }
    return const PagedResult(items: [], pageNumber: 1, pageSize: 20, totalCount: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false);
  }
}

class VentesDirectesRepository {
  final ApiClient apiClient;
  VentesDirectesRepository(this.apiClient);

  Future<List<VenteDirecteDto>> getByDate(String date) async {
    final res = await apiClient.get(Endpoints.ventesDirectes, query: {'date': date});
    if (res is List) return res.map((e) => VenteDirecteDto.fromJson(e as Map<String, dynamic>)).toList();
    return [];
  }
}

class MessagesRepository {
  final ApiClient apiClient;
  MessagesRepository(this.apiClient);

  Future<List<ContactMessageDto>> getMessages({String? status, String? search}) async {
    final query = <String, dynamic>{};
    if (status != null && status.isNotEmpty) query['status'] = status;
    if (search != null && search.isNotEmpty) query['search'] = search;
    final res = await apiClient.get(Endpoints.contactMessages, query: query.isNotEmpty ? query : null);
    if (res is List) return res.map((e) => ContactMessageDto.fromJson(e as Map<String, dynamic>)).toList();
    return [];
  }
}

class CompaniesRepository {
  final ApiClient apiClient;
  CompaniesRepository(this.apiClient);

  Future<List<CompanyDto>> getCompanies() async {
    final res = await apiClient.get(Endpoints.companies);
    if (res is List) return res.map((e) => CompanyDto.fromJson(e as Map<String, dynamic>)).toList();
    return [];
  }
}

class PrestationsRepository {
  final ApiClient apiClient;
  PrestationsRepository(this.apiClient);

  Future<List<PrestationAnnexeDto>> getPrestations() async {
    final res = await apiClient.get(Endpoints.prestations);
    if (res is List) return res.map((e) => PrestationAnnexeDto.fromJson(e as Map<String, dynamic>)).toList();
    return [];
  }
}

class NotificationsRepository {
  final ApiClient apiClient;
  NotificationsRepository(this.apiClient);

  Future<NotificationSummaryDto?> getSummary() async {
    final res = await apiClient.get(Endpoints.notificationSummary);
    if (res is Map<String, dynamic>) return NotificationSummaryDto.fromJson(res);
    return null;
  }

  Future<List<ContactMessageDto>> getContactMessages({String? status, String? search}) async {
    final query = <String, dynamic>{};
    if (status != null && status.isNotEmpty) query['status'] = status;
    if (search != null && search.isNotEmpty) query['search'] = search;

    final res = await apiClient.get(Endpoints.contactMessages, query: query.isNotEmpty ? query : null);
    if (res is List) return res.map((e) => ContactMessageDto.fromJson(e as Map<String, dynamic>)).toList();
    return [];
  }
}

class AccountingRepository {
  final ApiClient apiClient;
  AccountingRepository(this.apiClient);

  Future<JournalReportDto?> getJournal({DateTime? from, DateTime? to, String? paymentMethod}) async {
    final query = <String, dynamic>{};
    if (from != null) query['from'] = from.toUtc().toIso8601String();
    if (to != null) query['to'] = to.toUtc().toIso8601String();
    if (paymentMethod != null && paymentMethod.isNotEmpty) query['paymentMethod'] = paymentMethod;

    final res = await apiClient.get(Endpoints.comptaJournal, query: query.isNotEmpty ? query : null);
    if (res is Map<String, dynamic>) return JournalReportDto.fromJson(res);
    return null;
  }

  Future<BalanceReportDto?> getBalance({DateTime? from, DateTime? to, String? kind}) async {
    final query = <String, dynamic>{};
    if (from != null) query['from'] = from.toUtc().toIso8601String();
    if (to != null) query['to'] = to.toUtc().toIso8601String();
    if (kind != null && kind.isNotEmpty) query['kind'] = kind;

    final res = await apiClient.get(Endpoints.comptaBalance, query: query.isNotEmpty ? query : null);
    if (res is Map<String, dynamic>) return BalanceReportDto.fromJson(res);
    return null;
  }

  Future<TvaReportDto?> getTvaReport({DateTime? from, DateTime? to}) async {
    final query = <String, dynamic>{};
    if (from != null) query['from'] = from.toUtc().toIso8601String();
    if (to != null) query['to'] = to.toUtc().toIso8601String();

    final res = await apiClient.get(Endpoints.comptaTva, query: query.isNotEmpty ? query : null);
    if (res is Map<String, dynamic>) return TvaReportDto.fromJson(res);
    return null;
  }

  Future<List<AccountDto>> getAccounts({String? kind, bool? includeInactive}) async {
    final query = <String, dynamic>{};
    if (kind != null && kind.isNotEmpty) query['kind'] = kind;
    if (includeInactive != null) query['includeInactive'] = includeInactive;

    final res = await apiClient.get(Endpoints.accounts, query: query.isNotEmpty ? query : null);
    if (res is List) return res.map((e) => AccountDto.fromJson(e as Map<String, dynamic>)).toList();
    return [];
  }

  Future<List<CashRegisterDto>> getCashRegisters({bool includeInactive = false}) async {
    final res = await apiClient.get(Endpoints.cashRegisters, query: {'includeInactive': includeInactive});
    if (res is List) return res.map((e) => CashRegisterDto.fromJson(e as Map<String, dynamic>)).toList();
    return [];
  }
}

class CashSessionRepository {
  final ApiClient apiClient;
  CashSessionRepository(this.apiClient);

  Future<CashSessionDto?> getCurrent() async {
    final res = await apiClient.get(Endpoints.cashSessionsCurrent);
    if (res is Map<String, dynamic>) return CashSessionDto.fromJson(res);
    return null;
  }

  Future<List<CashSessionDto>> getHistory({int limit = 50}) async {
    final res = await apiClient.get(Endpoints.cashSessions, query: {'limit': limit});
    if (res is List) return res.map((e) => CashSessionDto.fromJson(e as Map<String, dynamic>)).toList();
    return [];
  }

  Future<CashSessionReportDto?> getReport(int sessionId) async {
    final res = await apiClient.get(Endpoints.cashSessionReport(sessionId));
    if (res is Map<String, dynamic>) return CashSessionReportDto.fromJson(res);
    return null;
  }
}

class UsersRepository {
  final ApiClient apiClient;
  UsersRepository(this.apiClient);

  Future<List<UserDto>> getUsers({bool includeInactive = true}) async {
    final res = await apiClient.get(Endpoints.users, query: {'includeInactive': includeInactive});
    if (res is List) return res.map((e) => UserDto.fromJson(e as Map<String, dynamic>)).toList();
    return [];
  }

  Future<UserDto?> getById(int id) async {
    final res = await apiClient.get(Endpoints.userById(id));
    if (res is Map<String, dynamic>) return UserDto.fromJson(res);
    return null;
  }
}
