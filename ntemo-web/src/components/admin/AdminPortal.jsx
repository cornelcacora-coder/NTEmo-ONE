import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import DashboardOverview from "./DashboardOverview";
import BadgesManager from "./BadgesManager";
import EmployeesManager from "./EmployeesManager";
import DocumentEngine from "./DocumentEngine";
import SettingsManager from "./SettingsManager";
import AdminProfileModal from "./AdminProfileModal";
import { attendanceService } from "../../services/attendanceService";
import { 
  LayoutDashboard, 
  CreditCard, 
  Users, 
  FileText, 
  Calendar,
  Settings,
  Bell,
  ChevronDown,
  CalendarCheck,
  ShieldCheck,
  Clock,
  Sparkles,
  Moon,
  Sun,
  Lock,
  LogOut,
  UserCheck,
  UserCircle
} from "lucide-react";

export default function AdminPortal({ onOpenKiosk, onLogout, currentAdmin: propAdmin }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [companySettings, setCompanySettings] = useState(attendanceService.getDefaultCompanySettings());
  const [currentAdmin, setCurrentAdmin] = useState(propAdmin || {
    id: "admin-cornelca-bitodi",
    firstName: "Cornelca",
    lastName: "BITODI",
    email: "cornelca.bitodi@ntemo.com",
    phone: "+242 06 400 12 34",
    role: "Directeur des Ressources Humaines (DRH)"
  });
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showYearMenu, setShowYearMenu] = useState(false);
  const [quickYearInput, setQuickYearInput] = useState("");

  useEffect(() => {
    if (propAdmin) setCurrentAdmin(propAdmin);
  }, [propAdmin]);

  useEffect(() => {
    // Écoute en direct des paramètres d'entreprise
    const unsubSettings = attendanceService.subscribeToCompanySettings((data) => {
      if (data) setCompanySettings(data);
    });

    // Écoute des administrateurs
    const unsubAdmins = attendanceService.subscribeToAdminUsers((users) => {
      if (users && users.length > 0) {
        const emailToFind = (propAdmin?.email || currentAdmin?.email || "cornelca.bitodi@ntemo.com").toLowerCase();
        const found = users.find((u) => u.email?.toLowerCase() === emailToFind);
        if (found) {
          setCurrentAdmin(found);
          try {
            localStorage.setItem("ntemo_active_admin", JSON.stringify(found));
          } catch (_) {}
        } else if (!propAdmin) {
          setCurrentAdmin(users[0]);
        }
      }
    });

    return () => {
      if (typeof unsubSettings === "function") unsubSettings();
      if (typeof unsubAdmins === "function") unsubAdmins();
    };
  }, [propAdmin]);

  const handleSettingsChange = (updated) => {
    setCompanySettings(updated);
  };

  const handleSwitchYear = async (year) => {
    setShowYearMenu(false);
    const updated = await attendanceService.updateCompanySettings({ activeYear: year });
    setCompanySettings(updated);
  };

  const handleAddQuickYear = async () => {
    if (!quickYearInput.trim() || isNaN(quickYearInput)) return;
    const y = quickYearInput.trim();
    const available = companySettings.availableYears || ["2024", "2025", "2026", "2027"];
    const updatedYears = [...new Set([...available, y])].sort();
    const updated = await attendanceService.updateCompanySettings({
      availableYears: updatedYears,
      activeYear: y
    });
    setCompanySettings(updated);
    setQuickYearInput("");
    setShowYearMenu(false);
  };

  const handleProfileSave = async (updatedData) => {
    const adminId = currentAdmin?.id || "admin-cornelca-bitodi";
    const saved = await attendanceService.updateAdminUser(adminId, updatedData);

    // Synchronisation explicite immédiate du collaborateur pour mise à jour instantanée du badge
    try {
      const emps = await attendanceService.getEmployees();
      const emp = emps.find((e) =>
        e.id === "emp-cornelca-bitodi" ||
        e.email?.toLowerCase() === (updatedData.email || currentAdmin.email || "").toLowerCase() ||
        (e.last_name || "").toUpperCase().includes("BITODI") ||
        (e.full_name || "").toUpperCase().includes("BITODI")
      );
      if (emp) {
        const fn = updatedData.firstName !== undefined ? updatedData.firstName : emp.first_name || "";
        const ln = updatedData.lastName !== undefined ? updatedData.lastName : emp.last_name || "";
        await attendanceService.updateEmployee(emp.id, {
          first_name: fn,
          last_name: ln,
          full_name: `${fn} ${ln}`.trim(),
          email: updatedData.email || emp.email,
          phone: updatedData.phone || emp.phone,
          position: updatedData.role || emp.position,
          role: updatedData.role || emp.role,
          photo_url: updatedData.photo_url !== undefined ? updatedData.photo_url : emp.photo_url
        });
      }
    } catch (e) {
      console.warn("Erreur synchro employé:", e);
    }

    const merged = { ...currentAdmin, id: adminId, ...updatedData };
    setCurrentAdmin(merged);
    try {
      localStorage.setItem("ntemo_active_admin", JSON.stringify(merged));
    } catch (_) {}
    return saved;
  };

  const allNavigation = [
    { id: "dashboard", label: t("nav.dashboard") || "Tableau de Bord", icon: LayoutDashboard },
    { id: "employees", label: t("nav.employees") || "Employés", icon: Users },
    { id: "badges",    label: t("nav.badges") || "Badges", icon: CreditCard },
    { id: "conges",    label: t("nav.conges") || "Congés", icon: Calendar },
    { id: "documents", label: t("nav.documents") || "Attestations & Documents", icon: FileText },
    { id: "settings",  label: t("nav.settings") || "Paramètres", icon: Settings },
  ];

  const navigation = allNavigation.filter((item) => {
    if (!currentAdmin?.permissions) return true;
    return currentAdmin.permissions[item.id] !== false;
  });

  return (
    <div className="min-h-screen flex flex-col font-sans notranslate bg-[#F4F7FC] text-slate-800" translate="no">
      
      <div className="flex flex-1 min-h-screen">
        
        {/* ======================================================== */}
        {/* 1. SIDEBAR GAUCHE (CLAIRE, MODERNE & PROFESSIONNELLE)    */}
        {/* ======================================================== */}
        <aside className="w-64 flex flex-col justify-between shrink-0 shadow-sm z-30 bg-white border-r border-slate-200/90 transition-colors">
          
          <div>
            {/* Logo Entreprise dynamique en haut de la sidebar */}
            <div className="p-6 pb-6 flex items-center justify-start">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00A3E0] via-[#0066B3] to-[#031B4D] p-0.5 shadow-lg shadow-sky-600/30 flex items-center justify-center">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center p-1.5 overflow-hidden">
                  <img
                    src={companySettings.logoUrl || "/ntemo-logo.jpg"}
                    alt={companySettings.companyName || "NTÊMO"}
                    className="w-full h-full object-contain filter drop-shadow"
                  />
                </div>
              </div>
            </div>

            {/* Menu de navigation vertical */}
            <nav className="px-4 space-y-1.5">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#0070BA] text-white shadow-md shadow-sky-600/35"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} strokeWidth={isActive ? 2.5 : 2} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bas de la sidebar : Bouton Déconnexion & Filigrane */}
          <div className="p-6 pt-0 text-center relative overflow-hidden space-y-3">
            {/* Bouton direct Déconnexion dans la barre latérale */}
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-rose-300 bg-rose-50/60 text-rose-600 text-xs font-bold hover:bg-rose-100 transition-all cursor-pointer shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t("nav.logout") || "Déconnexion"}</span>
            </button>

            {/* Filigrane géant discret en arrière-plan */}
            <div className="opacity-10 absolute -bottom-6 -left-6 pointer-events-none select-none">
              <img src={companySettings.logoUrl || "/ntemo-logo.jpg"} alt="" className="w-36 h-36 object-contain" />
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-10 h-10 mb-2 opacity-80">
                <img src={companySettings.logoUrl || "/ntemo-logo.jpg"} alt="" className="w-full h-full object-contain" />
              </div>
              <h4 className="text-sm font-extrabold tracking-widest uppercase truncate max-w-[190px] text-slate-800">
                {companySettings.companyName || "NTÊMO"}
              </h4>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1 max-w-[190px] line-clamp-2">
                {companySettings.companyMotto || "Ensemble, construisons un meilleur avenir"}
              </p>
            </div>
          </div>

        </aside>

        {/* ======================================================== */}
        {/* 2. ZONE PRINCIPALE (HEADER BLEU NUIT + CONTENU)          */}
        {/* ======================================================== */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* HEADER SUPÉRIEUR BLEU NUIT (CONFORME À L'IMAGE) */}
          <header className="bg-gradient-to-r from-[#031B4D] via-[#003B7A] to-[#020F28] text-white px-6 sm:px-8 py-3.5 shadow-md flex items-center justify-between z-20">
            
            {/* Gauche : Logo + NOM ENTREPRISE | PORTAIL ADMINISTRATION RH */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 p-1 flex items-center justify-center shrink-0">
                <img src={companySettings.logoUrl || "/ntemo-logo.jpg"} alt="" className="w-full h-full object-contain" />
              </div>
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-sm tracking-tight text-white notranslate uppercase" translate="no">
                  {companySettings.companyName || "NTÊMO ONE"}
                </span>
                <span className="text-sky-300/40 text-xs font-light">|</span>
                <span className="text-[11px] font-bold text-sky-200 uppercase tracking-wider">
                  {t("header.portalTitle") || "PORTAIL ADMINISTRATION RH"}
                </span>
              </div>
            </div>

            {/* Droite : Bascule Borne, Exercice, Cloche, Profil Cornelca BITODI */}
            <div className="flex items-center gap-4">
              
              {/* Sélecteur Interactif d'Année Fiscale */}
              <div className="relative">
                <button
                  onClick={() => setShowYearMenu(!showYearMenu)}
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold font-mono transition-all cursor-pointer shadow-sm ${
                    companySettings.activeYear < "2026"
                      ? "bg-amber-500/25 border-amber-400/50 text-amber-200 hover:bg-amber-500/35"
                      : "bg-white/10 hover:bg-white/20 border-white/20 text-sky-200"
                  }`}
                  title="Changer d'exercice fiscal (historique ou nouvelle année)"
                >
                  <Calendar className="w-3.5 h-3.5 text-sky-300" />
                  <span>Exercice {companySettings.activeYear || "2026"}</span>
                  <ChevronDown className="w-3 h-3 text-sky-300" />
                </button>

                {showYearMenu && (
                  <div className="absolute right-0 mt-3 w-60 rounded-2xl bg-white border border-slate-200 shadow-2xl p-3 z-50 text-slate-800 animate-fadeIn text-xs">
                    <div className="p-2 border-b border-slate-100">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#0070BA]" />
                        <span>Changer d'Exercice Fiscal</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                        Consultez l'historique des années passées ou basculez sur un nouvel exercice.
                      </div>
                    </div>

                    <div className="py-2 space-y-1">
                      {(companySettings.availableYears || ["2024", "2025", "2026", "2027"]).map((y) => {
                        const isCurrent = (companySettings.activeYear || "2026") === y;
                        return (
                          <button
                            key={y}
                            onClick={() => handleSwitchYear(y)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left font-mono font-bold transition-colors cursor-pointer ${
                              isCurrent
                                ? "bg-[#0070BA] text-white shadow-sm"
                                : "hover:bg-slate-100 text-slate-700"
                            }`}
                          >
                            <span>Exercice {y}</span>
                            {isCurrent && <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-sans font-semibold">Actif</span>}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                      <input
                        type="number"
                        placeholder="Autre année (ex: 2028)"
                        value={quickYearInput}
                        onChange={(e) => setQuickYearInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono outline-none focus:ring-1 focus:ring-[#0070BA]"
                      />
                      <button
                        onClick={handleAddQuickYear}
                        className="px-2.5 py-1.5 bg-[#0070BA] text-white rounded-xl font-bold text-xs hover:bg-[#005a96] cursor-pointer shrink-0"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bouton de bascule directe vers la borne Kiosk */}
              <button
                onClick={onOpenKiosk}
                className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                <CalendarCheck className="w-3.5 h-3.5 text-sky-300" />
                <span>{t("nav.kiosk") || "Borne Kiosk"}</span>
              </button>

              {/* Cloche de notifications avec pastille rouge */}
              <div className="relative cursor-pointer p-1.5 rounded-xl hover:bg-white/10 transition-colors">
                <Bell className="w-4 h-4 text-sky-200" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#003B7A]" />
              </div>

              {/* Profil Cornelca BITODI avec avatar rond et menu déroulant */}
              <div className="relative">
                <div 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2.5 pl-2 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00A3E0] to-sky-400 text-white font-extrabold flex items-center justify-center text-xs shadow-md">
                    {(currentAdmin.firstName || "C")[0]}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white group-hover:text-sky-200 transition-colors">
                      {currentAdmin.firstName} {currentAdmin.lastName}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-sky-300" />
                  </div>
                </div>

                {/* Menu déroulant profil avec option Déconnexion */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-white border border-slate-200 shadow-2xl p-3 z-50 text-slate-800 animate-fadeIn text-xs">
                    <div className="p-2 border-b border-slate-100">
                      <div className="font-bold text-slate-900">
                        {currentAdmin.firstName} {currentAdmin.lastName}
                      </div>
                      <div className="text-[11px] text-[#0070BA] font-semibold">{currentAdmin.role}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{currentAdmin.email}</div>
                    </div>

                    <div className="py-2 space-y-1">
                      {/* Option Mon Profil */}
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowProfileModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 text-left font-semibold cursor-pointer"
                      >
                        <UserCircle className="w-4 h-4 text-[#0070BA]" />
                        <span>Mon Profil</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab("settings");
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 text-left font-semibold cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-[#0070BA]" />
                        <span>{t("nav.settings") || "Paramètres & Accès RH"}</span>
                      </button>

                      {/* Option Déconnexion */}
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          if (onLogout) onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 text-left font-bold cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-600" />
                        <span>{t("nav.logout") || "Se Déconnecter"}</span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {t("header.securedSession") || "Session Sécurisée"}
                      </span>
                      <button
                        onClick={onOpenKiosk}
                        className="text-[11px] text-slate-500 hover:text-sky-600 font-semibold cursor-pointer"
                      >
                        {t("nav.kiosk") || "Borne"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </header>

          {/* CONTENU PRINCIPAL DES ONGLETS */}
          <main className="flex-1 p-6 sm:p-8 max-w-[1400px] w-full mx-auto overflow-y-auto">
            {activeTab === "dashboard" && (
              <DashboardOverview 
                onNavigate={setActiveTab} 
                companySettings={companySettings}
                currentAdmin={currentAdmin}
              />
            )}
            {activeTab === "employees" && (
              <EmployeesManager onNavigateToBadge={() => setActiveTab("badges")} />
            )}
            {activeTab === "badges" && <BadgesManager />}
            {activeTab === "conges" && (
              <div className="rounded-3xl p-8 border text-center py-16 shadow-sm bg-white border-slate-200">
                <Calendar className="w-12 h-12 text-[#0070BA] mx-auto mb-3" />
                <h3 className="text-lg font-bold">Module de Gestion des Congés & Absences</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Enregistrez et suivez les demandes de congés payés, congés maladie et permissions d'absence des collaborateurs pour l'exercice {companySettings.activeYear || "2026"}.
                </p>
              </div>
            )}
            {activeTab === "documents" && <DocumentEngine />}
            {activeTab === "settings" && (
              <SettingsManager onSettingsChange={handleSettingsChange} />
            )}
          </main>

          {/* PIED DE PAGE DISCRET CENTRÉ (STYLE MAQUETTE) */}
          <footer className="py-4 px-6 text-center text-xs border-t transition-colors bg-white border-slate-200/80 text-slate-400">
            <span className="font-extrabold text-slate-700 notranslate uppercase" translate="no">
              {companySettings.companyName || "NTÊMO ONE"}
            </span> © {companySettings.activeYear || "2026"} • Système d'Identification Biométrique & Gestion RH — {companySettings.address || "Brazzaville (Congo)"}.
          </footer>

        </div>

      </div>

      {/* MODAL MON PROFIL */}
      <AdminProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentAdmin={currentAdmin}
        onSave={handleProfileSave}
      />

    </div>
  );
}
