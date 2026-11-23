﻿import React, { useState, useEffect } from "react";
import { attendanceService } from "../../services/attendanceService";
import { QRCodeSVG } from "qrcode.react";
import { 
  Users, UserPlus, Search, Filter, FileText, AlertTriangle, CheckCircle,
  CreditCard, DollarSign, Briefcase, Printer, Shield, X, Loader2, Trash2,
  Eye, Building, Mail, Phone, Calendar, Wallet, RefreshCw, ArrowRightLeft,
  CheckSquare, Square, Sparkles, Download, Lock, UserX, UserCheck, Camera, Upload, Edit3
} from "lucide-react";

export default function EmployeesManager({ onNavigateToBadge }) {
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [salaryModalEmp, setSalaryModalEmp] = useState(null);
  const [badgeModalEmp, setBadgeModalEmp] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Modal changement de statut
  const [statusChangeEmp, setStatusChangeEmp] = useState(null);
  const [newStatus, setNewStatus] = useState("ACTIVE");
  const [statusNote, setStatusNote] = useState("");
  const [genDoc, setGenDoc] = useState(false);
  const [genDocType, setGenDocType] = useState("");
  const [genDocTiming, setGenDocTiming] = useState("after");
  const [docTemplates, setDocTemplates] = useState([]);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [statusTab, setStatusTab] = useState("ALL"); // "ALL" | "ACTIVE" | "TERMINATED"
  const [companySettings, setCompanySettings] = useState(attendanceService.getDefaultCompanySettings());

  // Modal d'édition complète des informations de l'employé
  const [editEmp, setEditEmp] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Formulaire d'inscription avec Rôles et Salaire
  const [newEmp, setNewEmp] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "Collaborateur",
    position: "",
    department: "Technologies & Systèmes",
    contract_type: "CDI",
    hire_date: new Date().toISOString().split("T")[0],
    base_salary: 350000,
    currency: "FCFA",
    transport_allowance: 30000,
    payment_method: "Virement Bancaire",
    bank_name: "BGFI Bank",
    bank_account: "",
    status: "ACTIVE",
    photo_url: null,
  });

  // Gestion universelle de sélection et téléversement de photos
  const handlePhotoSelect = (file, callback) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result;
      callback(base64);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoUploadForEmployee = async (file, empId) => {
    if (!file || !empId) return;
    handlePhotoSelect(file, async (base64) => {
      try {
        await attendanceService.updateEmployee(empId, { photo_url: base64 });
        setSuccessMessage("Photo du collaborateur mise à jour avec succès !");
        setTimeout(() => setSuccessMessage(null), 4000);
        if (selectedEmp?.id === empId) {
          setSelectedEmp((prev) => (prev ? { ...prev, photo_url: base64 } : prev));
        }
        if (badgeModalEmp?.id === empId) {
          setBadgeModalEmp((prev) => (prev ? { ...prev, photo_url: base64 } : prev));
        }
      } catch (err) {
        console.error("Erreur mise à jour photo:", err);
      }
    });
  };

  // Enregistrement des modifications complètes d'un collaborateur
  const handleSaveEmployeeEdit = async (e) => {
    e.preventDefault();
    if (!editEmp) return;
    setIsSavingEdit(true);
    try {
      const fullName = `${editEmp.first_name || ""} ${editEmp.last_name || ""}`.trim();
      const updates = {
        first_name: editEmp.first_name,
        last_name: editEmp.last_name,
        full_name: fullName,
        position: editEmp.position,
        role: editEmp.role,
        department: editEmp.department,
        email: editEmp.email,
        phone: editEmp.phone,
        contract_type: editEmp.contract_type,
        base_salary: Number(editEmp.base_salary) || 0,
        transport_allowance: Number(editEmp.transport_allowance) || 0,
        total_salary: (Number(editEmp.base_salary) || 0) + (Number(editEmp.transport_allowance) || 0),
        photo_url: editEmp.photo_url || null,
      };

      await attendanceService.updateEmployee(editEmp.id, updates);

      if (badgeModalEmp?.id === editEmp.id) {
        setBadgeModalEmp((prev) => (prev ? { ...prev, ...updates } : null));
      }
      if (selectedEmp?.id === editEmp.id) {
        setSelectedEmp((prev) => (prev ? { ...prev, ...updates } : null));
      }

      setSuccessMessage(`Dossier et badge de ${fullName} mis à jour automatiquement !`);
      setTimeout(() => setSuccessMessage(null), 5000);
      setEditEmp(null);
    } catch (err) {
      console.error("Erreur modification employé:", err);
      alert("Erreur lors de l'enregistrement des modifications.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const roles = [
    "Directeur Général",
    "Responsable RH",
    "Chef de Projet",
    "Ingénieur / Développeur",
    "Analyste Financier / Comptable",
    "Technicien Réseaux & Systèmes",
    "Opérateur Logistique",
    "Assistant Administratif",
    "Collaborateur",
  ];

  const departments = [
    "ALL",
    "Technologies & Systèmes",
    "Ressources Humaines",
    "Gestion de Projets",
    "Finance & Administration",
    "Opérations & Logistique",
  ];

  // Écoute temps réel Firestore & Paramètres entreprise
  useEffect(() => {
    const unsubEmps = attendanceService.subscribeToEmployees((emps) => {
      setEmployees(emps);
    });
    const unsubSettings = attendanceService.subscribeToCompanySettings((stg) => {
      if (stg) setCompanySettings(stg);
    });
    // Charger les modèles de documents
    try {
      const saved = localStorage.getItem("ntemo_doc_templates");
      if (saved) {
        const tpls = JSON.parse(saved);
        setDocTemplates(tpls.filter(t => t.active));
        const first = tpls.find(t => t.active);
        if (first) setGenDocType(first.type);
      }
    } catch(_) {}
    return () => {
      unsubEmps();
      if (typeof unsubSettings === "function") unsubSettings();
    };
  }, []);

  const isInactiveEmp = (emp) => {
    const s = emp.status || "ACTIVE";
    return s === "TERMINATED" || s === "Licencié" || s === "RESIGNED" || s === "Démissionnaire";
  };

  const activeEmployeesCount = employees.filter((e) => !isInactiveEmp(e)).length;
  const terminatedEmployeesCount = employees.filter((e) => isInactiveEmp(e)).length;

  const filteredEmployees = employees.filter((emp) => {
    const name = emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim();
    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.matricule || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.position || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.role || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === "ALL" || emp.department === selectedDept;

    const inactive = isInactiveEmp(emp);
    const matchesStatusTab =
      statusTab === "ALL" ? true :
      statusTab === "ACTIVE" ? !inactive :
      inactive;

    return matchesSearch && matchesDept && matchesStatusTab;
  });

  const generateMatricule = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `NTM-${year}-${rand}`;
  };

  const generateToken = () => {
    const rand = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `NTM-TOKEN-SEC-${rand}`;
  };

  // Inscription complète de l'employé avec génération du badge
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmp.first_name || !newEmp.last_name || !newEmp.position) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const matricule = generateMatricule();
      const token = generateToken();

      const created = {
        first_name: newEmp.first_name,
        last_name: newEmp.last_name,
        full_name: `${newEmp.first_name} ${newEmp.last_name}`.trim(),
        email: newEmp.email || `contact.${newEmp.first_name.toLowerCase()}@ntemo.com`,
        phone: newEmp.phone || "+242 06 000 0000",
        role: newEmp.role,
        position: newEmp.position,
        department: newEmp.department,
        hire_date: newEmp.hire_date,
        contract_type: newEmp.contract_type,
        // Données salariales
        base_salary: Number(newEmp.base_salary) || 0,
        currency: newEmp.currency,
        transport_allowance: Number(newEmp.transport_allowance) || 0,
        total_salary: (Number(newEmp.base_salary) || 0) + (Number(newEmp.transport_allowance) || 0),
        payment_method: newEmp.payment_method,
        bank_name: newEmp.bank_name,
        bank_account: newEmp.bank_account,
        status: "ACTIVE",
        matricule,
        badge_security_token: token,
        photo_url: newEmp.photo_url || null,
      };

      const result = await attendanceService.createEmployee(created);
      setIsModalOpen(false);
      setSuccessMessage(`Collaborateur ${created.full_name} inscrit avec succès ! Son badge sécurisé a été généré.`);
      setTimeout(() => setSuccessMessage(null), 5000);

      // Ouvrir automatiquement le modal du badge généré
      setBadgeModalEmp(result);

      // Reset formulaire
      setNewEmp({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        role: "Collaborateur",
        position: "",
        department: "Technologies & Systèmes",
        contract_type: "CDI",
        hire_date: new Date().toISOString().split("T")[0],
        base_salary: 350000,
        currency: "FCFA",
        transport_allowance: 30000,
        payment_method: "Virement Bancaire",
        bank_name: "BGFI Bank",
        bank_account: "",
        status: "ACTIVE",
        photo_url: null,
      });
    } catch (err) {
      console.error("Erreur création employé:", err);
      setSaveError("Impossible d'inscrire l'employé. Vérifiez la connexion.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEmployee = async (empId) => {
    if (!window.confirm("Supprimer définitivement ce collaborateur ?")) return;
    try {
      await attendanceService.deleteEmployee(empId);
      if (selectedEmp?.id === empId) setSelectedEmp(null);
    } catch (err) {
      console.error("Erreur suppression employé:", err);
    }
  };

  // Formatage monétaire
  const formatMoney = (amount, currency = "FCFA") => {
    return `${Number(amount || 0).toLocaleString("fr-FR")} ${currency}`;
  };

  // Statuts employés
  const STATUS_OPTIONS = [
    { value:"ACTIVE",     label:"Actif",           cls:"bg-emerald-50 text-emerald-700 border-emerald-200", dot:"●" },
    { value:"PROBATION",  label:"Période d'essai", cls:"bg-amber-50 text-amber-700 border-amber-200",       dot:"◎" },
    { value:"SUSPEND",    label:"Suspendu",         cls:"bg-orange-50 text-orange-700 border-orange-200",    dot:"⚠" },
    { value:"CONGE",      label:"En Congé",         cls:"bg-sky-50 text-sky-700 border-sky-200",             dot:"✈" },
    { value:"RESIGNED",   label:"Démissionnaire",   cls:"bg-slate-100 text-slate-600 border-slate-300",      dot:"↩" },
    { value:"TERMINATED", label:"Licencié",         cls:"bg-rose-50 text-rose-700 border-rose-200",          dot:"✕" },
  ];
  const getStatusInfo = (s) => STATUS_OPTIONS.find(o => o.value === s) || STATUS_OPTIONS[0];
  const getStatusLabel = (s) => getStatusInfo(s).label;

  // Génération de contenu de document (inline)
  const generateDocContent = (emp, docType) => {
    const today = new Date().toLocaleDateString("fr-FR");
    const empName = emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim();
    switch(docType) {
      case "ATTESTATION": return `NTÊMO ONE SARL — Brazzaville (Congo)\n\nATTESTATION DE TRAVAIL\n\nNous certifions que ${empName} (${emp.matricule}), ${emp.position}, est employé(e) au sein de notre entreprise.\n\nFait à Brazzaville, le ${today}\nDRH — NTÊMO ONE SARL`;
      case "LETTRE_PREAVIS": return `NTÊMO ONE SARL — Brazzaville (Congo)\n\nLETTRE DE PRÉAVIS\n\nNous informons ${empName} (${emp.matricule}) de la cessation de son contrat de type ${emp.contract_type || "CDI"}.\n\nFait à Brazzaville, le ${today}\nDRH — NTÊMO ONE SARL`;
      case "CERTIFICAT_TRAVAIL": return `NTÊMO ONE SARL — Brazzaville (Congo)\n\nCERTIFICAT DE TRAVAIL\n\nNous certifions que ${empName} (${emp.matricule}) a été employé(e) du ${emp.hire_date || "N/A"} au ${today} en qualité de ${emp.position}.\n\nFait à Brazzaville, le ${today}\nDRH — NTÊMO ONE SARL`;
      case "ORDRE_MISSION": return `NTÊMO ONE SARL — ORDRE DE MISSION\nMission N°: ODM-${new Date().getFullYear()}-${Math.floor(1000+Math.random()*9000)}\n\nCollaborateur: ${empName} (${emp.matricule})\nFonction: ${emp.position}\nDate: ${today}\n\nDRH — NTÊMO ONE SARL`;
      case "BILAN_PRESENCE": return `NTÊMO ONE SARL — BILAN DE PRÉSENCE\nPériode: ${new Date().toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}\nCollaborateur: ${empName} (${emp.matricule})\nDépartement: ${emp.department}\n\nStatut: Généré le ${today}`;
      case "CONTRAT": return `NTÊMO ONE SARL — CONTRAT DE TRAVAIL ${emp.contract_type||"CDI"}\n\nCollaborateur: ${empName} (${emp.matricule})\nPoste: ${emp.position}\nSalaire: ${Number(emp.base_salary||0).toLocaleString("fr-FR")} ${emp.currency||"FCFA"}\nDate d'embauche: ${emp.hire_date||today}\n\nFait à Brazzaville, le ${today}`;
      default: return `NTÊMO ONE SARL — Document RH\n${empName} (${emp.matricule})\nGénéré le ${today}`;
    }
  };

  const downloadDoc = (content, filename) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // Handler changement de statut
  const handleStatusChange = async () => {
    if (!statusChangeEmp || !newStatus) return;
    setIsChangingStatus(true);
    try {
      const docContent = genDoc && genDocType ? generateDocContent(statusChangeEmp, genDocType) : null;
      // Générer AVANT le changement si demandé
      if (genDoc && genDocType && genDocTiming === "before" && docContent) {
        downloadDoc(docContent, `${genDocType}_${statusChangeEmp.matricule}_AVANT-CHANGEMENT.txt`);
        await new Promise(r => setTimeout(r, 300));
      }
      // Appliquer le changement de statut
      await attendanceService.updateEmployee(statusChangeEmp.id, {
        status: newStatus,
        statusNote,
        statusChangedAt: new Date().toISOString()
      });
      // Générer APRÈS le changement si demandé
      if (genDoc && genDocType && genDocTiming === "after" && docContent) {
        await new Promise(r => setTimeout(r, 300));
        downloadDoc(docContent, `${genDocType}_${statusChangeEmp.matricule}_APRES-CHANGEMENT.txt`);
      }
      setSuccessMessage(`Statut de ${statusChangeEmp.full_name || statusChangeEmp.first_name} mis à jour → "${getStatusLabel(newStatus)}"${genDoc && genDocType ? " · Document généré et téléchargé." : "."}`);
      setTimeout(() => setSuccessMessage(null), 6000);
      setStatusChangeEmp(null);
      setStatusNote("");
      setGenDoc(false);
    } catch(err) {
      console.error("Erreur changement statut:", err);
    } finally {
      setIsChangingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête de page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Gestion des Employés, Rôles & Salaires
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Inscrivez les collaborateurs, attribuez leurs rôles, fixez leurs salaires et générez automatiquement leurs badges d'accès.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0070BA] to-[#00A3E0] hover:brightness-110 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-md shadow-sky-600/25 cursor-pointer active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Inscrire un Collaborateur</span>
        </button>
      </div>

      {/* Message de succès */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs"
          >
            Fermer
          </button>
        </div>
      )}

      {/* BARRE D'EXERCICE FISCAL ET FILTRES DE STATUT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-sky-50 to-blue-50/70 p-3.5 rounded-2xl border border-sky-200 text-xs text-sky-900 shadow-sm">
        <div className="flex items-center gap-2 font-medium">
          <Calendar className="w-4 h-4 text-[#0070BA] shrink-0" />
          <span>
            <strong>Exercice Actif : {companySettings?.activeYear || "2026"}</strong> — Tous les collaborateurs sont automatiquement reportés et conservés d'une année sur l'autre.
          </span>
        </div>
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-sky-200 shrink-0">
          <button
            onClick={() => setStatusTab("ALL")}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              statusTab === "ALL"
                ? "bg-[#0070BA] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tous ({employees.length})
          </button>
          <button
            onClick={() => setStatusTab("ACTIVE")}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              statusTab === "ACTIVE"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            En Activité ({activeEmployeesCount})
          </button>
          <button
            onClick={() => setStatusTab("TERMINATED")}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              statusTab === "TERMINATED"
                ? "bg-slate-700 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Licenciés / Archivés ({terminatedEmployeesCount})
          </button>
        </div>
      </div>

      {/* BARRE DE FILTRES ET RECHERCHE */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom, rôle, matricule, poste..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-[#00A3E0] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-[#00A3E0]"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === "ALL" ? "Tous les départements" : d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLE DES EMPLOYÉS (AVEC RÔLE, SALAIRE ET BADGE) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Collaborateur</th>
              <th className="px-6 py-4">Rôle & Poste</th>
              <th className="px-6 py-4">Département</th>
              <th className="px-6 py-4">Salaire Mensuel</th>
              <th className="px-6 py-4">Badge Sécurisé</th>
              <th className="px-6 py-4">Statut</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-600">Aucun collaborateur trouvé</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {statusTab === "TERMINATED" 
                      ? "Aucun collaborateur licencié ou archivé dans ce filtre." 
                      : "Cliquez sur « Inscrire un Collaborateur » ci-dessus pour ajouter un nouveau dossier."}
                  </p>
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => {
                const name = emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim();
                const totalSalary = (Number(emp.base_salary) || 0) + (Number(emp.transport_allowance) || 0);
                const isInactive = isInactiveEmp(emp);

                return (
                  <tr 
                    key={emp.id} 
                    className={
                      isInactive 
                        ? "bg-slate-100/90 text-slate-400 opacity-60 border-slate-300 grayscale select-none" 
                        : "hover:bg-slate-50/80 transition-colors"
                    }
                  >
                    
                    {/* Collaborateur */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {emp.photo_url ? (
                          <img
                            src={emp.photo_url}
                            alt={name}
                            className={`w-10 h-10 rounded-full object-cover border-2 shrink-0 shadow-sm ${
                              isInactive ? "border-slate-300 opacity-60" : "border-sky-400"
                            }`}
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm shadow-sm ${
                            isInactive 
                              ? "bg-slate-300 text-slate-600 border border-slate-400" 
                              : "bg-gradient-to-tr from-[#031B4D] to-[#00A3E0] border border-sky-300 text-white"
                          }`}>
                            {(name || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className={`font-bold text-xs flex items-center gap-2 ${isInactive ? "text-slate-500" : "text-slate-900"}`}>
                            <span>{name}</span>
                            {isInactive && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 border border-slate-300">
                                Archivé / Licencié
                              </span>
                            )}
                          </div>
                          <div className={`text-[11px] font-mono font-medium ${isInactive ? "text-slate-400" : "text-sky-700"}`}>
                            {emp.matricule}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Rôle & Poste */}
                    <td className="px-6 py-4">
                      <div className={`text-xs font-bold ${isInactive ? "text-slate-500" : "text-slate-800"}`}>{emp.position}</div>
                      <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        isInactive
                          ? "bg-slate-200 text-slate-500 border-slate-300"
                          : "text-sky-800 bg-sky-50 border-sky-100"
                      }`}>
                        {emp.role || "Collaborateur"}
                      </span>
                    </td>

                    {/* Département & Contrat */}
                    <td className="px-6 py-4">
                      <div className={`text-xs font-medium ${isInactive ? "text-slate-500" : "text-slate-700"}`}>{emp.department}</div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${
                        isInactive
                          ? "bg-slate-200 text-slate-500"
                          : emp.contract_type === "CDI" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {emp.contract_type || "CDI"}
                      </span>
                    </td>

                    {/* Salaire Mensuel */}
                    <td className="px-6 py-4">
                      {isInactive ? (
                        <div>
                          <div className="text-xs font-mono font-bold text-slate-400 line-through">
                            {formatMoney(totalSalary, emp.currency)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Verrouillé
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs font-mono font-bold text-emerald-700">
                            {formatMoney(totalSalary, emp.currency)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Base: {formatMoney(emp.base_salary, emp.currency)}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Badge d'accès */}
                    <td className="px-6 py-4">
                      {isInactive ? (
                        <span 
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-200 text-slate-500 border border-slate-300 text-xs font-semibold select-none cursor-not-allowed"
                          title="Badge révoqué : pointage interdit à la borne"
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Badge Révoqué</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => setBadgeModalEmp(emp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold transition-colors cursor-pointer"
                          title="Afficher le badge complet"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-[#00A3E0]" />
                          <span>Badge Généré</span>
                        </button>
                      )}
                    </td>

                    {/* Statut */}
                    <td className="px-6 py-4">
                      {(() => {
                        const si = getStatusInfo(emp.status || "ACTIVE");
                        return (
                          <button
                            onClick={() => { setStatusChangeEmp(emp); setNewStatus(emp.status || "ACTIVE"); setStatusNote(""); setGenDoc(false); }}
                            title="Cliquer pour modifier le statut ou réactiver"
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold cursor-pointer hover:opacity-80 transition-all ${si.cls}`}
                          >
                            {si.dot} {si.label}
                          </button>
                        );
                      })()}
                    </td>

                    {/* Actions - Suppression physique strictement interdite */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setStatusChangeEmp(emp); setNewStatus(emp.status || "ACTIVE"); setStatusNote(""); setGenDoc(false); }}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-xs flex items-center gap-1 border border-amber-200 transition-colors cursor-pointer"
                          title="Changer le statut & générer document"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Statut</span>
                        </button>

                        {isInactive ? (
                          <button
                            disabled
                            className="px-2.5 py-1.5 rounded-lg bg-slate-200 text-slate-400 font-semibold text-xs flex items-center gap-1 border border-slate-300 cursor-not-allowed select-none"
                            title="Dossier inactif : salaire verrouillé"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Verrouillé</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setSalaryModalEmp(emp)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs flex items-center gap-1 border border-emerald-200 transition-colors"
                            title="Gestion du Salaire"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            <span>Salaire</span>
                          </button>
                        )}

                        <button
                          onClick={() => setEditEmp({ ...emp })}
                          className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 font-semibold text-xs flex items-center gap-1 border border-sky-200 transition-colors cursor-pointer"
                          title="Modifier les informations et actualiser le badge automatiquement"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#00A3E0]" />
                          <span>Modifier</span>
                        </button>

                        <button
                          onClick={() => setSelectedEmp(emp)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 transition-colors"
                          title="Dossier Administratif et historique"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Dossier</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1 : FORMULAIRE D'INSCRIPTION EMPLOYÉ & SALAIRE     */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 my-8 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Inscrire un Collaborateur</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Renseignez l'identité, le rôle, et la rémunération. Le badge sera émis automatiquement.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {saveError}
              </div>
            )}

            <form onSubmit={handleAddEmployee} className="space-y-6">
              
              {/* SECTION A : IDENTITÉ */}
              <div>
                <h4 className="text-xs font-bold text-[#0070BA] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>1. Identité du Collaborateur</span>
                </h4>

                {/* SÉLECTEUR DE PHOTO D'IDENTITÉ */}
                <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 mb-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-sky-400 bg-white flex items-center justify-center shrink-0 shadow-sm">
                    {newEmp.photo_url ? (
                      <img src={newEmp.photo_url} alt="Aperçu photo" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1 flex-1">
                    <label className="text-xs font-bold text-slate-800 block">Photo d'Identité du Collaborateur</label>
                    <p className="text-[11px] text-slate-500">Visible sur le badge officiel et reconnue à la borne Kiosk.</p>
                    <div className="flex items-center gap-2 pt-1">
                      <label className="px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 border border-slate-300 hover:border-sky-300 text-sky-800 text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-[#00A3E0]" />
                        <span>{newEmp.photo_url ? "Changer la photo" : "Téléverser une photo"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handlePhotoSelect(f, (base64) => setNewEmp({ ...newEmp, photo_url: base64 }));
                          }}
                        />
                      </label>
                      {newEmp.photo_url && (
                        <button
                          type="button"
                          onClick={() => setNewEmp({ ...newEmp, photo_url: null })}
                          className="px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                        >
                          Retirer
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Prénom *</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: Cornelca"
                      value={newEmp.first_name}
                      onChange={(e) => setNewEmp({ ...newEmp, first_name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#00A3E0]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Nom de famille *</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: BITODI"
                      value={newEmp.last_name}
                      onChange={(e) => setNewEmp({ ...newEmp, last_name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#00A3E0]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Email Professionnel</label>
                    <input
                      type="email"
                      placeholder="cornelca.bitodi@ntemo.com"
                      value={newEmp.email}
                      onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#00A3E0]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Téléphone</label>
                    <input
                      type="tel"
                      placeholder="+242 06 000 0000"
                      value={newEmp.phone}
                      onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#00A3E0]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION B : RÔLE & POSTE */}
              <div>
                <h4 className="text-xs font-bold text-[#0070BA] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4" />
                  <span>2. Rôle & Attribution Professionnelle</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Rôle dans l'entreprise *</label>
                    <select
                      value={newEmp.role}
                      onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#00A3E0]"
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Poste exact / Titre *</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: Directeur Général, Développeur..."
                      value={newEmp.position}
                      onChange={(e) => setNewEmp({ ...newEmp, position: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#00A3E0]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Département</label>
                    <select
                      value={newEmp.department}
                      onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#00A3E0]"
                    >
                      {departments.filter((d) => d !== "ALL").map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Type de Contrat</label>
                    <select
                      value={newEmp.contract_type}
                      onChange={(e) => setNewEmp({ ...newEmp, contract_type: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#00A3E0]"
                    >
                      <option value="CDI">CDI (Indéterminée)</option>
                      <option value="CDD">CDD (Déterminée)</option>
                      <option value="STAGE">Stage Professionnel</option>
                      <option value="PRESTATAIRE">Prestataire / Consultant</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Statut à l'embauche</label>
                    <select
                      value={newEmp.status}
                      onChange={(e) => setNewEmp({ ...newEmp, status: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#00A3E0]"
                    >
                      <option value="ACTIVE">● Actif</option>
                      <option value="PROBATION">◎ Période d'essai</option>
                      <option value="SUSPEND">⚠ Suspendu</option>
                      <option value="CONGE">✈ En Congé</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION C : GESTION DU SALAIRE */}
              <div>
                <h4 className="text-xs font-bold text-[#0070BA] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  <span>3. Rémunération & Gestion du Salaire</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Salaire de Base Mensuel *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="5000"
                      value={newEmp.base_salary}
                      onChange={(e) => setNewEmp({ ...newEmp, base_salary: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#00A3E0]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Devise</label>
                    <select
                      value={newEmp.currency}
                      onChange={(e) => setNewEmp({ ...newEmp, currency: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#00A3E0]"
                    >
                      <option value="FCFA">FCFA (XAF)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Prime Transport & Panier</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={newEmp.transport_allowance}
                      onChange={(e) => setNewEmp({ ...newEmp, transport_allowance: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#00A3E0]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Mode de Paiement</label>
                    <select
                      value={newEmp.payment_method}
                      onChange={(e) => setNewEmp({ ...newEmp, payment_method: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#00A3E0]"
                    >
                      <option value="Virement Bancaire">Virement Bancaire</option>
                      <option value="Mobile Money (Airtel/MTN)">Mobile Money (Airtel / MTN)</option>
                      <option value="Espèces / Chèque">Espèces / Chèque</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Banque / N° Compte</label>
                    <input
                      type="text"
                      placeholder="ex: BGFI Bank - N° 0458-992384-21"
                      value={newEmp.bank_account}
                      onChange={(e) => setNewEmp({ ...newEmp, bank_account: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#00A3E0]"
                    />
                  </div>
                </div>
              </div>

              {/* BOUTONS D'ACTION */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0070BA] to-[#00A3E0] hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-sky-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Inscription & Émission du Badge...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Inscrire & Générer le Badge</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2 : BADGE GÉNÉRÉ APRÈS INSCRIPTION (OU CLIC BADGE) */}
      {/* ======================================================== */}
      {badgeModalEmp && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 text-center animate-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">
                Badge d'Identification Émis
              </span>
              <button
                onClick={() => setBadgeModalEmp(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-6 flex flex-col items-center">
              {badgeModalEmp.photo_url ? (
                <img
                  src={badgeModalEmp.photo_url}
                  alt={badgeModalEmp.full_name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-sky-400 shadow-lg mb-2"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#031B4D] to-[#00A3E0] flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-2">
                  {(badgeModalEmp.full_name || "?")[0].toUpperCase()}
                </div>
              )}

              {/* Bouton pour changer la photo directement depuis le badge */}
              <label className="text-xs font-bold text-[#0070BA] hover:text-sky-800 flex items-center gap-1.5 cursor-pointer bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-200 mb-3 hover:bg-sky-100 transition-all">
                <Camera className="w-3.5 h-3.5" />
                <span>{badgeModalEmp.photo_url ? "Modifier la photo du badge" : "Ajouter une photo au badge"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoUploadForEmployee(f, badgeModalEmp.id);
                  }}
                />
              </label>

              <h3 className="text-lg font-extrabold text-slate-900">{badgeModalEmp.full_name}</h3>
              <p className="text-xs font-semibold text-sky-700 mt-0.5">{badgeModalEmp.position}</p>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">Matricule : {badgeModalEmp.matricule}</p>

              {/* QR Code */}
              <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-md my-4">
                <QRCodeSVG
                  value={badgeModalEmp.badge_security_token || badgeModalEmp.matricule}
                  size={130}
                  level="H"
                />
              </div>

              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {badgeModalEmp.badge_security_token}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setBadgeModalEmp(null);
                  if (onNavigateToBadge) onNavigateToBadge();
                }}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#031B4D] to-[#00A3E0] text-white rounded-xl text-xs font-bold shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer la Carte Complète (Recto/Verso)</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3 : FICHE SALAIRE & PAIE                           */}
      {/* ======================================================== */}
      {salaryModalEmp && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 animate-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Fiche de Rémunération</h3>
                  <p className="text-xs text-slate-400">{salaryModalEmp.full_name} • {salaryModalEmp.position}</p>
                </div>
              </div>
              <button
                onClick={() => setSalaryModalEmp(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 flex justify-between items-center">
                <span className="text-slate-600">Salaire de Base Mensuel :</span>
                <strong className="font-mono text-sm text-slate-900">
                  {formatMoney(salaryModalEmp.base_salary, salaryModalEmp.currency)}
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 flex justify-between items-center">
                <span className="text-slate-600">Primes & Indemnités :</span>
                <strong className="font-mono text-sm text-emerald-600">
                  +{formatMoney(salaryModalEmp.transport_allowance, salaryModalEmp.currency)}
                </strong>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex justify-between items-center">
                <span className="font-bold text-emerald-950 text-sm">Salaire Brut Mensuel :</span>
                <strong className="font-mono text-base font-extrabold text-emerald-700">
                  {formatMoney(
                    (Number(salaryModalEmp.base_salary) || 0) + (Number(salaryModalEmp.transport_allowance) || 0),
                    salaryModalEmp.currency
                  )}
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 space-y-1.5 text-[11px] text-slate-500">
                <div className="flex justify-between">
                  <span>Mode de paiement :</span>
                  <strong className="text-slate-800">{salaryModalEmp.payment_method || "Virement"}</strong>
                </div>
                {salaryModalEmp.bank_account && (
                  <div className="flex justify-between">
                    <span>Coordonnées bancaires :</span>
                    <strong className="text-slate-800 font-mono">{salaryModalEmp.bank_account}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Type de contrat :</span>
                  <strong className="text-slate-800">{salaryModalEmp.contract_type || "CDI"}</strong>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSalaryModalEmp(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4 : CHANGEMENT DE STATUT + GÉNÉRATION DOCUMENT    */}
      {/* ======================================================== */}
      {statusChangeEmp && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-5 bg-gradient-to-r from-[#031B4D] to-[#0070BA] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-sky-200" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Changement de Statut</h3>
                  <p className="text-xs text-sky-200">{statusChangeEmp.full_name || `${statusChangeEmp.first_name} ${statusChangeEmp.last_name}`} • {statusChangeEmp.matricule}</p>
                </div>
              </div>
              <button onClick={() => setStatusChangeEmp(null)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">Statut actuel</label>
                {(() => { const si = getStatusInfo(statusChangeEmp.status || "ACTIVE"); return (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${si.cls}`}>{si.dot} {si.label}</span>
                ); })()}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">Nouveau statut <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map(opt => (
                    <label key={opt.value}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-xs font-semibold ${
                        newStatus === opt.value ? `${opt.cls} ring-2 ring-offset-1 ring-current` : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}>
                      <input type="radio" name="newStatus" value={opt.value} checked={newStatus === opt.value} onChange={() => setNewStatus(opt.value)} className="hidden" />
                      <span>{opt.dot}</span> {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Motif <span className="text-slate-400">(optionnel)</span></label>
                <textarea rows={2} value={statusNote} onChange={e => setStatusNote(e.target.value)}
                  placeholder="ex: Fin de période d'essai validée, Congé maladie prolongé..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs resize-none outline-none focus:ring-2 focus:ring-[#0070BA]" />
              </div>
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <div onClick={() => setGenDoc(!genDoc)}
                    className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all cursor-pointer ${genDoc ? "bg-[#0070BA] border-[#0070BA]" : "border-slate-300 bg-white"}`}>
                    {genDoc && <span className="text-white text-[10px] font-black">✓</span>}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800">Générer un document lié à ce changement</span>
                    <p className="text-[11px] text-slate-400">Télécharge automatiquement le document RH sélectionné</p>
                  </div>
                </label>
                {genDoc && (
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Type de document</label>
                      <select value={genDocType} onChange={e => setGenDocType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:ring-2 focus:ring-[#0070BA]">
                        {docTemplates.length === 0
                          ? <option value="">Aucun modèle actif — configurez dans Paramètres</option>
                          : docTemplates.map(t => <option key={t.id} value={t.type}>{t.name}</option>)
                        }
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1.5">Moment de génération</label>
                      <div className="flex gap-2">
                        {[{val:"before",label:"Avant le changement",desc:"État actuel"},{val:"after",label:"Après le changement",desc:"Nouvel état"}].map(opt => (
                          <label key={opt.val} className={`flex-1 p-2.5 rounded-xl border text-[11px] cursor-pointer transition-all ${
                            genDocTiming === opt.val ? "bg-sky-50 border-sky-300 text-sky-800 font-bold" : "border-slate-200 hover:bg-slate-50 text-slate-600"}`}>
                            <input type="radio" name="timing" value={opt.val} checked={genDocTiming === opt.val} onChange={() => setGenDocTiming(opt.val)} className="hidden" />
                            <div className="font-semibold">{opt.label}</div>
                            <div className="text-[10px] text-slate-400">{opt.desc}</div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button onClick={() => setStatusChangeEmp(null)} disabled={isChangingStatus}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer">
                  Annuler
                </button>
                <button onClick={handleStatusChange} disabled={isChangingStatus || !newStatus}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#031B4D] to-[#0070BA] text-white text-xs font-bold shadow-md hover:brightness-110 flex items-center gap-2 cursor-pointer disabled:opacity-50">
                  {isChangingStatus ? <><Loader2 className="w-4 h-4 animate-spin" /> Traitement...</>
                   : genDoc && genDocType ? <><Download className="w-4 h-4" /> {genDocTiming === "before" ? "Générer puis Appliquer" : "Appliquer puis Générer"}</>
                   : <><RefreshCw className="w-4 h-4" /> Appliquer le Changement</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DOSSIER GED */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-900">Dossier Collaborateur • {selectedEmp.full_name}</h3>
              <button onClick={() => setSelectedEmp(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo officielle du collaborateur avec option de téléversement */}
            <div className="flex items-center gap-4 p-3.5 bg-slate-50 rounded-2xl mb-4 border border-slate-200">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-sky-400 bg-white flex items-center justify-center shrink-0 shadow-sm">
                {selectedEmp.photo_url ? (
                  <img src={selectedEmp.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-[#031B4D] to-[#00A3E0] flex items-center justify-center text-white text-xl font-bold">
                    {(selectedEmp.full_name || "?")[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="space-y-1 flex-1">
                <span className="text-xs font-bold text-slate-800 block">Photo Officielle du Collaborateur</span>
                <p className="text-[11px] text-slate-400">Pour le badge et la borne biométrique de pointage.</p>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 border border-slate-300 hover:border-sky-300 text-sky-800 text-xs font-bold transition-all cursor-pointer shadow-sm mt-1">
                  <Camera className="w-3.5 h-3.5 text-[#00A3E0]" />
                  <span>{selectedEmp.photo_url ? "Remplacer la photo" : "Téléverser une photo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePhotoUploadForEmployee(f, selectedEmp.id);
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Matricule officiel :</span>
                <strong className="font-mono text-slate-900">{selectedEmp.matricule}</strong>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Rôle & Poste :</span>
                <strong className="text-slate-900">{selectedEmp.role} — {selectedEmp.position}</strong>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Contact :</span>
                <div className="text-slate-700">{selectedEmp.email} • {selectedEmp.phone}</div>
              </div>
            </div>
            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setEditEmp({ ...selectedEmp });
                  setSelectedEmp(null);
                }}
                className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#00A3E0]" />
                <span>Modifier les Informations</span>
              </button>
              <button
                onClick={() => setSelectedEmp(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL : MODIFIER LES INFORMATIONS DU COLLABORATEUR       */}
      {/* ======================================================== */}
      {editEmp && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 my-8 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Modifier le Collaborateur • {editEmp.full_name || `${editEmp.first_name} ${editEmp.last_name}`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Toute modification apportée ici met immédiatement à jour son dossier et son badge officiel en temps réel.
                </p>
              </div>
              <button
                onClick={() => setEditEmp(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployeeEdit} className="space-y-5">
              
              {/* Photo du collaborateur */}
              <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-sky-400 bg-white flex items-center justify-center shrink-0 shadow-sm">
                  {editEmp.photo_url ? (
                    <img src={editEmp.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="space-y-1 flex-1">
                  <span className="text-xs font-bold text-slate-800 block">Photo d'Identité Officielle</span>
                  <p className="text-[11px] text-slate-500">Inscrite sur le badge d'accès et reconnue à la borne Kiosk.</p>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 border border-slate-300 hover:border-sky-300 text-sky-800 text-xs font-bold transition-all cursor-pointer shadow-sm mt-1">
                    <Upload className="w-3.5 h-3.5 text-[#00A3E0]" />
                    <span>{editEmp.photo_url ? "Remplacer la photo" : "Téléverser une photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePhotoSelect(f, (b64) => setEditEmp({ ...editEmp, photo_url: b64 }));
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* 1. Identité */}
              <div>
                <h4 className="text-xs font-bold text-[#0070BA] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>Identité & État Civil</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Prénom *</label>
                    <input
                      type="text"
                      required
                      value={editEmp.first_name || ""}
                      onChange={(e) => setEditEmp({ ...editEmp, first_name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold outline-none focus:border-[#00A3E0]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Nom de famille *</label>
                    <input
                      type="text"
                      required
                      value={editEmp.last_name || ""}
                      onChange={(e) => setEditEmp({ ...editEmp, last_name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold outline-none focus:border-[#00A3E0]"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Rôle & Attribution */}
              <div>
                <h4 className="text-xs font-bold text-[#0070BA] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4" />
                  <span>Rôle & Poste (visible sur le Badge)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Poste exact (inscrit sur le badge) *</label>
                    <input
                      type="text"
                      required
                      value={editEmp.position || ""}
                      onChange={(e) => setEditEmp({ ...editEmp, position: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold outline-none focus:border-[#00A3E0]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Rôle</label>
                    <select
                      value={editEmp.role || "Collaborateur"}
                      onChange={(e) => setEditEmp({ ...editEmp, role: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:border-[#00A3E0]"
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Département</label>
                    <select
                      value={editEmp.department || "Technologies & Systèmes"}
                      onChange={(e) => setEditEmp({ ...editEmp, department: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:border-[#00A3E0]"
                    >
                      {departments.filter(d => d !== "ALL").map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Type de Contrat</label>
                    <select
                      value={editEmp.contract_type || "CDI"}
                      onChange={(e) => setEditEmp({ ...editEmp, contract_type: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:border-[#00A3E0]"
                    >
                      <option value="CDI">CDI (Indéterminée)</option>
                      <option value="CDD">CDD (Déterminée)</option>
                      <option value="STAGE">Stage Professionnel</option>
                      <option value="PRESTATAIRE">Prestataire / Consultant</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Contact & Rémunération */}
              <div>
                <h4 className="text-xs font-bold text-[#0070BA] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Phone className="w-4 h-4" />
                  <span>Coordonnées & Rémunération</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Email Professionnel</label>
                    <input
                      type="email"
                      value={editEmp.email || ""}
                      onChange={(e) => setEditEmp({ ...editEmp, email: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-[#00A3E0]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={editEmp.phone || ""}
                      onChange={(e) => setEditEmp({ ...editEmp, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-[#00A3E0]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Salaire de Base ({editEmp.currency || "FCFA"})</label>
                    <input
                      type="number"
                      value={editEmp.base_salary || 0}
                      onChange={(e) => setEditEmp({ ...editEmp, base_salary: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold outline-none focus:border-[#00A3E0]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Prime de Transport ({editEmp.currency || "FCFA"})</label>
                    <input
                      type="number"
                      value={editEmp.transport_allowance || 0}
                      onChange={(e) => setEditEmp({ ...editEmp, transport_allowance: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold outline-none focus:border-[#00A3E0]"
                    />
                  </div>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditEmp(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#031B4D] via-[#0070BA] to-[#00A3E0] hover:brightness-110 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  <span>Enregistrer & Actualiser le Badge</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}


