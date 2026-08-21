import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:juweiratapp/app/theme.dart';
import 'package:juweiratapp/app/di.dart';
import 'package:juweiratapp/core/formatters/formatters.dart';
import 'package:juweiratapp/core/models/dtos.dart';
import 'package:juweiratapp/shared/widgets/shared_widgets.dart';
import 'package:juweiratapp/core/services/export_service.dart';
import 'package:juweiratapp/shared/widgets/main_shell.dart';

enum ComptaDatePreset {
  today,
  yesterday,
  thisWeek,
  thisMonth,
  customDate,
  customRange,
  all,
}

class ComptaFilterState {
  final ComptaDatePreset preset;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? customLabel;
  final String? paymentMethod;

  const ComptaFilterState({
    this.preset = ComptaDatePreset.today,
    this.startDate,
    this.endDate,
    this.customLabel,
    this.paymentMethod,
  });

  ComptaFilterState copyWith({
    ComptaDatePreset? preset,
    DateTime? startDate,
    DateTime? endDate,
    String? customLabel,
    String? paymentMethod,
    bool clearDates = false,
  }) {
    return ComptaFilterState(
      preset: preset ?? this.preset,
      startDate: clearDates ? null : (startDate ?? this.startDate),
      endDate: clearDates ? null : (endDate ?? this.endDate),
      customLabel: customLabel ?? this.customLabel,
      paymentMethod: paymentMethod ?? this.paymentMethod,
    );
  }

  String get displayLabel {
    final fmt = DateFormat('dd/MM/yyyy');
    switch (preset) {
      case ComptaDatePreset.today:
        final dateStr = startDate != null ? fmt.format(startDate!) : fmt.format(DateTime.now());
        return 'Aujourd\'hui ($dateStr)';
      case ComptaDatePreset.yesterday:
        final dateStr = startDate != null ? fmt.format(startDate!) : '';
        return 'Hier ($dateStr)';
      case ComptaDatePreset.thisWeek:
        if (startDate != null && endDate != null) {
          return 'Cette semaine (${fmt.format(startDate!)} au ${fmt.format(endDate!)})';
        }
        return 'Cette semaine';
      case ComptaDatePreset.thisMonth:
        if (startDate != null) {
          return 'Ce mois (${DateFormat('MMMM yyyy', 'fr_FR').format(startDate!)})';
        }
        return 'Ce mois';
      case ComptaDatePreset.customDate:
        if (startDate != null) {
          return 'Date du ${fmt.format(startDate!)}';
        }
        return 'Date personnalisée';
      case ComptaDatePreset.customRange:
        if (startDate != null && endDate != null) {
          return 'Du ${fmt.format(startDate!)} au ${fmt.format(endDate!)}';
        }
        return 'Période personnalisée';
      case ComptaDatePreset.all:
        return 'Tout l\'historique';
    }
  }
}

final comptaFilterProvider = StateProvider.autoDispose<ComptaFilterState>((ref) {
  final now = DateTime.now();
  final startToday = DateTime(now.year, now.month, now.day, 0, 0, 0);
  final endToday = DateTime(now.year, now.month, now.day, 23, 59, 59, 999);
  return ComptaFilterState(
    preset: ComptaDatePreset.today,
    startDate: startToday,
    endDate: endToday,
  );
});

final comptaDataProvider = FutureProvider.autoDispose((ref) async {
  final comptaRepo = ref.watch(accountingRepositoryProvider);
  final sessionRepo = ref.watch(cashSessionRepositoryProvider);
  final filter = ref.watch(comptaFilterProvider);

  final from = filter.startDate;
  final to = filter.endDate;

  JournalReportDto? journal;
  BalanceReportDto? balance;
  TvaReportDto? tva;
  CashSessionDto? currentSession;
  List<CashSessionDto> sessionsHistory = [];
  List<CashRegisterDto> cashRegisters = [];

  try {
    journal = await comptaRepo.getJournal(from: from, to: to, paymentMethod: filter.paymentMethod);
  } catch (_) {}

  try {
    balance = await comptaRepo.getBalance(from: from, to: to);
  } catch (_) {}

  try {
    tva = await comptaRepo.getTvaReport(from: from, to: to);
  } catch (_) {}

  try {
    currentSession = await sessionRepo.getCurrent();
  } catch (_) {}

  try {
    sessionsHistory = await sessionRepo.getHistory(limit: 30);
  } catch (_) {}

  try {
    cashRegisters = await comptaRepo.getCashRegisters();
  } catch (_) {}

  return {
    'journal': journal,
    'balance': balance,
    'tva': tva,
    'currentSession': currentSession,
    'sessionsHistory': sessionsHistory,
    'cashRegisters': cashRegisters,
    'filter': filter,
  };
});

class ComptabilitePage extends ConsumerStatefulWidget {
  const ComptabilitePage({super.key});

  @override
  ConsumerState<ComptabilitePage> createState() => _ComptabilitePageState();
}

class _ComptabilitePageState extends ConsumerState<ComptabilitePage> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _applyPreset(ComptaDatePreset preset) {
    final now = DateTime.now();
    DateTime? start;
    DateTime? end;

    switch (preset) {
      case ComptaDatePreset.today:
        start = DateTime(now.year, now.month, now.day, 0, 0, 0);
        end = DateTime(now.year, now.month, now.day, 23, 59, 59, 999);
        break;
      case ComptaDatePreset.yesterday:
        final yest = now.subtract(const Duration(days: 1));
        start = DateTime(yest.year, yest.month, yest.day, 0, 0, 0);
        end = DateTime(yest.year, yest.month, yest.day, 23, 59, 59, 999);
        break;
      case ComptaDatePreset.thisWeek:
        // Lundi de la semaine en cours
        final monday = now.subtract(Duration(days: now.weekday - 1));
        start = DateTime(monday.year, monday.month, monday.day, 0, 0, 0);
        end = DateTime(now.year, now.month, now.day, 23, 59, 59, 999);
        break;
      case ComptaDatePreset.thisMonth:
        start = DateTime(now.year, now.month, 1, 0, 0, 0);
        end = DateTime(now.year, now.month, now.day, 23, 59, 59, 999);
        break;
      case ComptaDatePreset.all:
        start = null;
        end = null;
        break;
      default:
        break;
    }

    ref.read(comptaFilterProvider.notifier).state = ComptaFilterState(
      preset: preset,
      startDate: start,
      endDate: end,
      paymentMethod: ref.read(comptaFilterProvider).paymentMethod,
    );
  }

  Future<void> _pickSingleDate() async {
    final current = ref.read(comptaFilterProvider).startDate ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime(2023),
      lastDate: DateTime(2035),
      helpText: 'Sélectionner une date comptable',
      cancelText: 'Annuler',
      confirmText: 'Valider',
    );

    if (picked != null) {
      final start = DateTime(picked.year, picked.month, picked.day, 0, 0, 0);
      final end = DateTime(picked.year, picked.month, picked.day, 23, 59, 59, 999);
      ref.read(comptaFilterProvider.notifier).state = ComptaFilterState(
        preset: ComptaDatePreset.customDate,
        startDate: start,
        endDate: end,
        paymentMethod: ref.read(comptaFilterProvider).paymentMethod,
      );
    }
  }

  Future<void> _pickDateRange() async {
    final now = DateTime.now();
    final currentFilter = ref.read(comptaFilterProvider);
    final initialRange = (currentFilter.startDate != null && currentFilter.endDate != null)
        ? DateTimeRange(start: currentFilter.startDate!, end: currentFilter.endDate!)
        : DateTimeRange(start: now.subtract(const Duration(days: 7)), end: now);

    final pickedRange = await showDateRangePicker(
      context: context,
      initialDateRange: initialRange,
      firstDate: DateTime(2023),
      lastDate: DateTime(2035),
      helpText: 'Sélectionner une plage de dates',
      cancelText: 'Annuler',
      confirmText: 'Valider',
      saveText: 'Appliquer',
    );

    if (pickedRange != null) {
      final start = DateTime(pickedRange.start.year, pickedRange.start.month, pickedRange.start.day, 0, 0, 0);
      final end = DateTime(pickedRange.end.year, pickedRange.end.month, pickedRange.end.day, 23, 59, 59, 999);
      ref.read(comptaFilterProvider.notifier).state = ComptaFilterState(
        preset: ComptaDatePreset.customRange,
        startDate: start,
        endDate: end,
        paymentMethod: ref.read(comptaFilterProvider).paymentMethod,
      );
    }
  }

  void _showFilterOptionsBottomSheet() {
    final currentPreset = ref.read(comptaFilterProvider).preset;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Période Comptable',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: JuweiratColors.charcoal),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () => Navigator.of(ctx).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'Sélectionnez une période prédéfinie ou choisissez des dates précises :',
                  style: TextStyle(color: Color(0xFF6B7280), fontSize: 13),
                ),
                const SizedBox(height: 16),
                _buildModalOptionTile(
                  icon: Icons.today_rounded,
                  title: 'Aujourd\'hui (Par défaut)',
                  subtitle: 'Écritures & KPIs de la journée en cours',
                  isSelected: currentPreset == ComptaDatePreset.today,
                  onTap: () {
                    Navigator.of(ctx).pop();
                    _applyPreset(ComptaDatePreset.today);
                  },
                ),
                _buildModalOptionTile(
                  icon: Icons.history_rounded,
                  title: 'Hier',
                  subtitle: 'Écritures de la journée précédente',
                  isSelected: currentPreset == ComptaDatePreset.yesterday,
                  onTap: () {
                    Navigator.of(ctx).pop();
                    _applyPreset(ComptaDatePreset.yesterday);
                  },
                ),
                _buildModalOptionTile(
                  icon: Icons.date_range_rounded,
                  title: 'Cette semaine',
                  subtitle: 'Du lundi en cours jusqu\'à aujourd\'hui',
                  isSelected: currentPreset == ComptaDatePreset.thisWeek,
                  onTap: () {
                    Navigator.of(ctx).pop();
                    _applyPreset(ComptaDatePreset.thisWeek);
                  },
                ),
                _buildModalOptionTile(
                  icon: Icons.calendar_month_rounded,
                  title: 'Ce mois',
                  subtitle: 'Du 1er du mois en cours jusqu\'à aujourd\'hui',
                  isSelected: currentPreset == ComptaDatePreset.thisMonth,
                  onTap: () {
                    Navigator.of(ctx).pop();
                    _applyPreset(ComptaDatePreset.thisMonth);
                  },
                ),
                const Divider(height: 20),
                _buildModalOptionTile(
                  icon: Icons.calendar_today_rounded,
                  title: 'Choisir une date unique...',
                  subtitle: 'Consulter la comptabilité d\'un jour spécifique',
                  isSelected: currentPreset == ComptaDatePreset.customDate,
                  onTap: () {
                    Navigator.of(ctx).pop();
                    _pickSingleDate();
                  },
                ),
                _buildModalOptionTile(
                  icon: Icons.date_range_outlined,
                  title: 'Choisir une plage de dates...',
                  subtitle: 'Filtrer sur un intervalle personnalisé (Du ... Au ...)',
                  isSelected: currentPreset == ComptaDatePreset.customRange,
                  onTap: () {
                    Navigator.of(ctx).pop();
                    _pickDateRange();
                  },
                ),
                _buildModalOptionTile(
                  icon: Icons.all_inclusive_rounded,
                  title: 'Tout l\'historique',
                  subtitle: 'Afficher toutes les écritures sans filtre de date',
                  isSelected: currentPreset == ComptaDatePreset.all,
                  onTap: () {
                    Navigator.of(ctx).pop();
                    _applyPreset(ComptaDatePreset.all);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildModalOptionTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: isSelected ? JuweiratColors.green.withValues(alpha: 0.15) : const Color(0xFFF3F4F6),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: isSelected ? JuweiratColors.greenDark : JuweiratColors.charcoal, size: 20),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
          color: isSelected ? JuweiratColors.greenDark : JuweiratColors.charcoal,
          fontSize: 14,
        ),
      ),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
      trailing: isSelected ? const Icon(Icons.check_circle_rounded, color: JuweiratColors.greenDark, size: 20) : null,
      onTap: onTap,
    );
  }

  @override
  Widget build(BuildContext context) {
    final dataAsync = ref.watch(comptaDataProvider);
    final filterState = ref.watch(comptaFilterProvider);

    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (ctx) {
            final canPop = Navigator.of(ctx).canPop();
            if (canPop) {
              return IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: () => Navigator.of(ctx).pop(),
              );
            }
            return IconButton(
              icon: const Icon(Icons.menu_rounded),
              tooltip: 'Menu latéral',
              onPressed: () => mainScaffoldKey.currentState?.openDrawer(),
            );
          },
        ),
        title: const Text('Comptabilité & Caisse'),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month_rounded),
            tooltip: 'Filtrer par date / période',
            onPressed: _showFilterOptionsBottomSheet,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Actualiser',
            onPressed: () => ref.refresh(comptaDataProvider),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: JuweiratColors.green,
          unselectedLabelColor: const Color(0xFF9CA3AF),
          indicatorColor: JuweiratColors.green,
          indicatorWeight: 3,
          tabs: const [
            Tab(text: 'Journal de Caisse'),
            Tab(text: 'Sessions Caisse'),
            Tab(text: 'Balance & TVA'),
          ],
        ),
      ),
      body: Column(
        children: [
          // ── Date Filter Bar & Quick Chips ───────────────────────────────
          _buildFilterHeader(filterState),

          // ── Tab Content ─────────────────────────────────────────────────
          Expanded(
            child: dataAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline_rounded, color: Colors.red, size: 48),
                      const SizedBox(height: 12),
                      Text('Erreur: $err', textAlign: TextAlign.center, style: const TextStyle(color: Colors.red)),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.refresh),
                        onPressed: () => ref.refresh(comptaDataProvider),
                        label: const Text('Réessayer'),
                      ),
                    ],
                  ),
                ),
              ),
              data: (data) {
                final journal = data['journal'] as JournalReportDto?;
                final balance = data['balance'] as BalanceReportDto?;
                final tva = data['tva'] as TvaReportDto?;
                final currentSession = data['currentSession'] as CashSessionDto?;
                final sessionsHistory = data['sessionsHistory'] as List<CashSessionDto>;
                final registers = data['cashRegisters'] as List<CashRegisterDto>;

                return TabBarView(
                  controller: _tabController,
                  children: [
                    _buildJournalTab(journal, filterState),
                    _buildSessionsTab(currentSession, sessionsHistory, registers),
                    _buildBalanceTvaTab(balance, tva, filterState),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  // ── Date Filter Header ───────────────────────────────────────────────────
  Widget _buildFilterHeader(ComptaFilterState filterState) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: Colors.grey.shade200, width: 1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Bandeau période sélectionnée
          InkWell(
            onTap: _showFilterOptionsBottomSheet,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: JuweiratColors.charcoal,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Icon(Icons.calendar_today_rounded, size: 14, color: JuweiratColors.goldLight),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'PÉRIODE ACTIVE',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF9CA3AF), letterSpacing: 0.5),
                        ),
                        Text(
                          filterState.displayLabel,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: JuweiratColors.charcoal),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF3F4F6),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('Modifier', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: JuweiratColors.charcoal)),
                        SizedBox(width: 2),
                        Icon(Icons.arrow_drop_down_rounded, size: 16, color: JuweiratColors.charcoal),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Horizontal quick chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: Row(
              children: [
                _buildQuickChip('Aujourd\'hui', ComptaDatePreset.today, filterState.preset),
                _buildQuickChip('Hier', ComptaDatePreset.yesterday, filterState.preset),
                _buildQuickChip('Cette semaine', ComptaDatePreset.thisWeek, filterState.preset),
                _buildQuickChip('Ce mois', ComptaDatePreset.thisMonth, filterState.preset),
                _buildActionChip(
                  label: 'Date...',
                  icon: Icons.calendar_today_outlined,
                  isSelected: filterState.preset == ComptaDatePreset.customDate,
                  onTap: _pickSingleDate,
                ),
                _buildActionChip(
                  label: 'Plage...',
                  icon: Icons.date_range_outlined,
                  isSelected: filterState.preset == ComptaDatePreset.customRange,
                  onTap: _pickDateRange,
                ),
                _buildQuickChip('Tout', ComptaDatePreset.all, filterState.preset),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickChip(String label, ComptaDatePreset preset, ComptaDatePreset current) {
    final isSelected = preset == current;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        labelStyle: TextStyle(
          fontSize: 11,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          color: isSelected ? Colors.white : const Color(0xFF4B5563),
        ),
        backgroundColor: const Color(0xFFF3F4F6),
        selectedColor: JuweiratColors.green,
        checkmarkColor: Colors.white,
        showCheckmark: false,
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: isSelected ? JuweiratColors.green : Colors.transparent,
          ),
        ),
        onSelected: (_) => _applyPreset(preset),
      ),
    );
  }

  Widget _buildActionChip({
    required String label,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ActionChip(
        avatar: Icon(icon, size: 13, color: isSelected ? Colors.white : const Color(0xFF4B5563)),
        label: Text(label),
        labelStyle: TextStyle(
          fontSize: 11,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          color: isSelected ? Colors.white : const Color(0xFF4B5563),
        ),
        backgroundColor: isSelected ? JuweiratColors.green : const Color(0xFFF3F4F6),
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: isSelected ? JuweiratColors.green : Colors.transparent,
          ),
        ),
        onPressed: onTap,
      ),
    );
  }

  // ── Tab 1: Journal de Caisse ───────────────────────────────────────────────
  Widget _buildJournalTab(JournalReportDto? journal, ComptaFilterState filterState) {
    if (journal == null || journal.entries.isEmpty) {
      return RefreshIndicator(
        onRefresh: () async => ref.refresh(comptaDataProvider),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildJournalSummaryCard(journal, filterState),
            const SizedBox(height: 32),
            EmptyState(
              message: 'Aucune écriture enregistrée pour ${filterState.displayLabel.toLowerCase()}',
              icon: Icons.menu_book_rounded,
            ),
            const SizedBox(height: 16),
            if (filterState.preset != ComptaDatePreset.all)
              Center(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.all_inclusive_rounded),
                  label: const Text('Afficher tout l\'historique'),
                  onPressed: () => _applyPreset(ComptaDatePreset.all),
                ),
              ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async => ref.refresh(comptaDataProvider),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Synthèse Journal
          _buildJournalSummaryCard(journal, filterState),
          const SizedBox(height: 16),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Écritures (${journal.entries.length})',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: JuweiratColors.charcoal),
              ),
              Text(
                filterState.preset == ComptaDatePreset.today ? 'Journée active' : filterState.displayLabel,
                style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
              ),
            ],
          ),
          const SizedBox(height: 8),

          ...journal.entries.map((e) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: JuweiratCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF3F4F6),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              e.sourceType.toUpperCase(),
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: JuweiratColors.charcoal),
                            ),
                          ),
                          Text(frDate(e.date), style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(e.label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: JuweiratColors.charcoal)),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('HT: ${money(e.ht)} · TVA: ${money(e.tva)}', style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
                          if (e.paymentMethod != null)
                            Text(e.paymentMethod!, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF4B5563))),
                        ],
                      ),
                      const Divider(height: 12, color: JuweiratColors.cardBorder),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('TTC: ${money(e.ttc)}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              '+ ${money(e.encaisse)}',
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: JuweiratColors.greenDark),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildJournalSummaryCard(JournalReportDto? journal, ComptaFilterState filterState) {
    final totalEncaisse = journal?.totalEncaisse ?? 0;
    final totalTtc = journal?.totalTtc ?? 0;
    final totalHt = journal?.totalHt ?? 0;
    final totalTva = journal?.totalTva ?? 0;
    final totalDecaisse = journal?.totalDecaisse ?? 0;

    return JuweiratCard(
      color: JuweiratColors.charcoal,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'SYNTHÈSE DU JOURNAL · ${filterState.displayLabel.toUpperCase()}',
                  style: const TextStyle(color: JuweiratColors.goldLight, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (journal != null && journal.entries.isNotEmpty)
                IconButton(
                  icon: const Icon(Icons.share_outlined, color: JuweiratColors.goldLight, size: 18),
                  tooltip: 'Exporter CSV',
                  onPressed: () {
                    final dateTag = DateFormat('yyyyMMdd').format(filterState.startDate ?? DateTime.now());
                    ExportService.shareCsv(
                      fileName: 'journal_caisse_$dateTag.csv',
                      csvContent: 'Date,Libelle,HT,TVA,TTC,Encaisse,Decaisse,Mode\n${journal.entries.map((e) => '"${e.date}","${e.label}",${e.ht},${e.tva},${e.ttc},${e.encaisse},${e.decaisse},"${e.paymentMethod ?? ""}"').join('\n')}',
                    );
                  },
                ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Total Encaissé', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 11)),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      money(totalEncaisse),
                      style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900),
                    ),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text('Total TTC Facturé', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 11)),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      money(totalTtc),
                      style: const TextStyle(color: JuweiratColors.goldLight, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Divider(height: 1, color: Color(0xFF374151)),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('HT: ${money(totalHt)}', style: const TextStyle(color: Color(0xFFD1D5DB), fontSize: 11)),
              Text('TVA: ${money(totalTva)}', style: const TextStyle(color: Color(0xFFD1D5DB), fontSize: 11)),
              Text('Décaissé: ${money(totalDecaisse)}', style: const TextStyle(color: Color(0xFFEF4444), fontSize: 11)),
            ],
          ),
        ],
      ),
    );
  }

  // ── Tab 2: Sessions de Caisse ──────────────────────────────────────────────
  Widget _buildSessionsTab(
    CashSessionDto? currentSession,
    List<CashSessionDto> history,
    List<CashRegisterDto> registers,
  ) {
    return RefreshIndicator(
      onRefresh: () async => ref.refresh(comptaDataProvider),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Statut Session Actuelle
          JuweiratCard(
            color: currentSession != null ? JuweiratColors.charcoal : Colors.white,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      currentSession != null ? 'SESSION DE CAISSE EN COURS' : 'AUCUNE SESSION OUVERTE',
                      style: TextStyle(
                        color: currentSession != null ? JuweiratColors.goldLight : JuweiratColors.charcoal,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.8,
                      ),
                    ),
                    StatusBadge(status: currentSession != null ? 'Active' : 'Fermée'),
                  ],
                ),
                const SizedBox(height: 8),
                if (currentSession != null) ...[
                  Text(
                    currentSession.registerName,
                    style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Ouverte par ${currentSession.openedByUserName} le ${frDateTime(currentSession.openedAt)}',
                    style: const TextStyle(color: Color(0xFFD1D5DB), fontSize: 12),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Fond de caisse initial : ${money(currentSession.openingFloat)}',
                    style: const TextStyle(color: JuweiratColors.goldLight, fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ] else ...[
                  const Text(
                    'Aucune session de caisse n\'est actuellement ouverte pour votre compte.',
                    style: TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
                  ),
                  const SizedBox(height: 8),
                  if (registers.isNotEmpty)
                    Text(
                      '${registers.length} caisse(s) physique(s) configurée(s)',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: JuweiratColors.charcoal),
                    ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Caisses Enregistrées & Soldes
          if (registers.isNotEmpty) ...[
            const Text('Caisses & Trésorerie', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(
              children: registers.map((reg) {
                return Expanded(
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: JuweiratColors.cardBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(reg.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        const SizedBox(height: 4),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            money(reg.accountBalance),
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: JuweiratColors.greenDark),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
          ],

          // Historique des sessions
          const Text('Historique des Sessions de Caisse', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),

          if (history.isEmpty)
            const EmptyState(message: 'Aucun historique de session disponible', icon: Icons.point_of_sale_rounded)
          else
            ...history.map((s) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: JuweiratCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(s.registerName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            StatusBadge(status: s.status),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Ouverte: ${frDateTime(s.openedAt)} (${s.openedByUserName})',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                        ),
                        if (s.closedAt != null)
                          Text(
                            'Clôturée: ${frDateTime(s.closedAt)} (${s.closedByUserName ?? ""})',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                          ),
                        const Divider(height: 12, color: JuweiratColors.cardBorder),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Fond : ${money(s.openingFloat)}', style: const TextStyle(fontSize: 12, color: Color(0xFF4B5563))),
                            if (s.closingCountedTotal != null)
                              FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Text(
                                  'Compté : ${money(s.closingCountedTotal)}',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: JuweiratColors.charcoal),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                )),
        ],
      ),
    );
  }

  // ── Tab 3: Balance des Comptes & État TVA ──────────────────────────────────
  Widget _buildBalanceTvaTab(BalanceReportDto? balance, TvaReportDto? tva, ComptaFilterState filterState) {
    return RefreshIndicator(
      onRefresh: () async => ref.refresh(comptaDataProvider),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Rapport TVA Card
          if (tva != null) ...[
            JuweiratCard(
              color: JuweiratColors.charcoal,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          'ÉTAT TVA COLLECTÉE · ${filterState.displayLabel.toUpperCase()}',
                          style: const TextStyle(color: JuweiratColors.goldLight, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text('Taux : ${(tva.tvaRate * 100).toInt()}%', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      money(tva.totalTva),
                      style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Base HT : ${money(tva.totalHt)} · Total TTC : ${money(tva.totalTtc)}',
                    style: const TextStyle(color: Color(0xFFD1D5DB), fontSize: 12),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Balance des comptes
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Balance des Comptes & Trésorerie', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
              Text(
                filterState.displayLabel,
                style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
              ),
            ],
          ),
          const SizedBox(height: 8),

          if (balance == null || balance.lines.isEmpty)
            EmptyState(
              message: 'Aucun mouvement comptable pour ${filterState.displayLabel.toLowerCase()}',
              icon: Icons.account_balance_rounded,
            )
          else
            ...balance.lines.map((b) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: JuweiratCard(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(b.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              const SizedBox(height: 2),
                              Text('Nature: ${b.kind}', style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                              if (b.debit > 0 || b.credit > 0)
                                Text('Débit: ${money(b.debit)} · Crédit: ${money(b.credit)}', style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                money(b.closingBalance),
                                style: TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 14,
                                  color: b.closingBalance >= 0 ? JuweiratColors.greenDark : JuweiratColors.statusDangerText,
                                ),
                              ),
                            ),
                            const Text('Solde clôture', style: TextStyle(fontSize: 10, color: Color(0xFF9CA3AF))),
                          ],
                        ),
                      ],
                    ),
                  ),
                )),
        ],
      ),
    );
  }
}
