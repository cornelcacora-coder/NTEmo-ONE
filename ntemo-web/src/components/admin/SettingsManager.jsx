import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { attendanceService } from "../../services/attendanceService";
import {
  Building2,
  Users,
  Sliders,
  Globe,
  Moon,
  Sun,
  Calendar,
  Lock,
  Mail,
  Shield,
  Key,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
  Copy,
  ExternalLink,
  Upload,
  RefreshCw,
  Save,
  Check,
  Eye,
  EyeOff,
  UserCheck,
  LayoutDashboard,
  CreditCard,
  FileText,
  Settings,
  Sparkles,
  KeyRound,
  ListChecks,
  ToggleLeft,
  ToggleRight,
  FilePlus2,
  X,
  Image as ImageIcon,
  Phone,
  Smartphone,
  Send,
  Loader2,
  User
} from "lucide-react";

export default function SettingsManager({ onSettingsChange }) {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState("company"); // "company" | "system" | "users" | "documents"
  
  // Modèles de documents
  const DEFAULT_TEMPLATES = [
    { id:"tpl-1", name:"Attestation de Travail", type:"ATTESTATION", description:"Document certifié pour démarches administratives", active:true },
    { id:"tpl-2", name:"Ordre de Mission", type:"ORDRE_MISSION", description:"Mandat de déplacement officiel", active:true },
    { id:"tpl-3", name:"Bilan de Présence Mensuel", type:"BILAN_PRESENCE", description:"Heures effectives et retards depuis Firebase", active:true },
    { id:"tpl-4", name:"Lettre de Préavis", type:"LETTRE_PREAVIS", description:"Notification formelle de fin de contrat", active:true },
    { id:"tpl-5", name:"Certificat de Travail", type:"CERTIFICAT_TRAVAIL", description:"Document de fin de collaboration", active:true },
    { id:"tpl-6", name:"Contrat de Travail", type:"CONTRAT", description:"Convention d'embauche officielle", active:false }
  ];
  const [docTemplates, setDocTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem("ntemo_doc_templates");
      return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
    } catch(_) { return DEFAULT_TEMPLATES; }
  });
  const [showAddTpl, setShowAddTpl] = useState(false);
  const [newTplForm, setNewTplForm] = useState({ name:"", type:"ATTESTATION", description:"", mockupUrl:"" });
  
  // Paramètres Entreprise
  const [settings, setSettings] = useState(attendanceService.getDefaultCompanySettings());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [newYearInput, setNewYearInput] = useState("");

  // Utilisateurs RH / Admin
  const [adminUsers, setAdminUsers] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [showEditPermissionsModal, setShowEditPermissionsModal] = useState(false);

  const [activeUserForEmail, setActiveUserForEmail] = useState(null);
  const [activeUserForPass, setActiveUserForPass] = useState(null);
  const [activeUserForPerms, setActiveUserForPerms] = useState(null);

  // Formulaire d'ajout d'utilisateur
  const [newUser, setNewUser] = useState({
    firstName: "Cornelca",
    lastName: "BITODI",
    email: "cornelca.bitodi@ntemo.com",
    role: "Directeur des Ressources Humaines (DRH)",
    permissions: {
      dashboard: true,
      employees: true,
      badges: true,
      conges: true,
      documents: true,
      settings: true
    }
  });

  // Formulaire de changement de mot de passe
  const [passForm, setPassForm] = useState({
    currentTemp: "",
    newPassword: "",
    confirmPassword: "",
    error: "",
    success: false
  });

  // Copie dans le presse-papier
  const [copiedKey, setCopiedKey] = useState(null);

  // Sécurité & Mot de Passe de l'Administrateur Connecté (Cornelca BITODI)
  const [activeAdminSelf, setActiveAdminSelf] = useState(() => {
    try {
      const saved = localStorage.getItem("ntemo_active_admin");
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      id: "admin-cornelca-bitodi",
      firstName: "Cornelca",
      lastName: "BITODI",
      email: "cornelca.bitodi@ntemo.com",
      phone: "+242 06 400 12 34",
      role: "Directeur des Ressources Humaines (DRH)"
    };
  });

  const [adminPassForm, setAdminPassForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
    loading: false,
    error: "",
    success: ""
  });

  const [showAdminResetModal, setShowAdminResetModal] = useState(false);
  const [adminResetData, setAdminResetData] = useState(null);
  const [adminResetChannel, setAdminResetChannel] = useState("email");
  const [adminResetLoading, setAdminResetLoading] = useState(false);

  useEffect(() => {
    // Écoute en temps réel des paramètres entreprise
    const unsubSettings = attendanceService.subscribeToCompanySettings((data) => {
      if (data) {
        setSettings(data);
        if (data.language && data.language !== i18n.language) {
          i18n.changeLanguage(data.language);
        }
      }
    });

    // Écoute en temps réel des utilisateurs RH/Admin
    const unsubAdmins = attendanceService.subscribeToAdminUsers((users) => {
      if (users) setAdminUsers(users);
    });

    return () => {
      if (typeof unsubSettings === "function") unsubSettings();
      if (typeof unsubAdmins === "function") unsubAdmins();
    };
  }, []);

  // Sauvegarde des paramètres entreprise (100% Firestore + LocalStorage + React State)
  const handleSaveCompanySettings = async (e) => {
    e?.preventDefault();
    setSaveError("");
    try {
      const updated = await attendanceService.updateCompanySettings(settings);
      setSettings({ ...updated });
      if (onSettingsChange) onSettingsChange(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error("Erreur sauvegarde paramètres:", err);
      setSaveError("Erreur lors de l'enregistrement. Les données locales restent toutefois actives.");
    }
  };

  // Téléversement du Logo / Photo
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (uploadEvent) => {
        const base64Url = uploadEvent.target?.result;
        const newSettings = { ...settings, logoUrl: base64Url };
        setSettings(newSettings);
        await attendanceService.updateCompanySettings(newSettings);
        if (onSettingsChange) onSettingsChange(newSettings);
      };
      reader.readAsDataURL(file);
    }
  };

  // Bascule Mode Sombre
  const handleToggleDarkMode = async () => {
    const newDarkMode = !settings.darkMode;
    const updated = await attendanceService.updateCompanySettings({ darkMode: newDarkMode });
    setSettings(updated);
    if (onSettingsChange) onSettingsChange(updated);
  };

  // Changement de Langue i18n (Français, English, Russe)
  const handleChangeLanguage = async (langCode) => {
    await i18n.changeLanguage(langCode);
    const updated = await attendanceService.updateCompanySettings({ language: langCode });
    setSettings(updated);
    if (onSettingsChange) onSettingsChange(updated);
  };

  // Activation d'une Année d'Exercice
  const handleSetActiveYear = async (year) => {
    const updated = await attendanceService.updateCompanySettings({ activeYear: year });
    setSettings(updated);
    if (onSettingsChange) onSettingsChange(updated);
  };

  // Ajout d'une nouvelle Année
  const handleAddNewYear = async () => {
    if (!newYearInput.trim() || isNaN(newYearInput)) return;
    const yearStr = newYearInput.trim();
    const available = settings.availableYears || ["2024", "2025", "2026", "2027"];
    if (available.includes(yearStr)) {
      handleSetActiveYear(yearStr);
      setNewYearInput("");
      return;
    }
    const updatedYears = [...available, yearStr].sort();
    const updated = await attendanceService.updateCompanySettings({
      availableYears: updatedYears,
      activeYear: yearStr
    });
    setSettings(updated);
    setNewYearInput("");
    if (onSettingsChange) onSettingsChange(updated);
  };

  // Création d'un Utilisateur RH / Admin
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.email || !newUser.firstName) return;

    const created = await attendanceService.createAdminUser(newUser);
    setShowAddUserModal(false);

    // Ouvre immédiatement l'email officiel généré pour cet utilisateur
    setActiveUserForEmail(created);
    setShowEmailModal(true);

    // Reset form
    setNewUser({
      firstName: "",
      lastName: "",
      email: "",
      role: "Responsable RH",
      permissions: {
        dashboard: true,
        employees: true,
        badges: true,
        conges: true,
        documents: false,
        settings: false
      }
    });
  };

  // Réinitialiser le mot de passe d'un utilisateur
  const handleResetPassword = async (user) => {
    const updated = await attendanceService.resetAdminPassword(user.id);
    setActiveUserForEmail(updated);
    setShowEmailModal(true);
  };

  // Sauvegarde des permissions modifiées
  const handleSavePermissions = async () => {
    if (!activeUserForPerms) return;
    await attendanceService.updateAdminUser(activeUserForPerms.id, {
      permissions: activeUserForPerms.permissions,
      role: activeUserForPerms.role
    });
    setShowEditPermissionsModal(false);
  };

  // Exécution du changement de mot de passe (fonctionne à 100% et persiste)
  const handleExecutePasswordChange = async (e) => {
    e.preventDefault();
    setPassForm((p) => ({ ...p, error: "" }));

    if (!passForm.newPassword || passForm.newPassword.length < 6) {
      setPassForm((p) => ({ ...p, error: "Le mot de passe doit comporter au moins 6 caractères." }));
      return;
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      setPassForm((p) => ({ ...p, error: "Les deux mots de passe ne correspondent pas." }));
      return;
    }

    try {
      const updatedUser = await attendanceService.completePasswordChange(activeUserForPass.id, passForm.newPassword);
      setPassForm((p) => ({ ...p, success: true, error: "" }));

      // Si c'est l'utilisateur actuellement connecté, mettre à jour la session
      try {
        const active = localStorage.getItem("ntemo_active_admin");
        if (active) {
          const parsed = JSON.parse(active);
          if (parsed.id === activeUserForPass.id) {
            localStorage.setItem("ntemo_active_admin", JSON.stringify(updatedUser));
          }
        }
      } catch (_) {}

      setTimeout(() => {
        setShowChangePassModal(false);
        setPassForm({ currentTemp: "", newPassword: "", confirmPassword: "", error: "", success: false });
      }, 1400);
    } catch (err) {
      console.error("Erreur completePasswordChange:", err);
      setPassForm((p) => ({ ...p, error: "Erreur lors du changement de mot de passe." }));
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Modification directe du mot de passe de l'administrateur connecté
  const handleAdminChangeOwnPassword = async (e) => {
    e.preventDefault();
    setAdminPassForm((p) => ({ ...p, error: "", success: "" }));

    if (!adminPassForm.newPassword || adminPassForm.newPassword.length < 6) {
      setAdminPassForm((p) => ({ ...p, error: "Le mot de passe doit comporter au moins 6 caractères." }));
      return;
    }

    if (adminPassForm.newPassword !== adminPassForm.confirmPassword) {
      setAdminPassForm((p) => ({ ...p, error: "Les deux mots de passe ne correspondent pas." }));
      return;
    }

    setAdminPassForm((p) => ({ ...p, loading: true }));
    try {
      const adminId = activeAdminSelf?.id || "admin-cornelca-bitodi";
      const res = await attendanceService.changeAdminPassword(
        adminId,
        adminPassForm.oldPassword,
        adminPassForm.newPassword
      );

      setActiveAdminSelf(res.admin);
      setAdminPassForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
        loading: false,
        error: "",
        success: "Votre nouveau mot de passe administrateur a été enregistré avec succès !"
      });

      setTimeout(() => {
        setAdminPassForm((p) => ({ ...p, success: "" }));
      }, 4000);
    } catch (err) {
      setAdminPassForm((p) => ({
        ...p,
        loading: false,
        error: err?.message || "Erreur lors du changement de mot de passe."
      }));
    }
  };

  // Envoi d'une notification de réinitialisation personnalisée (Email ou SMS)
  const handleAdminRequestResetNotification = async (channel) => {
    setAdminResetChannel(channel);
    setAdminResetLoading(true);

    try {
      const identifier = channel === "email" 
        ? (activeAdminSelf?.email || "cornelca.bitodi@ntemo.com")
        : (activeAdminSelf?.phone || "+242 06 400 12 34");

      const res = await attendanceService.requestPasswordReset(identifier, channel);
      setAdminResetData(res);
      setShowAdminResetModal(true);
    } catch (err) {
      alert("Erreur: " + err.message);
    } finally {
      setAdminResetLoading(false);
    }
  };

  // Handlers modèles de documents
  const handleToggleTemplate = (id) => {
    const updated = docTemplates.map(t => t.id === id ? {...t, active: !t.active} : t);
    setDocTemplates(updated);
    try { localStorage.setItem("ntemo_doc_templates", JSON.stringify(updated)); } catch(_) {}
  };
  const handleDeleteTemplate = (id) => {
    if (!window.confirm("Supprimer ce modèle de document ?")) return;
    const updated = docTemplates.filter(t => t.id !== id);
    setDocTemplates(updated);
    try { localStorage.setItem("ntemo_doc_templates", JSON.stringify(updated)); } catch(_) {}
  };
  const handleAddTemplate = () => {
    if (!newTplForm.name.trim()) return;
    const id = `tpl-${Date.now()}`;
    const updated = [...docTemplates, { id, ...newTplForm, active: true }];
    setDocTemplates(updated);
    try { localStorage.setItem("ntemo_doc_templates", JSON.stringify(updated)); } catch(_) {}
    setNewTplForm({ name:"", type:"ATTESTATION", description:"", mockupUrl:"" });
    setShowAddTpl(false);
  };

  const handleUploadTemplateMockup = (templateId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result;
      const updated = docTemplates.map((t) => (t.id === templateId ? { ...t, mockupUrl: base64 } : t));
      setDocTemplates(updated);
      try {
        localStorage.setItem("ntemo_doc_templates", JSON.stringify(updated));
      } catch (_) {}
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveTemplateMockup = (templateId) => {
    const updated = docTemplates.map((t) => (t.id === templateId ? { ...t, mockupUrl: null } : t));
    setDocTemplates(updated);
    try {
      localStorage.setItem("ntemo_doc_templates", JSON.stringify(updated));
    } catch (_) {}
  };

  return (
    <div className={`space-y-6 ${settings.darkMode ? "text-slate-100" : "text-slate-800"}`}>
      
      {/* ======================================================== */}
      {/* EN-TÊTE DU MODULE PARAMÈTRES AVEC ONGLETS INTÉGRÉS      */}
      {/* ======================================================== */}
      <div className={`rounded-3xl p-6 sm:p-8 border shadow-sm transition-colors ${
        settings.darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0070BA]">
              <Settings className="w-4 h-4 animate-spin-slow" />
              <span>{t("settings.title") || "Configuration Système & Organisationnelle"}</span>
            </div>
            <h1 className="text-2xl font-black mt-1 tracking-tight">
              {settings.companyName || "NTÊMO ONE"} • {t("settings.title")}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {t("settings.subtitle")}
            </p>
          </div>

          {/* Raccourci Année Active & Mode Sombre rapide */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs font-bold ${
              settings.darkMode ? "bg-slate-800 border-slate-700 text-sky-300" : "bg-sky-50 border-sky-200 text-sky-800"
            }`}>
              <Calendar className="w-3.5 h-3.5" />
              <span>{t("header.activeYear")}: {settings.activeYear}</span>
            </div>

            <button
              onClick={handleToggleDarkMode}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                settings.darkMode 
                  ? "bg-amber-400/20 border-amber-400/40 text-amber-300 hover:bg-amber-400/30" 
                  : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {settings.darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{settings.darkMode ? "Clair" : "Sombre"}</span>
            </button>
          </div>
        </div>

        {/* Barre d'onglets Paramètres */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-slate-200/60 overflow-x-auto">
          <button
            onClick={() => setActiveSection("company")}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSection === "company"
                ? "bg-[#0070BA] text-white shadow-md shadow-sky-600/30"
                : settings.darkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{t("settings.tabCompany") || "Entreprise & Identité Visuelle"}</span>
          </button>

          <button
            onClick={() => setActiveSection("system")}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSection === "system"
                ? "bg-[#0070BA] text-white shadow-md shadow-sky-600/30"
                : settings.darkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{t("settings.tabSystem") || "Affichage, Langues & Exercices"}</span>
          </button>

          <button
            onClick={() => setActiveSection("users")}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSection === "users"
                ? "bg-[#0070BA] text-white shadow-md shadow-sky-600/30"
                : settings.darkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t("settings.tabUsers") || "Utilisateurs RH & Droits d'Accès"}</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 font-black">
              {adminUsers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSection("documents")}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSection === "documents"
                ? "bg-[#0070BA] text-white shadow-md shadow-sky-600/30"
                : settings.darkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <ListChecks className="w-4 h-4" />
            <span>Modèles de Documents</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 font-black">
              {docTemplates.filter(t => t.active).length}
            </span>
          </button>
        </div>
      </div>

      {/* Confirmation de sauvegarde */}
      {saveSuccess && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 p-4 rounded-2xl flex items-center justify-between animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-bold">
              {t("settings.saveSuccess") || "Paramètres mis à jour avec succès et synchronisés sur Firebase !"}
            </span>
          </div>
        </div>
      )}

      {saveError && (
        <div className="bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-300 p-4 rounded-2xl flex items-center gap-2.5 animate-fadeIn shadow-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <span className="text-xs font-bold">{saveError}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. SECTION ENTREPRISE & IDENTITÉ VISUELLE                */}
      {/* ======================================================== */}
      {activeSection === "company" && (
        <form onSubmit={handleSaveCompanySettings} className="space-y-6">
          <div className={`rounded-3xl p-6 sm:p-8 border shadow-sm transition-colors ${
            settings.darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold">{t("settings.companyIdentity") || "Identité & Coordonnées Officielles"}</h2>
                <p className="text-xs text-slate-400">{t("settings.companyDesc")}</p>
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0070BA] hover:bg-[#005a96] text-white text-xs font-bold rounded-2xl shadow-lg shadow-sky-600/30 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{t("settings.saveChanges") || "Enregistrer les Modifications"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Colonne Gauche : Logo / Photo de l'Entreprise */}
              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Logo / Photo Officielle
                </label>
                
                <div className={`p-6 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all ${
                  settings.darkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="w-28 h-28 rounded-2xl bg-white p-2 shadow-md border border-slate-200 flex items-center justify-center overflow-hidden mb-4 relative group">
                    <img
                      src={settings.logoUrl || "/ntemo-logo.jpg"}
                      alt="Logo Entreprise"
                      className="w-full h-full object-contain filter drop-shadow"
                    />
                  </div>

                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    {settings.companyName || "NTÊMO ONE"}
                  </p>
                  <p className="text-[10px] text-slate-400 mb-4 max-w-[200px]">
                    Format PNG, JPG ou SVG. Téléversez la photo de l'entreprise.
                  </p>

                  <label className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#0070BA]/10 hover:bg-[#0070BA]/20 text-[#0070BA] text-xs font-bold cursor-pointer transition-all border border-[#0070BA]/30">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{t("settings.changePhoto") || "Changer la Photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={async () => {
                      const newSettings = { ...settings, logoUrl: "/ntemo-logo.jpg" };
                      setSettings(newSettings);
                      await attendanceService.updateCompanySettings(newSettings);
                      if (onSettingsChange) onSettingsChange(newSettings);
                    }}
                    className="mt-2 text-[10px] text-slate-400 hover:text-[#0070BA] underline cursor-pointer"
                  >
                    {t("settings.restoreLogo") || "Restaurer le logo NTÊMO officiel"}
                  </button>
                </div>
              </div>

              {/* Colonne Centre & Droite : Formulaire d'Informations */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Nom de l'Entreprise */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold mb-1.5 text-slate-600 dark:text-slate-300">
                    {t("settings.companyName") || "Nom de l'Entreprise"} *
                  </label>
                  <input
                    type="text"
                    value={settings.companyName || ""}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-2xl border text-xs font-bold outline-none focus:ring-2 focus:ring-[#0070BA] ${
                      settings.darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}
                    placeholder="ex: NTÊMO ONE"
                    required
                  />
                </div>

                {/* Slogan / Devise */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold mb-1.5 text-slate-600 dark:text-slate-300">
                    {t("settings.motto") || "Devise / Slogan Officiel"}
                  </label>
                  <input
                    type="text"
                    value={settings.companyMotto || ""}
                    onChange={(e) => setSettings({ ...settings, companyMotto: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-2xl border text-xs outline-none focus:ring-2 focus:ring-[#0070BA] ${
                      settings.darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}
                    placeholder="ex: Ensemble, construisons un meilleur avenir"
                  />
                </div>

                {/* Adresse Complète (Strictement Brazzaville) */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold mb-1.5 text-slate-600 dark:text-slate-300">
                    {t("settings.address") || "Adresse du Siège Social"} *
                  </label>
                  <input
                    type="text"
                    value={settings.address || ""}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-2xl border text-xs font-medium outline-none focus:ring-2 focus:ring-[#0070BA] ${
                      settings.darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}
                    placeholder="Avenue CEMAC, Mpila, Zone Industrielle Ouenzé — Brazzaville (Congo)"
                    required
                  />
                </div>

                {/* Téléphone Officiel */}
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-600 dark:text-slate-300">
                    {t("settings.phone") || "Téléphone Officiel"}
                  </label>
                  <input
                    type="text"
                    value={settings.phone || ""}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-2xl border text-xs outline-none focus:ring-2 focus:ring-[#0070BA] ${
                      settings.darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}
                    placeholder="+242 06 400 12 34"
                  />
                </div>

                {/* Email Officiel */}
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-600 dark:text-slate-300">
                    {t("settings.email") || "Email de Contact / RH"}
                  </label>
                  <input
                    type="email"
                    value={settings.email || ""}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-2xl border text-xs outline-none focus:ring-2 focus:ring-[#0070BA] ${
                      settings.darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}
                    placeholder="contact@ntemo.com"
                  />
                </div>

                {/* Site Web */}
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-600 dark:text-slate-300">
                    {t("settings.website") || "Site Web Officiel"}
                  </label>
                  <input
                    type="text"
                    value={settings.website || ""}
                    onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-2xl border text-xs outline-none focus:ring-2 focus:ring-[#0070BA] ${
                      settings.darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}
                    placeholder="https://www.ntemoconsulting.com/"
                  />
                </div>

                {/* RCCM / IFU */}
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-600 dark:text-slate-300">
                    {t("settings.rccm") || "N° RCCM / IFU"}
                  </label>
                  <input
                    type="text"
                    value={settings.rccm || ""}
                    onChange={(e) => setSettings({ ...settings, rccm: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-2xl border text-xs font-mono outline-none focus:ring-2 focus:ring-[#0070BA] ${
                      settings.darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}
                    placeholder="CG-BZV-01-2026-B12-00456"
                  />
                </div>

              </div>

            </div>

          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* 2. SECTION AFFICHAGE, LANGUES I18N & EXERCICES           */}
      {/* ======================================================== */}
      {activeSection === "system" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Carte 1 : Changement de Langue avec i18n */}
          <div className={`rounded-3xl p-6 sm:p-8 border shadow-sm transition-colors ${
            settings.darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/15 text-[#0070BA] flex items-center justify-center font-bold">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">{t("settings.language") || "Langue du Système"}</h3>
                <p className="text-xs text-slate-400">{t("settings.languageDesc")}</p>
              </div>
            </div>

            <div className="space-y-3 mt-6">
              {[
                { code: "fr", label: "Français", flag: "🇫🇷 / 🇨🇬", desc: "Langue française de travail" },
                { code: "en", label: "English", flag: "🇬🇧 / 🇺🇸", desc: "International English language" },
                { code: "ru", label: "Русский (Russe)", flag: "🇷🇺", desc: "Русский интерфейс (i18n)" },
              ].map((lang) => {
                const isSelected = (settings.language || "fr") === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleChangeLanguage(lang.code)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#0070BA]/10 border-[#0070BA] text-[#0070BA] shadow-md ring-2 ring-[#0070BA]/20"
                        : settings.darkMode ? "border-slate-800 hover:bg-slate-800 text-slate-300" : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="text-2xl">{lang.flag}</span>
                      <div className="text-left">
                        <div className="text-xs font-extrabold">{lang.label}</div>
                        <div className="text-[10px] text-slate-400">{lang.desc}</div>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-[#0070BA]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Carte 2 : Mode Sombre & Thème */}
          <div className={`rounded-3xl p-6 sm:p-8 border shadow-sm transition-colors ${
            settings.darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold">
                {settings.darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold">{t("settings.darkMode") || "Thème Visuel & Mode Sombre"}</h3>
                <p className="text-xs text-slate-400">Basculez entre le mode clair moderne et le mode sombre haute visibilité.</p>
              </div>
            </div>

            <div className="mt-6 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold block">{t("settings.darkModeActive")}</span>
                  <span className="text-[11px] text-slate-400">
                    {settings.darkMode ? "Thème sombre activé (recommandé)" : "Thème clair actif"}
                  </span>
                </div>
                
                {/* Switch bouton */}
                <button
                  type="button"
                  onClick={handleToggleDarkMode}
                  className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.darkMode ? "bg-[#0070BA]" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.darkMode ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Horaires et Tolérance */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t("settings.hoursTitle") || "Horaires & Tolérance de Pointage"}
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">{t("settings.workStart") || "Entrée"}</label>
                  <input
                    type="time"
                    value={settings.workStartTime || "08:00"}
                    onChange={(e) => setSettings({ ...settings, workStartTime: e.target.value })}
                    className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold ${
                      settings.darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">{t("settings.lateTolerance") || "Tolérance Retard"}</label>
                  <input
                    type="time"
                    value={settings.lateToleranceTime || "08:30"}
                    onChange={(e) => setSettings({ ...settings, lateToleranceTime: e.target.value })}
                    className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold text-amber-500 ${
                      settings.darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">{t("settings.workEnd") || "Sortie"}</label>
                  <input
                    type="time"
                    value={settings.workEndTime || "17:00"}
                    onChange={(e) => setSettings({ ...settings, workEndTime: e.target.value })}
                    className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold ${
                      settings.darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Carte 3 : Activation des Années d'Exercice */}
          <div className={`md:col-span-2 rounded-3xl p-6 sm:p-8 border shadow-sm transition-colors ${
            settings.darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">{t("settings.activeYears") || "Gestion des Années & Exercices RH"}</h3>
                  <p className="text-xs text-slate-400">
                    {t("settings.activeYearsDesc")}
                  </p>
                </div>
              </div>

              {/* Champ d'ajout d'une nouvelle année */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  placeholder="ex: 2028"
                  className={`w-28 px-3 py-2 rounded-2xl border text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-[#0070BA] ${
                    settings.darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                  }`}
                />
                <button
                  type="button"
                  onClick={handleAddNewYear}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t("settings.addYear") || "Ajouter Année"}</span>
                </button>
              </div>
            </div>

            {/* Liste des Années Disponibles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {(settings.availableYears || ["2024", "2025", "2026", "2027"]).map((yr) => {
                const isActive = settings.activeYear === yr;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => handleSetActiveYear(yr)}
                    className={`p-4 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                      isActive
                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-md ring-2 ring-emerald-500/30"
                        : settings.darkMode ? "border-slate-800 hover:bg-slate-800 text-slate-300" : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="text-lg font-black font-mono">{yr}</span>
                    <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isActive ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                    }`}>
                      {isActive ? t("settings.inProgress") : t("settings.activate")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SECTION UTILISATEURS RH & DROITS D'ACCÈS              */}
      {/* ======================================================== */}
      {activeSection === "users" && (
        <div className="space-y-6">

          {/* ======================================================== */}
          {/* CARTE : SÉCURITÉ DE MON COMPTE ADMINISTRATEUR            */}
          {/* ======================================================== */}
          <div className="rounded-3xl p-6 sm:p-8 border border-sky-200 bg-gradient-to-br from-white via-sky-50/40 to-blue-50/20 shadow-md">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-sky-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#031B4D] to-[#0070BA] text-white flex items-center justify-center font-black text-xl shadow-md border-2 border-white">
                  {(activeAdminSelf?.firstName || "C")[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900">
                      {activeAdminSelf?.firstName || "Cornelca"} {activeAdminSelf?.lastName || "BITODI"}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0070BA]/10 text-[#0070BA] border border-[#0070BA]/20">
                      Administrateur Principal
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-[#0070BA]" />
                      <span>{activeAdminSelf?.email || "cornelca.bitodi@ntemo.com"}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-[#0070BA]" />
                      <span>{activeAdminSelf?.phone || "+242 06 400 12 34"}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Boutons d'envoi de réinitialisation sécurisée */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAdminRequestResetNotification("email")}
                  disabled={adminResetLoading}
                  className="px-4 py-2.5 rounded-2xl bg-white hover:bg-sky-50 text-[#0070BA] border border-sky-200 text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  title="Recevoir l'email officiel personnalisé NTÊMO avec code de réinitialisation"
                >
                  <Mail className="w-4 h-4 text-[#0070BA]" />
                  <span>Recevoir Email de Réinitialisation NTÊMO</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAdminRequestResetNotification("phone")}
                  disabled={adminResetLoading}
                  className="px-4 py-2.5 rounded-2xl bg-white hover:bg-sky-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  title="Recevoir le code de réinitialisation par SMS sur votre téléphone"
                >
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Code par SMS / Téléphone</span>
                </button>
              </div>
            </div>

            {/* Formulaire direct de changement de mot de passe */}
            <div className="pt-6">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#0070BA]" />
                <span>Modifier Mon Mot de Passe Administrateur</span>
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                Définissez directement un nouveau mot de passe sécurisé pour votre compte. Le changement est immédiatement appliqué et synchronisé.
              </p>

              {adminPassForm.success && (
                <div className="p-3.5 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{adminPassForm.success}</span>
                </div>
              )}

              {adminPassForm.error && (
                <div className="p-3.5 mb-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{adminPassForm.error}</span>
                </div>
              )}

              <form onSubmit={handleAdminChangeOwnPassword} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Ancien mot de passe (optionnel)</label>
                  <input
                    type="password"
                    value={adminPassForm.oldPassword}
                    onChange={(e) => setAdminPassForm({ ...adminPassForm, oldPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold outline-none focus:ring-2 focus:ring-[#0070BA]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nouveau mot de passe *</label>
                  <input
                    type="password"
                    required
                    value={adminPassForm.newPassword}
                    onChange={(e) => setAdminPassForm({ ...adminPassForm, newPassword: e.target.value })}
                    placeholder="Min. 6 caractères"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold outline-none focus:ring-2 focus:ring-[#0070BA]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Confirmer nouveau mot de passe *</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      required
                      value={adminPassForm.confirmPassword}
                      onChange={(e) => setAdminPassForm({ ...adminPassForm, confirmPassword: e.target.value })}
                      placeholder="Retapez le mot de passe"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold outline-none focus:ring-2 focus:ring-[#0070BA]"
                    />
                    <button
                      type="submit"
                      disabled={adminPassForm.loading}
                      className="px-5 py-2.5 rounded-xl bg-[#031B4D] hover:bg-[#0070BA] text-white text-xs font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {adminPassForm.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
                    </button>
                  </div>
                </div>
              </form>
            </div>

          </div>
          
          {/* Bannière Haut : Ajouter un Utilisateur */}
          <div className={`rounded-3xl p-6 sm:p-8 border shadow-sm transition-colors ${
            settings.darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600">
                  <Shield className="w-4 h-4" />
                  <span>{t("settings.userTitle") || "Gestion des Accès & Sécurité RH"}</span>
                </div>
                <h2 className="text-lg font-black mt-1">{t("settings.userTitle")}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t("settings.userSubtitle")}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0070BA] hover:bg-[#005a96] text-white text-xs font-bold rounded-2xl shadow-lg shadow-sky-600/30 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{t("settings.addUser") || "+ Ajouter un Utilisateur RH"}</span>
              </button>
            </div>
          </div>

          {/* Tableau de la liste des Utilisateurs RH */}
          <div className={`rounded-3xl border shadow-sm overflow-hidden transition-colors ${
            settings.darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                    settings.darkMode ? "bg-slate-800/60 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}>
                    <th className="py-4 px-6">{t("settings.colUser")}</th>
                    <th className="py-4 px-6">{t("settings.colRole")}</th>
                    <th className="py-4 px-6">{t("settings.colPerms")}</th>
                    <th className="py-4 px-6">{t("settings.colStatus")}</th>
                    <th className="py-4 px-6 text-right">{t("settings.colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {adminUsers.map((user) => {
                    const isMustChange = user.mustChangePassword;
                    const perms = user.permissions || {};
                    return (
                      <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        
                        {/* Identité */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#00A3E0] to-[#031B4D] text-white font-extrabold flex items-center justify-center text-xs shadow-sm">
                              {(user.firstName || "U")[0]}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                <span>{user.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Rôle */}
                        <td className="py-4 px-6">
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#0070BA]/10 text-[#0070BA] border border-[#0070BA]/20">
                            {user.role}
                          </span>
                        </td>

                        {/* Accès aux interfaces */}
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {perms.dashboard && (
                              <span className="px-2 py-0.5 rounded-md text-[9.5px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                Dashboard
                              </span>
                            )}
                            {perms.employees && (
                              <span className="px-2 py-0.5 rounded-md text-[9.5px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                Employés
                              </span>
                            )}
                            {perms.badges && (
                              <span className="px-2 py-0.5 rounded-md text-[9.5px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                Badges
                              </span>
                            )}
                            {perms.conges && (
                              <span className="px-2 py-0.5 rounded-md text-[9.5px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Congés
                              </span>
                            )}
                            {perms.documents && (
                              <span className="px-2 py-0.5 rounded-md text-[9.5px] font-semibold bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                                Rapports
                              </span>
                            )}
                            {perms.settings && (
                              <span className="px-2 py-0.5 rounded-md text-[9.5px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                Paramètres
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Statut sécurité */}
                        <td className="py-4 px-6">
                          {isMustChange ? (
                            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              <span className="text-[10px] font-bold">{t("settings.statusPending") || "1er Changement requis"}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              <span className="text-[10px] font-bold">{t("settings.statusActive") || "Actif & Sécurisé"}</span>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* Bouton Modifier Droits */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveUserForPerms(user);
                                setShowEditPermissionsModal(true);
                              }}
                              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                              title={t("settings.btnEditPerms")}
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Bouton Voir / Envoyer Email */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveUserForEmail(user);
                                setShowEmailModal(true);
                              }}
                              className="p-1.5 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950 text-sky-600 transition-colors cursor-pointer"
                              title="Afficher l'email d'invitation avec identifiants"
                            >
                              <Mail className="w-4 h-4" />
                            </button>

                            {/* Bouton Changer Mot de Passe Directement */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveUserForPass(user);
                                setPassForm({
                                  currentTemp: user.tempPassword || user.password || "",
                                  newPassword: "",
                                  confirmPassword: "",
                                  error: "",
                                  success: false
                                });
                                setShowChangePassModal(true);
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer border ${
                                isMustChange 
                                  ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                  : "bg-sky-500/10 hover:bg-sky-500/20 text-[#0070BA] border-sky-500/30"
                              }`}
                              title="Modifier ou réinitialiser le mot de passe"
                            >
                              {t("settings.btnChangePass") || "Mot de Passe"}
                            </button>

                            {/* Supprimer */}
                            {adminUsers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Supprimer l'accès de ${user.firstName} ${user.lastName} ?`)) {
                                    attendanceService.deleteAdminUser(user.id);
                                  }
                                }}
                                className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500 transition-colors cursor-pointer"
                                title={t("settings.btnDelete")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1 : AJOUTER UN UTILISATEUR RH AVEC DROITS          */}
      {/* ======================================================== */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-3xl p-6 sm:p-8 border shadow-2xl animate-scaleIn max-h-[90vh] overflow-y-auto ${
            settings.darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#0070BA]/15 text-[#0070BA] flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Nouvel Utilisateur RH / Administrateur</h3>
                  <p className="text-xs text-slate-400">Générez un accès avec mot de passe temporaire et email d'invitation.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-600 dark:text-slate-300">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs font-bold outline-none focus:ring-2 focus:ring-[#0070BA] ${
                      settings.darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}
                    placeholder="ex: Cornelca"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-600 dark:text-slate-300">Nom *</label>
                  <input
                    type="text"
                    required
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs font-bold outline-none focus:ring-2 focus:ring-[#0070BA] ${
                      settings.darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}
                    placeholder="ex: BITODI"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-600 dark:text-slate-300">Email Professionnel *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs font-medium outline-none focus:ring-2 focus:ring-[#0070BA] ${
                    settings.darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                  }`}
                  placeholder="cornelca.bitodi@ntemo.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-600 dark:text-slate-300">Rôle / Fonction Attribuée *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs font-bold outline-none focus:ring-2 focus:ring-[#0070BA] ${
                    settings.darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                  }`}
                >
                  <option value="Directeur des Ressources Humaines (DRH)">Directeur des Ressources Humaines (DRH)</option>
                  <option value="Responsable RH">Responsable RH</option>
                  <option value="Gestionnaire de Paie & Contrats">Gestionnaire de Paie & Contrats</option>
                  <option value="Superviseur de Borne / Sécurité">Superviseur de Borne / Sécurité</option>
                  <option value="Administrateur Système">Administrateur Système</option>
                </select>
              </div>

              {/* Attribution granulaire des accès aux interfaces */}
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Attribution des Accès aux Interfaces :
                </label>
                <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  
                  {[
                    { key: "dashboard", label: "Tableau de Bord", icon: LayoutDashboard },
                    { key: "employees", label: "Employés & Salaires", icon: Users },
                    { key: "badges", label: "Génération de Badges", icon: CreditCard },
                    { key: "conges", label: "Gestion des Congés", icon: Calendar },
                    { key: "documents", label: "Rapports & Documents", icon: FileText },
                    { key: "settings", label: "Paramètres Système", icon: Settings },
                  ].map((item) => {
                    const isChecked = newUser.permissions[item.key];
                    const Icon = item.icon;
                    return (
                      <label
                        key={item.key}
                        className={`flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-[#0070BA]/10 text-[#0070BA]"
                            : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            setNewUser({
                              ...newUser,
                              permissions: { ...newUser.permissions, [item.key]: e.target.checked }
                            })
                          }
                          className="w-4 h-4 rounded text-[#0070BA] focus:ring-[#0070BA]"
                        />
                        <Icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                      </label>
                    );
                  })}

                </div>
              </div>

              {/* Règle de Sécurité : Changement obligatoire */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-amber-800 dark:text-amber-300">
                <Shield className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Sécurité Obligatoire :</strong> Un mot de passe temporaire sera généré automatiquement. Dès sa première connexion sur l'interface, l'utilisateur aura l'obligation stricte de le modifier pour activer définitivement son compte.
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#0070BA] hover:bg-[#005a96] text-white text-xs font-bold rounded-2xl shadow-lg shadow-sky-600/30 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Créer & Préparer l'Email</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2 : APERÇU DE L'EMAIL OFFICIEL D'INVITATION        */}
      {/* ======================================================== */}
      {showEmailModal && activeUserForEmail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white text-slate-900 border border-slate-200 shadow-2xl animate-scaleIn max-h-[92vh] flex flex-col overflow-hidden">
            
            {/* Header de la modale */}
            <div className="bg-gradient-to-r from-[#031B4D] via-[#003B7A] to-[#020F28] text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 p-1 flex items-center justify-center">
                  <img src={settings.logoUrl || "/ntemo-logo.jpg"} alt="" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Email d'Activation des Accès RH</h3>
                  <p className="text-[11px] text-sky-200">Envoi sécurisé des identifiants au nouveau collaborateur</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Corps de l'email officiel */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* En-tête de message */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Destinataire :</span>
                  <span className="font-bold text-slate-800 font-mono">{activeUserForEmail.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Expéditeur :</span>
                  <span className="font-bold text-slate-800">Direction des Systèmes & RH • {settings.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Objet :</span>
                  <span className="font-bold text-[#0070BA]">[NTÊMO ONE] Vos accès au Portail RH - Activation de compte requise</span>
                </div>
              </div>

              {/* Message formaté */}
              <div className="border border-sky-100 bg-sky-50/40 rounded-2xl p-6 space-y-4 text-slate-700 leading-relaxed">
                <div className="flex items-center gap-3 pb-3 border-b border-sky-200/60">
                  <img src={settings.logoUrl || "/ntemo-logo.jpg"} alt="Logo" className="h-8 object-contain" />
                  <span className="text-xs font-black text-[#031B4D] tracking-wider uppercase">
                    {settings.companyName} • Portail RH
                  </span>
                </div>

                <p>
                  Bonjour <strong>{activeUserForEmail.firstName} {activeUserForEmail.lastName}</strong>,
                </p>

                <p>
                  Votre compte d'accès au système de gestion des présences et des ressources humaines vient d'être activé avec le rôle de : <strong className="text-[#0070BA]">{activeUserForEmail.role}</strong>.
                </p>

                {/* Bloc d'identifiants sécurisés */}
                <div className="bg-white p-4 rounded-xl border border-sky-200 shadow-sm space-y-2 font-mono">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Lien d'accès :</span>
                    <span className="font-bold text-slate-900">http://localhost:3001</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Identifiant :</span>
                    <span className="font-bold text-slate-900">{activeUserForEmail.email}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] bg-sky-50 p-2 rounded-lg border border-sky-200">
                    <span className="text-sky-800 font-sans font-bold">Mot de passe temporaire :</span>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#0070BA] text-sm">
                        {activeUserForEmail.tempPassword || activeUserForEmail.password || "NTM-2026-X7K2"}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeUserForEmail.tempPassword || activeUserForEmail.password || "NTM-2026-X7K2", "pass")}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Copier le mot de passe"
                      >
                        {copiedKey === "pass" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mention légale de changement obligatoire */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Changement obligatoire :</strong> Pour des raisons de conformité et de sécurité, ce mot de passe temporaire doit impérativement être remplacé lors de votre toute première connexion sur l'interface.
                  </div>
                </div>

                {/* Accès attribués */}
                <div>
                  <span className="font-bold text-slate-800 block mb-1">Modules et interfaces accordés :</span>
                  <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5">
                    {activeUserForEmail.permissions?.dashboard && <li>Tableau de Bord & Statistiques de présence</li>}
                    {activeUserForEmail.permissions?.employees && <li>Gestion des Collaborateurs & Grille des Salaires</li>}
                    {activeUserForEmail.permissions?.badges && <li>Concepteur & Impression des Badges Sécurisés</li>}
                    {activeUserForEmail.permissions?.conges && <li>Gestion des Demandes de Congés & Absences</li>}
                    {activeUserForEmail.permissions?.documents && <li>Moteur Documentaire & Rapports légaux</li>}
                    {activeUserForEmail.permissions?.settings && <li>Administration du Système & Paramètres Entreprise</li>}
                  </ul>
                </div>

                <p className="text-[11px] text-slate-500 pt-2 border-t border-sky-100">
                  Cordialement,<br />
                  <strong>L'Équipe RH & Sécurité • {settings.companyName}</strong><br />
                  {settings.address}
                </p>

              </div>

            </div>

            {/* Boutons d'action dans le footer */}
            <div className="bg-slate-50 p-4 sm:p-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  const body = `Bonjour ${activeUserForEmail.firstName} ${activeUserForEmail.lastName},\n\nVos accès au Portail RH ${settings.companyName} ont été créés.\n\nIdentifiant : ${activeUserForEmail.email}\nMot de passe temporaire : ${activeUserForEmail.tempPassword || activeUserForEmail.password}\n\nLien d'accès : http://localhost:3001\n\nAttention : Vous devrez obligatoirement changer ce mot de passe à votre première connexion.\n\nDirection des Ressources Humaines.`;
                  window.location.href = `mailto:${activeUserForEmail.email}?subject=${encodeURIComponent(`[${settings.companyName}] Vos identifiants Portail RH`)}&body=${encodeURIComponent(body)}`;
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Ouvrir dans Messagerie (Mailto)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = `Identifiant: ${activeUserForEmail.email}\nMot de passe: ${activeUserForEmail.tempPassword || activeUserForEmail.password}\nURL: http://localhost:3001`;
                    copyToClipboard(text, "all");
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-sky-50 hover:bg-sky-100 text-[#0070BA] border border-sky-200 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                >
                  {copiedKey === "all" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "all" ? "Copié !" : "Copier Tout"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowEmailModal(false);
                    setActiveUserForPass(activeUserForEmail);
                    setPassForm({
                      currentTemp: activeUserForEmail.tempPassword || activeUserForEmail.password || "",
                      newPassword: "",
                      confirmPassword: "",
                      error: "",
                      success: false
                    });
                    setShowChangePassModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-amber-500/20"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Changer le Mot de Passe</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3 : MODIFIER LE MOT DE PASSE (FONCTIONNEL 100%)    */}
      {/* ======================================================== */}
      {showChangePassModal && activeUserForPass && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white text-slate-900 border border-slate-200 shadow-2xl animate-scaleIn p-6 sm:p-8 space-y-5">
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 mx-auto flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                Modification du Mot de Passe
              </h3>
              <p className="text-xs text-slate-500">
                Utilisateur : <strong>{activeUserForPass.firstName} {activeUserForPass.lastName}</strong> ({activeUserForPass.email}).
              </p>
            </div>

            {passForm.success ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="text-xs font-bold text-emerald-800">
                  Mot de passe changé avec succès !
                </div>
                <div className="text-[11px] text-emerald-600">
                  Le compte est maintenant sécurisé et activé.
                </div>
              </div>
            ) : (
              <form onSubmit={handleExecutePasswordChange} className="space-y-4">
                
                {passForm.error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{passForm.error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-600">Mot de Passe Actuel / Provisoire</label>
                  <input
                    type="text"
                    disabled
                    value={passForm.currentTemp || "••••••••"}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-100 text-xs font-mono font-bold text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Nouveau Mot de Passe Sécurisé *</label>
                  <input
                    type="password"
                    required
                    placeholder="Min. 6 caractères"
                    value={passForm.newPassword}
                    onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold outline-none focus:ring-2 focus:ring-[#0070BA]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Confirmer le Nouveau Mot de Passe *</label>
                  <input
                    type="password"
                    required
                    placeholder="Retapez le même mot de passe"
                    value={passForm.confirmPassword}
                    onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold outline-none focus:ring-2 focus:ring-[#0070BA]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowChangePassModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    Fermer
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#0070BA] hover:bg-[#005a96] text-white text-xs font-bold rounded-2xl shadow-lg shadow-sky-600/30 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Valider & Enregistrer</span>
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4 : MODIFIER LES PERMISSIONS ET ACCÈS              */}
      {/* ======================================================== */}
      {showEditPermissionsModal && activeUserForPerms && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 border shadow-2xl animate-scaleIn ${
            settings.darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#0070BA]/15 text-[#0070BA] flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Modifier les Droits d'Accès</h3>
                  <p className="text-xs text-slate-400">{activeUserForPerms.firstName} {activeUserForPerms.lastName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditPermissionsModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-600 dark:text-slate-300">Rôle / Fonction</label>
                <select
                  value={activeUserForPerms.role}
                  onChange={(e) => setActiveUserForPerms({ ...activeUserForPerms, role: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs font-bold outline-none focus:ring-2 focus:ring-[#0070BA] ${
                    settings.darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                  }`}
                >
                  <option value="Directeur des Ressources Humaines (DRH)">Directeur des Ressources Humaines (DRH)</option>
                  <option value="Responsable RH">Responsable RH</option>
                  <option value="Gestionnaire de Paie & Contrats">Gestionnaire de Paie & Contrats</option>
                  <option value="Superviseur de Borne / Sécurité">Superviseur de Borne / Sécurité</option>
                  <option value="Administrateur Système">Administrateur Système</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Accès aux Interfaces Autorisées :
                </label>
                <div className="space-y-2 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  {[
                    { key: "dashboard", label: "Tableau de Bord & Métriques", icon: LayoutDashboard },
                    { key: "employees", label: "Gestion des Collaborateurs & Salaires", icon: Users },
                    { key: "badges", label: "Générateur de Badges & Impression", icon: CreditCard },
                    { key: "conges", label: "Module Congés & Absences", icon: Calendar },
                    { key: "documents", label: "Moteur Documentaire & Rapports légaux", icon: FileText },
                    { key: "settings", label: "Paramètres Système & Configuration", icon: Settings },
                  ].map((item) => {
                    const isChecked = activeUserForPerms.permissions?.[item.key];
                    const Icon = item.icon;
                    return (
                      <label
                        key={item.key}
                        className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-[#0070BA]/10 text-[#0070BA]"
                            : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!isChecked}
                          onChange={(e) =>
                            setActiveUserForPerms({
                              ...activeUserForPerms,
                              permissions: {
                                ...activeUserForPerms.permissions,
                                [item.key]: e.target.checked
                              }
                            })
                          }
                          className="w-4 h-4 rounded text-[#0070BA] focus:ring-[#0070BA]"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditPermissionsModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  className="px-6 py-2.5 bg-[#0070BA] hover:bg-[#005a96] text-white text-xs font-bold rounded-2xl shadow-lg shadow-sky-600/30 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer les Droits</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. SECTION MODÈLES DE DOCUMENTS                          */}
      {/* ======================================================== */}
      {activeSection === "documents" && (
        <div className={`rounded-3xl p-6 sm:p-8 border shadow-sm transition-colors ${
          settings.darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0070BA] mb-1">
                <ListChecks className="w-4 h-4" /> <span>Bibliothèque de Modèles RH</span>
              </div>
              <h2 className="text-lg font-bold">Modèles de Documents Officiels</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Les modèles actifs sont disponibles dans le Moteur de Documents et lors des changements de statut employé.
              </p>
            </div>
            <button onClick={() => setShowAddTpl(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0070BA] to-[#00A3E0] text-white text-xs font-bold rounded-2xl shadow-md hover:brightness-110 transition-all cursor-pointer shrink-0">
              <FilePlus2 className="w-4 h-4" /> <span>Nouveau Modèle</span>
            </button>
          </div>

          {showAddTpl && (
            <div className={`mb-5 p-5 rounded-2xl border-2 border-dashed ${
              settings.darkMode ? "bg-slate-800/60 border-sky-700" : "bg-sky-50/80 border-sky-300"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-sky-800 dark:text-sky-200 flex items-center gap-2">
                  <FilePlus2 className="w-4 h-4" /> Ajouter un nouveau modèle
                </h4>
                <button onClick={() => setShowAddTpl(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Nom du modèle *</label>
                  <input type="text" placeholder="ex: Fiche de Paie Mensuelle"
                    value={newTplForm.name} onChange={e => setNewTplForm({...newTplForm, name: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none focus:ring-2 focus:ring-[#0070BA]" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Type</label>
                  <select value={newTplForm.type} onChange={e => setNewTplForm({...newTplForm, type: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none focus:ring-2 focus:ring-[#0070BA]">
                    <option value="ATTESTATION">Attestation de Travail</option>
                    <option value="ORDRE_MISSION">Ordre de Mission</option>
                    <option value="BILAN_PRESENCE">Bilan de Présence</option>
                    <option value="LETTRE_PREAVIS">Lettre de Préavis</option>
                    <option value="CERTIFICAT_TRAVAIL">Certificat de Travail</option>
                    <option value="CONTRAT">Contrat de Travail</option>
                    <option value="AUTRE">Autre document RH</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Description</label>
                  <input type="text" placeholder="ex: Résumé mensuel de la paie"
                    value={newTplForm.description} onChange={e => setNewTplForm({...newTplForm, description: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none focus:ring-2 focus:ring-[#0070BA]" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Maquette Image (Papier en-tête)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setNewTplForm((p) => ({ ...p, mockupUrl: ev.target?.result }));
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-sky-50 file:text-[#0070BA] hover:file:bg-sky-100 cursor-pointer"
                  />
                  {newTplForm.mockupUrl && (
                    <span className="text-[10px] text-emerald-600 font-bold mt-1 block">✓ Image sélectionnée</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-3">
                <button onClick={() => setShowAddTpl(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer">Annuler</button>
                <button onClick={handleAddTemplate} disabled={!newTplForm.name.trim()}
                  className="px-5 py-2 bg-[#0070BA] text-white text-xs font-bold rounded-xl shadow hover:bg-[#005a96] transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5" /> Ajouter
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Total", value: docTemplates.length, cls: "text-sky-600" },
              { label: "Actifs", value: docTemplates.filter(t => t.active).length, cls: "text-emerald-600" },
              { label: "Inactifs", value: docTemplates.filter(t => !t.active).length, cls: "text-slate-400" },
            ].map(s => (
              <div key={s.label} className={`p-3 rounded-2xl border text-center ${settings.darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                <div className={`text-2xl font-black ${s.cls}`}>{s.value}</div>
                <div className="text-[11px] text-slate-400 font-semibold">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {docTemplates.map(tpl => {
              const typeColors = {
                ATTESTATION:"bg-indigo-50 text-indigo-700 border-indigo-200",
                ORDRE_MISSION:"bg-amber-50 text-amber-700 border-amber-200",
                BILAN_PRESENCE:"bg-emerald-50 text-emerald-700 border-emerald-200",
                LETTRE_PREAVIS:"bg-orange-50 text-orange-700 border-orange-200",
                CERTIFICAT_TRAVAIL:"bg-purple-50 text-purple-700 border-purple-200",
                CONTRAT:"bg-sky-50 text-sky-700 border-sky-200",
                AUTRE:"bg-slate-50 text-slate-600 border-slate-200",
              };
              const typeLabel = {
                ATTESTATION:"Attestation",ORDRE_MISSION:"Ordre Mission",BILAN_PRESENCE:"Bilan Présence",
                LETTRE_PREAVIS:"Lettre Préavis",CERTIFICAT_TRAVAIL:"Certificat",CONTRAT:"Contrat",AUTRE:"Autre"
              };
              return (
                <div key={tpl.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  tpl.active
                    ? settings.darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"
                    : settings.darkMode ? "bg-slate-800/40 border-slate-800 opacity-50" : "bg-slate-50 border-slate-200 opacity-55"
                }`}>
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    {/* Thumbnail Maquette si présente ou icône par défaut */}
                    {tpl.mockupUrl ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-sky-300 shadow-sm shrink-0 bg-white p-0.5 group relative" title="Maquette personnalisée chargée">
                        <img src={tpl.mockupUrl} alt="Maquette" className="w-full h-full object-cover rounded-lg" />
                      </div>
                    ) : (
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tpl.active ? "bg-gradient-to-br from-[#031B4D] to-[#00A3E0]" : "bg-slate-200 dark:bg-slate-700"}`}>
                        <FileText className={`w-5 h-5 ${tpl.active ? "text-white" : "text-slate-400"}`} />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs">{tpl.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeColors[tpl.type] || typeColors.AUTRE}`}>
                          {typeLabel[tpl.type] || tpl.type}
                        </span>
                        {tpl.mockupUrl ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-[#0070BA] border border-sky-200 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" /> Maquette Image Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] text-slate-400 border border-slate-200 bg-slate-50">
                            Maquette NTÊMO Standard
                          </span>
                        )}
                        {tpl.active
                          ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">● Actif</span>
                          : <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">Inactif</span>
                        }
                      </div>
                      {tpl.description && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{tpl.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {/* Bouton Téléverser / Changer Maquette */}
                    <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-[#0070BA] dark:text-sky-300 text-[11px] font-bold hover:bg-sky-100 transition-colors cursor-pointer" title="Téléverser l'image de la maquette">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{tpl.mockupUrl ? "Changer image" : "Ajouter maquette"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadTemplateMockup(tpl.id, file);
                        }}
                      />
                    </label>

                    {tpl.mockupUrl && (
                      <button
                        onClick={() => handleRemoveTemplateMockup(tpl.id)}
                        title="Retirer la maquette personnalisée"
                        className="px-2 py-1 rounded-xl text-amber-600 hover:bg-amber-50 border border-amber-200 text-[10px] font-semibold cursor-pointer"
                      >
                        Retirer
                      </button>
                    )}

                    <button onClick={() => handleToggleTemplate(tpl.id)} title={tpl.active ? "Désactiver" : "Activer"}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                        tpl.active ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                      }`}>
                      {tpl.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      {tpl.active ? "Actif" : "Inactif"}
                    </button>
                    <button onClick={() => handleDeleteTemplate(tpl.id)} title="Supprimer"
                      className="p-1.5 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {docTemplates.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <ListChecks className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-500">Aucun modèle configuré</p>
              </div>
            )}
          </div>

          <div className="mt-5 p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-200 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <span>Les modèles <strong>actifs</strong> apparaissent dans le <strong>Moteur de Génération</strong> (onglet Rapports) et dans le module <strong>Changement de Statut</strong> des employés.</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL : APERÇU OFFICIEL DE RÉINITIALISATION ADMIN NTÊMO  */}
      {/* ======================================================== */}
      {showAdminResetModal && adminResetData && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white text-slate-900 border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
            
            <div className="bg-gradient-to-r from-[#031B4D] via-[#003B7A] to-[#0070BA] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-sky-200" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Notification de Réinitialisation NTÊMO</h3>
                  <p className="text-[11px] text-sky-200">
                    {adminResetData.channel === "email" ? "Email officiel personnalisé" : "SMS de sécurité Brazzaville (+242)"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminResetModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              
              <div className="border border-sky-200 bg-sky-50/50 rounded-2xl p-5 space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-sky-200">
                  <div className="flex items-center gap-2.5">
                    <img src={settings.logoUrl || "/ntemo-logo.jpg"} alt="Logo" className="h-7 w-auto object-contain" />
                    <div>
                      <div className="font-extrabold text-xs text-[#031B4D]">NTÊMO CONSULTING</div>
                      <div className="text-[9.5px] text-slate-500">Direction Générale • Brazzaville (Congo)</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-sky-800 bg-white px-2.5 py-1 rounded-full border border-sky-200 shadow-sm">
                    {adminResetData.channel === "email" ? "Email Personnalisé" : "SMS Direct"}
                  </span>
                </div>

                <div className="text-xs text-slate-700 leading-relaxed space-y-1.5">
                  <p>
                    Bonjour <strong>{adminResetData.adminName}</strong>,
                  </p>
                  <p>
                    Vous avez demandé un code de réinitialisation sécurisé pour votre compte administrateur du système NTÊMO ONE.
                  </p>
                </div>

                {/* Bloc du Code */}
                <div className="bg-white p-4 rounded-2xl border border-sky-300 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">
                      Code de Sécurité (Valide 30 min) :
                    </span>
                    <span className="text-2xl font-mono font-black text-[#0070BA] tracking-widest">
                      {adminResetData.code}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      copyToClipboard(adminResetData.code, "adminCode");
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-100 hover:bg-sky-200 text-[#0070BA] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    {copiedKey === "adminCode" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === "adminCode" ? "Copié !" : "Copier"}</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 pt-1">
                  Destinataire : <strong className="text-slate-700">{adminResetData.channel === "email" ? adminResetData.email : adminResetData.phone}</strong>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                {adminResetData.channel === "email" ? (
                  <a
                    href={`mailto:${adminResetData.email}?subject=${encodeURIComponent("[NTÊMO ONE] Réinitialisation de votre mot de passe")}&body=${encodeURIComponent(`Bonjour ${adminResetData.adminName},\n\nVoici votre code de sécurité officiel pour réinitialiser le mot de passe de votre compte administrateur NTÊMO ONE :\n\nCODE : ${adminResetData.code}\n\nCe code expire dans 30 minutes.\n\nDirection Générale de NTÊMO\nAvenue CEMAC, Mpila, Zone Industrielle Ouenzé — Brazzaville (Congo)`)}`}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#0070BA] hover:bg-[#005a96] text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Ouvrir dans la Messagerie (Mailto)</span>
                  </a>
                ) : (
                  <a
                    href={`sms:${adminResetData.phone}?body=${encodeURIComponent(`[NTÊMO ONE] Votre code de sécurité de réinitialisation est : ${adminResetData.code}`)}`}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Envoyer le SMS ({adminResetData.phone})</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setShowAdminResetModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Fermer
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
