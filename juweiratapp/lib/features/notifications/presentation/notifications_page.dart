import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:juweiratapp/app/theme.dart';
import 'package:juweiratapp/app/di.dart';
import 'package:juweiratapp/core/formatters/formatters.dart';
import 'package:juweiratapp/core/models/dtos.dart';
import 'package:juweiratapp/core/models/paged_result.dart';
import 'package:juweiratapp/shared/widgets/shared_widgets.dart';
import 'package:juweiratapp/shared/widgets/main_shell.dart';

final notificationsOverviewProvider = FutureProvider.autoDispose((ref) async {
  final notifRepo = ref.watch(notificationsRepositoryProvider);
  final messagesRepo = ref.watch(messagesRepositoryProvider);
  final resaRepo = ref.watch(reservationRepositoryProvider);

  NotificationSummaryDto? summary;
  List<ContactMessageDto> messages = [];
  PagedResult<ReservationDto>? pagedResa;

  try {
    summary = await notifRepo.getSummary();
  } catch (e) {
    debugPrint('Error loading notification summary: $e');
  }

  try {
    messages = await messagesRepo.getMessages();
  } catch (e) {
    debugPrint('Error loading contact messages: $e');
  }

  try {
    pagedResa = await resaRepo.getPaged(pageSize: 20, isDescending: true);
  } catch (e) {
    debugPrint('Error loading reservations: $e');
  }

  return {
    'summary': summary,
    'messages': messages,
    'pagedReservations': pagedResa,
  };
});

class NotificationsPage extends ConsumerStatefulWidget {
  const NotificationsPage({super.key});

  @override
  ConsumerState<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends ConsumerState<NotificationsPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final overviewAsync = ref.watch(notificationsOverviewProvider);

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
        title: const Text('Centre d\'Alertes & Notifications'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Actualiser',
            onPressed: () => ref.refresh(notificationsOverviewProvider),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: JuweiratColors.green,
          unselectedLabelColor: const Color(0xFF9CA3AF),
          indicatorColor: JuweiratColors.green,
          indicatorWeight: 3,
          tabs: const [
            Tab(text: 'Alertes Actives'),
            Tab(text: 'Messages Site'),
            Tab(text: 'Résas Récentes'),
          ],
        ),
      ),
      body: overviewAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline_rounded, color: Colors.red, size: 48),
                const SizedBox(height: 12),
                Text('Erreur: $err', textAlign: TextAlign.center, style: const TextStyle(color: Colors.red)),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  icon: const Icon(Icons.refresh),
                  onPressed: () => ref.refresh(notificationsOverviewProvider),
                  label: const Text('Réessayer'),
                ),
              ],
            ),
          ),
        ),
        data: (data) {
          final summary = data['summary'] as NotificationSummaryDto?;
          final messages = data['messages'] as List<ContactMessageDto>;
          final pagedResa = data['pagedReservations'] as PagedResult<ReservationDto>?;
          final List<ReservationDto> reservations = pagedResa?.items ?? [];

          return TabBarView(
            controller: _tabController,
            children: [
              _buildAlertsTab(summary, messages, reservations),
              _buildMessagesTab(messages),
              _buildRecentReservationsTab(reservations),
            ],
          );
        },
      ),
    );
  }

  // ── Tab 1: Alertes & Synthèse (Conforme Backoffice) ───────────────────────
  Widget _buildAlertsTab(
    NotificationSummaryDto? summary,
    List<ContactMessageDto> messages,
    List<ReservationDto> reservations,
  ) {
    final pendingCount = summary?.pendingReservationsCount ?? 0;
    final webTodayCount = summary?.websiteReservationsTodayCount ?? 0;
    final unreadCount = summary?.unreadMessagesCount ?? messages.where((m) => m.isUnread).length;
    final daysNotClosed = summary?.daysNotClosedCount ?? 0;
    final totalAlerts = pendingCount + webTodayCount + unreadCount + daysNotClosed;
    final systemDateLabel = summary != null && summary.systemDate.isNotEmpty ? frDate(summary.systemDate) : '-';
    final todayDateLabel = summary != null && summary.todayDate.isNotEmpty ? frDate(summary.todayDate) : '-';

    return RefreshIndicator(
      onRefresh: () async => ref.refresh(notificationsOverviewProvider),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Statut PMS Journée Système ────────────────────────────────────
          if (daysNotClosed > 0) ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFCA5A5)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.warning_amber_rounded, color: Color(0xFFDC2626), size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '$daysNotClosed CLÔTURE(S) EN ATTENTE',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF991B1B)),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Le PMS est au $systemDateLabel (jour réel : $todayDateLabel). Clôturez pour synchroniser.',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF7F1D1D)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFDC2626),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                    onPressed: () => context.push('/pms/cloture'),
                    child: const Text('Clôturer'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ] else ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_outline_rounded, color: JuweiratColors.greenDark, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'PMS Synchronisé · Journée du $systemDateLabel',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: JuweiratColors.greenDark),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // ── Top Summary KPI Card ──────────────────────────────────────────
          JuweiratCard(
            color: JuweiratColors.charcoal,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'TABLEAU DES ALERTES EN TEMPS RÉEL',
                      style: TextStyle(
                        color: JuweiratColors.goldLight,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.8,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: totalAlerts > 0 ? Colors.red : JuweiratColors.greenDark,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        totalAlerts > 0 ? '$totalAlerts active(s)' : 'À jour',
                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  totalAlerts > 0
                      ? '$totalAlerts action(s) requise(s)'
                      : 'Aucune alerte en attente',
                  style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 4),
                Text(
                  'Journée hôtelière en cours : $systemDateLabel',
                  style: const TextStyle(color: Color(0xFFD1D5DB), fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          const Text('Catégories d\'Alertes', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: JuweiratColors.charcoal)),
          const SizedBox(height: 10),

          // 1. Réservations en attente (Pending)
          _buildAlertCategoryTile(
            icon: Icons.assignment_late_rounded,
            iconBg: const Color(0xFFDCFCE7),
            iconColor: JuweiratColors.greenDark,
            title: 'Réservation(s) en attente',
            count: pendingCount,
            subtitle: 'Statut Pending — à confirmer ou annuler',
            onTap: () => context.push('/reservations'),
          ),
          const SizedBox(height: 8),

          // 2. Réservations reçues du site aujourd'hui (Website)
          _buildAlertCategoryTile(
            icon: Icons.language_rounded,
            iconBg: const Color(0xFFDBEAFE),
            iconColor: const Color(0xFF1D4ED8),
            title: 'Résa(s) reçues du site aujourd\'hui',
            count: webTodayCount,
            subtitle: 'Créées le $systemDateLabel depuis juweirat.com',
            onTap: () => context.push('/reservations'),
          ),
          const SizedBox(height: 8),

          // 3. Messages non lus
          _buildAlertCategoryTile(
            icon: Icons.mark_email_unread_rounded,
            iconBg: const Color(0xFFFEF3C7),
            iconColor: const Color(0xFFB45309),
            title: 'Message(s) de contact non lu(s)',
            count: unreadCount,
            subtitle: 'Formulaire de contact du site juweirat.com',
            onTap: () => _tabController.animateTo(1),
          ),
          const SizedBox(height: 8),

          // 4. Clôtures non effectuées
          if (daysNotClosed > 0)
            _buildAlertCategoryTile(
              icon: Icons.history_toggle_off_rounded,
              iconBg: const Color(0xFFFEE2E2),
              iconColor: const Color(0xFFDC2626),
              title: 'Journée(s) à clôturer',
              count: daysNotClosed,
              subtitle: 'Le PMS est encore au $systemDateLabel (jour réel : $todayDateLabel)',
              onTap: () => context.push('/pms/cloture'),
            ),

          const SizedBox(height: 20),

          // ── Derniers Messages Reçus Aperçu ───────────────────────────────
          if (messages.isNotEmpty) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Derniers Messages Reçus', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                TextButton(
                  onPressed: () => _tabController.animateTo(1),
                  child: const Text('Voir tout'),
                ),
              ],
            ),
            ...messages.take(3).map((m) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: JuweiratCard(
                    onTap: () => _tabController.animateTo(1),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        CircleAvatar(
                          radius: 18,
                          backgroundColor: m.isUnread ? const Color(0xFFFEF3C7) : const Color(0xFFF3F4F6),
                          child: Icon(
                            m.isUnread ? Icons.mail_rounded : Icons.mail_outline_rounded,
                            size: 18,
                            color: m.isUnread ? const Color(0xFFB45309) : const Color(0xFF6B7280),
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
                                      m.name,
                                      style: TextStyle(
                                        fontWeight: m.isUnread ? FontWeight.bold : FontWeight.w600,
                                        fontSize: 13,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  Text(
                                    frDate(m.createdAt.toIso8601String()),
                                    style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                m.subject.isNotEmpty ? m.subject : 'Message sans sujet',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: JuweiratColors.charcoal),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                m.message,
                                style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                )),
          ],
        ],
      ),
    );
  }

  Widget _buildAlertCategoryTile({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String title,
    required int count,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return JuweiratCard(
      onTap: onTap,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: iconColor, size: 22),
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
                        title,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: JuweiratColors.charcoal),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: count > 0 ? iconColor : const Color(0xFFE5E7EB),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '$count',
                        style: TextStyle(
                          color: count > 0 ? Colors.white : const Color(0xFF6B7280),
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                ),
              ],
            ),
          ),
          const SizedBox(width: 4),
          const Icon(Icons.chevron_right_rounded, color: Color(0xFF9CA3AF), size: 20),
        ],
      ),
    );
  }

  // ── Tab 2: Messages de Contact du Site ─────────────────────────────────────
  Widget _buildMessagesTab(List<ContactMessageDto> messages) {
    if (messages.isEmpty) {
      return RefreshIndicator(
        onRefresh: () async => ref.refresh(notificationsOverviewProvider),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: const [
            EmptyState(
              message: 'Aucun message de contact reçu depuis le site web',
              icon: Icons.inbox_rounded,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async => ref.refresh(notificationsOverviewProvider),
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: messages.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final m = messages[index];

          return JuweiratCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 14,
                          backgroundColor: JuweiratColors.charcoal,
                          child: Text(
                            m.name.isNotEmpty ? m.name[0].toUpperCase() : 'C',
                            style: const TextStyle(color: JuweiratColors.goldLight, fontWeight: FontWeight.bold, fontSize: 11),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          m.name,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: JuweiratColors.charcoal),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: m.isUnread ? const Color(0xFFFEF3C7) : const Color(0xFFF3F4F6),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        m.isUnread ? 'NOUVEAU' : 'TRAITÉ',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                          color: m.isUnread ? const Color(0xFFB45309) : const Color(0xFF4B5563),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                if (m.subject.isNotEmpty) ...[
                  Text(
                    m.subject,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: JuweiratColors.charcoal),
                  ),
                  const SizedBox(height: 4),
                ],

                Text(
                  m.message,
                  style: const TextStyle(fontSize: 12, color: Color(0xFF374151), height: 1.4),
                ),
                const Divider(height: 16, color: JuweiratColors.cardBorder),

                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(m.email, style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                        if (m.phone != null && m.phone!.isNotEmpty)
                          Text('Tél : ${m.phone!}', style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                      ],
                    ),
                    Text(
                      frDateTime(m.createdAt.toIso8601String()),
                      style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF)),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ── Tab 3: Réservations Récentes / En Attente ─────────────────────────────
  Widget _buildRecentReservationsTab(List<ReservationDto> reservations) {
    if (reservations.isEmpty) {
      return RefreshIndicator(
        onRefresh: () async => ref.refresh(notificationsOverviewProvider),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: const [
            EmptyState(
              message: 'Aucune réservation récente trouvée',
              icon: Icons.book_online_rounded,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async => ref.refresh(notificationsOverviewProvider),
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: reservations.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final r = reservations[index];
          final isPending = r.status.toLowerCase() == 'pending';
          final isWeb = (r.source ?? '').toLowerCase() == 'website';

          return JuweiratCard(
            onTap: () => context.push('/reservations/${r.id}'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      r.reference,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: JuweiratColors.charcoal),
                    ),
                    Row(
                      children: [
                        if (isWeb)
                          Container(
                            margin: const EdgeInsets.only(right: 6),
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: const Color(0xFFBFDBFE)),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.language_rounded, size: 10, color: Color(0xFF1D4ED8)),
                                SizedBox(width: 3),
                                Text('Site Web', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF1D4ED8))),
                              ],
                            ),
                          ),
                        StatusBadge(status: r.status),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  r.clientFullName,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: JuweiratColors.charcoal),
                ),
                const SizedBox(height: 2),
                Text(
                  '${r.categoryNameFr} · ${frDate(r.checkInDate)} au ${frDate(r.checkOutDate)} (${r.nights} nuit${r.nights > 1 ? "s" : ""})',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                ),
                const Divider(height: 14, color: JuweiratColors.cardBorder),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Créée: ${r.createdAt != null ? frDate(r.createdAt!) : "-"}',
                      style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF)),
                    ),
                    Text(
                      money(r.totalPrice),
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: JuweiratColors.greenDark),
                    ),
                  ],
                ),
                if (isPending) ...[
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'Action requise : Confirmer ou Annuler la réservation',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFB45309)),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}
