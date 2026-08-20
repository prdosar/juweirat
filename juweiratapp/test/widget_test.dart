import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:juweiratapp/features/auth/presentation/login_page.dart';

void main() {
  testWidgets('LoginPage renders correctly with form elements', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: LoginPage(),
        ),
      ),
    );

    // Verify Title & Text
    expect(find.text('RÉSIDENCE JUWEIRAT'), findsOneWidget);
    expect(find.text('Connexion Espace Direction'), findsOneWidget);
    expect(find.text('SE CONNECTER'), findsOneWidget);
    expect(find.byType(TextField), findsNWidgets(2));
  });
}
