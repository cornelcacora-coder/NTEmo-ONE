import 'dart:convert';
import 'package:http/http.dart' as http;
import 'firebase_config.dart';

class FirestoreService {
  final http.Client _client = http.Client();

  /// Récupère un collaborateur depuis Firestore par son identifiant (document ID)
  Future<Map<String, dynamic>?> getEmployee(String employeeId) async {
    try {
      final url = Uri.parse(
          '${FirebaseConfig.firestoreBaseUrl}/employees/$employeeId?key=${FirebaseConfig.apiKey}');
      final response = await _client.get(url);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final parsed = _parseFirestoreFields(data['fields'] ?? {});
        // Injecter l'ID du document
        final name = data['name'] as String? ?? '';
        parsed['id'] = name.split('/').last;
        return parsed;
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  /// 🔑 Recherche un employé par son badge_security_token (activation par scan QR)
  Future<Map<String, dynamic>?> findEmployeeByToken(String token) async {
    try {
      // Utilisation d'une requête Firestore structuredQuery
      final url = Uri.parse(
          '${FirebaseConfig.firestoreBaseUrl}:runQuery?key=${FirebaseConfig.apiKey}');

      final body = jsonEncode({
        "structuredQuery": {
          "from": [{"collectionId": "employees"}],
          "where": {
            "fieldFilter": {
              "field": {"fieldPath": "badge_security_token"},
              "op": "EQUAL",
              "value": {"stringValue": token}
            }
          },
          "limit": 1
        }
      });

      final response = await _client.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: body,
      );

      if (response.statusCode == 200) {
        final results = jsonDecode(response.body) as List<dynamic>;
        for (final result in results) {
          final doc = result['document'];
          if (doc != null) {
            final parsed = _parseFirestoreFields(doc['fields'] ?? {});
            final name = doc['name'] as String? ?? '';
            parsed['id'] = name.split('/').last;
            return parsed;
          }
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  /// 🔑 Recherche par matricule (alternative d'activation)
  Future<Map<String, dynamic>?> findEmployeeByMatricule(String matricule) async {
    try {
      final url = Uri.parse(
          '${FirebaseConfig.firestoreBaseUrl}:runQuery?key=${FirebaseConfig.apiKey}');

      final body = jsonEncode({
        "structuredQuery": {
          "from": [{"collectionId": "employees"}],
          "where": {
            "fieldFilter": {
              "field": {"fieldPath": "matricule"},
              "op": "EQUAL",
              "value": {"stringValue": matricule}
            }
          },
          "limit": 1
        }
      });

      final response = await _client.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: body,
      );

      if (response.statusCode == 200) {
        final results = jsonDecode(response.body) as List<dynamic>;
        for (final result in results) {
          final doc = result['document'];
          if (doc != null) {
            final parsed = _parseFirestoreFields(doc['fields'] ?? {});
            final name = doc['name'] as String? ?? '';
            parsed['id'] = name.split('/').last;
            return parsed;
          }
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  /// Récupère la liste des collaborateurs dans Firestore
  Future<List<Map<String, dynamic>>> listEmployees() async {
    try {
      final url = Uri.parse(
          '${FirebaseConfig.firestoreBaseUrl}/employees?key=${FirebaseConfig.apiKey}');
      final response = await _client.get(url);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final documents = data['documents'] as List<dynamic>? ?? [];
        return documents.map((doc) {
          final fields = doc['fields'] as Map<String, dynamic>? ?? {};
          final parsed = _parseFirestoreFields(fields);
          final name = doc['name'] as String? ?? '';
          parsed['id'] = name.split('/').last;
          return parsed;
        }).toList();
      }
    } catch (e) {
      // ignore
    }
    return [];
  }

  /// Récupère l'historique des pointages filtrés par employeeId
  Future<List<Map<String, dynamic>>> getAttendances(String employeeId) async {
    try {
      final url = Uri.parse(
          '${FirebaseConfig.firestoreBaseUrl}/attendances?key=${FirebaseConfig.apiKey}');
      final response = await _client.get(url);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final documents = data['documents'] as List<dynamic>? ?? [];
        return documents
            .map((doc) => _parseFirestoreFields(doc['fields'] ?? {}))
            .where((att) =>
                att['employee_id'] == employeeId ||
                att['matricule'] == employeeId)
            .toList();
      }
    } catch (e) {
      // ignore
    }
    return [];
  }

  /// Décode les types Firestore REST (`stringValue`, `integerValue`, etc.)
  Map<String, dynamic> _parseFirestoreFields(Map<String, dynamic> fields) {
    final Map<String, dynamic> result = {};
    fields.forEach((key, val) {
      if (val is Map) {
        if (val.containsKey('stringValue')) {
          result[key] = val['stringValue'];
        } else if (val.containsKey('integerValue')) {
          result[key] = int.tryParse(val['integerValue'].toString());
        } else if (val.containsKey('booleanValue')) {
          result[key] = val['booleanValue'];
        } else if (val.containsKey('timestampValue')) {
          result[key] = val['timestampValue'];
        } else {
          result[key] = val.values.isNotEmpty ? val.values.first : null;
        }
      } else {
        result[key] = val;
      }
    });
    return result;
  }
}

