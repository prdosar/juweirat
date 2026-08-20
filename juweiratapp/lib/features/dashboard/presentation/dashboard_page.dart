import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:juweiratapp/app/theme.dart';
import 'package:juweiratapp/app/di.dart';
import 'package:juweiratapp/core/formatters/formatters.dart';
import 'package:juweiratapp/core/models/dtos.dart';
import 'package:juweiratapp/shared/widgets/shared_widgets.dart';
import 'package:juweiratapp/shared/widgets/main_shell.dart';

final dashboardFutureProvider = FutureProvider.autoDispose((ref) async {
  final repo = ref.watch(dashboardRepositoryProvider);
  final pmsRepo = ref.watch(pmsRepositoryProvider);
  final results = await Future.wait([
    repo.getRooms(),
    repo.getRecentReservations(),
    repo.getClients(),
    pmsRepo.getUnits(),
    pmsRepo.getActiveFolios(),
    pmsRepo.getClotureHistory(limit: 30),
    pmsRepo.getConfig(),
  ]);
  return {
    'rooms': results[0] as List<RoomDto>,
    'reservations': results[1] as List<ReservationDto>,
    'clients': results[2] as List<ClientDto>,
    'units': results[3] as List<UnitDto>,
    'folios': results[4] as List<FolioDto>,
    'history': results[5] as List<ClotureHistoryDto>,
    'config': results[6] as HotelConfigDto,
  };
});

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataAsync = ref.watch(dashboardFutureProvider);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded),
          tooltip: 'Menu latéral',
          onPressed: () => mainScaffoldKey.currentState?.openDrawer(),
        ),
        title: const Text('Tableau de Bord'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => context.push('/notifications'),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(dashboardFutureProvider),
          ),
        ],
      ),
      body: dataAsync.when(
        loading: () => const Padding(
          padding: EdgeInsets.all(16),
          child: Column(
            children: [
              SkeletonLoader(height: 80),
              SizedBox(height: 12),
              SkeletonLoader(height: 80),
              SizedBox(height: 12),
              SkeletonLoader(height: 200),
            ],
          ),
        ),
        error: (err, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Erreur: $err', style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => ref.refresh(dashboardFutureProvider),
                child: const Text('Réessayer'),
              ),
            ],
          ),
        ),
        data: (data) {
          final rooms = data['rooms'] as List<RoomDto>;
          final reservations = data['reservations'] as List<ReservationDto>;
          final clients = data['clients'] as List<ClientDto>;
          final units = data['units'] as List<UnitDto>;
          final folios = data['folios'] as List<FolioDto>;
          final history = data['history'] as List<ClotureHistoryDto>;
          final config = data['config'] as HotelConfigDto;

          // Capacité réelle des chambres / unités
          final totalRooms = units.isNotEmpty ? units.length : rooms.length;
          final hsCount = units.isNotEmpty
              ? units.where((u) => u.horsService).length
              : rooms.where((r) => r.status.toLowerCase() == 'hs' || r.status.toLowerCase() == 'hors service').length;

          final inHouseFolios = folios.where((f) => f.checkedIn && !f.closed).toList();
          final occCount = inHouseFolios.isNotEmpty
              ? inHouseFolios.length
              : (units.isNotEmpty
                  ? units.where((u) => u.currentFolioNumber != null).length
                  : rooms.where((r) => r.status.toLowerCase() == 'occupied' || r.status.toLowerCase() == 'occupé' || r.status.toLowerCase() == 'occupe').length);

          final dispoCount = (totalRooms - occCount - hsCount).clamp(0, totalRooms);

          // Calcul certifié du Taux d'Occupation
          final occPercent = totalRooms > 0 && (totalRooms - hsCount) > 0
              ? ((occCount / (totalRooms - hsCount)) * 100.0)
              : 0.0;

          // Calcul financier certifié (CA Nuitée + Petit-Déjeuner)
          final caHebJour = inHouseFolios.fold<int>(0, (sum, f) => sum + f.rate);
          final caPdjJour = inHouseFolios.fold<int>(0, (sum, f) => sum + (f.pdjParJour * f.pdjPrix));
          final caTotalJour = caHebJour + caPdjJour;
          // Filtrer l'historique pour exclure la date hôtel courante (évite double comptage si déjà clôturée)
          final historyPast = history.where((h) => h.dateHotel != config.dateHotel).toList();
          final caCumulMois = historyPast.fold<int>(0, (sum, h) => sum + h.caTotal) + caTotalJour;

          final displayCa = caCumulMois > 0 ? caCumulMois : caTotalJour;
          final displayCaSubtitle = caCumulMois > 0 ? 'CA mensuel consolidé' : 'CA réalisé aujourd\'hui';

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(dashboardFutureProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Hotel Header Banner
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          config.buildingName.toUpperCase(),
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: JuweiratColors.greenDark, letterSpacing: 0.8),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Date Hôtel : ${frDate(config.dateHotel)}',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: JuweiratColors.charcoal),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDCFCE7),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.verified_rounded, size: 14, color: JuweiratColors.greenDark),
                          SizedBox(width: 4),
                          Text('En direct', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: JuweiratColors.greenDark)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // 4 KPIs Grid
                Row(
                  children: [
                    Expanded(
                      child: StatCard(
                        title: 'Disponibles',
                        value: '$dispoCount / $totalRooms',
                        subtitle: 'chambres libres',
                        icon: Icons.hotel_rounded,
                        iconBg: const Color(0xFFDCFCE7),
                        iconColor: JuweiratColors.greenDark,
                        isVertical: true,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: StatCard(
                        title: 'Occupation',
                        value: '${occPercent.toStringAsFixed(1)}%',
                        subtitle: '$occCount ch. occupée(s)',
                        icon: Icons.pie_chart_rounded,
                        iconBg: const Color(0xFFFEF3C7),
                        iconColor: const Color(0xFFB45309),
                        isVertical: true,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: StatCard(
                        title: 'Réservations',
                        value: '${reservations.length}',
                        subtitle: 'dossiers récents',
                        icon: Icons.calendar_month_rounded,
                        iconBg: const Color(0xFFDBEAFE),
                        iconColor: const Color(0xFF1D4ED8),
                        isVertical: true,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: StatCard(
                        title: 'Chiffre d\'Affaires',
                        value: money(displayCa),
                        subtitle: displayCaSubtitle,
                        icon: Icons.account_balance_wallet_rounded,
                        iconBg: const Color(0xFFF3E8FF),
                        iconColor: const Color(0xFF7E22CE),
                        isVertical: true,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Bandeau d'état synthétique des chambres (Non débordant, responsive)
                JuweiratCard(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 10),
                  child: Row(
                    children: [
                      Expanded(
                        child: _buildStatusColumn('Dispos', '$dispoCount', JuweiratColors.statusSuccessText, const Color(0xFFDCFCE7)),
                      ),
                      Container(width: 1, height: 28, color: JuweiratColors.cardBorder),
                      Expanded(
                        child: _buildStatusColumn('Occupées', '$occCount', const Color(0xFFD97706), const Color(0xFFFEF3C7)),
                      ),
                      Container(width: 1, height: 28, color: JuweiratColors.cardBorder),
                      Expanded(
                        child: _buildStatusColumn('Hors Serv.', '$hsCount', JuweiratColors.statusDangerText, const Color(0xFFFEE2E2)),
                      ),
                      Container(width: 1, height: 28, color: JuweiratColors.cardBorder),
                      Expanded(
                        child: _buildStatusColumn('Clients', '${clients.length}', const Color(0xFF2563EB), const Color(0xFFDBEAFE)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Accès Rapides Hôteliers
                Row(
                  children: [
                    Expanded(
                      child: JuweiratCard(
                        onTap: () => context.push('/pms/journee'),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        child: const Row(
                          children: [
                            Icon(Icons.today_rounded, color: JuweiratColors.green, size: 20),
                            SizedBox(width: 8),
                            Text('Journée PMS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: JuweiratCard(
                        onTap: () => context.push('/pms/folios'),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        child: const Row(
                          children: [
                            Icon(Icons.receipt_long_rounded, color: JuweiratColors.goldLight, size: 20),
                            SizedBox(width: 8),
                            Text('Folios PMS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: JuweiratCard(
                        onTap: () => context.push('/rooms'),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        child: const Row(
                          children: [
                            Icon(Icons.meeting_room_rounded, color: Color(0xFF2563EB), size: 20),
                            SizedBox(width: 8),
                            Text('Chambres & Tarifs', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: JuweiratCard(
                        onTap: () => context.push('/rapports'),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        child: const Row(
                          children: [
                            Icon(Icons.analytics_rounded, color: Color(0xFF7E22CE), size: 20),
                            SizedBox(width: 8),
                            Text('Rapports & Stats', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Dernières Réservations
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Dernières Réservations',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: JuweiratColors.charcoal),
                    ),
                    TextButton(
                      onPressed: () => context.go('/reservations'),
                      child: const Text('Voir tout'),
                    ),
                  ],
                ),
                const SizedBox(height: 4),

                if (reservations.isEmpty)
                  const EmptyState(message: 'Aucune réservation récente')
                else
                  ...reservations.map(
                    (resa) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: JuweiratCard(
                        onTap: () => context.push('/reservations/${resa.id}'),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  resa.reference,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                                StatusBadge(status: resa.status),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              resa.clientFullName,
                              style: const TextStyle(fontSize: 14, color: JuweiratColors.charcoal, fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    '${resa.categoryNameFr} · ${frDate(resa.checkInDate)} → ${frDate(resa.checkOutDate)}',
                                    style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
                                    money(resa.totalPrice),
                                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: JuweiratColors.charcoal),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatusColumn(String label, String value, Color textColor, Color bgColor) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w900,
              color: textColor,
            ),
          ),
        ),
        const SizedBox(height: 4),
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: Color(0xFF6B7280),
            ),
          ),
        ),
      ],
    );
  }
}
