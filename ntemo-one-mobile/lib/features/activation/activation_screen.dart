import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../core/firebase/firestore_service.dart';
import '../../../core/services/session_service.dart';

/// Écran d'activation du compte mobile par scan du QR code du badge physique.
/// L'employé ne crée PAS de compte — il scanne son badge pour s'identifier.
/// Une seule activation est nécessaire ; les données sont sauvegardées localement.
class ActivationScreen extends StatefulWidget {
  final VoidCallback onActivated;

  const ActivationScreen({super.key, required this.onActivated});

  @override
  State<ActivationScreen> createState() => _ActivationScreenState();
}

class _ActivationScreenState extends State<ActivationScreen> {
  final FirestoreService _firestore = FirestoreService();
  final MobileScannerController _scannerController = MobileScannerController();
  final TextEditingController _manualController = TextEditingController();

  bool _isScanning = true;
  bool _isLoading = false;
  bool _cameraActive = false;
  String? _error;

  static const Color _ntemoBlue = Color(0xFF0070BA);
  static const Color _ntemoDark = Color(0xFF031B4D);

  @override
  void dispose() {
    _scannerController.dispose();
    _manualController.dispose();
    super.dispose();
  }

  /// Appelé lors d'un scan QR ou d'une saisie manuelle
  Future<void> _activateWithToken(String rawToken) async {
    final token = rawToken.trim();
    if (token.isEmpty || _isLoading) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Arrêter le scanner pendant la recherche
      await _scannerController.stop();

      Map<String, dynamic>? employee;

      // 1. Essai par badge_security_token (format NTM-TOKEN-SEC-XXXX)
      employee = await _firestore.findEmployeeByToken(token);

      // 2. Essai par matricule (format NTM-2026-XXXX)
      if (employee == null) {
        employee = await _firestore.findEmployeeByMatricule(token);
      }

      if (employee == null) {
        setState(() {
          _error =
              'Aucun badge trouvé pour ce code.\nVérifiez le QR code de votre badge physique ou saisissez votre matricule.';
          _isLoading = false;
        });
        // Redémarrer le scanner
        await _scannerController.start();
        return;
      }

      // Vérifier que l'employé est actif
      final status = employee['status'] as String? ?? 'ACTIVE';
      if (status == 'TERMINATED' || status == 'RESIGNED') {
        setState(() {
          _error =
              'Votre badge a été désactivé suite à la cessation de votre contrat.\nContactez la Direction des Ressources Humaines.';
          _isLoading = false;
        });
        await _scannerController.start();
        return;
      }

      // Sauvegarder la session localement
      final employeeId = employee['id'] as String? ?? token;
      await SessionService.saveSession(
        employeeId: employeeId,
        employeeData: employee,
      );

      if (mounted) {
        widget.onActivated();
      }
    } catch (e) {
      setState(() {
        _error = 'Erreur de connexion. Vérifiez votre connexion internet.';
        _isLoading = false;
      });
      await _scannerController.start();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _ntemoDark,
      body: SafeArea(
        child: Column(
          children: [
            // ─── HEADER ───────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 32, 24, 16),
              child: Column(
                children: [
                  // Logo NTÊMO
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF00A3E0).withValues(alpha: 0.4),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: const Center(
                      child: Text(
                        'N',
                        style: TextStyle(
                          color: _ntemoBlue,
                          fontWeight: FontWeight.w900,
                          fontSize: 36,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'NTÊMO ONE',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 2.0,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                    ),
                    child: const Text(
                      'Activation du Badge Mobile',
                      style: TextStyle(
                        color: Color(0xFF93C5FD),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ─── INSTRUCTIONS ─────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.info_outline, color: Color(0xFF38BDF8), size: 20),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Scannez le QR code imprimé sur votre badge physique NTÊMO pour activer votre espace personnel.',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // ─── ONGLETS SCAN / SAISIE MANUELLE ─────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _isScanning = true),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: _isScanning ? _ntemoBlue : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.qr_code_scanner,
                                color: _isScanning ? Colors.white : Colors.white54,
                                size: 16,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Scanner le QR',
                                style: TextStyle(
                                  color: _isScanning ? Colors.white : Colors.white54,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _isScanning = false),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: !_isScanning ? _ntemoBlue : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.keyboard_outlined,
                                color: !_isScanning ? Colors.white : Colors.white54,
                                size: 16,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Saisie manuelle',
                                style: TextStyle(
                                  color: !_isScanning ? Colors.white : Colors.white54,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            // ─── ZONE DE SCAN / SAISIE ────────────────────────────────
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: _isScanning ? _buildScanner() : _buildManualInput(),
              ),
            ),

            // ─── MESSAGE D'ERREUR ──────────────────────────────────────
            if (_error != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.red.shade900.withValues(alpha: 0.8),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.red.shade700),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.redAccent, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _error!,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // ─── FOOTER ───────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 20),
              child: Text(
                'NTÊMO ONE • Brazzaville (Congo) • ntemoconsulting.com',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.3),
                  fontSize: 10,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScanner() {
    if (_isLoading) {
      return Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(color: Color(0xFF00A3E0)),
          const SizedBox(height: 20),
          const Text(
            'Identification en cours...',
            style: TextStyle(color: Colors.white70, fontSize: 14),
          ),
          const SizedBox(height: 8),
          const Text(
            'Recherche dans la base de données NTÊMO',
            style: TextStyle(color: Colors.white38, fontSize: 11),
          ),
        ],
      );
    }

    return Column(
      children: [
        // Cadre caméra
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Stack(
              children: [
                MobileScanner(
                  controller: _scannerController,
                  onDetect: (capture) {
                    final barcode = capture.barcodes.firstOrNull;
                    if (barcode?.rawValue != null && !_isLoading) {
                      _activateWithToken(barcode!.rawValue!);
                    }
                  },
                ),
                // Viseur de scan
                Center(
                  child: Container(
                    width: 200,
                    height: 200,
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFF00A3E0), width: 2),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Stack(
                      children: [
                        // Coins décoratifs
                        Positioned(top: 0, left: 0, child: _corner(TopLeft())),
                        Positioned(top: 0, right: 0, child: _corner(TopRight())),
                        Positioned(bottom: 0, left: 0, child: _corner(BottomLeft())),
                        Positioned(bottom: 0, right: 0, child: _corner(BottomRight())),
                      ],
                    ),
                  ),
                ),
                // Overlay texte
                Positioned(
                  bottom: 16,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'Pointez vers le QR code de votre badge',
                        style: TextStyle(color: Colors.white, fontSize: 11),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildManualInput() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.badge_outlined, color: Color(0xFF38BDF8), size: 56),
        const SizedBox(height: 20),
        const Text(
          'Saisissez votre matricule ou token de badge',
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.5),
        ),
        const SizedBox(height: 24),
        TextField(
          controller: _manualController,
          style: const TextStyle(color: Colors.white, fontFamily: 'monospace'),
          decoration: InputDecoration(
            hintText: 'ex : NTM-2026-1234 ou NTM-TOKEN-SEC-XXX',
            hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3), fontSize: 12),
            filled: true,
            fillColor: Colors.white.withValues(alpha: 0.08),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.2)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.2)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xFF00A3E0), width: 2),
            ),
            prefixIcon: const Icon(Icons.fingerprint, color: Color(0xFF38BDF8)),
          ),
          textCapitalization: TextCapitalization.characters,
          onSubmitted: _activateWithToken,
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton.icon(
            onPressed: _isLoading
                ? null
                : () => _activateWithToken(_manualController.text),
            icon: _isLoading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.check_circle_outline),
            label: Text(_isLoading ? 'Activation...' : 'Activer mon badge'),
            style: ElevatedButton.styleFrom(
              backgroundColor: _ntemoBlue,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
          ),
        ),
      ],
    );
  }

  Widget _corner(CornerType type) {
    const size = 20.0;
    const thickness = 3.0;
    const color = Color(0xFF00A3E0);

    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _CornerPainter(type, color, thickness)),
    );
  }
}

// Types de coins pour le viseur
abstract class CornerType {}
class TopLeft extends CornerType {}
class TopRight extends CornerType {}
class BottomLeft extends CornerType {}
class BottomRight extends CornerType {}

class _CornerPainter extends CustomPainter {
  final CornerType type;
  final Color color;
  final double thickness;

  _CornerPainter(this.type, this.color, this.thickness);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = thickness
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path = Path();
    if (type is TopLeft) {
      path.moveTo(size.width, 0);
      path.lineTo(0, 0);
      path.lineTo(0, size.height);
    } else if (type is TopRight) {
      path.moveTo(0, 0);
      path.lineTo(size.width, 0);
      path.lineTo(size.width, size.height);
    } else if (type is BottomLeft) {
      path.moveTo(0, 0);
      path.lineTo(0, size.height);
      path.lineTo(size.width, size.height);
    } else {
      path.moveTo(size.width, 0);
      path.lineTo(size.width, size.height);
      path.lineTo(0, size.height);
    }
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(_CornerPainter old) => false;
}
