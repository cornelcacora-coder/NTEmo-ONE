import 'package:flutter/material.dart';
import 'features/activation/activation_screen.dart';
import 'features/badge/screens/virtual_badge_screen.dart';
import 'core/firebase/firestore_service.dart';
import 'core/services/session_service.dart';

// ─── Couleurs officielles NTÊMO ────────────────────────────────────────────
const Color _ntemoBlue      = Color(0xFF0070BA);
const Color _ntemoDark      = Color(0xFF031B4D);
const Color _ntemoCyan      = Color(0xFF00A3E0);
const Color _emerald        = Color(0xFF10B981);
const Color _emeraldAccent  = Color(0xFF34D399);

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const NtemoOneApp());
}

class NtemoOneApp extends StatelessWidget {
  const NtemoOneApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NTÊMO ONE',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: _ntemoBlue,
          primary: _ntemoBlue,
        ),
        useMaterial3: true,
        fontFamily: 'Roboto',
      ),
      home: const AppEntryPoint(),
    );
  }
}

/// Point d'entrée : vérifie si l'employé est déjà activé ou doit scanner son badge
class AppEntryPoint extends StatefulWidget {
  const AppEntryPoint({super.key});

  @override
  State<AppEntryPoint> createState() => _AppEntryPointState();
}

class _AppEntryPointState extends State<AppEntryPoint> {
  bool _checking = true;
  bool _isActivated = false;

  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<void> _checkSession() async {
    final activated = await SessionService.isActivated();
    if (mounted) {
      setState(() {
        _isActivated = activated;
        _checking = false;
      });
    }
  }

  void _onActivated() {
    setState(() => _isActivated = true);
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) {
      return const Scaffold(
        backgroundColor: _ntemoDark,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: _ntemoCyan),
              SizedBox(height: 20),
              Text(
                'NTÊMO ONE',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 2,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (!_isActivated) {
      return ActivationScreen(onActivated: _onActivated);
    }

    return const MainNavigationScreen();
  }
}

// ─── NAVIGATION PRINCIPALE ─────────────────────────────────────────────────
class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;
  Map<String, dynamic>? _employeeData;

  @override
  void initState() {
    super.initState();
    _loadEmployee();
  }

  Future<void> _loadEmployee() async {
    final cached = await SessionService.getEmployeeData();
    if (mounted) setState(() => _employeeData = cached);
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      const VirtualBadgeScreen(),
      AttendanceHistoryScreen(employeeData: _employeeData),
      LeavesScreen(employeeData: _employeeData),
      ProfileScreen(
        employeeData: _employeeData,
        onLogout: () async {
          final confirm = await showDialog<bool>(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text('Désactiver le badge mobile ?'),
              content: const Text(
                'Votre badge mobile sera désactivé. Vous devrez rescanner votre badge physique pour accéder à nouveau à l\'application.',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  child: const Text('Annuler'),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                  onPressed: () => Navigator.pop(ctx, true),
                  child: const Text('Désactiver', style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          );
          if (confirm == true && mounted) {
            await SessionService.clearSession();
            if (mounted) {
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(
                  builder: (_) => ActivationScreen(
                    onActivated: () {
                      Navigator.of(context).pushAndRemoveUntil(
                        MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
                        (route) => false,
                      );
                    },
                  ),
                ),
                (route) => false,
              );
            }
          }
        },
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [_ntemoCyan, _ntemoBlue],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Center(
                child: Text(
                  'N',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 18,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'NTÊMO ONE',
                  style: TextStyle(
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.0,
                    fontSize: 15,
                    color: _ntemoDark,
                  ),
                ),
              ],
            ),
          ],
        ),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0.5,
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: _emerald.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _emerald.withValues(alpha: 0.3)),
            ),
            child: const Row(
              children: [
                Icon(Icons.cloud_done, size: 14, color: _emerald),
                SizedBox(width: 4),
                Text(
                  'Firebase Actif',
                  style: TextStyle(
                    fontSize: 11,
                    color: _emerald,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        backgroundColor: Colors.white,
        indicatorColor: _ntemoBlue.withValues(alpha: 0.1),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.badge_outlined),
            selectedIcon: Icon(Icons.badge, color: _ntemoBlue),
            label: 'Mon Badge',
          ),
          NavigationDestination(
            icon: Icon(Icons.access_time_outlined),
            selectedIcon: Icon(Icons.access_time_filled, color: _ntemoBlue),
            label: 'Présences',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_month_outlined),
            selectedIcon: Icon(Icons.calendar_month, color: _ntemoBlue),
            label: 'Congés',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person, color: _ntemoBlue),
            label: 'Profil RH',
          ),
        ],
      ),
    );
  }
}

// ─── ÉCRAN HISTORIQUE DES PRÉSENCES ───────────────────────────────────────
class AttendanceHistoryScreen extends StatefulWidget {
  final Map<String, dynamic>? employeeData;

  const AttendanceHistoryScreen({super.key, this.employeeData});

  @override
  State<AttendanceHistoryScreen> createState() => _AttendanceHistoryScreenState();
}

class _AttendanceHistoryScreenState extends State<AttendanceHistoryScreen> {
  final FirestoreService _firestoreService = FirestoreService();
  List<Map<String, dynamic>> _attendances = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  Future<void> _fetchHistory() async {
    setState(() => _isLoading = true);
    final employeeId = await SessionService.getEmployeeId();
    if (employeeId != null) {
      final records = await _firestoreService.getAttendances(employeeId);
      // Trier par date décroissante
      records.sort((a, b) => (b['date'] ?? '').compareTo(a['date'] ?? ''));
      if (mounted) setState(() => _attendances = records);
    }
    if (mounted) setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: _ntemoBlue));
    }

    final todayStr = DateTime.now().toIso8601String().split('T')[0];
    final todayRecord = _attendances.where((r) => r['date'] == todayStr).firstOrNull;

    return RefreshIndicator(
      onRefresh: _fetchHistory,
      color: _ntemoBlue,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Bandeau info
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: _ntemoBlue.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: _ntemoBlue.withValues(alpha: 0.2)),
            ),
            child: const Row(
              children: [
                Icon(Icons.info_outline, color: _ntemoBlue, size: 18),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Vos pointages sont enregistrés en temps réel lors du scan de votre badge à la borne d\'accueil.',
                    style: TextStyle(fontSize: 12, color: _ntemoDark, height: 1.4),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),
          const Text('Pointage du Jour',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: _ntemoDark)),
          const SizedBox(height: 10),

          // Carte du jour
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: Colors.grey.shade200),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: todayRecord != null
                  ? Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Aujourd\'hui · $todayStr',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: Colors.green.shade50,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.green.shade200),
                              ),
                              child: const Text(
                                'Présent',
                                style: TextStyle(
                                    color: Colors.green, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                        const Divider(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _timeColumn('ENTRÉE', todayRecord['first_check_in'], Colors.green),
                            _timeColumn('SORTIE',
                                todayRecord['last_check_out'] ?? '—', Colors.orange),
                            if (todayRecord['worked_duration'] != null)
                              _timeColumn(
                                  'DURÉE', todayRecord['worked_duration'], _ntemoBlue),
                          ],
                        ),
                        if (todayRecord['is_late'] == true)
                          Container(
                            margin: const EdgeInsets.only(top: 12),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.orange.shade50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.orange.shade200),
                            ),
                            child: Text(
                              'Retard détecté : +${todayRecord['late_minutes'] ?? '?'} min',
                              style: const TextStyle(color: Colors.orange, fontSize: 12),
                            ),
                          ),
                      ],
                    )
                  : const Padding(
                      padding: EdgeInsets.all(12),
                      child: Text(
                        'Aucun pointage enregistré aujourd\'hui.',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
            ),
          ),

          const SizedBox(height: 20),

          if (_attendances.isNotEmpty) ...[
            const Text('Historique Récent',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: _ntemoDark)),
            const SizedBox(height: 10),
            ..._attendances.take(10).map((record) => _attendanceCard(record)),
          ],

          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Formulaire de régularisation transmis à la RH'),
                  backgroundColor: _ntemoBlue,
                ),
              );
            },
            icon: const Icon(Icons.edit_calendar),
            label: const Text('Demander une régularisation'),
            style: OutlinedButton.styleFrom(foregroundColor: _ntemoBlue),
          ),
        ],
      ),
    );
  }

  Widget _timeColumn(String label, String? time, Color color) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
        const SizedBox(height: 2),
        Text(
          time ?? '—',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color),
        ),
      ],
    );
  }

  Widget _attendanceCard(Map<String, dynamic> record) {
    final isLate = record['is_late'] == true;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: isLate ? Colors.orange.shade50 : Colors.green.shade50,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              isLate ? Icons.access_time : Icons.check_circle_outline,
              color: isLate ? Colors.orange : Colors.green,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(record['date'] ?? '',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                Text(
                  'Entrée : ${record['first_check_in'] ?? '—'} · Sortie : ${record['last_check_out'] ?? 'En cours'}',
                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                ),
              ],
            ),
          ),
          if (isLate)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                '+${record['late_minutes'] ?? '?'}m',
                style: TextStyle(fontSize: 10, color: Colors.orange.shade700, fontWeight: FontWeight.bold),
              ),
            ),
        ],
      ),
    );
  }
}

// ─── ÉCRAN CONGÉS ──────────────────────────────────────────────────────────
class LeavesScreen extends StatelessWidget {
  final Map<String, dynamic>? employeeData;

  const LeavesScreen({super.key, this.employeeData});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Carte solde de congés
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [_ntemoDark, _ntemoBlue],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: _ntemoBlue.withValues(alpha: 0.3),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('SOLDE DE CONGÉS PAYÉS',
                    style: TextStyle(color: Colors.white60, fontSize: 11)),
                const SizedBox(height: 6),
                const Text('24.5 Jours',
                    style: TextStyle(
                        color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900)),
                const SizedBox(height: 4),
                Text('Exercice ${DateTime.now().year} • Validé par la RH',
                    style: const TextStyle(color: _emeraldAccent, fontSize: 12)),
              ],
            ),
          ),

          const SizedBox(height: 16),

          FilledButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Demande transmise à votre responsable'),
                  backgroundColor: _ntemoBlue,
                ),
              );
            },
            icon: const Icon(Icons.add),
            label: const Text('Nouvelle demande d\'absence'),
            style: FilledButton.styleFrom(backgroundColor: _ntemoBlue),
          ),

          const SizedBox(height: 20),
          const Text('Historique des demandes',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: _ntemoDark)),
          const SizedBox(height: 10),

          // Placeholder
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: const Center(
              child: Text(
                'Aucune demande en cours.\nVos demandes approuvées par la RH apparaîtront ici.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey, fontSize: 12, height: 1.5),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── ÉCRAN PROFIL RH ───────────────────────────────────────────────────────
class ProfileScreen extends StatelessWidget {
  final Map<String, dynamic>? employeeData;
  final VoidCallback? onLogout;

  const ProfileScreen({super.key, this.employeeData, this.onLogout});

  @override
  Widget build(BuildContext context) {
    final data = employeeData ?? {};
    final firstName = data['first_name'] as String? ?? '';
    final lastName = data['last_name'] as String? ?? '';
    final fullName = data['full_name'] as String? ??
        (firstName.isNotEmpty ? '$firstName $lastName' : 'Collaborateur');
    final position = data['position'] as String? ?? 'Poste non défini';
    final matricule = data['matricule'] as String? ?? '—';
    final email = data['email'] as String? ?? '—';
    final phone = data['phone'] as String? ?? '—';
    final department = data['department'] as String? ?? '—';
    final contractType = data['contract_type'] as String? ?? 'CDI';
    final photoUrl = data['photo_url'] as String?;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Carte identité
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.grey.shade200),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              // Avatar
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    colors: [_ntemoCyan, _ntemoBlue],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  border: Border.all(color: _ntemoCyan, width: 2),
                ),
                child: photoUrl != null && photoUrl.startsWith('http')
                    ? ClipOval(
                        child: Image.network(
                          photoUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _avatarInitials(fullName),
                        ),
                      )
                    : _avatarInitials(fullName),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(fullName.toUpperCase(),
                        style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 15,
                            color: _ntemoDark)),
                    const SizedBox(height: 4),
                    Text(position,
                        style: const TextStyle(color: _ntemoBlue, fontSize: 12)),
                    const SizedBox(height: 2),
                    Text(matricule,
                        style: const TextStyle(
                            color: Colors.grey, fontSize: 11, fontFamily: 'monospace')),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: _emerald.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: _emerald.withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        contractType,
                        style: const TextStyle(
                            color: _emerald, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // Infos
        _infoTile(Icons.email_outlined, email, 'Email professionnel'),
        _infoTile(Icons.phone_outlined, phone, 'Téléphone'),
        _infoTile(Icons.business_outlined, department, 'Département'),

        const SizedBox(height: 20),

        // Lien site officiel
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: _ntemoBlue.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: _ntemoBlue.withValues(alpha: 0.15)),
          ),
          child: const Row(
            children: [
              Icon(Icons.language, color: _ntemoBlue, size: 18),
              SizedBox(width: 10),
              Text(
                'www.ntemoconsulting.com',
                style: TextStyle(
                    color: _ntemoBlue,
                    fontSize: 12,
                    fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Bouton désactiver le badge mobile
        OutlinedButton.icon(
          onPressed: onLogout,
          icon: const Icon(Icons.logout, color: Colors.red),
          label: const Text('Désactiver ce badge mobile',
              style: TextStyle(color: Colors.red)),
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: Colors.red),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
        ),

        const SizedBox(height: 8),
        const Center(
          child: Text(
            'NTÊMO ONE • Brazzaville (Congo)\nDirection Générale de NTÊMO',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey, fontSize: 10, height: 1.6),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _avatarInitials(String name) {
    final initials = name.isNotEmpty ? name[0].toUpperCase() : 'N';
    return Center(
      child: Text(
        initials,
        style: const TextStyle(
            color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900),
      ),
    );
  }

  Widget _infoTile(IconData icon, String title, String subtitle) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: _ntemoBlue.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: _ntemoBlue, size: 18),
        ),
        title: Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 11)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 4),
      ),
    );
  }
}
