import 'dart:async';
import 'package:flutter/foundation.dart';
import '../network/api_client.dart';
import '../network/endpoints.dart';
import '../cache/local_cache.dart';
import '../models/dtos.dart';
import '../models/paged_result.dart';

class PollingService {
  final ApiClient apiClient;
  Timer? _timer;
  final void Function(NotificationItemDto notif)? onNewAlert;

  PollingService(this.apiClient, {this.onNewAlert});

  void start() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 45), (_) => _poll());
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  Future<void> _poll() async {
    try {
      // 1. Check new reservations
      final res = await apiClient.get(
        Endpoints.reservationsPaged,
        query: {'pageNumber': 1, 'pageSize': 1, 'sortBy': 'CreatedAt', 'isDescending': true},
      );
      if (res is Map<String, dynamic>) {
        final paged = PagedResult.fromJson(res, (e) => ReservationDto.fromJson(e as Map<String, dynamic>));
        if (paged.items.isNotEmpty) {
          final latest = paged.items.first;
          final lastSeen = LocalCache.getLastSeen('last_seen_resa_id');
          if (lastSeen > 0 && latest.id > lastSeen) {
            onNewAlert?.call(
              NotificationItemDto(
                id: 'res_${latest.id}',
                type: 'reservation.created',
                title: 'Nouvelle réservation ${latest.reference}',
                body: '${latest.clientFullName} · ${latest.nights} nuits · ${latest.totalPrice} FCFA',
                entityType: 'reservation',
                entityId: latest.id.toString(),
                deepLink: '/reservations/${latest.id}',
                createdAt: DateTime.now(),
              ),
            );
          }
          await LocalCache.setLastSeen('last_seen_resa_id', latest.id);
        }
      }
    } catch (e) {
      if (kDebugMode) {
        print('Polling error: $e');
      }
    }
  }
}
