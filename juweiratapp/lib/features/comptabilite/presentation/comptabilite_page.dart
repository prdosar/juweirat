import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:juweiratapp/app/theme.dart';
import 'package:juweiratapp/app/di.dart';
import 'package:juweiratapp/core/formatters/formatters.dart';
import 'package:juweiratapp/core/models/dtos.dart';
import 'package:juweiratapp/shared/widgets/shared_widgets.dart';
import 'package:juweiratapp/core/services/export_service.dart';
import 'package:juweiratapp/shared/widgets/main_shell.dart';

final comptaDataProvider = FutureProvider.autoDispose((ref) async {
  final comptaRepo = ref.watch(accountingRepositoryProvider);
  final sessionRepo = ref.watch(cashSessionRepositoryProvider);

  final results = await Future.wait([
    comptaRepo.getJournal(),
    comptaRepo.getBalance(),
    comptaRepo.getTvaReport(),
    sessionRepo.getCurrent(),
    sessionRepo.getHistory(limit: 20),
    comptaRepo.getCashRegisters(),
  ]);

  return {
    'journal': results[0] as JournalReportDto?,
    'balance': results[1] as BalanceReportDto?,
    'tva': results[2] as TvaReportDto?,
    'currentSession': results[3] as CashSessionDto?,
    'sessionsHistory': results[4] as List<CashSessionDto>,
    'cashRegisters': results[5] as List<CashRegisterDto>,
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

  @override
  Widget build(BuildContext context) {
    final dataAsync = ref.watch(comptaDataProvider);

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
            icon: const Icon(Icons.refresh),
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
      body: dataAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Erreur: $err', style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => ref.refresh(comptaDataProvider),
                child: const Text('Réessayer'),
              ),
            ],
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
              _buildJournalTab(journal),
              _buildSessionsTab(currentSession, sessionsHistory, registers),
              _buildBalanceTvaTab(balance, tva),
            ],
          );
        },
      ),
    );
  }

  // ── Tab 1: Journal de Caisse ───────────────────────────────────────────────
  Widget _buildJournalTab(JournalReportDto? journal) {
    if (journal == null || journal.entries.isEmpty) {
      return const EmptyState(
        message: 'Aucune écriture enregistrée dans le journal de caisse',
        icon: Icons.menu_book_rounded,
      );
    }

    return RefreshIndicator(
      onRefresh: () async => ref.refresh(comptaDataProvider),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Synthèse Journal
          JuweiratCard(
            color: JuweiratColors.charcoal,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'JOURNAL DES ENCAISSEMENTS',
                      style: TextStyle(color: JuweiratColors.goldLight, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                    ),
                    IconButton(
                      icon: const Icon(Icons.share_outlined, color: JuweiratColors.goldLight, size: 18),
                      tooltip: 'Exporter CSV',
                      onPressed: () {
                        ExportService.shareCsv(
                          fileName: 'journal_caisse.csv',
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
                            money(journal.totalEncaisse),
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
                            money(journal.totalTtc),
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
                    Text('Total HT: ${money(journal.totalHt)}', style: const TextStyle(color: Color(0xFFD1D5DB), fontSize: 11)),
                    Text('TVA Collectée: ${money(journal.totalTva)}', style: const TextStyle(color: Color(0xFFD1D5DB), fontSize: 11)),
                    Text('Décaissé: ${money(journal.totalDecaisse)}', style: const TextStyle(color: Color(0xFFEF4444), fontSize: 11)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          const Text('Écritures Récentes', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
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
  Widget _buildBalanceTvaTab(BalanceReportDto? balance, TvaReportDto? tva) {
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
                      const Text(
                        'ÉTAT TVA COLLECTÉE',
                        style: TextStyle(color: JuweiratColors.goldLight, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8),
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
          const Text('Balance des Comptes & Trésorerie', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),

          if (balance == null || balance.lines.isEmpty)
            const EmptyState(message: 'Aucun compte comptable initialisé', icon: Icons.account_balance_rounded)
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
