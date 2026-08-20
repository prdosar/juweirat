import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:juweiratapp/app/theme.dart';
import 'package:juweiratapp/app/di.dart';
import 'package:juweiratapp/core/formatters/formatters.dart';
import 'package:juweiratapp/core/models/dtos.dart';
import 'package:juweiratapp/shared/widgets/shared_widgets.dart';
import 'package:juweiratapp/shared/widgets/main_shell.dart';

final ventesDataProvider = FutureProvider.autoDispose((ref) async {
  final ventesRepo = ref.watch(ventesDirectesRepositoryProvider);
  final prestationsRepo = ref.watch(prestationsRepositoryProvider);
  final pmsRepo = ref.watch(pmsRepositoryProvider);

  final config = await pmsRepo.getConfig();
  final date = config.dateHotel.isNotEmpty ? config.dateHotel : '2026-08-19';

  final results = await Future.wait([
    ventesRepo.getByDate(date),
    prestationsRepo.getPrestations(),
  ]);

  return {
    'ventes': results[0] as List<VenteDirecteDto>,
    'prestations': results[1] as List<PrestationAnnexeDto>,
    'date': date,
  };
});

class VentesDirectesPage extends ConsumerWidget {
  const VentesDirectesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataAsync = ref.watch(ventesDataProvider);

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
        title: const Text('Ventes Directes & Prestations'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(ventesDataProvider),
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
                onPressed: () => ref.refresh(ventesDataProvider),
                child: const Text('Réessayer'),
              ),
            ],
          ),
        ),
        data: (data) {
          final ventes = data['ventes'] as List<VenteDirecteDto>;
          final prestations = data['prestations'] as List<PrestationAnnexeDto>;
          final date = data['date'] as String;

          final totalCaVentes = ventes.fold<int>(0, (sum, v) => sum + v.total);
          final totalArticles = ventes.fold<int>(0, (sum, v) => sum + v.quantite);

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(ventesDataProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Top KPI Card
                JuweiratCard(
                  color: JuweiratColors.charcoal,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'VENTES DU JOUR HÔTEL',
                        style: TextStyle(color: JuweiratColors.goldLight, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.0),
                      ),
                      const SizedBox(height: 8),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(
                          money(totalCaVentes),
                          style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Date : ${frDate(date)} · $totalArticles prestation(s) vendue(s)',
                        style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Prestations au catalogue
                const Text('Catalogue des Prestations & Tarifs', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),

                if (prestations.isEmpty)
                  const EmptyState(message: 'Aucune prestation enregistrée', icon: Icons.shopping_bag_outlined)
                else
                  SizedBox(
                    height: 100,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: prestations.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (context, index) {
                        final p = prestations[index];
                        return Container(
                          width: 140,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: JuweiratColors.cardBorder),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                p.nameFr,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: JuweiratColors.charcoal),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Text(
                                  money(p.price),
                                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: JuweiratColors.greenDark),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                const SizedBox(height: 20),

                // Journal des ventes directes
                const Text('Journal des Ventes Réalisées', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),

                if (ventes.isEmpty)
                  const EmptyState(message: 'Aucune vente directe enregistrée pour cette date', icon: Icons.receipt_long_rounded)
                else
                  ...ventes.map(
                    (v) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: JuweiratCard(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    v.prestationNameFr,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: JuweiratColors.charcoal),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${v.quantite} × ${money(v.prixUnitaireSnapshot)} · Mode : ${v.mode} ${v.paymentMethod != null ? "(${v.paymentMethod})" : ""}',
                                    style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                                  ),
                                  if (v.clientNom != null || v.folioNumber != null) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      '${v.clientNom ?? ""} ${v.folioNumber != null ? "(Folio ${v.folioNumber})" : ""}'.trim(),
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFF4B5563)),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                money(v.total),
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: JuweiratColors.charcoal),
                              ),
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
}
