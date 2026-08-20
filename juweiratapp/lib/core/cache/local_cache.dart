import 'dart:convert';
import 'package:hive_flutter/hive_flutter.dart';

class LocalCache {
  static const String cacheBoxName = 'juweirat_cache';
  static const String prefsBoxName = 'juweirat_prefs';

  static Future<void> init() async {
    await Hive.initFlutter();
    await Hive.openBox<String>(cacheBoxName);
    await Hive.openBox<dynamic>(prefsBoxName);
  }

  static Future<void> setJson(String key, dynamic data, {Duration ttl = const Duration(minutes: 5)}) async {
    final box = Hive.box<String>(cacheBoxName);
    final record = {
      'exp': DateTime.now().add(ttl).millisecondsSinceEpoch,
      'data': data,
    };
    await box.put(key, jsonEncode(record));
  }

  static dynamic getJson(String key) {
    final box = Hive.box<String>(cacheBoxName);
    final raw = box.get(key);
    if (raw == null) return null;
    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      final exp = decoded['exp'] as int;
      if (DateTime.now().millisecondsSinceEpoch > exp) {
        box.delete(key);
        return null;
      }
      return decoded['data'];
    } catch (_) {
      return null;
    }
  }

  static int getLastSeen(String key) {
    final box = Hive.box<dynamic>(prefsBoxName);
    return (box.get(key, defaultValue: 0) as num).toInt();
  }

  static Future<void> setLastSeen(String key, int val) async {
    final box = Hive.box<dynamic>(prefsBoxName);
    await box.put(key, val);
  }

  static Future<void> clearAll() async {
    final box = Hive.box<String>(cacheBoxName);
    await box.clear();
  }
}
