import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:juweiratapp/app/theme.dart';
import 'package:juweiratapp/app/di.dart';
import 'package:juweiratapp/core/formatters/formatters.dart';
import 'package:juweiratapp/shared/widgets/shared_widgets.dart';
import 'package:juweiratapp/shared/widgets/main_shell.dart';

final gouvernanteDataProvider = FutureProvider.autoDispose((ref) async {
  final repo = ref.watch(pmsRepositoryProvider);
  return await repo.getUnits();
});

class GouvernantePage extends ConsumerStatefulWidget {
  const GouvernantePage({super.key});

  @override
  ConsumerState<GouvernantePage> createState() => _GouvernantePageState();
}

class _GouvernantePageState extends ConsumerState<GouvernantePage> {
  String _filter = 'all';

  @override
  Widget build(BuildContext context) {
    final unitsAsync = ref.watch(gouvernanteDataProvider);

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
        title: const Text('Gouvernante & Étages'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(gouvernanteDataProvider),
          ),
        ],
      ),
      body: unitsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Erreur: $err', style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => ref.refresh(gouvernanteDataProvider),
                child: const Text('Réessayer'),
              ),
            ],
          ),
        ),
        data: (units) {
          final totalUnits = units.length;
          final propres = units.where((u) => u.statutMenage.toLowerCase() == 'propre' && !u.horsService).length;
          final sales = units.where((u) => u.statutMenage.toLowerCase() == 'sale' && !u.horsService).length;
          final hs = units.where((u) => u.horsService).length;

          final filtered = units.where((u) {
            if (_filter == 'propre') return u.statutMenage.toLowerCase() == 'propre' && !u.horsService;
            if (_filter == 'sale') return u.statutMenage.toLowerCase() == 'sale' && !u.horsService;
            if (_filter == 'hs') return u.horsService;
            return true;
          }).toList();

          return Column(
            children: [
              // Summary KPIs
              Container(
                color: Colors.white,
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: StatCard(
                            title: 'Propres',
                            value: '$propres / $totalUnits',
                            subtitle: 'prêtes location',
                            icon: Icons.check_circle_rounded,
                            iconBg: const Color(0xFFDCFCE7),
                            iconColor: JuweiratColors.greenDark,
                            isVertical: true,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: StatCard(
                            title: 'À Nettoyer',
                            value: '$sales',
                            subtitle: 'statut sale',
                            icon: Icons.cleaning_services_rounded,
                            iconBg: const Color(0xFFFEF3C7),
                            iconColor: const Color(0xFFB45309),
                            isVertical: true,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: StatCard(
                            title: 'Hors Service',
                            value: '$hs',
                            subtitle: 'maintenance / blocage',
                            icon: Icons.build_circle_rounded,
                            iconBg: const Color(0xFFFEE2E2),
                            iconColor: JuweiratColors.statusDangerText,
                            isVertical: true,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _buildFilterChip('all', 'Tous ($totalUnits)'),
                          const SizedBox(width: 8),
                          _buildFilterChip('propre', 'Propres ($propres)'),
                          const SizedBox(width: 8),
                          _buildFilterChip('sale', 'À Nettoyer ($sales)'),
                          const SizedBox(width: 8),
                          _buildFilterChip('hs', 'Hors Service ($hs)'),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: JuweiratColors.cardBorder),

              // Units list
              Expanded(
                child: filtered.isEmpty
                    ? const EmptyState(message: 'Aucune unité pour ce filtre', icon: Icons.cleaning_services_rounded)
                    : RefreshIndicator(
                        onRefresh: () async => ref.refresh(gouvernanteDataProvider),
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final u = filtered[index];
                            final statusLabel = u.horsService
                                ? 'Hors Service'
                                : (u.statutMenage.isNotEmpty ? u.statutMenage : 'Propre');

                            return JuweiratCard(
                              child: Row(
                                children: [
                                  Container(
                                    width: 48,
                                    height: 48,
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      color: JuweiratColors.charcoal,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Text(
                                      u.pmsRoomNo ?? '${u.id}',
                                      style: const TextStyle(
                                        color: JuweiratColors.goldLight,
                                        fontWeight: FontWeight.w900,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          u.nameFr.isNotEmpty ? u.nameFr : 'Appartement ${u.pmsRoomNo ?? ""}',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: JuweiratColors.charcoal),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          'Étage ${u.floor} · Type ${u.pmsType ?? "T2"} · Dernier ménage: ${frDate(u.lastCleaned)}',
                                          style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                                        ),
                                        if (u.currentFolioNumber != null) ...[
                                          const SizedBox(height: 4),
                                          Text(
                                            '👤 Occupant en séjour : Folio ${u.currentFolioNumber}',
                                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: JuweiratColors.greenDark),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  StatusBadge(status: statusLabel),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
              ),
            ],
          );
        },
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
