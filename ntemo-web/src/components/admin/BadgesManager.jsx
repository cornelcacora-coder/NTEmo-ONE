import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { attendanceService } from "../../services/attendanceService";
import { 
  CreditCard, 
  Printer, 
  RotateCw, 
  CheckCircle2, 
  ShieldAlert, 
  Loader2,
  Camera,
  Edit3,
  X,
  User,
  Briefcase,
  Phone,
  Mail
} from "lucide-react";

// Motif décoratif de micro-points géométriques (style moderne tech)
function DotPattern({ className = "" }) {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className={className} opacity="0.30">
      <circle cx="6" cy="6" r="1.5" fill="#38BDF8" />
      <circle cx="18" cy="6" r="1.5" fill="#38BDF8" />
      <circle cx="30" cy="6" r="1.5" fill="#38BDF8" />
      <circle cx="6" cy="18" r="1.5" fill="#38BDF8" />
      <circle cx="18" cy="18" r="1.5" fill="#38BDF8" />
      <circle cx="30" cy="18" r="1.5" fill="#38BDF8" />
      <circle cx="6" cy="30" r="1.5" fill="#38BDF8" />
      <circle cx="18" cy="30" r="1.5" fill="#38BDF8" />
      <circle cx="30" cy="30" r="1.5" fill="#38BDF8" />
      <circle cx="6" cy="42" r="1.5" fill="#38BDF8" />
      <circle cx="18" cy="42" r="1.5" fill="#38BDF8" />
      <circle cx="30" cy="42" r="1.5" fill="#38BDF8" />
    </svg>
  );
}

// Logo Officiel NTÊMO : Présentation de prestige respectant les couleurs d'origine
function NtemoBrandBadge({ size = "md", lightBg = false }) {
  return (
    <div className={`flex flex-col items-center ${lightBg ? "" : "text-white"}`}>
      <div className="bg-white rounded-2xl p-1.5 shadow-md border border-sky-100 flex items-center justify-center">
        <img
          src="/ntemo-logo.jpg"
          alt="Logo NTÊMO"
          className={size === "lg" ? "h-14 w-auto object-contain" : "h-10 w-auto object-contain"}
        />
      </div>
      <p className="text-[7.5px] uppercase tracking-[0.24em] font-extrabold text-sky-200 mt-1 drop-shadow-sm">
        CARTE D'IDENTITÉ PROFESSIONNELLE
      </p>
    </div>
  );
}

export default function BadgesManager() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [searchBadgeTerm, setSearchBadgeTerm] = useState("");
  const [revokedMessage, setRevokedMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [companySettings, setCompanySettings] = useState(attendanceService.getDefaultCompanySettings());

  // Modal d'édition directe depuis le badge
  const [editBadgeEmp, setEditBadgeEmp] = useState(null);
  const [isSavingBadgeEdit, setIsSavingBadgeEdit] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const unsubEmps = attendanceService.subscribeToEmployees((emps) => {
      setEmployees(emps);
      setIsLoading(false);
      setSelectedEmp((prev) => {
        if (!prev && emps.length > 0) {
          const bitodi = emps.find((e) => 
            (e.last_name || "").toUpperCase().includes("BITODI") || 
            (e.full_name || "").toUpperCase().includes("BITODI") ||
            (e.first_name || "").toUpperCase().includes("CORNELCA")
          );
          return bitodi || emps[0];
        }
        if (prev) {
          const updated = emps.find((e) => 
            e.id === prev.id || 
            (prev.email && e.email?.toLowerCase() === prev.email.toLowerCase()) ||
            (prev.matricule && e.matricule === prev.matricule)
          );
          return updated ? { ...prev, ...updated } : prev;
        }
        return emps[0] || null;
      });
    });

    const unsubSettings = attendanceService.subscribeToCompanySettings((stg) => {
      if (stg) setCompanySettings(stg);
    });

    return () => {
      unsubEmps();
      if (typeof unsubSettings === "function") unsubSettings();
    };
  }, []);

  const handleSaveBadgeEdit = async (e) => {
    e.preventDefault();
    if (!editBadgeEmp) return;
    setIsSavingBadgeEdit(true);
    try {
      const fullName = `${editBadgeEmp.first_name || ""} ${editBadgeEmp.last_name || ""}`.trim();
      const updates = {
        first_name: editBadgeEmp.first_name,
        last_name: editBadgeEmp.last_name,
        full_name: fullName,
        position: editBadgeEmp.position,
        role: editBadgeEmp.role,
        department: editBadgeEmp.department,
        email: editBadgeEmp.email,
        phone: editBadgeEmp.phone,
        photo_url: editBadgeEmp.photo_url || null,
      };

      await attendanceService.updateEmployee(editBadgeEmp.id, updates);
      setSelectedEmp((prev) => (prev?.id === editBadgeEmp.id ? { ...prev, ...updates } : prev));
      setRevokedMessage(`Badge de ${fullName} mis à jour automatiquement !`);
      setTimeout(() => setRevokedMessage(null), 4000);
      setEditBadgeEmp(null);
    } catch (err) {
      console.error("Erreur mise à jour badge:", err);
      alert("Erreur lors de la mise à jour des informations du badge.");
    } finally {
      setIsSavingBadgeEdit(false);
    }
  };

  const handleRegenerateBadge = async (empId) => {
    setIsRegenerating(true);
    try {
      await attendanceService.regenerateBadge(empId);
      setRevokedMessage("Nouveau badge sécurisé généré avec succès ! L'ancien code a été révoqué.");
      setTimeout(() => setRevokedMessage(null), 4000);
    } catch (err) {
      console.error("Erreur réémission badge:", err);
      setRevokedMessage("Erreur lors de la réémission du badge.");
      setTimeout(() => setRevokedMessage(null), 4000);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleUploadPhoto = (file, empId) => {
    if (!file || !empId) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result;
      await attendanceService.updateEmployee(empId, { photo_url: base64 });
      setSelectedEmp((prev) => (prev?.id === empId ? { ...prev, photo_url: base64 } : prev));
      setRevokedMessage("Photo du badge mise à jour avec succès !");
      setTimeout(() => setRevokedMessage(null), 3500);
    };
    reader.readAsDataURL(file);
  };

  const empName = selectedEmp
    ? (selectedEmp.full_name || `${selectedEmp.first_name || ""} ${selectedEmp.last_name || ""}`).trim().toUpperCase()
    : "CORNELCA BITODI";

  const empPosition = selectedEmp?.position 
    ? selectedEmp.position.toUpperCase() 
    : (selectedEmp?.role ? selectedEmp.role.toUpperCase() : "DIRECTION GÉNÉRALE");
  const empMatricule = selectedEmp?.matricule || "NTM-2026-001";
  const empEmail = selectedEmp?.email || "cornelca.bitodi@ntemo.com";
  const empPhone = selectedEmp?.phone || "+242 06 000 0000";
  const badgeToken = selectedEmp?.badge_security_token || empMatricule;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <span>Génération & Impression des Badges Officiels NTÊMO</span>
          </h2>
        </div>

        {selectedEmp && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditBadgeEmp({ ...selectedEmp })}
              className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Modifier les informations du collaborateur pour actualiser son badge"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
              <span>Modifier Infos</span>
            </button>
            <label className="px-4 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm">
              <Camera className="w-3.5 h-3.5 text-[#00A3E0]" />
              <span>{selectedEmp.photo_url ? "Changer la Photo" : "Ajouter une Photo"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadPhoto(f, selectedEmp.id);
                }}
              />
            </label>
            <button
              onClick={() => handleRegenerateBadge(selectedEmp.id)}
              disabled={isRegenerating}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isRegenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCw className="w-3.5 h-3.5" />
              )}
              Réémettre le Badge
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#031B4D] via-[#0070BA] to-[#00A3E0] hover:opacity-95 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-md shadow-sky-900/20"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimer le Badge (Recto / Verso)
            </button>
          </div>
        )}
      </div>

      {revokedMessage && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
          revokedMessage.startsWith("Erreur")
            ? "bg-red-50 border-red-200 text-red-800"
            : "bg-emerald-50 border-emerald-200 text-emerald-800"
        }`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {revokedMessage}
        </div>
      )}

      {employees.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-600 mb-1">Aucun collaborateur dans Firebase</p>
          <p className="text-xs">Ajoutez des collaborateurs depuis l'onglet « Employés » pour générer leurs badges.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Liste des collaborateurs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 h-fit">
            <h3 className="font-bold text-sm text-slate-900 mb-3 px-1 flex items-center justify-between">
              <span>Collaborateurs</span>
              <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
                {employees.length}
              </span>
            </h3>

            {/* Barre de recherche rapide de badge */}
            <div className="mb-3">
              <input
                type="text"
                value={searchBadgeTerm}
                onChange={(e) => setSearchBadgeTerm(e.target.value)}
                placeholder="Rechercher (ex: BITODI)..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#0070BA] bg-slate-50 font-medium"
              />
            </div>

            <div className="space-y-1.5 max-h-[550px] overflow-y-auto pr-1">
              {employees
                .filter((emp) => {
                  if (!searchBadgeTerm.trim()) return true;
                  const term = searchBadgeTerm.toLowerCase();
                  const name = (emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`).toLowerCase();
                  const matricule = (emp.matricule || "").toLowerCase();
                  const pos = (emp.position || "").toLowerCase();
                  return name.includes(term) || matricule.includes(term) || pos.includes(term);
                })
                .map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmp(emp)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                    selectedEmp?.id === emp.id
                      ? "bg-gradient-to-r from-sky-50 to-blue-50/60 border border-sky-300 text-blue-950 shadow-sm"
                      : "hover:bg-slate-50 border border-transparent text-slate-700"
                  }`}
                >
                  {emp.photo_url ? (
                    <img
                      src={emp.photo_url}
                      alt={emp.full_name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-sky-400 shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#031B4D] to-[#00A3E0] border border-sky-300 flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-sm">
                      {(emp.full_name || emp.first_name || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <div className="font-bold text-xs truncate">{emp.full_name || `${emp.first_name} ${emp.last_name}`}</div>
                    <div className="text-[11px] text-sky-700 font-mono font-medium truncate">{emp.matricule}</div>
                    <div className="text-[11px] text-slate-500 truncate">{emp.position}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* APERÇU HAUTE FIDÉLITÉ DU BADGE NTÊMO (RECTO / VERSO) */}
          <div className="lg:col-span-2 space-y-6">
            {selectedEmp ? (
              <div className="bg-slate-100 rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-inner">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00A3E0] animate-pulse" />
                      Design Officiel NTÊMO • Couleurs Authentiques
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                      Badge d'Identification • {empName}
                    </h3>
                  </div>
                  <span className="px-3 py-1 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-800 border border-emerald-300/80 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                    Certifié NTÊMO
                  </span>
                </div>

                {/* CONTENEUR DES 2 FACES (RECTO ET VERSO) */}
                <div id="printable-badge-area" className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2 max-w-2xl mx-auto">
                  
                  {/* ======================================================== */}
                  {/* FACE 1 : RECTO (CHARTE NTÊMO OFFICIELLE DU CLIENT)       */}
                  {/* ======================================================== */}
                  <div className="ntemo-print-card relative w-full max-w-[320px] aspect-[1/1.58] mx-auto rounded-[28px] bg-white shadow-2xl border border-slate-200/80 flex flex-col justify-between overflow-hidden">
                    
                    {/* SECTION HAUTE : Vague bleue aux couleurs exactes du logo (#031B4D vers #00A3E0) */}
                    <div className="relative h-[48%] w-full bg-gradient-to-b from-[#031B4D] via-[#0070BA] to-[#00A3E0] flex flex-col items-center pt-3.5 overflow-hidden">
                      {/* Vagues et lueurs cyan en fond */}
                      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-sky-300 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute -top-10 -right-10 w-36 h-36 bg-[#00A3E0]/25 rounded-full blur-xl pointer-events-none" />
                      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#031B4D]/60 rounded-full blur-lg pointer-events-none" />
                      
                      {/* Motifs pointillés latéraux aux couleurs cyan */}
                      <DotPattern className="absolute left-2.5 top-6" />
                      <DotPattern className="absolute right-2.5 top-3" />

                      {/* Logo NTÊMO officiel */}
                      <div className="relative z-10">
                        <NtemoBrandBadge size="md" />
                      </div>

                      {/* Découpe de vague inférieure */}
                      <svg
                        className="absolute bottom-0 left-0 right-0 w-full"
                        viewBox="0 0 320 60"
                        preserveAspectRatio="none"
                      >
                        <path
                          d="M0,35 C80,60 120,10 160,35 C200,60 240,10 320,35 L320,60 L0,60 Z"
                          fill="#FFFFFF"
                        />
                      </svg>
                    </div>

                    {/* PHOTO EN MÉDAILLON ROND (Centrée à cheval sur la vague) */}
                    <div className="absolute top-[37%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 group">
                      <label className="cursor-pointer block relative" title="Cliquer pour changer la photo">
                        <div className="relative p-1 rounded-full bg-gradient-to-b from-[#00A3E0] via-[#0070BA] to-[#031B4D] shadow-xl group-hover:scale-105 transition-transform">
                          <div className="p-1 rounded-full bg-white shadow-inner relative overflow-hidden">
                            {selectedEmp.photo_url ? (
                              <img
                                src={selectedEmp.photo_url}
                                alt={empName}
                                className="w-24 h-24 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-sky-50 to-blue-100 flex flex-col items-center justify-center text-sky-800">
                                <Camera className="w-8 h-8 text-sky-700 stroke-[1.5]" />
                                <span className="text-[8px] font-bold mt-1 text-sky-900">AJOUTER</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                              <Camera className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadPhoto(f, selectedEmp.id);
                          }}
                        />
                      </label>
                    </div>

                    {/* SECTION CENTRALE : NOM + POSTE */}
                    <div className="relative z-10 text-center pt-10 px-4">
                      <h2 className="text-sm font-extrabold text-[#031B4D] tracking-wide uppercase">
                        {empName}
                      </h2>
                      <div className="w-24 h-[1.5px] bg-gradient-to-r from-transparent via-[#00A3E0] to-transparent mx-auto my-1.5" />
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {empPosition}
                      </p>
                    </div>

                    {/* SECTION BAS : CODE QR + VAGUES DÉCORATIVES D'ANGLE */}
                    <div className="relative pb-5 pt-2 flex flex-col items-center justify-center">
                      {/* Vagues subtiles aux couleurs exactes du logo */}
                      <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-gradient-to-tr from-[#031B4D] to-[#00A3E0] rounded-full blur-md opacity-35 pointer-events-none" />
                      <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-gradient-to-tl from-[#0070BA] to-sky-300 rounded-full blur-md opacity-35 pointer-events-none" />

                      {/* Cadre QR Code avec bordure soignée */}
                      <div className="p-2 bg-white rounded-xl shadow-md border border-sky-100 flex items-center justify-center relative">
                        <QRCodeSVG
                          value={badgeToken}
                          size={92}
                          level="H"
                          includeMargin={false}
                          fgColor="#031B4D"
                        />
                      </div>

                      <p className="text-[8px] font-mono font-medium text-sky-900 mt-1 tracking-wider">
                        {badgeToken}
                      </p>
                    </div>

                  </div>

                  {/* ======================================================== */}
                  {/* FACE 2 : VERSO (CHARTE NTÊMO OFFICIELLE DU CLIENT)       */}
                  {/* ======================================================== */}
                  <div className="ntemo-print-card relative w-full max-w-[320px] aspect-[1/1.58] mx-auto rounded-[28px] bg-white shadow-2xl border border-slate-200/80 flex flex-col justify-between overflow-hidden">
                    
                    {/* SECTION HAUTE : COORDONNÉES ET CONSIGNES (100% EN FRANÇAIS) */}
                    <div className="p-6 pt-7 space-y-3">
                      
                      {/* Ligne NID (Matricule) */}
                      <div className="border-b border-sky-100 pb-1.5 flex items-baseline justify-between">
                        <span className="text-[11px] font-bold text-[#031B4D] tracking-wide">
                          NID :
                        </span>
                        <span className="text-[11px] font-bold font-mono text-sky-800">
                          {empMatricule}
                        </span>
                      </div>

                      {/* Ligne Email */}
                      <div className="border-b border-sky-100 pb-1.5 flex items-baseline justify-between">
                        <span className="text-[11px] font-bold text-[#031B4D] tracking-wide">
                          Email :
                        </span>
                        <span className="text-[11px] font-medium text-slate-600 truncate max-w-[170px]">
                          {empEmail}
                        </span>
                      </div>

                      {/* Ligne Téléphone */}
                      <div className="border-b border-sky-100 pb-1.5 flex items-baseline justify-between">
                        <span className="text-[11px] font-bold text-[#031B4D] tracking-wide">
                          Téléphone :
                        </span>
                        <span className="text-[11px] font-medium text-slate-600 font-mono">
                          {empPhone}
                        </span>
                      </div>

                      {/* Consigne de restitution 100% en français (Brazzaville, Congo) */}
                      <div className="pt-2 text-[9.5px] text-slate-600 leading-snug space-y-0.5">
                        <p className="font-semibold text-slate-800">
                          Si cette carte est trouvée, prière de la rapporter à :
                        </p>
                        <p className="text-[#031B4D] font-bold">
                          Direction Générale de NTÊMO
                        </p>
                        <p className="text-slate-500 text-[8.5px]">
                          Avenue CEMAC, Mpila, Zone Industrielle Ouenzé — Brazzaville (Congo)
                        </p>
                      </div>

                    </div>

                    {/* SECTION BASSE : Vague bleue dégradée avec Logo Officiel & URL */}
                    <div className="relative h-[44%] w-full bg-gradient-to-b from-[#031B4D] via-[#0070BA] to-[#00A3E0] flex flex-col items-center justify-center pb-3 overflow-hidden text-center">
                      
                      {/* Découpe de vague supérieure inversée */}
                      <svg
                        className="absolute top-0 left-0 right-0 w-full"
                        viewBox="0 0 320 60"
                        preserveAspectRatio="none"
                      >
                        <path
                          d="M0,0 L320,0 L320,25 C240,50 200,0 160,25 C120,50 80,0 0,25 Z"
                          fill="#FFFFFF"
                        />
                      </svg>

                      {/* Motifs pointillés latéraux */}
                      <DotPattern className="absolute left-3 top-10" />
                      <DotPattern className="absolute right-3 top-8" />

                      {/* Vagues subtiles en bas */}
                      <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-sky-400/20 rounded-full blur-lg pointer-events-none" />
                      <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-blue-900/40 rounded-full blur-lg pointer-events-none" />

                      {/* Logo NTÊMO au verso */}
                      <div className="relative z-10 flex flex-col items-center text-center mt-3">
                        <div className="bg-white rounded-xl p-1 shadow-md border border-sky-100 flex items-center justify-center">
                          <img
                            src="/ntemo-logo.jpg"
                            alt="Logo NTÊMO"
                            className="h-8 w-auto object-contain"
                          />
                        </div>
                        <p className="text-[7.5px] uppercase tracking-[0.24em] font-extrabold text-sky-200 mt-1 drop-shadow-sm">
                          CARTE D'IDENTITÉ PROFESSIONNELLE
                        </p>
                        <a
                          href="https://www.ntemoconsulting.com/"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-white font-bold tracking-wider mt-1 hover:underline block"
                        >
                          www.ntemoconsulting.com
                        </a>
                      </div>

                    </div>

                  </div>

                </div>

              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                Sélectionnez un collaborateur pour afficher son badge.
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL : MODIFICATION RAPIDE DES INFORMATIONS DU BADGE    */}
      {/* ======================================================== */}
      {editBadgeEmp && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Modifier les Informations du Badge</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Toute modification apportée ici met immédiatement à jour le badge officiel en temps réel.
                </p>
              </div>
              <button
                onClick={() => setEditBadgeEmp(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBadgeEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={editBadgeEmp.first_name || ""}
                    onChange={(e) => setEditBadgeEmp({ ...editBadgeEmp, first_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#00A3E0]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Nom de famille *</label>
                  <input
                    type="text"
                    required
                    value={editBadgeEmp.last_name || ""}
                    onChange={(e) => setEditBadgeEmp({ ...editBadgeEmp, last_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#00A3E0]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Poste exact (inscrit sur le badge) *</label>
                <input
                  type="text"
                  required
                  value={editBadgeEmp.position || ""}
                  onChange={(e) => setEditBadgeEmp({ ...editBadgeEmp, position: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold outline-none focus:border-[#00A3E0]"
                  placeholder="ex: Directeur Général, Développeur..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Email Professionnel</label>
                  <input
                    type="email"
                    value={editBadgeEmp.email || ""}
                    onChange={(e) => setEditBadgeEmp({ ...editBadgeEmp, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#00A3E0]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={editBadgeEmp.phone || ""}
                    onChange={(e) => setEditBadgeEmp({ ...editBadgeEmp, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#00A3E0]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditBadgeEmp(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingBadgeEdit}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#031B4D] to-[#00A3E0] hover:brightness-110 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingBadgeEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Enregistrer & Mettre à jour le Badge</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
