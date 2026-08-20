import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:juweiratapp/app/theme.dart';
import 'package:juweiratapp/app/di.dart';
import 'package:juweiratapp/core/formatters/formatters.dart';
import 'package:juweiratapp/core/models/dtos.dart';
import 'package:juweiratapp/shared/widgets/shared_widgets.dart';
import 'package:juweiratapp/shared/widgets/main_shell.dart';

final journeeDataProvider = FutureProvider.autoDispose((ref) async {
  final repo = ref.watch(pmsRepositoryProvider);
  final results = await Future.wait([
    repo.getConfig(),
    repo.getActiveFolios(),
    repo.getUnits(),
    repo.getCloturePreview(),
  ]);
  return {
    'config': results[0] as HotelConfigDto,
    'folios': results[1] as List<FolioDto>,
    'units': results[2] as List<UnitDto>,
    'preview': results[3] as CloturePreviewDto,
  };
});

class JourneePage extends ConsumerWidget {
  const JourneePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataAsync = ref.watch(journeeDataProvider);

    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu_rounded),
            tooltip: 'Menu latéral',
            onPressed: () => mainScaffoldKey.currentState?.openDrawer(),
          ),
        ),
        title: const Text('Journée Hôtelière PMS'),
        actions: [
          IconButton(
            icon: const Icon(Icons.receipt_long_rounded),
            tooltip: 'Tous les Folios',
            onPressed: () => context.push('/pms/folios'),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(journeeDataProvider),
          ),
        ],
      ),
      body: dataAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Erreur: $e', style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => ref.refresh(journeeDataProvider),
                child: const Text('Réessayer'),
              ),
            ],
          ),
        ),
        data: (data) {
          final config = data['config'] as HotelConfigDto;
          final folios = data['folios'] as List<FolioDto>;
          final units = data['units'] as List<UnitDto>;
          final preview = data['preview'] as CloturePreviewDto;

          final dateHotel = config.dateHotel;
          final arrivees = folios.where((f) => f.arrival.startsWith(dateHotel)).toList();
          final departs = folios.where((f) => f.departure.startsWith(dateHotel)).toList();
          final presents = folios.where((f) => f.checkedIn && !f.closed).toList();

          final totalSoldeDu = folios.fold<int>(0, (sum, f) => sum + f.solde);
          final totalHebJour = presents.fold<int>(0, (sum, f) => sum + f.rate);
          final totalPdjJour = presents.fold<int>(0, (sum, f) => sum + (f.pdjParJour * f.pdjPrix));
          final totalCaJour = totalHebJour + totalPdjJour;
          final totalEncaisse = folios.fold<int>(0, (sum, f) => sum + f.paid);

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(journeeDataProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Bandeau Date Hotel Premium
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: JuweiratColors.charcoal,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: const [
                      BoxShadow(
                        color: Color.fromRGBO(0, 0, 0, 0.15),
                        blurRadius: 10,
                        offset: Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF3DC720).withAlpha(50),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(Icons.hotel_rounded, color: JuweiratColors.goldLight, size: 20),
                              ),
                              const SizedBox(width: 10),
                              const Text(
                                'DATE HOTEL ACTUELLE',
                                style: TextStyle(
                                  color: Color(0xFF9CA3AF),
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1.0,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: preview.canClose ? JuweiratColors.greenDark : const Color(0xFF374151),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              preview.canClose ? 'Prêt pour Clôture' : 'Journée en Cours',
                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        frDate(dateHotel),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${units.length} Unités au total · ${preview.estimatedActiveCount} Séjour(s) actif(s)',
                        style: const TextStyle(color: Color(0xFFD1D5DB), fontSize: 12),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // 3 KPIs Verticaux Lisibles & Aérés
                Row(
                  children: [
                    Expanded(
                      child: StatCard(
                        title: 'Arrivées',
                        value: '${arrivees.length}',
                        subtitle: 'du jour',
                        icon: Icons.login_rounded,
                        iconBg: const Color(0xFFDBEAFE),
                        iconColor: const Color(0xFF1D4ED8),
                        isVertical: true,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: StatCard(
                        title: 'Départs',
                        value: '${departs.length}',
                        subtitle: 'du jour',
                        icon: Icons.logout_rounded,
                        iconBg: const Color(0xFFFEF3C7),
                        iconColor: const Color(0xFFB45309),
                        isVertical: true,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: StatCard(
                        title: 'Présents',
                        value: '${presents.length}',
                        subtitle: 'en séjour',
                        icon: Icons.person_pin_rounded,
                        iconBg: const Color(0xFFDCFCE7),
                        iconColor: JuweiratColors.greenDark,
                        isVertical: true,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 3 Financial KPIs with FittedBox
                Row(
                  children: [
                    Expanded(
                      child: JuweiratCard(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'CA TOTAL DU JOUR',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF6B7280)),
                            ),
                            const SizedBox(height: 4),
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: Alignment.centerLeft,
                              child: Text(
                                money(totalCaJour),
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: JuweiratColors.charcoal),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Héb: ${money(totalHebJour)}',
                              style: const TextStyle(fontSize: 10, color: Color(0xFF6B7280)),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: JuweiratCard(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'TOTAL ENCAISSÉ',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF6B7280)),
                            ),
                            const SizedBox(height: 4),
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: Alignment.centerLeft,
                              child: Text(
                                money(totalEncaisse),
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: JuweiratColors.greenDark),
                              ),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              'règlements folios',
                              style: TextStyle(fontSize: 10, color: Color(0xFF6B7280)),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: JuweiratCard(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'SOLDE DÛ RESTANT',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF6B7280)),
                            ),
                            const SizedBox(height: 4),
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: Alignment.centerLeft,
                              child: Text(
                                money(totalSoldeDu),
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w900,
                                  color: totalSoldeDu > 0 ? JuweiratColors.statusDangerText : JuweiratColors.statusSuccessText,
                                ),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              totalSoldeDu > 0 ? 'créance active' : 'comptes soldés',
                              style: const TextStyle(fontSize: 10, color: Color(0xFF6B7280)),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Liste des résidents en séjour
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Dossiers en Séjour (Présents)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    TextButton(
                      onPressed: () => context.push('/pms/folios'),
                      child: const Text('Voir tout'),
                    ),
                  ],
                ),
                const SizedBox(height: 4),

                if (presents.isEmpty)
                  const EmptyState(
                    message: 'Aucun résident en séjour pour cette date hôtel',
                    icon: Icons.meeting_room_outlined,
                  )
                else
                  ...presents.map(
                    (f) {
                      final clientName = (f.nom != null || f.prenom != null)
                          ? '${f.prenom ?? ''} ${f.nom ?? ''}'.trim()
                          : (f.guest ?? 'Client');

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: JuweiratCard(
                          onTap: () => context.push('/pms/folios/${f.id}'),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: JuweiratColors.charcoal,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      f.unitLabel,
                                      style: const TextStyle(color: JuweiratColors.goldLight, fontWeight: FontWeight.bold, fontSize: 11),
                                    ),
                                  ),
                                  StatusBadge(status: f.solde > 0 ? 'Solde dû' : 'Soldé'),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                clientName,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: JuweiratColors.charcoal),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Text(
                                    'Folio ${f.number}',
                                    style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280), fontWeight: FontWeight.w500),
                                  ),
                                  const SizedBox(width: 8),
                                  const Text('·', style: TextStyle(color: Color(0xFF9CA3AF))),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Départ : ${frDate(f.departure)}',
                                    style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              const Divider(height: 1, color: JuweiratColors.cardBorder),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('Tarif: ${money(f.rate)}/nuit', style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
                                  Row(
                                    children: [
                                      const Text('Solde: ', style: TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
                                      FittedBox(
                                        fit: BoxFit.scaleDown,
                                        child: Text(
                                          money(f.solde),
                                          style: TextStyle(
                                            fontWeight: FontWeight.w900,
                                            fontSize: 13,
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
              ],
            ),
          );
        },
      ),
    );
  }
}
