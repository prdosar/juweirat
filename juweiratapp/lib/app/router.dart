import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:juweiratapp/features/auth/presentation/auth_notifier.dart';
import 'package:juweiratapp/features/auth/presentation/login_page.dart';
import 'package:juweiratapp/features/dashboard/presentation/dashboard_page.dart';
import 'package:juweiratapp/features/reservations/presentation/reservation_pages.dart';
import 'package:juweiratapp/features/clients/presentation/client_pages.dart';
import 'package:juweiratapp/features/pms/journee/presentation/journee_page.dart';
import 'package:juweiratapp/features/pms/folios/presentation/folio_pages.dart';
import 'package:juweiratapp/features/pms/statistiques/presentation/statistiques_page.dart';
import 'package:juweiratapp/features/rooms/presentation/rooms_page.dart';
import 'package:juweiratapp/features/notifications/presentation/notifications_page.dart';
import 'package:juweiratapp/features/pms/gouvernante/presentation/gouvernante_page.dart';
import 'package:juweiratapp/features/pms/maintenance/presentation/maintenance_page.dart';
import 'package:juweiratapp/features/pms/cloture/presentation/cloture_page.dart';
import 'package:juweiratapp/features/ventes/presentation/ventes_page.dart';
import 'package:juweiratapp/shared/widgets/main_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/dashboard',
    redirect: (context, state) {
      final isAuth = authState.isAuthenticated;
      final isLogin = state.matchedLocation == '/login';

      if (!isAuth && !isLogin) return '/login';
      if (isAuth && isLogin) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            builder: (context, state) => const DashboardPage(),
          ),
          GoRoute(
            path: '/reservations',
            builder: (context, state) => const ReservationListPage(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) {
                  final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
                  return ReservationDetailPage(reservationId: id);
                },
              ),
            ],
          ),
          GoRoute(
            path: '/clients',
            builder: (context, state) => const ClientListPage(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) {
                  final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
                  return ClientDetailPage(clientId: id);
                },
              ),
            ],
          ),
          GoRoute(
            path: '/pms/journee',
            builder: (context, state) => const JourneePage(),
          ),
          GoRoute(
            path: '/pms/folios',
            builder: (context, state) => const FolioListPage(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) {
                  final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
                  return FolioDetailPage(folioId: id);
                },
              ),
            ],
          ),
          GoRoute(
            path: '/rapports',
            builder: (context, state) => const StatistiquesPage(),
          ),
          GoRoute(
            path: '/notifications',
            builder: (context, state) => const NotificationsPage(),
          ),
          GoRoute(
            path: '/rooms',
            builder: (context, state) => const RoomsTarifsPage(),
          ),
          GoRoute(
            path: '/pms/gouvernante',
            builder: (context, state) => const GouvernantePage(),
          ),
          GoRoute(
            path: '/pms/maintenance',
            builder: (context, state) => const MaintenancePage(),
          ),
          GoRoute(
            path: '/pms/cloture',
            builder: (context, state) => const CloturePage(),
          ),
          GoRoute(
            path: '/ventes-directes',
            builder: (context, state) => const VentesDirectesPage(),
          ),
        ],
      ),
    ],
  );
});
