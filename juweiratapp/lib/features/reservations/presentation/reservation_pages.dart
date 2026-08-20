import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:juweiratapp/app/theme.dart';
import 'package:juweiratapp/app/di.dart';
import 'package:juweiratapp/core/formatters/formatters.dart';
import 'package:juweiratapp/core/models/dtos.dart';
import 'package:juweiratapp/shared/widgets/shared_widgets.dart';
import 'package:juweiratapp/shared/widgets/main_shell.dart';

final reservationsFilterProvider = StateProvider<Map<String, dynamic>>((ref) => {
  'page': 1,
  'search': '',
  'status': '',
});

final reservationsPagedProvider = FutureProvider.autoDispose((ref) async {
  final repo = ref.watch(reservationRepositoryProvider);
  final filters = ref.watch(reservationsFilterProvider);
  return await repo.getPaged(
    page: filters['page'] as int? ?? 1,
    pageSize: 15,
    search: filters['search'] as String?,
    status: filters['status'] as String?,
  );
});

class ReservationListPage extends ConsumerWidget {
  const ReservationListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pagedAsync = ref.watch(reservationsPagedProvider);
    // filters watched by provider

    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu_rounded),
            tooltip: 'Menu latéral',
            onPressed: () => mainScaffoldKey.currentState?.openDrawer(),
          ),
        ),
        title: const Text('Réservations'),
      ),
      body: Column(
        children: [
          // Barre de recherche et filtre statut
          Container(
            color: JuweiratColors.white,
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                SearchField(
                  hint: 'Rechercher par référence, client...',
                  onChanged: (val) {
                    ref.read(reservationsFilterProvider.notifier).update((s) => {...s, 'search': val, 'page': 1});
                  },
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip(ref, 'Tous', ''),
                      _buildFilterChip(ref, 'Confirmée', 'Confirmed'),
                      _buildFilterChip(ref, 'En attente', 'Pending'),
                      _buildFilterChip(ref, 'Annulée', 'Cancelled'),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Liste
          Expanded(
            child: pagedAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Erreur: $e')),
              data: (paged) {
                if (paged.items.isEmpty) {
                  return const EmptyState(message: 'Aucune réservation ne correspond aux critères');
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.refresh(reservationsPagedProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: paged.items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final r = paged.items[index];
                      return JuweiratCard(
                        onTap: () => context.push('/reservations/${r.id}'),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(r.reference, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                StatusBadge(status: r.status),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(r.clientFullName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                            const SizedBox(height: 4),
                            Text(
                              '${r.categoryNameFr} · ${r.nights} nuit(s) · ${frDate(r.checkInDate)} → ${frDate(r.checkOutDate)}',
                              style: const TextStyle(color: Color(0xFF6B7280), fontSize: 12),
                            ),
                            const Divider(height: 16),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Payé : ${money(r.amountPaid)}', style: const TextStyle(fontSize: 12, color: JuweiratColors.statusSuccessText)),
                                FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text('Total : ${money(r.totalPrice)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                ),
                              ],
                            ),
                          ],
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

  Widget _buildFilterChip(WidgetRef ref, String label, String value) {
    final current = ref.watch(reservationsFilterProvider)['status'] as String? ?? '';
    final isSelected = current == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        selectedColor: JuweiratColors.greenLight,
        onSelected: (_) {
          ref.read(reservationsFilterProvider.notifier).update((s) => {...s, 'status': value, 'page': 1});
        },
      ),
    );
  }
}

class ReservationDetailPage extends ConsumerWidget {
  final int reservationId;
  const ReservationDetailPage({super.key, required this.reservationId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(reservationRepositoryProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Détail Réservation #$reservationId'),
      ),
      body: FutureBuilder<ReservationDto?>(
        future: repo.getById(reservationId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final r = snapshot.data;
          if (r == null) return const Center(child: Text('Réservation introuvable'));

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Header Référence & Statut
              JuweiratCard(
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(r.reference, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        StatusBadge(status: r.status),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Créée le : ${frDate(r.createdAt)}', style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
                        Text(r.source ?? 'Direct', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Fiche Client
              JuweiratCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Client', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 8),
                    Text(r.clientFullName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                    if (r.clientEmail != null) Text('✉️ ${r.clientEmail!}', style: const TextStyle(fontSize: 13)),
                    if (r.clientPhone != null) Text('📞 ${r.clientPhone!}', style: const TextStyle(fontSize: 13)),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Logement & Séjour
              JuweiratCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Séjour & Hébergement', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 8),
                    Text('Catégorie : ${r.categoryNameFr}', style: const TextStyle(fontSize: 13)),
                    if (r.roomNumber != null) Text('Chambre : n°${r.roomNumber!}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text('Arrivée : ${frDate(r.checkInDate)}  ·  Départ : ${frDate(r.checkOutDate)} (${r.nights} nuits)', style: const TextStyle(fontSize: 13)),
                    Text('Occupants : ${r.adults} adulte(s), ${r.children} enfant(s)', style: const TextStyle(fontSize: 13)),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Décomposition Financière
              JuweiratCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Décomposition Financière', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 8),
                    _buildPriceRow('Hébergement :', money(r.totalHebergement)),
                    _buildPriceRow('Prestations annexes :', money(r.totalPrestations)),
                    const Divider(),
                    _buildPriceRow('TOTAL :', money(r.totalPrice), isBold: true),
                    _buildPriceRow('Payé :', money(r.amountPaid), color: JuweiratColors.statusSuccessText),
                    _buildPriceRow(
                      'Solde dû :',
                      money(r.amountDue.clamp(0, r.totalPrice)),
                      color: r.amountDue > 0 ? JuweiratColors.statusDangerText : JuweiratColors.statusSuccessText,
                      isBold: true,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Garantie
              if (r.garantieType != null)
                JuweiratCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Garantie Réservation', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      const SizedBox(height: 6),
                      Text('Type : ${r.garantieType!}', style: const TextStyle(fontSize: 13)),
                      if (r.carteSuffix != null) Text('Carte : **** **** **** ${r.carteSuffix!} (${r.carteExpiration ?? ''})', style: const TextStyle(fontSize: 13)),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildPriceRow(String label, String value, {bool isBold = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(child: Text(label, style: TextStyle(fontSize: 13, fontWeight: isBold ? FontWeight.bold : FontWeight.normal))),
          const SizedBox(width: 8),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(value, style: TextStyle(fontSize: 13, fontWeight: isBold ? FontWeight.w900 : FontWeight.bold, color: color)),
          ),
        ],
      ),
    );
  }
}
