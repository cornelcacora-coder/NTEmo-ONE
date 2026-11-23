import 'package:flutter/material.dart';
import '../services/attendance_service.dart';

const Color _emerald = Color(0xFF10B981);

class AttendanceScanScreen extends StatefulWidget {
  const AttendanceScanScreen({super.key});

  @override
  State<AttendanceScanScreen> createState() => _AttendanceScanScreenState();
}

class _AttendanceScanScreenState extends State<AttendanceScanScreen> {
  final AttendanceService _attendanceService = AttendanceService();
  final TextEditingController _manualTokenController = TextEditingController();
  bool _isLoading = false;
  String? _successMessage;
  String? _errorMessage;
  String _punchType = 'IN';

  Future<void> _submitPunch(String rawToken) async {
    if (rawToken.trim().isEmpty) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      await _attendanceService.punch(
        qrToken: rawToken.trim(),
        type: _punchType,
        deviceMeta: 'Flutter Mobile App',
      );

      setState(() {
        final timeStr = DateTime.now().toIso8601String().substring(11, 16);
        _successMessage =
            "Pointage validé avec succès (${_punchType == 'IN' ? 'Entrée' : 'Sortie'}) à $timeStr !";
        _manualTokenController.clear();
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.indigo.shade50,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.indigo.shade100),
            ),
            child: const Row(
              children: [
                Icon(Icons.security, color: Color(0xFF4F46E5), size: 32),
                SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Pointage Présence Certifié',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Présentez votre badge sur la borne d\'accueil à l\'entrée pour valider votre arrivée.',
                        style: TextStyle(fontSize: 12, color: Colors.black54),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          if (_successMessage != null)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _emerald.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _emerald),
              ),
              child: Text(
                _successMessage!,
                style: const TextStyle(color: _emerald, fontWeight: FontWeight.bold),
              ),
            ),
          if (_errorMessage != null)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Text(
                _errorMessage!,
                style: TextStyle(color: Colors.red.shade700, fontWeight: FontWeight.bold),
              ),
            ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: ChoiceChip(
                  label: const Center(child: Text('Entrée')),
                  selected: _punchType == 'IN',
                  onSelected: (val) => setState(() => _punchType = 'IN'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ChoiceChip(
                  label: const Center(child: Text('Sortie')),
                  selected: _punchType == 'OUT',
                  onSelected: (val) => setState(() => _punchType = 'OUT'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _manualTokenController,
            decoration: InputDecoration(
              labelText: 'Saisie manuelle matricule ou token',
              hintText: 'ex: NTM-TOKEN-SEC-001',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _isLoading ? null : () => _submitPunch(_manualTokenController.text),
            child: _isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text('Valider le pointage'),
          ),
        ],
      ),
    );
  }
}
