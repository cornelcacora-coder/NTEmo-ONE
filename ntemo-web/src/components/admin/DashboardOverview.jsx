﻿import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { attendanceService } from "../../services/attendanceService";
import { 
  Users, 
  UserCheck, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Calendar,
  CalendarDays,
  CalendarRange,
  BarChart3,
  ShieldCheck,
  ChevronRight,
  RotateCw,
  CalendarClock,
  Sparkles,
  CreditCard,
  FileText
} from "lucide-react";

export default function DashboardOverview({ onNavigate, companySettings, currentAdmin }) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState("today");

  const PERIODS = [
    { key: "today",  label: t("dashboard.today") || "Aujourd'hui",   icon: Calendar },
    { key: "week",   label: t("dashboard.week") || "Cette Semaine", icon: CalendarDays },
    { key: "month",  label: t("dashboard.month") || "Ce Mois",       icon: CalendarRange },
    { key: "year",   label: t("dashboard.year") || "Cette Année",    icon: BarChart3 },
  ];
  const [kpis, setKpis] = useState({
    totalEmployees: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    presenceRate: 0,
    totalRecords: 0,
    uniqueDays: 0,
  });
  const [attendances, setAttendances] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Horloge en temps réel
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calcul des indicateurs clés (KPIs)
  const loadKpis = useCallback(async (records, currentPeriod) => {
    const employees = await attendanceService.getEmployees();
    const totalEmployees = employees.length;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const subset = currentPeriod === "today"
      ? records.filter((r) => r.date === todayStr)
      : records;

    const presentCount = subset.filter((r) => r.first_check_in).length;
    const lateCount = subset.filter((r) => r.is_late).length;
    const uniqueDays = [...new Set(subset.map((r) => r.date))].length;

    let presenceRate = 0;
    if (currentPeriod === "today") {
      presenceRate = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;
    } else {
      presenceRate = totalEmployees > 0 && uniqueDays > 0
        ? Math.round((presentCount / (totalEmployees * uniqueDays)) * 100)
        : 0;
    }

    setKpis({
      totalEmployees,
      presentCount,
      lateCount,
      absentCount: currentPeriod === "today" ? Math.max(0, totalEmployees - presentCount) : 0,
      presenceRate: Math.min(100, presenceRate),
      totalRecords: subset.length,
      uniqueDays,
    });
  }, []);

  // Écoute temps réel
  useEffect(() => {
    const unsubscribe = attendanceService.subscribeToAttendances(period, (records) => {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const subset = period === "today" ? records.filter((r) => r.date === todayStr) : records;
      setAttendances(subset);
      loadKpis(records, period);
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [period, loadKpis]);

  const periodLabel = PERIODS.find((p) => p.key === period)?.label || "";

  // Date actuelle formatée (ex: 17 novembre 2026)
  const fullDateStr = currentTime.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const lastTimeString = currentTime.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      
      {/* ======================================================== */}
      {/* 1. EN-TÊTE DE BIENVENUE & SÉLECTEUR DE DATE              */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{t("dashboard.welcome")}, {currentAdmin?.firstName || "Cornelca"}</span>
            <span className="text-2xl">👋</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {t("dashboard.subtitle") || "Voici un aperçu général de votre système RH."}
          </p>
        </div>

        {/* Sélecteur de date en capsule blanche */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="bg-white border border-slate-200/90 rounded-2xl px-4 py-2.5 shadow-sm flex items-center gap-2.5 text-xs font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-[#0070BA]" />
            <span>{fullDateStr}</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. BARRE DE FILTRAGE DES PÉRIODES                        */}
      {/* ======================================================== */}
      <div className="bg-white rounded-full border border-slate-200/80 shadow-sm p-1.5 flex items-center justify-between overflow-x-auto">
        {PERIODS.map(({ key, label, icon: Icon }, index) => {
          const isActive = period === key;
          return (
            <React.Fragment key={key}>
              <button
                onClick={() => setPeriod(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-6 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[#0070BA] text-white shadow-md shadow-sky-600/30"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{label}</span>
              </button>
              {index < PERIODS.length - 1 && (
                <div className="w-[1px] h-5 bg-slate-200 shrink-0 hidden md:block" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 3. LES 4 CARTES KPIS                                     */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* CARTE 1 : EFFECTIF TOTAL */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                EFFECTIF TOTAL
              </p>
              <h3 className="text-4xl font-extrabold text-slate-900 mt-2">
                {kpis.totalEmployees}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#E8F1FC] text-[#0070BA] flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" strokeWidth={2} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <Users className="w-3.5 h-3.5 text-[#0070BA]" />
            <span>Collaborateurs actifs</span>
          </div>
        </div>

        {/* CARTE 2 : PRÉSENTS AU BUREAU */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                PRÉSENTS AU BUREAU
              </p>
              <h3 className="text-4xl font-extrabold text-slate-900 mt-2">
                {kpis.presentCount}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#E6F8F0] text-[#10B981] flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6" strokeWidth={2} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-[#10B981] font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Taux de présence : {kpis.presenceRate}%</span>
          </div>
        </div>

        {/* CARTE 3 : RETARDS DÉTECTÉS */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                RETARDS DÉTECTÉS
              </p>
              <h3 className="text-4xl font-extrabold text-slate-900 mt-2">
                {kpis.lateCount}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#FEF5E7] text-[#F59E0B] flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" strokeWidth={2} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-[#F59E0B] font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>Arrivées après 08h30</span>
          </div>
        </div>

        {/* CARTE 4 : NON POINTÉS */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                NON POINTÉS
              </p>
              <h3 className="text-4xl font-extrabold text-slate-900 mt-2">
                {period === "today" ? kpis.absentCount : kpis.totalRecords}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#FEEBEB] text-[#EF4444] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" strokeWidth={2} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-[#EF4444] font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{period === "today" ? "Absences ou congés" : `${kpis.uniqueDays} jours d'activité`}</span>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 4. TABLEAU DES POINTAGES + PANNEAU LATÉRAL               */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLONNE GAUCHE (2/3) : POINTAGES */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          
          {/* En-tête de la table */}
          <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#0070BA] flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                Pointages — {periodLabel}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Dernier enregistrement : {lastTimeString}</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-[#EBF3FC] text-[11px] uppercase font-bold text-[#0070BA] tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Collaborateur</th>
                  <th className="px-6 py-3.5">Département</th>
                  <th className="px-6 py-3.5">Entrée</th>
                  <th className="px-6 py-3.5">Sortie</th>
                  <th className="px-6 py-3.5">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendances.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 px-6 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-sky-50 text-[#0070BA] flex items-center justify-center mb-3 shadow-inner">
                          <CalendarClock className="w-9 h-9" strokeWidth={1.5} />
                        </div>
                        <h4 className="font-bold text-base text-slate-900">
                          Aucun pointage enregistré pour {periodLabel.toLowerCase()}.
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                          Les pointages apparaîtront ici dès qu'ils seront enregistrés à la borne Kiosk.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  attendances.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#031B4D] to-[#00A3E0] text-white font-bold flex items-center justify-center text-xs shadow-sm">
                            {item.employee_name?.charAt(0) || "E"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{item.employee_name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{item.matricule}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600 font-medium">{item.department}</td>
                      <td className="px-6 py-3.5 font-mono text-emerald-600 font-bold text-xs">
                        {item.first_check_in || "—"}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-amber-600 font-bold text-xs">
                        {item.last_check_out || "En cours"}
                      </td>
                      <td className="px-6 py-3.5">
                        {item.is_late ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Retard (+{item.late_minutes}m)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            À l'heure
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* COLONNE DROITE (1/3) : CARTE BONNE JOURNÉE & RACCOURCIS */}
        <div className="space-y-5">
          
          {/* CARTE BLEUE DÉGRADÉE « BONNE JOURNÉE ! » */}
          <div className="bg-gradient-to-br from-[#0070BA] via-[#004892] to-[#031B4D] rounded-3xl p-6 text-white shadow-xl shadow-sky-950/20 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-sky-300" />
              </div>
              <h4 className="font-extrabold text-lg text-white">Bonne Journée !</h4>
            </div>

            <p className="text-xs text-sky-100/90 leading-relaxed">
              La borne est configurée en mode scan inverse anti-fraude. L'horodatage est certifié pour empêcher toute falsification.
            </p>

            <button
              onClick={() => onNavigate("kiosk")}
              className="mt-5 w-full py-3 px-4 bg-white hover:bg-sky-50 text-[#0070BA] rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95"
            >
              <span>Basculer vers la Borne d'accueil</span>
              <span>→</span>
            </button>
          </div>

          {/* BLOC RACCOURCIS MODULES */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <h4 className="font-extrabold text-slate-900 text-sm mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0070BA]" />
              <span>Raccourcis Modules</span>
            </h4>

            <div className="space-y-2.5">
              {[
                { nav: "badges",    icon: CreditCard, label: "Générer & Imprimer les Badges" },
                { nav: "employees", icon: Users,      label: "Gérer les Fiches Collaborateurs" },
                { nav: "documents", icon: FileText,   label: "Moteur Documentaire RH (A4)" },
              ].map(({ nav, icon: Icon, label }) => (
                <button
                  key={nav}
                  onClick={() => onNavigate(nav)}
                  className="w-full text-left p-3.5 rounded-2xl bg-slate-50 hover:bg-sky-50/70 border border-slate-100 transition-all flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-[#0070BA] group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 group-hover:text-[#0070BA] shadow-sm">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0070BA] transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

