import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:juweiratapp/app/theme.dart';
import 'package:juweiratapp/features/auth/presentation/auth_notifier.dart';

/// Clé globale exposée pour que les pages enfants puissent ouvrir le drawer du shell.
final GlobalKey<ScaffoldState> mainScaffoldKey = GlobalKey<ScaffoldState>();

class MainShell extends ConsumerWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  int _calculateSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/dashboard')) return 0;
    if (location.startsWith('/reservations')) return 1;
    if (location.startsWith('/pms/journee')) return 2;
    if (location.startsWith('/rapports')) return 3;
    if (location.startsWith('/notifications')) return 4;
    return 0;
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go('/dashboard');
        break;
      case 1:
        context.go('/reservations');
        break;
      case 2:
        context.go('/pms/journee');
        break;
      case 3:
        context.go('/rapports');
        break;
      case 4:
        context.go('/notifications');
        break;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentIndex = _calculateSelectedIndex(context);

    return Scaffold(
      key: mainScaffoldKey,
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            DrawerHeader(
              decoration: const BoxDecoration(color: JuweiratColors.charcoal),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Image.asset(
                    'assets/images/logo.png',
                    height: 48,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) => Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: JuweiratColors.charcoal800,
                        shape: BoxShape.circle,
                        border: Border.all(color: JuweiratColors.green, width: 1.5),
                      ),
                      child: const Icon(Icons.hotel_rounded, color: JuweiratColors.green, size: 28),
                    ),
                  ),
                  const SizedBox(height: 10),
                  const Text('RÉSIDENCE JUWEIRAT', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                  const Text('Direction & Exploitation', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12)),
                ],
              ),
            ),
            ListTile(
              leading: const Icon(Icons.dashboard_rounded),
              title: const Text('Tableau de Bord'),
              onTap: () {
                Navigator.of(context).pop();
                context.go('/dashboard');
              },
            ),
            ListTile(
              leading: const Icon(Icons.book_online_rounded),
              title: const Text('Réservations'),
              onTap: () {
                Navigator.of(context).pop();
                context.go('/reservations');
              },
            ),
            ListTile(
              leading: const Icon(Icons.people_alt_rounded),
              title: const Text('Clients'),
              onTap: () {
                Navigator.of(context).pop();
                context.push('/clients');
              },
            ),
            ListTile(
              leading: const Icon(Icons.meeting_room_rounded),
              title: const Text('Chambres & Tarifs'),
              onTap: () {
                Navigator.of(context).pop();
                context.push('/rooms');
              },
            ),
            const Divider(),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Text(
                'EXPLOITATION PMS',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF6B7280)),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.wb_sunny_rounded),
              title: const Text('Journée PMS'),
              onTap: () {
                Navigator.of(context).pop();
                context.go('/pms/journee');
              },
            ),
            ListTile(
              leading: const Icon(Icons.receipt_long_rounded),
              title: const Text('Folios'),
              onTap: () {
                Navigator.of(context).pop();
                context.push('/pms/folios');
              },
            ),
            ListTile(
              leading: const Icon(Icons.cleaning_services_rounded),
              title: const Text('Gouvernante & Étages'),
              onTap: () {
                Navigator.of(context).pop();
                context.push('/pms/gouvernante');
              },
            ),
            ListTile(
              leading: const Icon(Icons.build_rounded),
              title: const Text('Maintenance'),
              onTap: () {
                Navigator.of(context).pop();
                context.push('/pms/maintenance');
              },
            ),
            ListTile(
              leading: const Icon(Icons.shopping_bag_rounded),
              title: const Text('Ventes Directes'),
              onTap: () {
                Navigator.of(context).pop();
                context.push('/ventes-directes');
              },
            ),
            ListTile(
              leading: const Icon(Icons.lock_clock_rounded),
              title: const Text('Clôture Journée'),
              onTap: () {
                Navigator.of(context).pop();
                context.push('/pms/cloture');
              },
            ),
            ListTile(
              leading: const Icon(Icons.analytics_rounded),
              title: const Text('Statistiques & Rapports'),
              onTap: () {
                Navigator.of(context).pop();
                context.go('/rapports');
              },
            ),
            const Divider(),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Text(
                'COMPTABILITÉ & FINANCE',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF6B7280)),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.account_balance_wallet_rounded),
              title: const Text('Comptabilité & Caisse'),
              subtitle: const Text('Journal, Sessions, TVA', style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
              onTap: () {
                Navigator.of(context).pop();
                context.push('/comptabilite');
              },
            ),
            const Divider(),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Text(
                'ADMINISTRATION',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF6B7280)),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.manage_accounts_rounded),
              title: const Text('Gestion des Utilisateurs'),
              onTap: () {
                Navigator.of(context).pop();
                context.push('/users');
              },
            ),
            ListTile(
              leading: const Icon(Icons.notifications_rounded),
              title: const Text('Centre d\'Alertes'),
              onTap: () {
                Navigator.of(context).pop();
                context.go('/notifications');
              },
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.logout_rounded, color: Colors.red),
              title: const Text('Déconnexion', style: TextStyle(color: Colors.red)),
              onTap: () async {
                Navigator.of(context).pop();
                await ref.read(authStateProvider.notifier).logout();
                if (context.mounted) context.go('/login');
              },
            ),
          ],
        ),
      ),
      body: child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: currentIndex,
        onTap: (idx) => _onItemTapped(idx, context),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_rounded), label: 'Accueil'),
          BottomNavigationBarItem(icon: Icon(Icons.book_online_rounded), label: 'Réservations'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_month_rounded), label: 'Journée'),
          BottomNavigationBarItem(icon: Icon(Icons.insights_rounded), label: 'Rapports'),
          BottomNavigationBarItem(icon: Icon(Icons.notifications_rounded), label: 'Alertes'),
        ],
      ),
    );
  }
}
