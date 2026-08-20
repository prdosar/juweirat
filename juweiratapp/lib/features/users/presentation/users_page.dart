import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:juweiratapp/app/theme.dart';
import 'package:juweiratapp/app/di.dart';
import 'package:juweiratapp/core/formatters/formatters.dart';
import 'package:juweiratapp/shared/widgets/shared_widgets.dart';
import 'package:juweiratapp/shared/widgets/main_shell.dart';

final usersListProvider = FutureProvider.autoDispose((ref) async {
  final repo = ref.watch(usersRepositoryProvider);
  return await repo.getUsers(includeInactive: true);
});

class UsersPage extends ConsumerWidget {
  const UsersPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final usersAsync = ref.watch(usersListProvider);

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
        title: const Text('Gestion des Utilisateurs'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(usersListProvider),
          ),
        ],
      ),
      body: usersAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Erreur: $err', style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => ref.refresh(usersListProvider),
                child: const Text('Réessayer'),
              ),
            ],
          ),
        ),
        data: (users) {
          if (users.isEmpty) {
            return const EmptyState(
              message: 'Aucun compte utilisateur trouvé',
              icon: Icons.people_outline_rounded,
            );
          }

          final admins = users.where((u) => u.role.toLowerCase() == 'admin').length;
          final actifs = users.where((u) => u.isActive).length;

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(usersListProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Top KPI Summary
                JuweiratCard(
                  color: JuweiratColors.charcoal,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'ÉQUIPE & UTILISATEURS DU SYSTÈME',
                        style: TextStyle(
                          color: JuweiratColors.goldLight,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '${users.length} Compte(s) enregistrés',
                        style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$actifs compte(s) actif(s) · $admins administrateur(s)',
                        style: const TextStyle(color: Color(0xFFD1D5DB), fontSize: 12),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                const Text('Liste des Collaborateurs', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),

                ...users.map((u) {
                  final roleBadgeColor = u.role.toLowerCase() == 'admin'
                      ? const Color(0xFFFEF3C7)
                      : (u.role.toLowerCase() == 'comptable' ? const Color(0xFFE0E7FF) : const Color(0xFFF3F4F6));
                  final roleTextColor = u.role.toLowerCase() == 'admin'
                      ? const Color(0xFFB45309)
                      : (u.role.toLowerCase() == 'comptable' ? const Color(0xFF3730A3) : const Color(0xFF4B5563));

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: JuweiratCard(
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 22,
                            backgroundColor: JuweiratColors.charcoal,
                            child: Text(
                              (u.firstName.isNotEmpty ? u.firstName[0] : (u.lastName.isNotEmpty ? u.lastName[0] : 'U')).toUpperCase(),
                              style: const TextStyle(color: JuweiratColors.goldLight, fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        u.fullName,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: JuweiratColors.charcoal),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: roleBadgeColor,
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        u.role.toUpperCase(),
                                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: roleTextColor),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(u.email, style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Icon(
                                      u.isActive ? Icons.check_circle_rounded : Icons.cancel_rounded,
                                      size: 13,
                                      color: u.isActive ? JuweiratColors.greenDark : Colors.red,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      u.isActive ? 'Compte actif' : 'Désactivé',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                        color: u.isActive ? JuweiratColors.greenDark : Colors.red,
                                      ),
                                    ),
                                    if (u.lastLoginAt != null) ...[
                                      const SizedBox(width: 8),
                                      const Text('·', style: TextStyle(color: Color(0xFF9CA3AF))),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Vu : ${frDateTime(u.lastLoginAt)}',
                                        style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                                      ),
                                    ],
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ),
          );
        },
      ),
    );
  }
}
