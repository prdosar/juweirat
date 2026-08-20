import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:juweiratapp/app/theme.dart';
import 'package:juweiratapp/app/di.dart';
import 'package:juweiratapp/core/formatters/formatters.dart';
import 'package:juweiratapp/core/models/dtos.dart';
import 'package:juweiratapp/shared/widgets/shared_widgets.dart';
import 'package:juweiratapp/core/services/export_service.dart';
import 'package:juweiratapp/shared/widgets/main_shell.dart';

final foliosListProvider = FutureProvider.autoDispose((ref) async {
  final repo = ref.watch(pmsRepositoryProvider);
  return await repo.getActiveFolios();
});

final folioDetailProvider = FutureProvider.autoDispose.family<FolioDto?, int>((ref, id) async {
  final repo = ref.watch(pmsRepositoryProvider);
  return await repo.getFolioById(id);
});

class FolioListPage extends ConsumerStatefulWidget {
  const FolioListPage({super.key});

  @override
  ConsumerState<FolioListPage> createState() => _FolioListPageState();
}

class _FolioListPageState extends ConsumerState<FolioListPage> {
  String _search = '';
  String _filter = 'all';

  @override
  Widget build(BuildContext context) {
    final foliosAsync = ref.watch(foliosListProvider);

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
        title: const Text('Dossiers Folios PMS'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(foliosListProvider),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: SearchField(
              hint: 'Rechercher un folio, un nom ou un appartement...',
              onChanged: (val) => setState(() => _search = val.toLowerCase()),
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              children: [
                _buildFilterChip('all', 'Tous'),
                const SizedBox(width: 8),
                _buildFilterChip('active', 'En Séjour'),
                const SizedBox(width: 8),
                _buildFilterChip('unpaid', 'Avec Solde Dû'),
                const SizedBox(width: 8),
                _buildFilterChip('closed', 'Clôturés'),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: foliosAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Erreur: $err', style: const TextStyle(color: Colors.red)),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      onPressed: () => ref.refresh(foliosListProvider),
                      child: const Text('Réessayer'),
                    ),
                  ],
                ),
              ),
              data: (folios) {
                final filtered = folios.where((f) {
                  final matchesSearch = _search.isEmpty ||
                      f.number.toLowerCase().contains(_search) ||
                      (f.guest?.toLowerCase().contains(_search) ?? false) ||
                      (f.nom?.toLowerCase().contains(_search) ?? false) ||
                      (f.prenom?.toLowerCase().contains(_search) ?? false) ||
                      f.unitLabel.toLowerCase().contains(_search);

                  if (!matchesSearch) return false;

                  if (_filter == 'active') return f.checkedIn && !f.closed;
                  if (_filter == 'unpaid') return f.solde > 0;
                  if (_filter == 'closed') return f.closed;
                  return true;
                }).toList();

                if (filtered.isEmpty) {
                  return const EmptyState(
                    message: 'Aucun folio ne correspond à votre recherche',
                    icon: Icons.receipt_long_rounded,
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async => ref.refresh(foliosListProvider),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final f = filtered[index];
                      final clientName = (f.nom != null || f.prenom != null)
                          ? '${f.prenom ?? ''} ${f.nom ?? ''}'.trim()
                          : (f.guest ?? 'Client');

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: JuweiratCard(
                          onTap: () => context.push('/pms/folios/${f.id}'),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: JuweiratColors.charcoal,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      f.unitLabel.toUpperCase(),
                                      style: const TextStyle(
                                        color: JuweiratColors.goldLight,
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  StatusBadge(
                                    status: f.closed
                                        ? 'Clôturé'
                                        : (f.checkedIn ? 'En Séjour' : f.resaStatus),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Text(
                                clientName,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  color: JuweiratColors.charcoal,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  const Icon(Icons.confirmation_number_outlined, size: 14, color: Color(0xFF6B7280)),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Folio ${f.number}',
                                    style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280), fontWeight: FontWeight.w500),
                                  ),
                                  const SizedBox(width: 12),
                                  const Icon(Icons.date_range_outlined, size: 14, color: Color(0xFF6B7280)),
                                  const SizedBox(width: 4),
                                  Text(
                                    '${frDate(f.arrival)} → ${frDate(f.departure)} (${f.nights}n)',
                                    style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              const Divider(height: 1, color: JuweiratColors.cardBorder),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Total: ${money(f.totalGeneral)}',
                                    style: const TextStyle(fontSize: 12, color: Color(0xFF4B5563)),
                                  ),
                                  Row(
                                    children: [
                                      Text(
                                        f.solde > 0 ? 'Solde dû: ' : 'Soldé: ',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: f.solde > 0 ? JuweiratColors.statusDangerText : JuweiratColors.statusSuccessText,
                                        ),
                                      ),
                                      FittedBox(
                                        fit: BoxFit.scaleDown,
                                        child: Text(
                                          money(f.solde),
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w900,
                                            color: f.solde > 0 ? JuweiratColors.statusDangerText : JuweiratColors.statusSuccessText,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String key, String label) {
    final selected = _filter == key;
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => setState(() => _filter = key),
      selectedColor: JuweiratColors.green,
      labelStyle: TextStyle(
        color: selected ? Colors.white : const Color(0xFF4B5563),
        fontWeight: selected ? FontWeight.bold : FontWeight.normal,
        fontSize: 12,
      ),
    );
  }
}

class FolioDetailPage extends ConsumerWidget {
  final int folioId;

  const FolioDetailPage({super.key, required this.folioId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final folioAsync = ref.watch(folioDetailProvider(folioId));

    return Scaffold(
      appBar: AppBar(
        title: Text('Détail Folio #$folioId'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined),
            onPressed: () {
              final f = folioAsync.value;
              if (f != null) {
                ExportService.shareCsv(
                  fileName: 'folio_${f.number}.csv',
                  csvContent: 'Rubrique,Valeur\n'
                      'Numero,${f.number}\n'
                      'Logement,${f.unitLabel}\n'
                      'Client,${f.nom ?? f.guest ?? ""}\n'
                      'Arrivee,${f.arrival}\n'
                      'Depart,${f.departure}\n'
                      'Total Hebergement,${f.totalHeb}\n'
                      'Total General,${f.totalGeneral}\n'
                      'Regle,${f.paid}\n'
                      'Solde,${f.solde}\n',
                );
              }
            },
          ),
        ],
      ),
      body: folioAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Erreur: $err')),
        data: (f) {
          if (f == null) return const EmptyState(message: 'Folio introuvable');

          final clientName = (f.nom != null || f.prenom != null)
              ? '${f.prenom ?? ''} ${f.nom ?? ''}'.trim()
              : (f.guest ?? 'Client');

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Header Card
              JuweiratCard(
                color: JuweiratColors.charcoal,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          f.number,
                          style: const TextStyle(
                            color: JuweiratColors.goldLight,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        StatusBadge(
                          status: f.closed ? 'Clôturé' : (f.checkedIn ? 'En Séjour' : f.resaStatus),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      clientName,
                      style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${f.unitLabel} · Segment: ${f.segment} · ${f.pax} Pax',
                      style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Séjour Card
              JuweiratCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Détails du Séjour', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 12),
                    _buildRow('Date d\'arrivée', frDate(f.arrival)),
                    _buildRow('Date de départ', frDate(f.departure)),
                    _buildRow('Nombre de nuits', '${f.nights} nuit(s)'),
                    _buildRow('Tarif appliqué', '${money(f.rate)} / nuit (${f.tarifTier})'),
                    _buildRow('Électricité incluse', f.elecIncluded ? 'Oui' : 'Non'),
                    if (f.payMode != null) _buildRow('Mode de paiement', f.payMode!),
                    if (f.note != null && f.note!.isNotEmpty) _buildRow('Remarques', f.note!),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Synthèse Financière Card
              JuweiratCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Synthèse Financière du Compte', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 12),
                    _buildRow('Total Hébergement', money(f.totalHeb)),
                    _buildRow('Total Petit-Déjeuner', money(f.totalPdj > 0 ? f.totalPdj : f.pdjParJour * f.pdjPrix * f.nights)),
                    _buildRow('Dépendances / Prestations', money(f.totalDependances)),
                    if (f.totalDebiteur > 0) _buildRow('Report Débiteur', money(f.totalDebiteur)),
                    const Divider(height: 20, color: JuweiratColors.cardBorder),
                    _buildRow('TOTAL GÉNÉRAL', money(f.totalGeneral), isBold: true),
                    _buildRow('Acomptes / Arrhes', money(f.arrhes)),
                    _buildRow('Total Encaissé / Réglé', money(f.paid), isBold: true, valueColor: JuweiratColors.greenDark),
                    const Divider(height: 20, color: JuweiratColors.cardBorder),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'SOLDE RESTANT DÛ',
                          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: JuweiratColors.charcoal),
                        ),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            money(f.solde),
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: f.solde > 0 ? JuweiratColors.statusDangerText : JuweiratColors.statusSuccessText,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildRow(String label, String value, {bool isBold = false, Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: const Color(0xFF6B7280),
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value,
              style: TextStyle(
                fontSize: 13,
                color: valueColor ?? (isBold ? JuweiratColors.charcoal : const Color(0xFF1F2937)),
                fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
