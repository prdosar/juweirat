import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:juweiratapp/app/theme.dart';
import 'package:juweiratapp/app/di.dart';
import 'package:juweiratapp/core/formatters/formatters.dart';
import 'package:juweiratapp/core/models/dtos.dart';
import 'package:juweiratapp/shared/widgets/shared_widgets.dart';
import 'package:juweiratapp/shared/widgets/main_shell.dart';

final cloturePageDataProvider = FutureProvider.autoDispose((ref) async {
  final repo = ref.watch(pmsRepositoryProvider);
  final results = await Future.wait([
    repo.getConfig(),
    repo.getCloturePreview(),
    repo.getClotureHistory(limit: 60),
    repo.getActiveFolios(),
  ]);
  return {
    'config': results[0] as HotelConfigDto,
    'preview': results[1] as CloturePreviewDto,
    'history': results[2] as List<ClotureHistoryDto>,
    'folios': results[3] as List<FolioDto>,
  };
});

class CloturePage extends ConsumerWidget {
  const CloturePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataAsync = ref.watch(cloturePageDataProvider);

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
        title: const Text('Clôture Journalière PMS'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(cloturePageDataProvider),
          ),
        ],
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
                onPressed: () => ref.refresh(cloturePageDataProvider),
                child: const Text('Réessayer'),
              ),
            ],
          ),
        ),
        data: (data) {
          final config = data['config'] as HotelConfigDto;
          final preview = data['preview'] as CloturePreviewDto;
          final history = data['history'] as List<ClotureHistoryDto>;
          final folios = data['folios'] as List<FolioDto>;

          final activeFolios = folios.where((f) => f.checkedIn && !f.closed).toList();
          final caHeb = activeFolios.fold<int>(0, (s, f) => s + f.rate);
          final caPdj = activeFolios.fold<int>(0, (s, f) => s + (f.pdjParJour * f.pdjPrix));
          final caTotal = caHeb + caPdj;

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(cloturePageDataProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Header Banner
                JuweiratCard(
                  color: JuweiratColors.charcoal,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'AUDIT DE CLÔTURE JOURNALIÈRE',
                            style: TextStyle(color: JuweiratColors.goldLight, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.0),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: preview.canClose ? JuweiratColors.greenDark : JuweiratColors.statusDangerText,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              preview.canClose ? 'Prêt pour clôture' : 'Actions requises',
                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Date Hôtel : ${frDate(config.dateHotel)}',
                        style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${preview.estimatedActiveCount} Séjour(s) actif(s) en passage de nuitée',
                        style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Estimation Financiére Clôture
                JuweiratCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Estimation du Chiffre d\'Affaires Clôturé', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      const SizedBox(height: 12),
                      _buildRow('CA Hébergement estimé', money(caHeb)),
                      _buildRow('CA Petit-Déjeuner estimé', money(caPdj)),
                      const Divider(height: 18, color: JuweiratColors.cardBorder),
                      _buildRow('TOTAL GÉNÉRÉ À CLÔTURER', money(caTotal), isBold: true, valueColor: JuweiratColors.greenDark),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Pending Departures / Arrivals Status
                if (preview.pendingArrivals.isNotEmpty) ...[
                  Text('Arrivées en attente (${preview.pendingArrivals.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFFB45309))),
                  const SizedBox(height: 8),
                  ...preview.pendingArrivals.map((arr) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: JuweiratCard(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(arr.guest ?? 'Client', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              Text('Unité : ${arr.unitLabel} · Folio ${arr.number}', style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                            ],
                          ),
                          const StatusBadge(status: 'Arrivée en attente'),
                        ],
                      ),
                    ),
                  )),
                  const SizedBox(height: 12),
                ],

                if (preview.pendingDepartures.isNotEmpty) ...[
                  Text('Départs en attente (${preview.pendingDepartures.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFFB45309))),
                  const SizedBox(height: 8),
                  ...preview.pendingDepartures.map((dep) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: JuweiratCard(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(dep.guest ?? 'Client', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              Text('Unité : ${dep.unitLabel} · Folio ${dep.number}', style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                            ],
                          ),
                          const StatusBadge(status: 'Départ en attente'),
                        ],
                      ),
                    ),
                  )),
                  const SizedBox(height: 12),
                ],

                // Historique des clôtures récentes
                const Text('Journal Historique des Clôtures', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),

                if (history.isEmpty)
                  const EmptyState(message: 'Aucun historique de clôture disponible', icon: Icons.history_rounded)
                else
                  ...history.take(15).map((h) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: JuweiratCard(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(frDate(h.dateHotel), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              Text('TO: ${percent(h.occupation)} · ${h.occ} ch. occ · RevPAR: ${money(h.revPar)}', style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                            ],
                          ),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              money(h.caTotal),
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: JuweiratColors.charcoal),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )),
              ],
            ),
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
          Text(label, style: TextStyle(fontSize: 13, color: const Color(0xFF6B7280), fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(value, style: TextStyle(fontSize: 13, fontWeight: isBold ? FontWeight.w900 : FontWeight.bold, color: valueColor ?? JuweiratColors.charcoal)),
          ),
        ],
      ),
    );
  }
}
