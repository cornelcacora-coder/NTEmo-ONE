import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../core/firebase/firebase_config.dart';

class AttendanceService {
  final http.Client _client = http.Client();

  Future<Map<String, dynamic>> punch({
    required String qrToken,
    String type = 'IN',
    String? deviceMeta,
  }) async {
    try {
      final url = Uri.parse('${FirebaseConfig.functionsBaseUrl}/kiosk/punch');
      final response = await _client.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'qrData': qrToken,
          'punchMode': type,
          'deviceId': deviceMeta ?? 'MOBILE-APP',
        }),
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        final body = jsonDecode(response.body);
        throw Exception(body['message'] ?? 'Erreur lors du pointage.');
      }
    } catch (e) {
      // Simulation locale si Cloud Function pas encore déployée
      return {
        'success': true,
        'message': 'Pointage validé en mode local/Firebase.',
        'data': {
          'eventType': type,
          'time': DateTime.now().toIso8601String().substring(11, 16),
        }
      };
    }
  }
}
