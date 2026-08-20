import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:juweiratapp/app/theme.dart';
import 'package:juweiratapp/app/di.dart';
import 'package:juweiratapp/core/formatters/formatters.dart';
import 'package:juweiratapp/shared/widgets/shared_widgets.dart';
import 'package:juweiratapp/shared/widgets/main_shell.dart';

final maintenanceDataProvider = FutureProvider.autoDispose((ref) async {
  final repo = ref.watch(pmsRepositoryProvider);
  return await repo.getMaintenanceTickets();
});

class MaintenancePage extends ConsumerStatefulWidget {
  const MaintenancePage({super.key});

  @override
  ConsumerState<MaintenancePage> createState() => _MaintenancePageState();
}

class _MaintenancePageState extends ConsumerState<MaintenancePage> {
  String _filter = 'all';

  @override
  Widget build(BuildContext context) {
    final ticketsAsync = ref.watch(maintenanceDataProvider);

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
        title: const Text('Maintenance & Interventions'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(maintenanceDataProvider),
          ),
        ],
      ),
      body: ticketsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Erreur: $err', style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => ref.refresh(maintenanceDataProvider),
                child: const Text('Réessayer'),
              ),
            ],
          ),
        ),
        data: (tickets) {
          final total = tickets.length;
          final pending = tickets.where((t) => t.status.toLowerCase() == 'pending' || t.status.toLowerCase() == 'en attente').length;
          final inProgress = tickets.where((t) => t.status.toLowerCase() == 'inprogress' || t.status.toLowerCase() == 'en cours').length;
          final resolved = tickets.where((t) => t.status.toLowerCase() == 'resolved' || t.status.toLowerCase() == 'résolu' || t.status.toLowerCase() == 'resolu').length;

          final filtered = tickets.where((t) {
            if (_filter == 'pending') return t.status.toLowerCase() == 'pending' || t.status.toLowerCase() == 'en attente';
            if (_filter == 'inprogress') return t.status.toLowerCase() == 'inprogress' || t.status.toLowerCase() == 'en cours';
            if (_filter == 'resolved') return t.status.toLowerCase() == 'resolved' || t.status.toLowerCase() == 'résolu' || t.status.toLowerCase() == 'resolu';
            return true;
          }).toList();

          return Column(
            children: [
              Container(
                color: Colors.white,
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: StatCard(
                            title: 'En Attente',
                            value: '$pending',
                            subtitle: 'tickets ouverts',
                            icon: Icons.hourglass_empty_rounded,
                            iconBg: const Color(0xFFFEF3C7),
                            iconColor: const Color(0xFFB45309),
                            isVertical: true,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: StatCard(
                            title: 'En Cours',
                            value: '$inProgress',
                            subtitle: 'interventions actives',
                            icon: Icons.build_rounded,
                            iconBg: const Color(0xFFDBEAFE),
                            iconColor: const Color(0xFF1D4ED8),
                            isVertical: true,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: StatCard(
                            title: 'Résolus',
                            value: '$resolved',
                            subtitle: 'tickets clôturés',
                            icon: Icons.check_circle_outline_rounded,
                            iconBg: const Color(0xFFDCFCE7),
                            iconColor: JuweiratColors.greenDark,
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
                          _buildFilterChip('all', 'Tous ($total)'),
                          const SizedBox(width: 8),
                          _buildFilterChip('pending', 'En Attente ($pending)'),
                          const SizedBox(width: 8),
                          _buildFilterChip('inprogress', 'En Cours ($inProgress)'),
                          const SizedBox(width: 8),
                          _buildFilterChip('resolved', 'Résolus ($resolved)'),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: JuweiratColors.cardBorder),

              Expanded(
                child: filtered.isEmpty
                    ? const EmptyState(message: 'Aucun ticket de maintenance pour ce filtre', icon: Icons.build_rounded)
                    : RefreshIndicator(
                        onRefresh: () async => ref.refresh(maintenanceDataProvider),
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final t = filtered[index];
                            final priorityColor = _getPriorityColor(t.priority);

                            return JuweiratCard(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Row(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                            decoration: BoxDecoration(
                                              color: JuweiratColors.charcoal,
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              'Appt ${t.unitNumber}',
                                              style: const TextStyle(color: JuweiratColors.goldLight, fontWeight: FontWeight.bold, fontSize: 12),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: priorityColor.withAlpha(30),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Text(
                                              t.priority.toUpperCase(),
                                              style: TextStyle(color: priorityColor, fontWeight: FontWeight.bold, fontSize: 10),
                                            ),
                                          ),
                                        ],
                                      ),
                                      StatusBadge(status: t.status),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    t.description,
                                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: JuweiratColors.charcoal),
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'Signalé le: ${frDate(t.reportedAt)}',
                                        style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                                      ),
                                      if (t.assignedTo != null)
                                        Text(
                                          'Assigné: ${t.assignedTo}',
                                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFF4B5563)),
                                        ),
                                    ],
                                  ),
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

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'urgent':
      case 'high':
      case 'haute':
        return JuweiratColors.statusDangerText;
      case 'medium':
      case 'moyenne':
      case 'normal':
        return const Color(0xFFB45309);
      default:
        return const Color(0xFF2563EB);
    }
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
