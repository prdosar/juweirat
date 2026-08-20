import 'package:flutter/material.dart';

class JuweiratColors {
  // Tokens principaux
  static const Color charcoal = Color(0xFF1A1A1A);
  static const Color charcoal800 = Color(0xFF252525);
  static const Color charcoal700 = Color(0xFF2E2E2E);
  static const Color charcoal600 = Color(0xFF3A3A3A);

  static const Color green = Color(0xFF3DC720);
  static const Color greenLight = Color(0xFF5FDB42);
  static const Color greenDark = Color(0xFF2B9618);

  static const Color invoiceGreen = Color(0xFF1B4332);
  static const Color gold = Color(0xFFB08D57);
  static const Color goldLight = Color(0xFFD4AF37);
  static const Color surface = Color(0xFFFAF8F5);
  static const Color contentBg = Color(0xFFF0F2F5);
  static const Color cardBorder = Color(0xFFE5E9E6);
  static const Color white = Color(0xFFFFFFFF);

  // Sémantique statuts
  static const Color statusSuccessText = Color(0xFF15803D);
  static const Color statusSuccessBg = Color(0xFFDCFCE7);

  static const Color statusWarningText = Color(0xFFB45309);
  static const Color statusWarningBg = Color(0xFFFEF3C7);

  static const Color statusDangerText = Color(0xFFB91C1C);
  static const Color statusDangerBg = Color(0xFFFEE2E2);

  static const Color statusInfoText = Color(0xFF1D4ED8);
  static const Color statusInfoBg = Color(0xFFDBEAFE);

  static const Color statusNeutralText = Color(0xFF4B5563);
  static const Color statusNeutralBg = Color(0xFFF3F4F6);

  static const Color statusPurpleText = Color(0xFF7E22CE);
  static const Color statusPurpleBg = Color(0xFFFAF5FF);
}

class JuweiratTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: JuweiratColors.contentBg,
      primaryColor: JuweiratColors.green,
      colorScheme: const ColorScheme.light(
        primary: JuweiratColors.green,
        onPrimary: JuweiratColors.charcoal,
        secondary: JuweiratColors.invoiceGreen,
        surface: JuweiratColors.white,
        onSurface: JuweiratColors.charcoal,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: JuweiratColors.charcoal,
        foregroundColor: JuweiratColors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: JuweiratColors.white,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
      cardTheme: CardThemeData(
        color: JuweiratColors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: JuweiratColors.cardBorder, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: JuweiratColors.white,
        selectedItemColor: JuweiratColors.greenDark,
        unselectedItemColor: Color(0xFF9CA3AF),
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
        unselectedLabelStyle: TextStyle(fontSize: 11),
      ),
    );
  }
}
