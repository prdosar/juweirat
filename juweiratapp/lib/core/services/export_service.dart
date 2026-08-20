import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

class ExportService {
  static Future<void> shareCsv({
    required String fileName,
    required String csvContent,
    String? subject,
  }) async {
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/$fileName');
    // Add UTF-8 BOM for Excel compatibility
    final bom = [0xEF, 0xBB, 0xBF];
    await file.writeAsBytes([...bom, ...csvContent.codeUnits]);

    await Share.shareXFiles(
      [XFile(file.path, mimeType: 'text/csv')],
      subject: subject ?? 'Rapport Juweirat Direction',
    );
  }
}
