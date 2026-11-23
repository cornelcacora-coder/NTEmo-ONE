import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Gestion de la session de l'employé sur le mobile.
/// L'activation se fait une seule fois en scannant le QR code du badge physique.
/// L'ID et les données sont ensuite conservés localement de façon sécurisée.
class SessionService {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static const String _keyEmployeeId = 'ntemo_employee_id';
  static const String _keyEmployeeData = 'ntemo_employee_data';
  static const String _keyActivatedAt = 'ntemo_activated_at';

  /// Vérifie si l'employé a déjà activé son compte
  static Future<bool> isActivated() async {
    final id = await _storage.read(key: _keyEmployeeId);
    return id != null && id.isNotEmpty;
  }

  /// Sauvegarde la session après activation par scan du badge
  static Future<void> saveSession({
    required String employeeId,
    required Map<String, dynamic> employeeData,
  }) async {
    await _storage.write(key: _keyEmployeeId, value: employeeId);
    await _storage.write(key: _keyEmployeeData, value: jsonEncode(employeeData));
    await _storage.write(
      key: _keyActivatedAt,
      value: DateTime.now().toIso8601String(),
    );
  }

  /// Récupère l'ID de l'employé actif
  static Future<String?> getEmployeeId() async {
    return await _storage.read(key: _keyEmployeeId);
  }

  /// Récupère les données locales de l'employé (cache)
  static Future<Map<String, dynamic>?> getEmployeeData() async {
    final raw = await _storage.read(key: _keyEmployeeData);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  /// Met à jour le cache local des données employé
  static Future<void> updateEmployeeCache(Map<String, dynamic> data) async {
    await _storage.write(key: _keyEmployeeData, value: jsonEncode(data));
  }

  /// Déconnexion / désactivation (réinitialise la session)
  static Future<void> clearSession() async {
    await _storage.deleteAll();
  }

  /// Date d'activation
  static Future<String?> getActivatedAt() async {
    return await _storage.read(key: _keyActivatedAt);
  }
}
