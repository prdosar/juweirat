import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:juweiratapp/app/theme.dart';
import 'package:juweiratapp/app/di.dart';
import 'package:juweiratapp/core/formatters/formatters.dart';
import 'package:juweiratapp/core/models/dtos.dart';
import 'package:juweiratapp/shared/widgets/shared_widgets.dart';
import 'package:juweiratapp/shared/widgets/main_shell.dart';

final clientSearchProvider = StateProvider<String>((ref) => '');

final clientsPagedProvider = FutureProvider.autoDispose((ref) async {
  final repo = ref.watch(clientRepositoryProvider);
  final search = ref.watch(clientSearchProvider);
  return await repo.getPaged(page: 1, pageSize: 30, search: search);
});

class ClientListPage extends ConsumerWidget {
  const ClientListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final clientsAsync = ref.watch(clientsPagedProvider);

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
        title: const Text('Répertoire Clients'),
      ),
      body: Column(
        children: [
          Container(
            color: JuweiratColors.white,
            padding: const EdgeInsets.all(12),
            child: SearchField(
              hint: 'Rechercher un client...',
              onChanged: (val) => ref.read(clientSearchProvider.notifier).state = val,
            ),
          ),
          Expanded(
            child: clientsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Erreur: $e')),
              data: (paged) {
                if (paged.items.isEmpty) return const EmptyState(message: 'Aucun client trouvé');
                return ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: paged.items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final c = paged.items[index];
                    return JuweiratCard(
                      onTap: () => context.push('/clients/${c.id}'),
                      child: Row(
                        children: [
                          CircleAvatar(
                            backgroundColor: JuweiratColors.charcoal,
                            foregroundColor: JuweiratColors.white,
                            child: Text(c.firstName.isNotEmpty ? c.firstName[0].toUpperCase() : 'C'),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(c.fullName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                const SizedBox(height: 2),
                                Text(c.phone ?? c.email ?? 'Aucun contact', style: const TextStyle(color: Color(0xFF6B7280), fontSize: 12)),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right, color: Color(0xFF9CA3AF)),
                        ],
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class ClientDetailPage extends ConsumerWidget {
  final int clientId;
  const ClientDetailPage({super.key, required this.clientId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(clientRepositoryProvider);

    return Scaffold(
      appBar: AppBar(title: Text('Fiche Client #$clientId')),
      body: FutureBuilder<ClientDto?>(
        future: repo.getById(clientId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          final c = snapshot.data;
          if (c == null) return const Center(child: Text('Client introuvable'));

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              JuweiratCard(
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 32,
                      backgroundColor: JuweiratColors.charcoal,
                      foregroundColor: JuweiratColors.white,
                      child: Text(c.firstName.isNotEmpty ? c.firstName[0].toUpperCase() : 'C', style: const TextStyle(fontSize: 24)),
                    ),
                    const SizedBox(height: 12),
                    Text(c.fullName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    if (c.companyName != null) Text(c.companyName!, style: const TextStyle(color: JuweiratColors.greenDark, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        if (c.phone != null)
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(backgroundColor: JuweiratColors.greenDark, foregroundColor: Colors.white),
                            icon: const Icon(Icons.phone, size: 18),
                            label: const Text('Appeler'),
                            onPressed: () {},
                          ),
                        if (c.email != null)
                          OutlinedButton.icon(
                            icon: const Icon(Icons.email_outlined, size: 18),
                            label: const Text('Email'),
                            onPressed: () {},
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              JuweiratCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Informations Générales', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 8),
                    Text('Nationalité : ${c.nationality ?? "-"}'),
                    Text('Pièce : ${c.documentType ?? "-"} n°${c.documentNumber ?? "-"}'),
                    Text('Ville / Pays : ${c.city ?? "-"}, ${c.country ?? "-"}'),
                    Text('Client depuis : ${frDate(c.createdAt)}'),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              const Text('Historique des Séjours', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              FutureBuilder<List<ReservationDto>>(
                future: repo.getReservationsByClient(clientId),
                builder: (context, resSnap) {
                  if (resSnap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
                  final resList = resSnap.data ?? [];
                  if (resList.isEmpty) return const EmptyState(message: 'Aucun séjour enregistré');
                  return Column(
                    children: resList.map((r) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: JuweiratCard(
                        onTap: () => context.push('/reservations/${r.id}'),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(r.reference, style: const TextStyle(fontWeight: FontWeight.bold)),
                                Text('${frDate(r.checkInDate)} → ${frDate(r.checkOutDate)}', style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
                              ],
                            ),
                            StatusBadge(status: r.status),
                          ],
                        ),
                      ),
                    )).toList(),
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }
}
