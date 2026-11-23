﻿import React, { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { attendanceService } from "../../services/attendanceService";
import { soundService } from "../../services/soundService";
import { 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  User, 
  Send, 
  ShieldCheck, 
  CreditCard,
  Loader2,
  Video
} from "lucide-react";
import { isFirebaseConfigured } from "../../firebase/config";

// Monogramme NTÊMO 3D stylisé aux couleurs exactes du logo
function NtemoMark({ className = "w-10 h-10" }) {
  return (
    <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#00A3E0] via-[#0066B3] to-[#031B4D] p-0.5 shadow-lg shadow-sky-500/25 ${className}`}>
      <div className="w-full h-full bg-[#031940] rounded-[14px] flex items-center justify-center p-1.5 overflow-hidden">
        <img
          src="/ntemo-logo.jpg"
          alt="NTÊMO"
          className="w-full h-full object-contain filter drop-shadow"
        />
      </div>
    </div>
  );
}

export default function KioskView({ onOpenAdmin }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [punchMode, setPunchMode] = useState("AUTO"); // "AUTO" | "IN" | "OUT"
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [punchResult, setPunchResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [errorType, setErrorType] = useState("generic"); // "not_found" | "debounce" | "generic"
  const [manualInput, setManualInput] = useState("");
  const [companySettings, setCompanySettings] = useState(attendanceService.getDefaultCompanySettings());

  const html5QrCodeRef = useRef(null);
  const scannerContainerId = "kiosk-camera-reader";
  const isAlreadyProcessingRef = useRef(false);

  // Synchronisation des paramètres d'entreprise
  useEffect(() => {
    const unsub = attendanceService.subscribeToCompanySettings((settings) => {
      if (settings) setCompanySettings(settings);
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // Horloge temps réel
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fermeture automatique du modal de résultat après 3.5 secondes
  useEffect(() => {
    if (punchResult) {
      const timeout = setTimeout(() => setPunchResult(null), 3500);
      return () => clearTimeout(timeout);
    }
  }, [punchResult]);

  // Traitement du scan réussi
  const handleScanSuccess = useCallback(async (scannedCode) => {
    if (isAlreadyProcessingRef.current || punchResult) return;
    isAlreadyProcessingRef.current = true;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await attendanceService.recordPunch({
        qrData: scannedCode,
        punchMode,
        deviceId: "BORNE-ACCUEIL-BRAZZA",
      });
      soundService.playSuccess();
      setPunchResult(result);
      setManualInput("");
    } catch (err) {
      soundService.playError();
      const msg = err.message || "Erreur de validation du badge.";
      if (
        msg.toLowerCase().includes("non reconnu") ||
        msg.toLowerCase().includes("révoqué") ||
        (msg.toLowerCase().includes("badge") && msg.toLowerCase().includes("base"))
      ) {
        setErrorType("not_found");
      } else if (msg.toLowerCase().includes("déjà validé") || msg.toLowerCase().includes("patienter")) {
        setErrorType("debounce");
      } else {
        setErrorType("generic");
      }
      setErrorMessage(msg);
      setTimeout(() => { setErrorMessage(null); setErrorType("generic"); }, 5000);
    } finally {
      setIsProcessing(false);
      isAlreadyProcessingRef.current = false;
    }
  }, [punchMode, punchResult]);

  // Arrêter la caméra proprement
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (e) {
        console.warn("Arrêt scanner:", e);
      }
    }
  };

  // Démarrer la webcam avec timeout de sécurité pour ne JAMAIS bloquer l'utilisateur
  const startCamera = async () => {
    setCameraLoading(true);
    setCameraError(null);

    // Timeout de secours de 4 secondes pour libérer le bouton si le navigateur tarde
    const safetyTimer = setTimeout(() => {
      setCameraLoading((loading) => {
        if (loading) {
          setCameraError("La caméra met du temps à répondre. Cliquez sur « Activer la Caméra » ou sur « Autoriser » dans Chrome.");
          return false;
        }
        return false;
      });
    }, 4000);

    try {
      await stopScanner();

      const html5Qr = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5Qr;

      const qrConfig = {
        fps: 15,
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0,
      };

      let cameras = [];
      try {
        cameras = await Html5Qrcode.getCameras();
      } catch (e) {
        console.warn("Énumération caméras:", e);
      }

      const camTarget = (cameras && cameras.length > 0) ? cameras[0].id : { facingMode: "user" };

      await html5Qr.start(
        camTarget,
        qrConfig,
        (decodedText) => handleScanSuccess(decodedText),
        () => {}
      );

      clearTimeout(safetyTimer);
      setCameraActive(true);
      setCameraError(null);
    } catch (err) {
      clearTimeout(safetyTimer);
      console.error("Échec caméra:", err);
      setCameraActive(false);
      setCameraError(
        "Accès webcam interrompu. Cliquez sur le bouton bleu « Activer la Caméra » ou autorisez la caméra dans Chrome."
      );
    } finally {
      clearTimeout(safetyTimer);
      setCameraLoading(false);
    }
  };

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualInput.trim()) handleScanSuccess(manualInput.trim());
  };

  // Formatage date et heure fidèles à l'image
  const hours = String(currentTime.getHours()).padStart(2, "0");
  const minutes = String(currentTime.getMinutes()).padStart(2, "0");
  const seconds = String(currentTime.getSeconds()).padStart(2, "0");
  const timeFormatted = `${hours} : ${minutes} : ${seconds}`;

  const dateFormatted = currentTime.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const dateCapitalized = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

  return (
    <div className="min-h-screen bg-[#020B1C] text-white flex flex-col justify-between selection:bg-[#00A3E0] selection:text-white relative overflow-hidden font-sans">
      
      {/* Vagues de fond douces et élégantes (Dégradé organique comme sur l'image) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#0070BA]/20 via-[#00A3E0]/15 to-transparent blur-3xl opacity-80" />
        <div className="absolute top-1/4 -right-40 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-[#0070BA]/25 via-[#031B4D]/30 to-transparent blur-3xl opacity-90" />
        <div className="absolute -bottom-40 -left-40 w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-[#021844]/60 to-[#00A3E0]/15 blur-3xl opacity-70" />
      </div>

      {/* ======================================================== */}
      {/* 1. HEADER (Logo, Capsule Heure, Bouton Admin)             */}
      {/* ======================================================== */}
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between z-20">
        
        {/* GAUCHE : Logo Entreprise Dynamique */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#00A3E0] via-[#0066B3] to-[#031B4D] p-0.5 shadow-lg shadow-sky-500/25">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center p-1.5 overflow-hidden">
              <img
                src={companySettings.logoUrl || "/ntemo-logo.jpg"}
                alt={companySettings.companyName || "NTÊMO"}
                className="w-full h-full object-contain filter drop-shadow"
              />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5 notranslate" translate="no">
              <span className="text-xl font-extrabold tracking-tight text-white uppercase notranslate" translate="no">
                {companySettings.companyName || "NTÊMO ONE"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Borne de Pointage
            </p>
          </div>
        </div>

        {/* CENTRE : Capsule Horloge temps réel avec date */}
        <div className="bg-[#041635]/80 border border-sky-500/25 rounded-2xl px-8 py-2.5 shadow-xl shadow-sky-950/40 backdrop-blur-md flex items-center gap-4 text-center">
          <Clock className="w-6 h-6 text-sky-400 shrink-0" strokeWidth={1.8} />
          <div>
            <div className="text-2xl font-extrabold font-mono tracking-widest text-white drop-shadow leading-none">
              {timeFormatted}
            </div>
            <div className="text-[11px] text-slate-300 font-medium mt-1">
              {dateCapitalized}
            </div>
          </div>
        </div>

        {/* DROITE : Bouton Portail RH & Admin */}
        <div>
          <button
            onClick={onOpenAdmin}
            className="group px-4 py-2.5 rounded-full bg-[#071E47]/90 hover:bg-[#0c2b66] border border-sky-400/30 text-white text-xs font-semibold transition-all shadow-md shadow-sky-950/30 flex items-center gap-2.5 cursor-pointer"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span className="text-slate-100 group-hover:text-white">Portail RH & Admin</span>
            <User className="w-4 h-4 text-slate-300 group-hover:text-white ml-0.5" strokeWidth={2} />
          </button>
        </div>

      </header>

      {/* ======================================================== */}
      {/* 2. ZONE CENTRALE (Sélecteur Mode, Cadre Caméra, Saisie Manuelle) */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-2 z-10 max-w-4xl mx-auto w-full">
        
        {/* SÉLECTEUR DE MODE DE POINTAGE */}
        <div className="flex items-center gap-1.5 p-1 bg-[#03132D]/95 border border-sky-500/20 rounded-full mb-6 shadow-2xl backdrop-blur-md">
          <button
            onClick={() => setPunchMode("AUTO")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              punchMode === "AUTO"
                ? "bg-gradient-to-r from-[#0066CC] to-[#00A3E0] text-white shadow-lg shadow-sky-500/35"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Video className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>Automatique</span>
          </button>

          <button
            onClick={() => setPunchMode("IN")}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              punchMode === "IN"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Entrée</span>
          </button>

          <button
            onClick={() => setPunchMode("OUT")}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              punchMode === "OUT"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Sortie</span>
          </button>
        </div>

        {/* CADRE PRINCIPAL SCANNER */}
        <div className="relative w-full max-w-[620px] aspect-[1.38/1] rounded-[32px] overflow-hidden border-[1.5px] border-[#0070BA] bg-gradient-to-b from-[#061C44]/90 via-[#031535]/95 to-[#020F28] shadow-[0_0_50px_rgba(0,112,186,0.28)] flex flex-col items-center justify-center backdrop-blur-xl">
          
          {/* Conteneur HTML5-QRCode pour le flux vidéo */}
          <div id={scannerContainerId} className="w-full h-full object-cover" />

          {/* 1. ÉCRAN LORSQUE LA CAMÉRA EST ACTIVE : Viseur de scan laser */}
          {cameraActive && !punchResult && !isProcessing && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
              <div className="relative w-64 h-64 border-2 border-dashed border-[#00A3E0] rounded-2xl flex items-center justify-center overflow-hidden">
                <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00A3E0] to-transparent shadow-[0_0_15px_#00A3E0] animate-laser" />
                <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-sky-400 rounded-tl" />
                <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-sky-400 rounded-tr" />
                <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-sky-400 rounded-bl" />
                <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-sky-400 rounded-br" />
              </div>
              <p className="mt-4 text-xs font-semibold tracking-wide text-sky-200 bg-[#020B1C]/90 px-5 py-1.5 rounded-full border border-sky-500/30 shadow-md">
                Présentez votre badge devant la caméra
              </p>
            </div>
          )}

          {/* 2. ÉCRAN D'ATTENTE OU BOUTON D'ACTIVATION (TOUJOURS CLIQUABLE) */}
          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#051C44]/95 to-[#020F28]/98 z-10">
              
              {/* Icône caméra barrée stylisée */}
              <div className="relative mb-3 flex items-center justify-center">
                <CameraOff className="w-20 h-20 text-[#0084D6]" strokeWidth={1.8} />
              </div>

              {/* Titre */}
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Caméra prête
              </h3>

              {/* Message d'information */}
              <p className="text-xs text-slate-300 mt-2 max-w-md leading-relaxed">
                {cameraError || "Accès webcam interrompu. Cliquez sur le bouton ci-dessous pour activer le scanner."}
              </p>

              {/* BOUTON D'ACTIVATION PRINCIPAL (CLIQUABLE ET VISIBLE EN PERMANENCE) */}
              <button
                onClick={startCamera}
                disabled={cameraLoading}
                className="mt-6 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#0066CC] via-[#0088E6] to-[#00A3E0] hover:brightness-110 active:scale-95 text-white font-bold text-sm flex items-center gap-2.5 shadow-xl shadow-[#0088E6]/40 transition-all cursor-pointer disabled:opacity-80"
              >
                {cameraLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connexion à la webcam...</span>
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" strokeWidth={2.5} />
                    <span>Activer la Caméra</span>
                  </>
                )}
              </button>

              {cameraLoading && (
                <p className="text-[11px] text-sky-300 mt-3 animate-pulse">
                  👉 Pensez à cliquer sur « Autoriser » dans la petite fenêtre en haut de Chrome
                </p>
              )}

            </div>
          )}

          {/* 3. CHARGEMENT / VÉRIFICATION FIREBASE */}
          {isProcessing && (
            <div className="absolute inset-0 bg-[#020B1C]/90 backdrop-blur-md flex flex-col items-center justify-center z-20">
              <Loader2 className="w-16 h-16 text-[#00A3E0] animate-spin mb-4" strokeWidth={2.5} />
              <p className="text-base font-bold text-sky-200">Vérification Firebase en cours...</p>
            </div>
          )}

          {/* 4. MODAL RÉSULTAT POINTAGE (SUCCÈS) */}
          {punchResult && (
            <div className="absolute inset-0 bg-[#020B1C]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in zoom-in-95">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-3 ${
                punchResult.eventType === "IN" ? "bg-emerald-500/20 text-emerald-400 ring-4 ring-emerald-500/30" : "bg-amber-500/20 text-amber-400 ring-4 ring-amber-500/30"
              }`}>
                <CheckCircle2 className="w-12 h-12" />
              </div>

              {punchResult.employee.photo_url && (
                <img src={punchResult.employee.photo_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-sky-400 mb-2 shadow-lg" />
              )}

              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 ${
                punchResult.eventType === "IN" ? "bg-emerald-500/30 text-emerald-300" : "bg-amber-500/30 text-amber-300"
              }`}>
                {punchResult.eventType === "IN" ? "Arrivée Confirmée" : "Départ Confirmé"}
              </span>

              <h2 className="text-2xl font-extrabold text-white">
                {punchResult.employee.full_name || `${punchResult.employee.first_name || ""} ${punchResult.employee.last_name || ""}`.trim()}
              </h2>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                {punchResult.employee.matricule} • {punchResult.employee.position}
              </p>

              <div className="mt-3 p-3 bg-[#041635] border border-sky-500/20 rounded-xl w-full max-w-xs shadow-inner">
                <div className="text-2xl font-mono font-extrabold text-white">{punchResult.time}</div>
                {punchResult.workedDuration && (
                  <p className="text-xs text-sky-300 font-medium mt-1">
                    Temps travaillé : <strong className="text-white">{punchResult.workedDuration}</strong>
                  </p>
                )}
              </div>

              <p className="text-xs text-emerald-400 mt-3 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Pointage certifié et enregistré
              </p>
            </div>
          )}

          {/* 5. BANNIÈRE D'ERREUR */}
          {errorMessage && (
            <div className={`absolute inset-x-4 bottom-4 p-4 rounded-2xl border text-xs font-semibold flex items-start gap-3 z-30 shadow-2xl backdrop-blur-md ${
              errorType === "not_found"
                ? "bg-red-950/95 border-red-700/80 text-red-200"
                : errorType === "debounce"
                ? "bg-amber-950/95 border-amber-700/80 text-amber-200"
                : "bg-rose-950/90 border-rose-800/80 text-rose-200"
            }`}>
              <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
                errorType === "not_found" ? "text-red-400" :
                errorType === "debounce" ? "text-amber-400" : "text-rose-400"
              }`} />
              <div className="flex flex-col gap-0.5">
                {errorType === "not_found" ? (
                  <>
                    <span className="text-sm font-bold text-red-300">
                      ❌ Employé non enregistré dans le système
                    </span>
                    <span className="text-xs text-red-300/80">
                      Ce badge ou matricule n'existe pas dans le système. Contactez la Direction des Ressources Humaines.
                    </span>
                    <span className="text-[11px] text-red-400/70 font-mono mt-0.5 italic">
                      Code : {manualInput || "via caméra"}
                    </span>
                  </>
                ) : errorType === "debounce" ? (
                  <>
                    <span className="text-sm font-bold text-amber-300">
                      ⏱ Pointage trop rapproché
                    </span>
                    <span className="text-xs text-amber-300/80">{errorMessage}</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-bold text-rose-300">Erreur de validation</span>
                    <span>{errorMessage}</span>
                  </>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ======================================================== */}
        {/* CADRE SAISIE MANUELLE                                     */}
        {/* ======================================================== */}
        <div className="w-full max-w-[620px] mt-6 p-4 rounded-2xl bg-[#041533]/85 border border-sky-500/20 shadow-xl backdrop-blur-md flex items-center gap-4">
          
          <div className="p-3 rounded-xl bg-[#0070BA]/20 border border-[#00A3E0]/30 text-[#00A3E0] flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" strokeWidth={1.8} />
          </div>

          <div className="flex-1">
            <label className="text-[10px] font-bold text-slate-300 tracking-wider block mb-1.5 uppercase">
              SAISIE MANUELLE DU MATRICULE OU JETON DE BADGE :
            </label>
            <form onSubmit={handleManualSubmit} className="flex items-center gap-3">
              <input
                type="text"
                placeholder="ex : NTM-TOKEN-SEC-XXX ou NTM-2026-001..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="flex-1 bg-[#020A1A] border border-sky-500/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00A3E0] transition-colors"
              />
              <button
                type="submit"
                disabled={isProcessing}
                className="px-6 py-2.5 bg-gradient-to-r from-[#0066CC] to-[#00A3E0] hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-sky-600/30 flex items-center gap-2 shrink-0 cursor-pointer active:scale-95"
              >
                <Send className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>Pointer</span>
              </button>
            </form>
          </div>

        </div>

      </main>

      {/* ======================================================== */}
      {/* 3. FOOTER                                                 */}
      {/* ======================================================== */}
      <footer className="px-8 py-4 border-t border-slate-800/60 bg-[#020917]/80 flex items-center justify-between text-xs text-slate-400 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#00A3E0] to-[#031B4D] p-0.5 flex items-center justify-center">
            <img src={companySettings.logoUrl || "/ntemo-logo.jpg"} alt="" className="w-full h-full object-contain rounded-md" />
          </div>
          <div className="flex items-center gap-2 notranslate" translate="no">
            <strong className="text-white font-extrabold tracking-tight uppercase notranslate" translate="no">
              {companySettings.companyName || "NTÊMO ONE"}
            </strong>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 font-medium">
              {companySettings.address || "Brazzaville, Congo"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" strokeWidth={2} />
          <span>Système sécurisé</span>
        </div>
      </footer>

    </div>
  );
}

