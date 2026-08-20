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
  final repo = ref.watch(pmsRepositoryProvider);
  final results = await Future.wait([
    repo.getConfig(),
    repo.getClotureHistory(),
    repo.getDebiteurs(),
    repo.getActiveFolios(),
    repo.getUnits(),
  ]);
  return {
    'config': results[0] as HotelConfigDto,
    'history': results[1] as List<ClotureHistoryDto>,
    'debiteurs': results[2] as List<DebiteurDto>,
    'folios': results[3] as List<FolioDto>,
    'units': results[4] as List<UnitDto>,
  };
});

class StatistiquesPage extends ConsumerStatefulWidget {
  const StatistiquesPage({super.key});

  @override
  ConsumerState<StatistiquesPage> createState() => _StatistiquesPageState();
}

class _StatistiquesPageState extends ConsumerState<StatistiquesPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;

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
            Tab(text: 'Prévisionnel 12M'),
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

          return TabBarView(
            controller: _tabController,
            children: [
              _buildFeuilleJourneeTab(config, folios, units, history),
              _buildPrevisionnelTab(config, units, folios, history),
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

  // ── Tab 2: Prévisionnel 12 Mois ────────────────────────────────────────────
  Widget _buildPrevisionnelTab(
    HotelConfigDto config,
    List<UnitDto> units,
    List<FolioDto> folios,
    List<ClotureHistoryDto> history,
  ) {
    final totalUnits = units.length;
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Prix de base calculé dynamiquement à partir des tarifs réels des unités / folios / historique
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
        : (avgFolioRate > 0 ? avgFolioRate : (avgHistoryRate > 0 ? avgHistoryRate : 0));

    // Taux d'occupation de référence calculé dynamiquement
    final baselineOcc = history.isNotEmpty
        ? ((history.fold<double>(0, (sum, h) => sum + h.occupation) / history.length) / 100.0).clamp(0.1, 1.0)
        : 0.65;

    // Calcul dynamique de chaque mois
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

    // Total annuel exact = somme des 12 mois calculés
    final totalCaPrevisionnel = monthlyData.fold<int>(0, (sum, m) => sum + (m['ca'] as int));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Executive Banner 12M
        JuweiratCard(
          color: JuweiratColors.charcoal,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'BUDGET & PRÉVISIONNEL ANNUEL 12 MOIS',
                style: TextStyle(color: JuweiratColors.goldLight, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8),
              ),
              const SizedBox(height: 8),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  money(totalCaPrevisionnel),
                  style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Capacité d\'accueil globale sur $totalUnits appartements · Tarif moyen réf : ${money(basePrice)}/nuit',
                style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        const Text('Détail Mensuel Prévisionnel', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),

        JuweiratCard(
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
        ),
      ],
    );
  }

  // ── Tab 3: Règlements & Créances ───────────────────────────────────────────
  Widget _buildReglementsTab(List<DebiteurDto> debiteurs, List<FolioDto> folios) {
    final totalDebiteurs = debiteurs.fold<int>(0, (sum, d) => sum + d.solde);
    final totalFoliosSolde = folios.fold<int>(0, (sum, f) => sum + f.solde);
    // Encaissé = paiements folios + paiements débiteurs NON rattachés à un folio actif (évite double comptage)
    final totalEncaisse = folios.fold<int>(0, (sum, f) => sum + f.paid)
        + debiteurs.where((d) => d.folioId == null).fold<int>(0, (sum, d) => sum + d.paid);
    // Facturé = totalGeneral des folios + montant des débiteurs sans folio
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
