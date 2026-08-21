import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:juweiratapp/app/theme.dart';
import 'package:juweiratapp/app/di.dart';
import 'package:juweiratapp/core/formatters/formatters.dart';
import 'package:juweiratapp/core/models/dtos.dart';
import 'package:juweiratapp/features/pms/statistiques/domain/statistics_calculator.dart';
import 'package:juweiratapp/shared/widgets/shared_widgets.dart';
import 'package:juweiratapp/core/services/export_service.dart';
import 'package:juweiratapp/shared/widgets/main_shell.dart';

final statsDataProvider = FutureProvider.autoDispose((ref) async {
  final pmsRepo = ref.watch(pmsRepositoryProvider);
  final resaRepo = ref.watch(reservationRepositoryProvider);

  HotelConfigDto? config;
  List<ClotureHistoryDto> history = [];
  List<DebiteurDto> debiteurs = [];
  List<FolioDto> folios = [];
  List<UnitDto> units = [];
  List<ReservationDto> reservations = [];

  try { config = await pmsRepo.getConfig(); } catch (_) {}
  try { history = await pmsRepo.getClotureHistory(); } catch (_) {}
  try { debiteurs = await pmsRepo.getDebiteurs(); } catch (_) {}
  try { folios = await pmsRepo.getActiveFolios(); } catch (_) {}
  try { units = await pmsRepo.getUnits(); } catch (_) {}
  try {
    final paged = await resaRepo.getPaged(pageSize: 100, isDescending: false);
    reservations = paged.items;
  } catch (_) {}

  return {
    'config': config ??
        const HotelConfigDto(
          id: 1,
          buildingName: 'Résidence Juweirat',
          ownerName: 'Saka Tidjani',
          city: 'Cotonou',
          currencyCode: 'XOF',
          currencyDecimals: 0,
          dateHotel: '',
          resaSeq: 0,
          factureSeq: 0,
        ),
    'history': history,
    'debiteurs': debiteurs,
    'folios': folios,
    'units': units,
    'reservations': reservations,
  };
});

class StatistiquesPage extends ConsumerStatefulWidget {
  const StatistiquesPage({super.key});

  @override
  ConsumerState<StatistiquesPage> createState() => _StatistiquesPageState();
}

class _StatistiquesPageState extends ConsumerState<StatistiquesPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _forecastHorizon = 0; // 0: 30 Jours, 1: 3 Mois, 2: 12 Mois

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final statsAsync = ref.watch(statsDataProvider);

    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu_rounded),
            tooltip: 'Menu latéral',
            onPressed: () => mainScaffoldKey.currentState?.openDrawer(),
          ),
        ),
        title: const Text('Rapports & Statistiques'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(statsDataProvider),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: JuweiratColors.green,
          unselectedLabelColor: const Color(0xFF9CA3AF),
          indicatorColor: JuweiratColors.green,
          indicatorWeight: 3,
          tabs: const [
            Tab(text: 'Feuille de Journée'),
            Tab(text: 'Forecast & Prévisions'),
            Tab(text: 'Règlements & Créances'),
            Tab(text: 'Vue Mensuelle'),
          ],
        ),
      ),
      body: statsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Erreur: $err', style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => ref.refresh(statsDataProvider),
                child: const Text('Réessayer'),
              ),
            ],
          ),
        ),
        data: (data) {
          final config = data['config'] as HotelConfigDto;
          final history = data['history'] as List<ClotureHistoryDto>;
          final debiteurs = data['debiteurs'] as List<DebiteurDto>;
          final folios = data['folios'] as List<FolioDto>;
          final units = data['units'] as List<UnitDto>;
          final reservations = data['reservations'] as List<ReservationDto>;

          return TabBarView(
            controller: _tabController,
            children: [
              _buildFeuilleJourneeTab(config, folios, units, history),
              _buildPrevisionnelTab(config, units, folios, history, reservations),
              _buildReglementsTab(debiteurs, folios),
              _buildVueMensuelleTab(history),
            ],
          );
        },
      ),
    );
  }

  // ── Tab 1: Feuille de Journée ───────────────────────────────────────────────
  Widget _buildFeuilleJourneeTab(
    HotelConfigDto config,
    List<FolioDto> folios,
    List<UnitDto> units,
    List<ClotureHistoryDto> history,
  ) {
    final totalUnits = units.length;
    final hsUnits = units.where((u) => u.horsService).length;
    final presents = folios.where((f) => f.checkedIn && !f.closed).toList();
    final occRooms = presents.length;
    final totalPax = presents.fold<int>(0, (sum, f) => sum + f.pax);

    final caHebJour = presents.fold<int>(0, (sum, f) => sum + f.rate);
    final caPdjJour = presents.fold<int>(0, (sum, f) => sum + (f.pdjParJour * f.pdjPrix));
    final caTotalJour = caHebJour + caPdjJour;

    // Formules statistiques certifiées
    final to = StatisticsCalculator.calculateOccupancyRate(
      occupiedRooms: occRooms,
      totalRooms: totalUnits,
      outOfServiceRooms: hsUnits,
    );
    final adr = StatisticsCalculator.calculateADR(
      caHebergement: caHebJour,
      occupiedRooms: occRooms,
    );
    final revpar = StatisticsCalculator.calculateRevPAR(
      caHebergement: caHebJour,
      totalRooms: totalUnits,
      outOfServiceRooms: hsUnits,
    );
    final revpac = StatisticsCalculator.calculateREVPAC(
      caTotal: caTotalJour,
      occupantsPax: totalPax,
    );

    // Cumuls consolidés — exclure la date hôtel courante de l'historique pour éviter le double comptage
    final historyPast = history.where((h) => h.dateHotel != config.dateHotel).toList();
    final caHebMois = historyPast.fold<int>(0, (sum, h) => sum + h.caHeb) + caHebJour;
    final caPdjMois = historyPast.fold<int>(0, (sum, h) => sum + h.caPdj) + caPdjJour;
    final caTotalMois = historyPast.fold<int>(0, (sum, h) => sum + h.caTotal) + caTotalJour;

    return RefreshIndicator(
      onRefresh: () async => ref.refresh(statsDataProvider),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Ratios de Performance Hôtelière', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  Text('Date Hôtel : ${frDate(config.dateHotel)}', style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.share_outlined, color: JuweiratColors.greenDark),
                tooltip: 'Exporter CSV',
                onPressed: () {
                  ExportService.shareCsv(
                    fileName: 'feuille_journee_${config.dateHotel}.csv',
                    csvContent: 'Indicateur,Valeur\n'
                        'Taux Occupation,${percent(to)}\n'
                        'ADR (Prix Moyen),${adr.toInt()}\n'
                        'RevPAR,${revpar.toInt()}\n'
                        'REVPAC,${revpac.toInt()}\n'
                        'CA Hebergement Jour,$caHebJour\n'
                        'CA Petit Dejeuner Jour,$caPdjJour\n'
                        'CA Total Jour,$caTotalJour\n'
                        'CA Total Mois Consolide,$caTotalMois\n',
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 12),

          // 4 KPIs Ratios
          Row(
            children: [
              Expanded(
                child: StatCard(
                  title: 'Taux Occupation',
                  value: percent(to),
                  subtitle: '$occRooms / $totalUnits chambres',
                  icon: Icons.pie_chart_outline_rounded,
                  iconBg: const Color(0xFFDBEAFE),
                  iconColor: const Color(0xFF1D4ED8),
                  isVertical: true,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: StatCard(
                  title: 'ADR (Prix Moyen)',
                  value: money(adr.toInt()),
                  subtitle: 'par ch. louée',
                  icon: Icons.trending_up_rounded,
                  iconBg: const Color(0xFFDCFCE7),
                  iconColor: JuweiratColors.greenDark,
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
                  title: 'RevPAR',
                  value: money(revpar.toInt()),
                  subtitle: 'revenu / dispo',
                  icon: Icons.show_chart_rounded,
                  iconBg: const Color(0xFFFEF3C7),
                  iconColor: const Color(0xFFB45309),
                  isVertical: true,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: StatCard(
                  title: 'REVPAC',
                  value: money(revpac.toInt()),
                  subtitle: 'revenu / client',
                  icon: Icons.people_outline_rounded,
                  iconBg: const Color(0xFFFAF5FF),
                  iconColor: const Color(0xFF7E22CE),
                  isVertical: true,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Tableau Comparatif Financier Haute Visibilité
          JuweiratCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Synthèse Financière (Chiffre d\'Affaires)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(4)),
                      child: const Text('Journée vs Cumul', style: TextStyle(fontSize: 10, color: Color(0xFF6B7280))),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                _buildAmountRow('CA Hébergement', caHebJour, caHebMois),
                _buildAmountRow('CA Petit-Déjeuner', caPdjJour, caPdjMois),
                const Divider(height: 18, color: JuweiratColors.cardBorder),
                _buildAmountRow('CA TOTAL RÉALISÉ', caTotalJour, caTotalMois, isBold: true),
                const SizedBox(height: 4),
                _buildTextMetricRow('Nuitées Réalisées', '$occRooms', '${historyPast.fold<int>(0, (sum, h) => sum + h.occ) + occRooms}'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Tab 2: Forecast & Prévisions Métier (Vue Directeur & Yield Management) ───
  Widget _buildPrevisionnelTab(
    HotelConfigDto config,
    List<UnitDto> units,
    List<FolioDto> folios,
    List<ClotureHistoryDto> history,
    List<ReservationDto> reservations,
  ) {
    final totalUnits = units.isNotEmpty ? units.length : 20;
    final systemDate = DateTime.tryParse(config.dateHotel) ?? DateTime.now();

    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Tarif moyen de référence par nuit calculé dynamiquement
    final avgUnitRate = units.isNotEmpty
        ? (units.fold<int>(0, (sum, u) => sum + (u.tarifNuit > 0 ? u.tarifNuit : 0)) / units.length).round()
        : 0;
    final avgFolioRate = folios.isNotEmpty
        ? (folios.fold<int>(0, (sum, f) => sum + f.rate) / folios.length).round()
        : 0;
    final avgHistoryRate = history.isNotEmpty
        ? (history.fold<int>(0, (sum, h) => sum + h.pm) / history.length).round()
        : 0;

    final basePrice = avgUnitRate > 0
        ? avgUnitRate
        : (avgFolioRate > 0 ? avgFolioRate : (avgHistoryRate > 0 ? avgHistoryRate : 45000));

    final baselineOcc = history.isNotEmpty
        ? ((history.fold<double>(0, (sum, h) => sum + h.occupation) / history.length) / 100.0).clamp(0.1, 1.0)
        : 0.65;

    // Réservations actives non annulées
    final activeResas = reservations.where((r) => r.status.toLowerCase() != 'cancelled').toList();

    // ── 1. Métriques Horizon 30 Jours ─────────────────────────────────────────
    final end30d = systemDate.add(const Duration(days: 30));
    final resas30d = activeResas.where((r) {
      final cin = DateTime.tryParse(r.checkInDate);
      final cout = DateTime.tryParse(r.checkOutDate);
      if (cin == null || cout == null) return false;
      return cin.isBefore(end30d) && cout.isAfter(systemDate);
    }).toList();

    final nuitsOtb30d = resas30d.fold<int>(0, (sum, r) => sum + r.nights);
    final caOtb30d = resas30d.fold<int>(0, (sum, r) => sum + r.totalPrice);
    final paidOtb30d = resas30d.fold<int>(0, (sum, r) => sum + r.amountPaid);
    final dueOtb30d = resas30d.fold<int>(0, (sum, r) => sum + (r.amountDue > 0 ? r.amountDue : (r.totalPrice - r.amountPaid)));
    final capacityNights30d = totalUnits * 30;
    final toOtb30d = (nuitsOtb30d / (capacityNights30d > 0 ? capacityNights30d : 1)).clamp(0.0, 1.0);
    final targetBudget30d = (capacityNights30d * baselineOcc * basePrice).round();
    final adrOtb30d = nuitsOtb30d > 0 ? (caOtb30d / nuitsOtb30d).round() : basePrice;

    // ── 2. Métriques Horizon 3 Mois (Trimestre) ──────────────────────────────
    final end3m = systemDate.add(const Duration(days: 90));
    final resas3m = activeResas.where((r) {
      final cin = DateTime.tryParse(r.checkInDate);
      final cout = DateTime.tryParse(r.checkOutDate);
      if (cin == null || cout == null) return false;
      return cin.isBefore(end3m) && cout.isAfter(systemDate);
    }).toList();

    final nuitsOtb3m = resas3m.fold<int>(0, (sum, r) => sum + r.nights);
    final caOtb3m = resas3m.fold<int>(0, (sum, r) => sum + r.totalPrice);
    final paidOtb3m = resas3m.fold<int>(0, (sum, r) => sum + r.amountPaid);
    final dueOtb3m = resas3m.fold<int>(0, (sum, r) => sum + (r.amountDue > 0 ? r.amountDue : (r.totalPrice - r.amountPaid)));
    final capacityNights3m = totalUnits * 90;
    final toOtb3m = (nuitsOtb3m / (capacityNights3m > 0 ? capacityNights3m : 1)).clamp(0.0, 1.0);
    final targetBudget3m = (capacityNights3m * baselineOcc * basePrice).round();
    final adrOtb3m = nuitsOtb3m > 0 ? (caOtb3m / nuitsOtb3m).round() : basePrice;

    // ── 3. Métriques Horizon 12 Mois (Annuel) ────────────────────────────────
    final monthlyData = List.generate(months.length, (index) {
      final isHighSeason = index == 0 || index == 1 || index == 6 || index == 7 || index == 10 || index == 11;
      final occRate = (isHighSeason ? baselineOcc * 1.15 : baselineOcc * 0.88).clamp(0.05, 0.98);
      final days = monthDays[index];
      final nuits = (totalUnits * days * occRate).round();
      final caMonth = nuits * basePrice;

      return {
        'month': months[index],
        'index': index + 1,
        'isHighSeason': isHighSeason,
        'occRate': occRate,
        'days': days,
        'nuits': nuits,
        'ca': caMonth,
      };
    });
    final totalCa12m = monthlyData.fold<int>(0, (sum, m) => sum + (m['ca'] as int));

    // Sélection des valeurs selon l'horizon actif
    final currentResas = _forecastHorizon == 0 ? resas30d : (_forecastHorizon == 1 ? resas3m : activeResas);
    final currentCaOtb = _forecastHorizon == 0 ? caOtb30d : (_forecastHorizon == 1 ? caOtb3m : caOtb3m);
    final currentPaid = _forecastHorizon == 0 ? paidOtb30d : (_forecastHorizon == 1 ? paidOtb3m : 0);
    final currentTargetBudget = _forecastHorizon == 0 ? targetBudget30d : (_forecastHorizon == 1 ? targetBudget3m : totalCa12m);
    final currentDue = _forecastHorizon == 0 ? dueOtb30d : dueOtb3m;
    final currentToOtb = _forecastHorizon == 0 ? toOtb30d : (_forecastHorizon == 1 ? toOtb3m : baselineOcc);
    final currentAdr = _forecastHorizon == 0 ? adrOtb30d : (_forecastHorizon == 1 ? adrOtb3m : basePrice);
    final currentNuits = _forecastHorizon == 0 ? nuitsOtb30d : (_forecastHorizon == 1 ? nuitsOtb3m : (totalUnits * 365 * baselineOcc).round());

    // Mix de ventes (Courts vs Longs Séjours & Sources)
    final longStays = currentResas.where((r) => r.nights >= 15).toList();
    final shortStays = currentResas.where((r) => r.nights < 15).toList();
    final longStaysCa = longStays.fold<int>(0, (sum, r) => sum + r.totalPrice);
    final shortStaysCa = shortStays.fold<int>(0, (sum, r) => sum + r.totalPrice);

    final webCount = currentResas.where((r) => (r.source ?? '').toLowerCase() == 'website').length;
    final directCount = currentResas.where((r) => (r.source ?? '').toLowerCase() == 'direct' || (r.source ?? '').isEmpty).length;
    final corporateCount = currentResas.where((r) => (r.source ?? '').toLowerCase() == 'corporate' || (r.source ?? '').toLowerCase() == 'societe').length;

    final horizonLabel = _forecastHorizon == 0 ? '30 Jours' : (_forecastHorizon == 1 ? '3 Mois' : '12 Mois');
    final progressPct = currentTargetBudget > 0 ? (currentCaOtb / currentTargetBudget).clamp(0.0, 1.0) : 0.0;

    return RefreshIndicator(
      onRefresh: () async => ref.refresh(statsDataProvider),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Horizon Selector Chips ────────────────────────────────────────
          Row(
            children: [
              _buildHorizonChip(0, '30 Jours (Court Terme)', Icons.today_rounded),
              const SizedBox(width: 8),
              _buildHorizonChip(1, '3 Mois (Trimestre)', Icons.date_range_rounded),
              const SizedBox(width: 8),
              _buildHorizonChip(2, 'Budget 12 Mois', Icons.calendar_month_rounded),
            ],
          ),
          const SizedBox(height: 16),

          // ── Executive Forecast & OTB Card ─────────────────────────────────
          JuweiratCard(
            color: JuweiratColors.charcoal,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'CARNET DE COMMANDES & FORECAST ($horizonLabel)',
                      style: const TextStyle(
                        color: JuweiratColors.goldLight,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.8,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: progressPct >= 0.6 ? JuweiratColors.greenDark : const Color(0xFFD97706),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${(progressPct * 100).toStringAsFixed(0)}% sécurisé',
                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                Text(
                  _forecastHorizon == 2 ? money(totalCa12m) : money(currentCaOtb),
                  style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 2),
                Text(
                  _forecastHorizon == 2
                      ? 'Objectif budgétaire annuel sur $totalUnits appartements'
                      : 'CA Déjà Sécurisé (OTB) · Objectif Cible : ${money(currentTargetBudget)}',
                  style: const TextStyle(color: Color(0xFFD1D5DB), fontSize: 12),
                ),
                const SizedBox(height: 12),

                // Barre de progression
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progressPct,
                    minHeight: 6,
                    backgroundColor: const Color(0xFF374151),
                    valueColor: const AlwaysStoppedAnimation(JuweiratColors.goldLight),
                  ),
                ),
                const SizedBox(height: 12),

                // Cash flow futur
                if (_forecastHorizon != 2)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1F2937),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Acomptes déjà perçus :', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 10)),
                            Text(money(currentPaid), style: const TextStyle(color: Color(0xFF34D399), fontWeight: FontWeight.bold, fontSize: 12)),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text('Soldes à encaisser aux check-ins :', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 10)),
                            Text(money(currentDue), style: const TextStyle(color: JuweiratColors.goldLight, fontWeight: FontWeight.bold, fontSize: 12)),
                          ],
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── 4 KPIs Décisionnels pour le Directeur ──────────────────────────
          Row(
            children: [
              Expanded(
                child: StatCard(
                  title: 'Remplissage OTB',
                  value: percent(currentToOtb * 100),
                  subtitle: '$currentNuits nuits vendues',
                  icon: Icons.pie_chart_rounded,
                  iconBg: const Color(0xFFDBEAFE),
                  iconColor: const Color(0xFF1D4ED8),
                  isVertical: true,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: StatCard(
                  title: 'ADR Prévisionnel',
                  value: money(currentAdr),
                  subtitle: 'par nuit vendue',
                  icon: Icons.trending_up_rounded,
                  iconBg: const Color(0xFFDCFCE7),
                  iconColor: JuweiratColors.greenDark,
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
                  title: 'Dossiers Confirmés',
                  value: '${currentResas.length}',
                  subtitle: 'réservations actives',
                  icon: Icons.book_online_rounded,
                  iconBg: const Color(0xFFFEF3C7),
                  iconColor: const Color(0xFFB45309),
                  isVertical: true,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: StatCard(
                  title: 'Longs Séjours',
                  value: '${longStays.length}',
                  subtitle: 'socle N15 / N30',
                  icon: Icons.apartment_rounded,
                  iconBg: const Color(0xFFFAF5FF),
                  iconColor: const Color(0xFF7E22CE),
                  isVertical: true,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // ── Yield Management & Recommandations Stratégiques ───────────────
          _buildYieldRecommendationCard(currentToOtb, horizonLabel),
          const SizedBox(height: 16),

          // ── Mix de Ventes & Segments de Clientèle ─────────────────────────
          _buildSalesMixCard(
            shortStayCount: shortStays.length,
            shortStayCa: shortStaysCa,
            longStayCount: longStays.length,
            longStayCa: longStaysCa,
            totalCa: currentCaOtb > 0 ? currentCaOtb : 1,
            webCount: webCount,
            directCount: directCount,
            corporateCount: corporateCount,
          ),
          const SizedBox(height: 16),

          // ── Détail / Grille selon l'Horizon ────────────────────────────────
          if (_forecastHorizon == 0) ...[
            const Text('Découpage Hebdomadaire (30 Jours)', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            _buildWeeklyBreakdown(systemDate, totalUnits, resas30d, basePrice),
          ] else if (_forecastHorizon == 1) ...[
            const Text('Comparatif Trimestriel (M, M+1, M+2)', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            _buildQuarterlyBreakdown(systemDate, totalUnits, resas3m, basePrice, baselineOcc),
          ] else ...[
            const Text('Grille Budgétaire 12 Mois', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            _build12MonthGrid(monthlyData),
          ],
        ],
      ),
    );
  }

  Widget _buildHorizonChip(int index, String label, IconData icon) {
    final isSelected = _forecastHorizon == index;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _forecastHorizon = index),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSelected ? JuweiratColors.charcoal : Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: isSelected ? JuweiratColors.charcoal : const Color(0xFFE5E7EB)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 14, color: isSelected ? JuweiratColors.goldLight : const Color(0xFF6B7280)),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    color: isSelected ? Colors.white : const Color(0xFF4B5563),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildYieldRecommendationCard(double currentOcc, String horizonLabel) {
    final isHigh = currentOcc >= 0.75;
    final isLow = currentOcc < 0.35;

    final Color cardBg = isHigh
        ? const Color(0xFFFEF2F2)
        : (isLow ? const Color(0xFFFFFBEB) : const Color(0xFFF0FDF4));
    final Color borderColor = isHigh
        ? const Color(0xFFFCA5A5)
        : (isLow ? const Color(0xFFFDE68A) : const Color(0xFFBBF7D0));
    final Color iconColor = isHigh
        ? const Color(0xFFDC2626)
        : (isLow ? const Color(0xFFD97706) : JuweiratColors.greenDark);
    final IconData icon = isHigh
        ? Icons.trending_up_rounded
        : (isLow ? Icons.campaign_rounded : Icons.check_circle_outline_rounded);

    final String title = isHigh
        ? 'YIELD : FORTE TENSION & DEMANDE ÉLEVÉE ($horizonLabel)'
        : (isLow
            ? 'YIELD : OPPORTUNITÉ COMMERCIALE ($horizonLabel)'
            : 'YIELD : RYTHME DE REMPLISSAGE CONFORME ($horizonLabel)');

    final String recommendation = isHigh
        ? 'Le carnet de commandes est déjà rempli à ${(currentOcc * 100).toStringAsFixed(1)}%. Recommandation DG : Majorer les tarifs de 10% à 15% sur les derniers appartements disponibles et imposer un minimum de séjour de 2 nuitées.'
        : (isLow
            ? 'Le taux d\'occupation réservé est à ${(currentOcc * 100).toStringAsFixed(1)}%. Recommandation DG : Relancer les comptes sociétés partenaires (Corporate) et pousser une offre préférentielle long séjour sur le site web.'
            : 'Le taux d\'occupation réservé est à ${(currentOcc * 100).toStringAsFixed(1)}%, parfaitement aligné avec la trajectoire budgétaire. Maintenir la politique tarifaire standard.');

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: iconColor,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  recommendation,
                  style: TextStyle(
                    fontSize: 12,
                    color: isHigh
                        ? const Color(0xFF7F1D1D)
                        : (isLow ? const Color(0xFF78350F) : const Color(0xFF14532D)),
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSalesMixCard({
    required int shortStayCount,
    required int shortStayCa,
    required int longStayCount,
    required int longStayCa,
    required int totalCa,
    required int webCount,
    required int directCount,
    required int corporateCount,
  }) {
    final shortStayPct = totalCa > 0 ? (shortStayCa / totalCa * 100).toStringAsFixed(0) : '0';
    final longStayPct = totalCa > 0 ? (longStayCa / totalCa * 100).toStringAsFixed(0) : '0';

    return JuweiratCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Mix de Ventes & Segments de Clientèle',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: JuweiratColors.charcoal),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildMixColumn(
                  title: 'Courts Séjours (<15j)',
                  count: shortStayCount,
                  ca: shortStayCa,
                  badge: '$shortStayPct% CA',
                  badgeColor: const Color(0xFFDBEAFE),
                  textColor: const Color(0xFF1D4ED8),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMixColumn(
                  title: 'Longs Séjours (≥15j/30j)',
                  count: longStayCount,
                  ca: longStayCa,
                  badge: '$longStayPct% CA',
                  badgeColor: const Color(0xFFDCFCE7),
                  textColor: JuweiratColors.greenDark,
                ),
              ),
            ],
          ),
          const Divider(height: 20, color: JuweiratColors.cardBorder),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildSourceTag('Site Web', webCount, Icons.language_rounded, const Color(0xFF1D4ED8)),
              _buildSourceTag('Direct / Tél', directCount, Icons.phone_in_talk_rounded, JuweiratColors.greenDark),
              _buildSourceTag('Corporate', corporateCount, Icons.business_rounded, const Color(0xFF7E22CE)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMixColumn({
    required String title,
    required int count,
    required int ca,
    required String badge,
    required Color badgeColor,
    required Color textColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(child: Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF374151)))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(color: badgeColor, borderRadius: BorderRadius.circular(4)),
                child: Text(badge, style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: textColor)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(money(ca), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: JuweiratColors.charcoal)),
          Text('$count dossier${count > 1 ? "s" : ""}', style: const TextStyle(fontSize: 10, color: Color(0xFF6B7280))),
        ],
      ),
    );
  }

  Widget _buildSourceTag(String label, int count, IconData icon, Color color) {
    return Row(
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text('$label : ', style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
        Text('$count', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: JuweiratColors.charcoal)),
      ],
    );
  }

  // ── Grille 30 Jours par Semaines ──────────────────────────────────────────
  Widget _buildWeeklyBreakdown(DateTime systemDate, int totalUnits, List<ReservationDto> resas, int basePrice) {
    final weeks = List.generate(4, (w) {
      final wStart = systemDate.add(Duration(days: w * 7));
      final wEnd = systemDate.add(Duration(days: (w + 1) * 7));
      final wResas = resas.where((r) {
        final cin = DateTime.tryParse(r.checkInDate);
        final cout = DateTime.tryParse(r.checkOutDate);
        if (cin == null || cout == null) return false;
        return cin.isBefore(wEnd) && cout.isAfter(wStart);
      }).toList();

      final nuits = wResas.fold<int>(0, (sum, r) => sum + r.nights);
      final ca = wResas.fold<int>(0, (sum, r) => sum + r.totalPrice);
      final capNights = totalUnits * 7;
      final to = (nuits / (capNights > 0 ? capNights : 1)).clamp(0.0, 1.0);

      return {
        'week': 'Semaine ${w + 1}',
        'dates': '${frDate(wStart.toIso8601String())} au ${frDate(wEnd.toIso8601String())}',
        'nuits': nuits,
        'ca': ca,
        'to': to,
      };
    });

    return JuweiratCard(
      padding: EdgeInsets.zero,
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: weeks.length,
        separatorBuilder: (_, __) => const Divider(height: 1, color: JuweiratColors.cardBorder),
        itemBuilder: (context, index) {
          final w = weeks[index];
          final to = w['to'] as double;
          final isHigh = to >= 0.75;
          final isLow = to < 0.35;

          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: isHigh ? const Color(0xFFFEF2F2) : (isLow ? const Color(0xFFFFFBEB) : const Color(0xFFF0FDF4)),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text('S${index + 1}', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: isHigh ? Colors.red : (isLow ? Colors.amber[800] : JuweiratColors.greenDark))),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(w['week'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: JuweiratColors.charcoal)),
                      Text('${w['dates']} · TO: ${(to * 100).toStringAsFixed(0)}%', style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                    ],
                  ),
                ),
                Text(money(w['ca'] as int), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: JuweiratColors.greenDark)),
              ],
            ),
          );
        },
      ),
    );
  }

  // ── Grille 3 Mois ─────────────────────────────────────────────────────────
  Widget _buildQuarterlyBreakdown(DateTime systemDate, int totalUnits, List<ReservationDto> resas, int basePrice, double baselineOcc) {
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    final qMonths = List.generate(3, (mIdx) {
      final mDate = DateTime(systemDate.year, systemDate.month + mIdx, 1);
      final nextMDate = DateTime(mDate.year, mDate.month + 1, 1);
      final daysInM = nextMDate.difference(mDate).inDays;

      final mResas = resas.where((r) {
        final cin = DateTime.tryParse(r.checkInDate);
        final cout = DateTime.tryParse(r.checkOutDate);
        if (cin == null || cout == null) return false;
        return cin.isBefore(nextMDate) && cout.isAfter(mDate);
      }).toList();

      final nuits = mResas.fold<int>(0, (sum, r) => sum + r.nights);
      final ca = mResas.fold<int>(0, (sum, r) => sum + r.totalPrice);
      final capNights = totalUnits * daysInM;
      final to = (nuits / (capNights > 0 ? capNights : 1)).clamp(0.0, 1.0);
      final target = (capNights * baselineOcc * basePrice).round();

      return {
        'name': monthNames[mDate.month - 1],
        'year': mDate.year,
        'nuits': nuits,
        'ca': ca,
        'target': target,
        'to': to,
      };
    });

    return JuweiratCard(
      padding: EdgeInsets.zero,
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: qMonths.length,
        separatorBuilder: (_, __) => const Divider(height: 1, color: JuweiratColors.cardBorder),
        itemBuilder: (context, index) {
          final m = qMonths[index];
          final to = m['to'] as double;

          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${m['name']} ${m['year']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: JuweiratColors.charcoal)),
                      const SizedBox(height: 2),
                      Text('TO Acquis : ${(to * 100).toStringAsFixed(1)}% · ${m['nuits']} nuits', style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(money(m['ca'] as int), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: JuweiratColors.greenDark)),
                    Text('Cible : ${money(m['target'] as int)}', style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF))),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ── Grille 12 Mois ────────────────────────────────────────────────────────
  Widget _build12MonthGrid(List<Map<String, dynamic>> monthlyData) {
    return JuweiratCard(
      padding: EdgeInsets.zero,
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: monthlyData.length,
        separatorBuilder: (_, __) => const Divider(height: 1, color: JuweiratColors.cardBorder),
        itemBuilder: (context, index) {
          final m = monthlyData[index];
          final isHigh = m['isHighSeason'] as bool;
          final occRate = m['occRate'] as double;
          final nuits = m['nuits'] as int;
          final caMonth = m['ca'] as int;

          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: isHigh ? const Color(0xFFFEF3C7) : const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${index + 1}',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: isHigh ? const Color(0xFFB45309) : const Color(0xFF4B5563),
                      fontSize: 13,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(m['month'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: JuweiratColors.charcoal)),
                      Text('TO est. ${(occRate * 100).toStringAsFixed(1)}% · $nuits nuits', style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                    ],
                  ),
                ),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerRight,
                  child: Text(
                    money(caMonth),
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 14,
                      color: JuweiratColors.greenDark,
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

  // ── Tab 3: Règlements & Créances ───────────────────────────────────────────
  Widget _buildReglementsTab(List<DebiteurDto> debiteurs, List<FolioDto> folios) {
    final totalDebiteurs = debiteurs.fold<int>(0, (sum, d) => sum + d.solde);
    final totalFoliosSolde = folios.fold<int>(0, (sum, f) => sum + f.solde);
    final totalEncaisse = folios.fold<int>(0, (sum, f) => sum + f.paid)
        + debiteurs.where((d) => d.folioId == null).fold<int>(0, (sum, d) => sum + d.paid);
    final totalFacture = folios.fold<int>(0, (sum, f) => sum + f.totalGeneral)
        + debiteurs.where((d) => d.folioId == null).fold<int>(0, (sum, d) => sum + d.amount);

    final recoveryRate = StatisticsCalculator.calculateRecoveryRate(
      totalPaid: totalEncaisse,
      totalInvoiced: totalFacture > 0 ? totalFacture : 1,
    );

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Recovery Card
        JuweiratCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Taux Global de Recouvrement', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  StatusBadge(status: recoveryRate >= 90 ? 'Excellent' : 'À Suivre'),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: LinearProgressIndicator(
                      value: (recoveryRate / 100).clamp(0.0, 1.0),
                      backgroundColor: const Color(0xFFE5E7EB),
                      valueColor: const AlwaysStoppedAnimation(JuweiratColors.green),
                      minHeight: 10,
                      borderRadius: BorderRadius.circular(5),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    percent(recoveryRate),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: JuweiratColors.charcoal),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Amounts Summary
        JuweiratCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Synthèse Encaissée vs Créances En Cours', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 12),
              _buildAmountRow('Total Encaissé / Réglé', totalEncaisse, null, isBold: true, color: JuweiratColors.greenDark),
              _buildAmountRow('Créances Débiteurs Clients', totalDebiteurs, null, isBold: false, color: const Color(0xFFB45309)),
              _buildAmountRow('Soldes Folios Non Réglés', totalFoliosSolde, null, isBold: false, color: JuweiratColors.statusDangerText),
              const Divider(height: 18, color: JuweiratColors.cardBorder),
              _buildAmountRow('TOTAL FACTURÉ CONSOLIDÉ', totalFacture, null, isBold: true),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Liste des Débiteurs
        const Text('Dossiers Débiteurs en Attente', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),

        if (debiteurs.isEmpty)
          const EmptyState(message: 'Aucune créance débiteur enregistrée', icon: Icons.check_circle_outline_rounded)
        else
          ...debiteurs.map(
            (d) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: JuweiratCard(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(d.client, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          const SizedBox(height: 2),
                          Text(
                            '${d.label} · Échéance: ${frDate(d.dueDate)}',
                            style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        money(d.solde),
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 14,
                          color: JuweiratColors.statusDangerText,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  // ── Tab 4: Vue Mensuelle ───────────────────────────────────────────────────
  Widget _buildVueMensuelleTab(List<ClotureHistoryDto> history) {
    if (history.isEmpty) {
      return const EmptyState(
        message: 'Aucun historique de clôture mensuelle disponible pour l\'instant',
        icon: Icons.history_rounded,
      );
    }

    final totalCaClotures = history.fold<int>(0, (sum, h) => sum + h.caTotal);
    final avgOccupancy = history.isNotEmpty
        ? history.fold<double>(0, (sum, h) => sum + h.occupation) / history.length
        : 0.0;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Monthly Summary Banner
        JuweiratCard(
          color: JuweiratColors.charcoal,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'HISTORIQUE CONSOLIDÉ DES CLÔTURES',
                style: TextStyle(color: JuweiratColors.goldLight, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8),
              ),
              const SizedBox(height: 8),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  money(totalCaClotures),
                  style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${history.length} journée(s) clôturée(s) · Taux d\'occupation moyen : ${percent(avgOccupancy)}',
                style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        const Text('Journal Quotidien des Clôtures', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),

        JuweiratCard(
          padding: EdgeInsets.zero,
          child: ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: history.length,
            separatorBuilder: (_, __) => const Divider(height: 1, color: JuweiratColors.cardBorder),
            itemBuilder: (context, index) {
              final h = history[index];
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF3F4F6),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.receipt_rounded, color: JuweiratColors.charcoal, size: 18),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            frDate(h.dateHotel),
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: JuweiratColors.charcoal),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'TO: ${percent(h.occupation)} · ${h.occ} ch. occ · RevPAR: ${money(h.revPar)}',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                          ),
                        ],
                      ),
                    ),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerRight,
                      child: Text(
                        money(h.caTotal),
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: JuweiratColors.charcoal),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // ── Helper Table Rows with Auto-Scaling FittedBox ──────────────────────────
  Widget _buildAmountRow(String label, num dayVal, num? monthVal, {bool isBold = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            flex: 4,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
                color: isBold ? JuweiratColors.charcoal : const Color(0xFF4B5563),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 3,
            child: Align(
              alignment: Alignment.centerRight,
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  money(dayVal),
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: isBold ? FontWeight.w900 : FontWeight.w600,
                    color: color ?? (isBold ? JuweiratColors.charcoal : const Color(0xFF1F2937)),
                  ),
                ),
              ),
            ),
          ),
          if (monthVal != null) ...[
            const SizedBox(width: 12),
            Expanded(
              flex: 4,
              child: Align(
                alignment: Alignment.centerRight,
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    money(monthVal),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: isBold ? FontWeight.w900 : FontWeight.w600,
                      color: JuweiratColors.greenDark,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTextMetricRow(String label, String dayVal, String monthVal) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            flex: 4,
            child: Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF4B5563))),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 3,
            child: Align(
              alignment: Alignment.centerRight,
              child: Text(dayVal, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 4,
            child: Align(
              alignment: Alignment.centerRight,
              child: Text(monthVal, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: JuweiratColors.greenDark)),
            ),
          ),
        ],
      ),
    );
  }
}
