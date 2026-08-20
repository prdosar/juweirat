import 'package:intl/intl.dart';

String money(num? n, [String cur = 'FCFA']) {
  if (n == null) return '0 $cur';
  final rounded = n.round();
  final fmt = NumberFormat('#,##0', 'fr_FR').format(rounded);
  return '$fmt $cur';
}

String compactMoney(num? n, [String cur = 'FCFA']) {
  if (n == null || n == 0) return '0 $cur';
  if (n.abs() >= 1000000000) {
    return '${(n / 1000000000).toStringAsFixed(1)} Mrd $cur';
  }
  if (n.abs() >= 1000000) {
    return '${(n / 1000000).toStringAsFixed(1)} M $cur';
  }
  if (n.abs() >= 1000) {
    return '${(n / 1000).toStringAsFixed(1)} k $cur';
  }
  return money(n, cur);
}

String frDate(String? iso) {
  if (iso == null || iso.isEmpty) return '-';
  try {
    final dt = DateTime.parse(iso);
    return DateFormat('dd/MM/yyyy').format(dt);
  } catch (_) {
    return iso;
  }
}

String frDateTime(String? iso) {
  if (iso == null || iso.isEmpty) return '-';
  try {
    final dt = DateTime.parse(iso);
    return DateFormat('dd/MM/yyyy HH:mm').format(dt);
  } catch (_) {
    return iso;
  }
}

String fmtTime(String? iso) {
  if (iso == null || iso.isEmpty) return '-';
  try {
    final dt = DateTime.parse(iso);
    return DateFormat('HH:mm').format(dt);
  } catch (_) {
    return iso;
  }
}

double nightsBetween(String a, String b) {
  try {
    final da = DateTime.parse(a);
    final db = DateTime.parse(b);
    return db.difference(da).inDays.toDouble();
  } catch (_) {
    return 0.0;
  }
}

String percent(num? v) {
  if (v == null || v.isNaN || v.isInfinite) return '0%';
  return '${v.toDouble().toStringAsFixed(1)}%';
}
