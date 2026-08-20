import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:juweiratapp/app/theme.dart';
import 'package:juweiratapp/app/di.dart';
import 'package:juweiratapp/core/formatters/formatters.dart';
import 'package:juweiratapp/shared/widgets/shared_widgets.dart';
import 'package:juweiratapp/shared/widgets/main_shell.dart';

final notificationsListProvider = FutureProvider.autoDispose((ref) async {
  final repo = ref.watch(notificationsRepositoryProvider);
  return await repo.getNotifications();
});

class NotificationsPage extends ConsumerWidget {
  const NotificationsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifsAsync = ref.watch(notificationsListProvider);

    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu_rounded),
            tooltip: 'Menu latéral',
            onPressed: () => mainScaffoldKey.currentState?.openDrawer(),
          ),
        ),
        title: const Text('Centre d\'Alertes & Notifications'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(notificationsListProvider),
          ),
        ],
      ),
      body: notifsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Erreur: $err', style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => ref.refresh(notificationsListProvider),
                child: const Text('Réessayer'),
              ),
            ],
          ),
        ),
        data: (notifications) {
          if (notifications.isEmpty) {
            return const EmptyState(
              message: 'Aucune notification ou alerte pour le moment',
              icon: Icons.notifications_none_rounded,
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(notificationsListProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: notifications.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final notif = notifications[index];
                final iconData = _getIconForType(notif.type);
                final iconColor = _getColorForType(notif.type);

                return JuweiratCard(
                  onTap: notif.deepLink != null
                      ? () => context.push(notif.deepLink!)
                      : null,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: iconColor.withAlpha(30),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(iconData, color: iconColor, size: 22),
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
                                    notif.title,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: JuweiratColors.charcoal),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  frDateTime(notif.createdAt.toIso8601String()),
                                  style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              notif.body,
                              style: const TextStyle(fontSize: 13, color: Color(0xFF4B5563)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  IconData _getIconForType(String type) {
    if (type.contains('reservation')) return Icons.calendar_month_rounded;
    if (type.contains('cloture')) return Icons.lock_clock_rounded;
    if (type.contains('noshow') || type.contains('annulation')) return Icons.cancel_outlined;
    if (type.contains('maintenance')) return Icons.build_rounded;
    return Icons.notifications_rounded;
  }

  Color _getColorForType(String type) {
    if (type.contains('reservation')) return const Color(0xFF1D4ED8);
    if (type.contains('cloture')) return JuweiratColors.greenDark;
    if (type.contains('noshow') || type.contains('annulation')) return JuweiratColors.statusDangerText;
    if (type.contains('maintenance')) return const Color(0xFFB45309);
    return JuweiratColors.charcoal;
  }
}
