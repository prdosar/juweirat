import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app/theme.dart';
import 'app/router.dart';
import 'core/cache/local_cache.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await LocalCache.init();

  runApp(
    const ProviderScope(
      child: JuweiratApp(),
    ),
  );
}

class JuweiratApp extends ConsumerWidget {
  const JuweiratApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Juweirat Direction',
      theme: JuweiratTheme.lightTheme,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
