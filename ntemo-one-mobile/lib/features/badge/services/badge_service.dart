import '../../../core/firebase/firestore_service.dart';
import '../../../core/services/session_service.dart';

class VirtualBadge {
  final String id;
  final String badgeNumber;
  final String securityToken;
  final String status;
  final String issuedAt;
  final String? expiresAt;
  final String employeeMatricule;
  final String employeeName;
  final String? department;
  final String? position;
  final String? photoPath;

  VirtualBadge({
    required this.id,
    required this.badgeNumber,
    required this.securityToken,
    required this.status,
    required this.issuedAt,
    this.expiresAt,
    required this.employeeMatricule,
    required this.employeeName,
    this.department,
    this.position,
    this.photoPath,
  });

  factory VirtualBadge.fromFirestore(Map<String, dynamic> data) {
    final firstName = data['first_name'] as String? ?? '';
    final lastName = data['last_name'] as String? ?? '';
    final fullName = data['full_name'] as String? ??
        '$firstName $lastName'.trim();

    return VirtualBadge(
      id: data['id'] ?? '',
      badgeNumber: data['matricule'] ?? 'BDG-2026-001',
      securityToken: data['badge_security_token'] ?? data['matricule'] ?? '',
      status: data['status'] ?? 'ACTIVE',
      issuedAt: data['hire_date'] ?? '',
      expiresAt: data['contract_end_date'],
      employeeMatricule: data['matricule'] ?? '',
      employeeName: fullName.isEmpty ? 'Collaborateur' : fullName,
      department: data['department'],
      position: data['position'],
      // Supporte photo base64 (stockée dans Firestore) ou URL
      photoPath: data['photo_url'],
    );
  }
}

class BadgeService {
  final FirestoreService _firestoreService = FirestoreService();

  /// Charge le badge virtuel de l'employé actif (session locale)
  Future<VirtualBadge> getMyVirtualBadge() async {
    // 1. Récupérer l'ID de l'employé depuis la session locale
    final employeeId = await SessionService.getEmployeeId();

    if (employeeId == null) {
      throw Exception(
        'Aucun badge activé.\nScannez le QR code de votre badge physique pour accéder à votre espace.',
      );
    }

    // 2. Essai de récupération en temps réel depuis Firestore
    final data = await _firestoreService.getEmployee(employeeId);
    if (data != null && data.isNotEmpty) {
      // Mettre à jour le cache local avec les données fraîches
      await SessionService.updateEmployeeCache(data);
      return VirtualBadge.fromFirestore(data);
    }

    // 3. Fallback sur le cache local si pas de connexion
    final cached = await SessionService.getEmployeeData();
    if (cached != null && cached.isNotEmpty) {
      return VirtualBadge.fromFirestore(cached);
    }

    // 4. Aucune donnée disponible
    throw Exception(
      'Impossible de charger votre badge. Vérifiez votre connexion internet.',
    );
  }
}
