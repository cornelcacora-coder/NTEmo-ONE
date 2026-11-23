﻿import React, { useState, useEffect, useRef } from "react";
import { attendanceService } from "../../services/attendanceService";
import { QRCodeSVG } from "qrcode.react";
import { 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Printer, 
  CheckCircle2, 
  Sparkles, 
  Eye, 
  Loader2, 
  FilePlus2, 
  Settings, 
  Upload, 
  Image as ImageIcon,
  ShieldCheck,
  Building,
  User,
  Calendar,
  Award,
  Stamp,
  ArrowRightLeft,
  Archive,
  History,
  RotateCcw
} from "lucide-react";

const DEFAULT_TEMPLATES = [
  { id:"tpl-1", name:"Attestation de Travail", type:"ATTESTATION", description:"Document certifié pour démarches administratives", active:true },
  { id:"tpl-2", name:"Ordre de Mission", type:"ORDRE_MISSION", description:"Mandat de déplacement officiel", active:true },
  { id:"tpl-3", name:"Bilan de Présence Mensuel", type:"BILAN_PRESENCE", description:"Heures effectives et retards", active:true },
  { id:"tpl-4", name:"Lettre de Préavis", type:"LETTRE_PREAVIS", description:"Notification formelle de fin de contrat", active:true },
  { id:"tpl-5", name:"Certificat de Travail", type:"CERTIFICAT_TRAVAIL", description:"Document de fin de collaboration", active:true },
  { id:"tpl-6", name:"Contrat de Travail", type:"CONTRAT", description:"Convention d'embauche officielle", active:false }
];

const DEFAULT_ARCHIVES = [
  {
    id: "doc-arch-2024-01",
    year: "2024",
    templateType: "ATTESTATION",
    templateName: "Attestation de Travail",
    employeeId: "emp-cornelca-bitodi",
    employeeName: "CORNELCA BITODI",
    matricule: "NTM-2024-0001",
    refNumber: "NTM/RH/2024/NTM-2024-0001",
    date: "14 Novembre 2024",
    status: "Validé & Archivé"
  },
  {
    id: "doc-arch-2025-01",
    year: "2025",
    templateType: "BILAN_PRESENCE",
    templateName: "Bilan de Présence Annuel",
    employeeId: "emp-cornelca-bitodi",
    employeeName: "CORNELCA BITODI",
    matricule: "NTM-2025-0001",
    refNumber: "NTM/RH/2025/NTM-2025-0001",
    date: "18 Décembre 2025",
    status: "Validé & Archivé"
  }
];

export default function DocumentEngine() {
  const [employees, setEmployees] = useState([]);
  const [isLoadingEmps, setIsLoadingEmps] = useState(true);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [templateType, setTemplateType] = useState("ATTESTATION");
  const [docTemplates, setDocTemplates] = useState([]);
  const [companySettings, setCompanySettings] = useState(attendanceService.getDefaultCompanySettings());
  const [isPrinting, setIsPrinting] = useState(false);
  const [notification, setNotification] = useState(null);

  // Gestion multi-années des documents
  const [activeTab, setActiveTab] = useState("editor"); // "editor" | "history"
  const [archivedDocs, setArchivedDocs] = useState([]);
  const [historyYearFilter, setHistoryYearFilter] = useState("ALL");

  // Synchronisation des paramètres entreprise, modèles et archives
  useEffect(() => {
    // 1. Paramètres entreprise
    const unsubSettings = attendanceService.subscribeToCompanySettings((data) => {
      if (data) setCompanySettings(data);
    });

    // 2. Modèles de documents
    try {
      const saved = localStorage.getItem("ntemo_doc_templates");
      const templates = saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
      setDocTemplates(templates);
      const firstActive = templates.find((t) => t.active);
      if (firstActive) setTemplateType(firstActive.type);
    } catch (_) {
      setDocTemplates(DEFAULT_TEMPLATES);
    }

    // 3. Documents archivés multi-années
    try {
      const savedDocs = localStorage.getItem("ntemo_archived_documents");
      if (savedDocs) {
        setArchivedDocs(JSON.parse(savedDocs));
      } else {
        setArchivedDocs(DEFAULT_ARCHIVES);
        localStorage.setItem("ntemo_archived_documents", JSON.stringify(DEFAULT_ARCHIVES));
      }
    } catch (_) {
      setArchivedDocs(DEFAULT_ARCHIVES);
    }

    // 4. Employés
    setIsLoadingEmps(true);
    const unsubscribeEmps = attendanceService.subscribeToEmployees((emps) => {
      setEmployees(emps);
      setIsLoadingEmps(false);
      if (emps.length > 0 && !selectedEmpId) {
        // Sélectionner par défaut Cornelca BITODI s'il existe
        const bitodi = emps.find((e) => 
          (e.last_name || "").toUpperCase().includes("BITODI") || 
          (e.first_name || "").toUpperCase().includes("CORNELCA")
        );
        setSelectedEmpId((bitodi || emps[0]).id);
      }
    });

    return () => {
      if (typeof unsubSettings === "function") unsubSettings();
      if (typeof unsubscribeEmps === "function") unsubscribeEmps();
    };
  }, []);

  const activeTemplates = docTemplates.filter((t) => t.active);
  const currentTemplate = docTemplates.find((t) => t.type === templateType) || activeTemplates[0] || DEFAULT_TEMPLATES[0];
  const selectedEmp = employees.find((e) => e.id === selectedEmpId) || employees[0];

  const empName = selectedEmp
    ? (selectedEmp.full_name || `${selectedEmp.first_name || ""} ${selectedEmp.last_name || ""}`).trim().toUpperCase()
    : "CORNELCA BITODI";

  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const activeYear = companySettings?.activeYear || String(new Date().getFullYear());
  const refNumber = `NTM/RH/${activeYear}/${selectedEmp?.matricule || "NTM-2026-001"}`;

  // Archiver le document en cours pour l'exercice actif
  const handleArchiveCurrentDoc = () => {
    if (!selectedEmp) return;
    const newArchived = {
      id: `doc-arch-${Date.now()}`,
      year: activeYear,
      templateType: currentTemplate?.type || templateType,
      templateName: currentTemplate?.name || templateType,
      employeeId: selectedEmp.id,
      employeeName: empName,
      matricule: selectedEmp.matricule,
      refNumber,
      date: today,
      status: "Validé & Archivé"
    };

    const updated = [newArchived, ...archivedDocs];
    setArchivedDocs(updated);
    try {
      localStorage.setItem("ntemo_archived_documents", JSON.stringify(updated));
    } catch (_) {}

    setNotification(`Document "${newArchived.templateName}" archivé avec succès pour l'exercice ${activeYear} !`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Reporter un document d'une année passée vers l'exercice actif
  const handleForwardDocToActiveYear = (docToForward) => {
    const forwardedDoc = {
      ...docToForward,
      id: `doc-arch-${Date.now()}`,
      year: activeYear,
      refNumber: `NTM/RH/${activeYear}/${docToForward.matricule}`,
      date: today,
      status: `Reporté depuis ${docToForward.year} vers ${activeYear}`
    };

    const updated = [forwardedDoc, ...archivedDocs];
    setArchivedDocs(updated);
    try {
      localStorage.setItem("ntemo_archived_documents", JSON.stringify(updated));
    } catch (_) {}

    setNotification(`Document de ${docToForward.employeeName} reporté avec succès vers l'exercice ${activeYear} (Réf : ${forwardedDoc.refNumber}) !`);
    setTimeout(() => setNotification(null), 4500);
  };

  // Charger un document pour réimpression immédiate
  const handleLoadDocForPrint = (doc) => {
    const matchedEmp = employees.find((e) => e.id === doc.employeeId || e.matricule === doc.matricule);
    if (matchedEmp) {
      setSelectedEmpId(matchedEmp.id);
    }
    setTemplateType(doc.templateType);
    setActiveTab("editor");
    setNotification(`Document "${doc.templateName}" chargé pour réimpression dans la maquette officielle.`);
    setTimeout(() => setNotification(null), 3000);
  };

  // Gestion de l'impression fidèle
  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 150);
  };

  // Téléversement d'une maquette image directement depuis le moteur
  const handleUploadMockup = (file) => {
    if (!file || !currentTemplate) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result;
      const updated = docTemplates.map((t) => (t.id === currentTemplate.id ? { ...t, mockupUrl: base64 } : t));
      setDocTemplates(updated);
      try {
        localStorage.setItem("ntemo_doc_templates", JSON.stringify(updated));
      } catch (_) {}
      setNotification("Maquette d'image appliquée avec succès au modèle !");
      setTimeout(() => setNotification(null), 3500);
    };
    reader.readAsDataURL(file);
  };

  // Téléchargement du contenu texte brut
  const handleDownloadText = () => {
    if (!selectedEmp) return;
    const textContent = `RÉPUBLIQUE DU CONGO
ENTREPRISE NTÊMO ONE SARL
Avenue CEMAC, Mpila, Zone Industrielle Ouenzé — Brazzaville (Congo)
Direction des Ressources Humaines
Réf : ${refNumber}

DOCUMENT : ${currentTemplate?.name || templateType}
Collaborateur : ${empName}
Matricule : ${selectedEmp.matricule}
Poste : ${selectedEmp.position}
Département : ${selectedEmp.department}
Type de contrat : ${selectedEmp.contract_type}
Date d'embauche : ${selectedEmp.hire_date || "N/A"}
Statut : ${selectedEmp.status || "Actif"}

Fait à Brazzaville, le ${today}
Direction des Ressources Humaines — NTÊMO ONE SARL`;

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${templateType}_${selectedEmp.matricule || "employe"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatMoney = (amount, currency = "FCFA") => {
    return `${Number(amount || 0).toLocaleString("fr-FR")} ${currency}`;
  };

  return (
    <div className="space-y-6">
      
      {/* ======================================================== */}
      {/* 1. EN-TÊTE DU MODULE & CONTRÔLE D'IMPRESSION             */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0070BA] mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Moteur d'Édition & Génération Sécurisée</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Maquette & Documents Officiels RH
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Sélectionnez un collaborateur : ses données personnelles, administratives et contractuelles sont automatiquement récupérées et injectées dans la maquette officielle, prête à imprimer ou exporter.
          </p>
        </div>

        {selectedEmp && (
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleArchiveCurrentDoc}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm shadow-emerald-700/25"
              title="Archiver pour l'exercice actif"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Archiver ({activeYear})</span>
            </button>
            <button
              onClick={handleDownloadText}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              title="Télécharger le texte brut"
            >
              <Download className="w-4 h-4" />
              <span>Export Texte</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#031B4D] via-[#0070BA] to-[#00A3E0] hover:brightness-110 active:scale-[0.99] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-sky-900/25 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer le Document (A4)</span>
            </button>
          </div>
        )}
      </div>

      {/* BARRE D'ONGLETS MULTI-ANNÉES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm no-print">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("editor")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "editor"
                ? "bg-[#0070BA] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Éditeur & Maquette A4 (Exercice {activeYear})</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "history"
                ? "bg-[#0070BA] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Historique & Multi-Années ({archivedDocs.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-sky-800 bg-sky-50 px-3.5 py-1.5 rounded-xl border border-sky-100 font-medium">
          <ShieldCheck className="w-4 h-4 text-[#0070BA]" />
          <span>Exercice Fiscal Actif : <strong>{activeYear}</strong> — Brazzaville (Congo)</span>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-sm animate-fadeIn no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* VUE 1 : ÉDITEUR ET MAQUETTE OFFICIELLE */}
      {activeTab === "editor" && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLONNE GAUCHE (4 colonnes) : Sélection Employé & Modèle */}
        <div className="lg:col-span-4 space-y-5 no-print">
          
          {/* SÉLECTION DU COLLABORATEUR */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#0070BA]" />
                1. Collaborateur Bénéficiaire
              </span>
              <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100 font-mono">
                {employees.length} inscrit(s)
              </span>
            </div>

            {employees.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl">
                Aucun collaborateur enregistré.
              </div>
            ) : (
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 font-bold outline-none focus:ring-2 focus:ring-[#0070BA] cursor-pointer"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {(emp.full_name || `${emp.first_name} ${emp.last_name}`).toUpperCase()} ({emp.matricule}) — {emp.position}
                  </option>
                ))}
              </select>
            )}

            {/* Récapitulatif dynamique des informations récupérées */}
            {selectedEmp && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50/70 to-blue-50/50 border border-sky-200/80 space-y-2 text-xs">
                <div className="font-extrabold text-slate-900 flex items-center justify-between">
                  <span>{empName}</span>
                  <span className="font-mono text-[10px] text-sky-700 font-bold bg-white px-2 py-0.5 rounded-full border border-sky-200">
                    {selectedEmp.matricule}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-1">
                  <div><strong>Poste :</strong> {selectedEmp.position || "N/A"}</div>
                  <div><strong>Département :</strong> {selectedEmp.department || "Ressources Humaines"}</div>
                  <div><strong>Contrat :</strong> {selectedEmp.contract_type || "CDI"} • <strong>Statut :</strong> {selectedEmp.status || "Actif"}</div>
                  <div><strong>Rémunération :</strong> {formatMoney((selectedEmp.base_salary || 0) + (selectedEmp.transport_allowance || 0), selectedEmp.currency)}</div>
                </div>
              </div>
            )}
          </div>

          {/* SÉLECTION DU MODÈLE DE DOCUMENT */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#0070BA]" />
                2. Modèle de Document
              </span>
              <a href="#settings" className="text-[10px] font-bold text-[#0070BA] hover:underline flex items-center gap-1">
                <Settings className="w-3 h-3" /> Configurer
              </a>
            </div>

            <div className="space-y-2">
              {activeTemplates.map((tpl) => {
                const isSelected = templateType === tpl.type;
                return (
                  <label
                    key={tpl.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#0070BA] text-white border-[#0070BA] shadow-md shadow-sky-600/25"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <input
                        type="radio"
                        name="templateSelection"
                        value={tpl.type}
                        checked={isSelected}
                        onChange={() => setTemplateType(tpl.type)}
                        className="hidden"
                      />
                      {tpl.mockupUrl ? (
                        <img src={tpl.mockupUrl} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0 border border-white/40" />
                      ) : (
                        <FileText className={`w-4 h-4 shrink-0 ${isSelected ? "text-white" : "text-[#0070BA]"}`} />
                      )}
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold truncate">{tpl.name}</div>
                        <div className={`text-[10px] truncate ${isSelected ? "text-sky-100" : "text-slate-400"}`}>
                          {tpl.description || "Modèle officiel certifié"}
                        </div>
                      </div>
                    </div>

                    {tpl.mockupUrl && (
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full shrink-0 ${
                        isSelected ? "bg-white/20 text-white" : "bg-sky-50 text-[#0070BA]"
                      }`}>
                        Image
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Option pour téléverser une image de maquette pour ce modèle */}
            <div className="pt-2 border-t border-slate-100">
              <label className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-sky-300 bg-sky-50/60 hover:bg-sky-100/70 text-[#0070BA] text-xs font-bold transition-all cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{currentTemplate?.mockupUrl ? "Remplacer l'image de la maquette" : "Ajouter une image de maquette"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadMockup(file);
                  }}
                />
              </label>
              <p className="text-[10px] text-slate-400 text-center mt-1.5">
                PNG ou JPG (papier en-tête ou maquette de fond).
              </p>
            </div>
          </div>

        </div>

        {/* ======================================================== */}
        {/* COLONNE DROITE (8 colonnes) : MAQUETTE OFFICIELLE DU DOC */}
        {/* ======================================================== */}
        <div className="lg:col-span-8">
          
          {selectedEmp ? (
            <div className="bg-slate-200/80 p-4 sm:p-8 rounded-3xl border border-slate-300/80 shadow-inner overflow-x-auto">
              
              {/* FEUILLE OFFICIELLE FORMAT A4 HAUTE FIDÉLITÉ */}
              <div
                id="printable-document-area"
                className="w-full max-w-[780px] min-h-[1050px] mx-auto bg-white shadow-2xl rounded-sm p-10 sm:p-14 relative flex flex-col justify-between overflow-hidden text-slate-900 border border-slate-200/90 font-serif"
                style={{
                  backgroundColor: "#ffffff",
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact"
                }}
              >
                
                {/* 1. FILIGRANE GÉANT CENTRÉ (LOGO NTÊMO) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] select-none z-0">
                  <img src={companySettings.logoUrl || "/ntemo-logo.jpg"} alt="" className="w-[500px] h-[500px] object-contain" />
                </div>

                {/* SI UNE IMAGE DE MAQUETTE A ÉTÉ CHARGÉE POUR CE MODÈLE */}
                {currentTemplate?.mockupUrl && (
                  <div className="mb-6 rounded-xl overflow-hidden border border-slate-200 max-h-36 w-full flex items-center justify-center bg-slate-50 relative z-10">
                    <img src={currentTemplate.mockupUrl} alt="Maquette Officielle" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* CONTENU PRINCIPAL DU DOCUMENT */}
                <div className="relative z-10 space-y-7">
                  
                  {/* EN-TÊTE OFFICIEL DE L'ENTREPRISE (CONFORME BRAZZAVILLE) */}
                  <div className="flex items-start justify-between border-b-2 border-[#031B4D] pb-5">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl p-1 bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                        <img
                          src={companySettings.logoUrl || "/ntemo-logo.jpg"}
                          alt="Logo NTÊMO"
                          className="w-full h-full object-contain filter drop-shadow"
                        />
                      </div>
                      <div>
                        <h1 className="text-xl font-black text-[#031B4D] tracking-tight uppercase font-sans">
                          {companySettings.companyName || "NTÊMO ONE SARL"}
                        </h1>
                        <p className="text-[11px] font-semibold text-[#0070BA] font-sans tracking-wide">
                          {companySettings.companyMotto || "Ensemble, construisons un meilleur avenir"}
                        </p>
                        <p className="text-[9.5px] text-slate-500 font-sans mt-0.5 max-w-sm">
                          {companySettings.address || "Avenue CEMAC, Mpila, Zone Industrielle Ouenzé — Brazzaville (Congo)"}
                        </p>
                      </div>
                    </div>

                    {/* Bloc Légal & Coordonnées */}
                    <div className="text-right font-sans text-[9px] text-slate-500 space-y-0.5">
                      <div className="font-bold text-slate-800">DIRECTION DES RESSOURCES HUMAINES</div>
                      <div>RCCM : {companySettings.rccm || "CG-BZV-01-2026-B12-00456"}</div>
                      <div>IFU : {companySettings.ifu || "020260012345678"}</div>
                      <div>Tél : {companySettings.phone || "+242 06 400 12 34"}</div>
                      <div>Email : {companySettings.email || "direction@ntemo.com"}</div>
                    </div>
                  </div>

                  {/* RÉFÉRENCE & DATE OFFICIELLE */}
                  <div className="flex items-center justify-between text-xs font-sans">
                    <div className="font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                      Réf : {refNumber}
                    </div>
                    <div className="font-medium text-slate-600">
                      Brazzaville, le {today}
                    </div>
                  </div>

                  {/* TITRE PRINCIPAL DU DOCUMENT */}
                  <div className="text-center pt-2 pb-1">
                    <div className="inline-block relative">
                      <h2 className="text-2xl font-black text-[#031B4D] uppercase tracking-wider font-sans px-8 py-2 border-b-2 border-t-2 border-[#00A3E0]">
                        {currentTemplate?.name || "ATTESTATION DE TRAVAIL"}
                      </h2>
                    </div>
                  </div>

                  {/* CORPS DU DOCUMENT AVEC DONNÉES INJECTÉES DYNAMIQUEMENT */}
                  <div className="text-[13.5px] text-slate-800 leading-relaxed space-y-5 text-justify">
                    
                    <p>
                      Nous soussignés, <strong>{companySettings.companyName || "NTÊMO ONE SARL"}</strong>, représentée par sa Direction des Ressources Humaines, certifions en toute légalité et régularité que :
                    </p>

                    {/* CADRE RÉCAPITULATIF REHAUSSÉ DU COLLABORATEUR */}
                    <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-5 font-sans space-y-2.5 my-4">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Identité du Collaborateur :</span>
                          <strong className="text-slate-900 text-sm">{empName}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Numéro Matricule Officiel :</span>
                          <strong className="font-mono text-sky-800 text-sm">{selectedEmp.matricule}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Fonction & Titre :</span>
                          <strong className="text-slate-900">{selectedEmp.position || "N/A"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Département d'Affectation :</span>
                          <strong className="text-slate-900">{selectedEmp.department || "Ressources Humaines"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Nature du Contrat :</span>
                          <strong className="text-slate-900">{selectedEmp.contract_type || "CDI"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Date de Prise de Fonction :</span>
                          <strong className="text-slate-900">{selectedEmp.hire_date || "01/01/2026"}</strong>
                        </div>
                      </div>
                    </div>

                    {/* PARAGRAPHES JURIDIQUES SELON LE TYPE DE MODÈLE */}
                    {templateType === "ATTESTATION" && (
                      <p>
                        Est régulièrement employé(e) au sein de nos services et exerce actuellement ses fonctions avec professionnalisme, probité et rigueur au sein de notre siège à Brazzaville. La présente attestation lui est délivrée en bonne et due forme sur sa demande pour servir et valoir ce que de droit auprès des administrations ou institutions intéressées.
                      </p>
                    )}

                    {templateType === "ORDRE_MISSION" && (
                      <p>
                        Est formellement mandaté(e) pour accomplir une mission officielle au nom et pour le compte de <strong>{companySettings.companyName || "NTÊMO ONE SARL"}</strong>. Les autorités civiles, militaires et aéroportuaires de la République du Congo sont priées de lui prêter assistance et facilités dans l'accomplissement de sa mission.
                      </p>
                    )}

                    {templateType === "CERTIFICAT_TRAVAIL" && (
                      <p>
                        A été employé(e) au sein de notre établissement du {selectedEmp.hire_date || "N/A"} à ce jour. Il/Elle quitte notre entreprise libre de tout engagement envers nous, tous salaires et indemnités légaux lui ayant été intégralement réglés.
                      </p>
                    )}

                    {templateType === "LETTRE_PREAVIS" && (
                      <p>
                        Conformément aux stipulations contractuelles et aux dispositions du Code du Travail congolais, nous vous notifions formellement par le présent document le préavis relatif à l'échéance de votre contrat. Durant cette période, vos droits et obligations demeurent pleinement applicables.
                      </p>
                    )}

                    {templateType === "CONTRAT" && (
                      <p>
                        Le présent engagement lie les deux parties pour l'exercice des fonctions susmentionnées, sous réserve du respect du règlement intérieur de <strong>{companySettings.companyName || "NTÊMO ONE SARL"}</strong> et des dispositions légales régissant le travail en République du Congo.
                      </p>
                    )}

                    <p className="pt-2">
                      En foi de quoi, ce document officiel certifié et scellé est délivré à l'intéressé(e) pour faire valoir ses droits légitimes.
                    </p>

                  </div>

                </div>

                {/* ======================================================== */}
                {/* BAS DE PAGE : SCEAU OFFICIEL, SIGNATURE & QR CODE        */}
                {/* ======================================================== */}
                <div className="relative z-10 pt-10 border-t border-slate-200 mt-10">
                  <div className="flex items-end justify-between">
                    
                    {/* GAUCHE : QR CODE D'AUTHENTICITÉ NUMÉRIQUE */}
                    <div className="flex items-center gap-3 font-sans">
                      <div className="p-2 bg-white rounded-xl border border-slate-300 shadow-sm">
                        <QRCodeSVG
                          value={`NTEMO-CERTIFIED:${selectedEmp.matricule}:${selectedEmp.badge_security_token || "SEC2026"}`}
                          size={70}
                          level="H"
                          fgColor="#031B4D"
                        />
                      </div>
                      <div className="text-[9px] text-slate-500 leading-snug">
                        <strong className="text-[#031B4D] block uppercase font-bold">Certification Biométrique</strong>
                        <span>Code Sécurité : {selectedEmp.badge_security_token || "NTM-TOKEN-SEC"}</span><br />
                        <span>Document horodaté et authentifié.</span>
                      </div>
                    </div>

                    {/* MILIEU : SCEAU OFFICIEL CIRCULAIRE NTÊMO (ROUGE / BLEU) */}
                    <div className="flex flex-col items-center justify-center pointer-events-none select-none">
                      <div className="w-24 h-24 rounded-full border-2 border-dashed border-rose-600/70 p-1 flex items-center justify-center text-center transform -rotate-12 bg-rose-50/20">
                        <div className="w-full h-full rounded-full border border-rose-600 flex flex-col items-center justify-center p-1 text-[7.5px] font-sans font-black text-rose-700 uppercase leading-tight">
                          <span>RÉP. DU CONGO</span>
                          <span className="font-extrabold text-[8.5px] text-[#031B4D] my-0.5">★ NTÊMO ONE ★</span>
                          <span className="text-[6.5px] text-rose-800">DIRECTION RH</span>
                          <span className="text-[6px] text-emerald-700 font-bold mt-0.5">CERTIFIÉ CONFORME</span>
                        </div>
                      </div>
                    </div>

                    {/* DROITE : SIGNATURE DE LA DIRECTION RH */}
                    <div className="text-right font-sans space-y-1">
                      <div className="text-[11px] font-bold text-slate-700">Pour la Direction des Ressources Humaines</div>
                      <div className="h-10 flex items-center justify-end">
                        <span className="font-serif italic text-base font-bold text-[#031B4D] underline decoration-sky-400">
                          Cornelca BITODI
                        </span>
                      </div>
                      <div className="text-[9px] font-bold text-[#0070BA] uppercase">Directeur des Ressources Humaines</div>
                    </div>

                  </div>

                  {/* MENTION LÉGALE DE BAS DE FEUILLE A4 */}
                  <div className="text-center font-sans text-[8px] text-slate-400 pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <span>{companySettings.companyName || "NTÊMO ONE SARL"} — Système d'Identification Biométrique & Gestion RH</span>
                    <span>Avenue CEMAC, Mpila, Zone Industrielle Ouenzé — Brazzaville (Congo)</span>
                    <span>Page 1 / 1</span>
                  </div>

                </div>

              </div>

            </div>
          ) : (
            <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
              Veuillez sélectionner un collaborateur pour charger la maquette officielle.
            </div>
          )}

        </div>

      </div>
      )}

      {/* VUE 2 : HISTORIQUE MULTI-ANNÉES & REPORT DE DOCUMENTS */}
      {activeTab === "history" && (
        <div className="space-y-6">
          
          {/* BANNIÈRE EXPLICATIVE DU REPORT DES ANNÉES */}
          <div className="bg-gradient-to-r from-sky-50 via-blue-50/80 to-indigo-50/60 p-5 rounded-3xl border border-sky-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0070BA] uppercase tracking-wide">
                <Calendar className="w-4 h-4" />
                <span>Continuité Intégrale des Exercices & Archives RH</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Gestion des Années Précédentes & Report vers l'Exercice Actif ({activeYear})
              </h3>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Tous les employés sont automatiquement reconduits et présents chaque année. Vous pouvez consulter les attestations et documents émis lors des années passées (2024, 2025...), les réimprimer fidèlement, ou les <strong>reporter d'un clic</strong> vers le nouvel exercice pour les actualiser.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-sky-200 shrink-0">
              <span className="text-xs font-bold text-slate-600">Filtrer par année :</span>
              <select
                value={historyYearFilter}
                onChange={(e) => setHistoryYearFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-[#0070BA] outline-none cursor-pointer focus:border-[#0070BA]"
              >
                <option value="ALL">Toutes les années ({archivedDocs.length})</option>
                <option value="2027">Exercice 2027</option>
                <option value="2026">Exercice Actif 2026</option>
                <option value="2025">Exercice Passé 2025</option>
                <option value="2024">Exercice Passé 2024</option>
              </select>
            </div>
          </div>

          {/* TABLEAU DES DOCUMENTS ARCHIVÉS */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Exercice</th>
                  <th className="px-6 py-4">Document</th>
                  <th className="px-6 py-4">Collaborateur Bénéficiaire</th>
                  <th className="px-6 py-4">Référence Officielle</th>
                  <th className="px-6 py-4">Date d'Émission</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions Multi-Années</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {archivedDocs
                  .filter((d) => historyYearFilter === "ALL" || d.year === historyYearFilter)
                  .map((doc) => {
                    const isFromPastYear = doc.year !== activeYear;

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Exercice / Année */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-xl font-bold text-xs ${
                            doc.year === activeYear
                              ? "bg-sky-100 text-[#0070BA] border border-sky-200 font-mono"
                              : "bg-slate-100 text-slate-700 border border-slate-200 font-mono"
                          }`}>
                            {doc.year}
                          </span>
                        </td>

                        {/* Nom du document */}
                        <td className="px-6 py-4 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#0070BA]" />
                            <span>{doc.templateName}</span>
                          </div>
                        </td>

                        {/* Collaborateur */}
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{doc.employeeName}</div>
                          <div className="text-[10px] text-sky-700 font-mono">{doc.matricule}</div>
                        </td>

                        {/* Référence */}
                        <td className="px-6 py-4 font-mono font-medium text-slate-600">
                          {doc.refNumber}
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4 text-slate-500">
                          {doc.date}
                        </td>

                        {/* Statut */}
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{doc.status}</span>
                          </span>
                        </td>

                        {/* Actions : Consulter/Imprimer ou Reporter */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleLoadDocForPrint(doc)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Recharger dans la maquette officielle pour imprimer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Voir & Imprimer</span>
                            </button>

                            {isFromPastYear ? (
                              <button
                                onClick={() => handleForwardDocToActiveYear(doc)}
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0070BA] to-[#00A3E0] hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
                                title={`Transférer et actualiser ce document vers l'exercice actif ${activeYear}`}
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                <span>Reporter vers {activeYear}</span>
                              </button>
                            ) : (
                              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
                                Exercice Actif
                              </span>
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
      )}

    </div>
  );
}


