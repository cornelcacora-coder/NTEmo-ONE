import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../services/badge_service.dart';

const Color _emerald = Color(0xFF10B981);
const Color _emeraldAccent = Color(0xFF34D399);

class VirtualBadgeScreen extends StatefulWidget {
  const VirtualBadgeScreen({super.key});

  @override
  State<VirtualBadgeScreen> createState() => _VirtualBadgeScreenState();
}

class _VirtualBadgeScreenState extends State<VirtualBadgeScreen> {
  final BadgeService _badgeService = BadgeService();
  VirtualBadge? _badge;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadBadge();
  }

  Future<void> _loadBadge() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final badge = await _badgeService.getMyVirtualBadge();
      setState(() {
        _badge = badge;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.badge_outlined, size: 64, color: Colors.grey),
              const SizedBox(height: 16),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 16, color: Colors.black87),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _loadBadge,
                child: const Text('Actualiser'),
              ),
            ],
          ),
        ),
      );
    }

    final badge = _badge!;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        children: [
          // CARTE BADGE VIRTUEL OFFICIELLE NTEMO ONE
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              gradient: const LinearGradient(
                colors: [Color(0xFF0F172A), Color(0xFF1E1B4B)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF4F46E5).withValues(alpha: 0.2),
                  blurRadius: 24,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // En-tête Badge
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: const Color(0xFF4F46E5),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Center(
                            child: Text(
                              'N',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          'NTEMO ONE',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: _emerald.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: _emeraldAccent),
                      ),
                      child: Text(
                        badge.status,
                        style: const TextStyle(
                          color: _emeraldAccent,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Informations Employé
                Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: badge.photoPath != null
                          ? Image.network(
                              badge.photoPath!,
                              width: 68,
                              height: 68,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                width: 68,
                                height: 68,
                                color: Colors.white12,
                                child: const Icon(Icons.person, color: Colors.white),
                              ),
                            )
                          : Container(
                              width: 68,
                              height: 68,
                              color: Colors.white12,
                              child: const Icon(Icons.person, color: Colors.white),
                            ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            badge.employeeName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            badge.position ?? 'Collaborateur',
                            style: const TextStyle(color: Color(0xFF818CF8), fontSize: 12),
                          ),
                          Text(
                            badge.department ?? 'Général',
                            style: const TextStyle(color: Colors.white54, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // Matricule & Numéro
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('MATRICULE', style: TextStyle(color: Colors.white38, fontSize: 9)),
                          Text(
                            badge.employeeMatricule,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'monospace',
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('SÉCURITÉ', style: TextStyle(color: Colors.white38, fontSize: 9)),
                          Text(
                            'CERTIFIÉ FIREBASE',
                            style: TextStyle(
                              color: _emeraldAccent,
                              fontWeight: FontWeight.bold,
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // QR CODE HAUTE LISIBILITÉ POUR LE SCAN PAR LA BORNE MURALE
                Center(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: const [
                        BoxShadow(
                          color: Colors.black38,
                          blurRadius: 10,
                          offset: Offset(0, 4),
                        ),
                      ],
                    ),
                    child: QrImageView(
                      data: badge.securityToken,
                      version: QrVersions.auto,
                      size: 150.0,
                      backgroundColor: Colors.white,
                    ),
                  ),
                ),

                const SizedBox(height: 12),
                Center(
                  child: Text(
                    'Présentez ce QR Code devant la caméra de la borne',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.indigo.shade200, fontSize: 11),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),
          OutlinedButton.icon(
            onPressed: _loadBadge,
            icon: const Icon(Icons.refresh),
            label: const Text('Actualiser le badge'),
          ),
        ],
      ),
    );
  }
}
