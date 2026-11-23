﻿import React, { useState } from "react";
import { 
  Bot, 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  FileCheck, 
  Wand2, 
  RefreshCw 
} from "lucide-react";

export default function AiAssistant() {
  const [prompt, setPrompt] = useState("");
  const [docType, setDocType] = useState("COURRIER_ADMIN");
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const quickPrompts = [
    "Rédiger un avertissement formel pour retards répétés injustifiés",
    "Rédiger une lettre de félicitations pour ponctualité exemplaire",
    "Générer un compte-rendu de la réunion mensuelle de la direction",
    "Rédiger une convocation pour entretien d'évaluation annuel",
  ];

  const handleGenerate = (customPrompt) => {
    const p = customPrompt || prompt;
    if (!p.trim()) return;

    setIsLoading(true);

    setTimeout(() => {
      const today = new Date().toLocaleDateString("fr-FR");
      let draft = "";

      if (p.includes("avertissement") || p.includes("retard")) {
        draft = `ENTREPRISE NTÊMO ONE SARL
Avenue CEMAC, Mpila, Zone Industrielle Ouenzé — Brazzaville (Congo)
Direction des Ressources Humaines
Brazzaville, le ${today}

LETTRE D'AVERTISSEMENT FORMEL

Objet : Rappel à l'ordre concernant le respect des horaires de travail

Monsieur / Madame,

Nous constatons à travers les relevés de notre système de pointage biométrique et Kiosk plusieurs retards non justifiés enregistrés au cours des dernières semaines.

Nous vous rappelons que les horaires de travail en vigueur au sein de l'entreprise NTÊMO ONE fixent l'heure limite d'arrivée à 08h30. La ponctualité est indispensable au bon fonctionnement des équipes et à la continuité de nos services.

Nous vous prions de bien vouloir régulariser votre ponctualité dès réception de la présente. À défaut d'amélioration, nous serions contraints d'appliquer les sanctions prévues par le règlement d'entreprise.

Veuillez agréer, l'expression de nos salutations distinguées.

La Direction des Ressources Humaines.`;
      } else if (p.includes("félicitations") || p.includes("exemplaire")) {
        draft = `ENTREPRISE NTÊMO ONE SARL
Avenue CEMAC, Mpila, Zone Industrielle Ouenzé — Brazzaville (Congo)
Direction des Ressources Humaines
Brazzaville, le ${today}

LETTRE DE FÉLICITATIONS OFFICIELLE

Objet : Reconnaissance de votre assiduité et ponctualité exemplaire

Cher(e) collaborateur(trice),

La Direction Générale et les Ressources Humaines tiennent à vous adresser leurs chaleureuses félicitations pour votre taux de présence irréprochable (100% de ponctualité) au cours de ce trimestre.

Votre sens élevé des responsabilités et votre engagement quotidien constituent un exemple inspirant pour l'ensemble de nos équipes.

Nous vous remercions pour votre précieuse contribution au succès de NTÊMO ONE.

Très cordialement,
La Direction Générale.`;
      } else {
        draft = `ENTREPRISE NTÊMO ONE SARL
Avenue CEMAC, Mpila, Zone Industrielle Ouenzé — Brazzaville (Congo)
Brazzaville, le ${today}

NOTE ADMINISTRATIVE ET COMPTE-RENDU RH

Objet : Synthèse d'activité et directives internes

Faisant suite à notre analyse et à votre demande :
"${p}"

La Direction confirme la prise en compte des orientations arrêtées. Les différents départements concernés sont priés d'assurer l'application rigoureuse des mesures préconisées.

Fait pour valoir ce que de droit.
La Direction Générale de NTÊMO.`;
      }

      setResponse(draft);
      setIsLoading(false);
    }, 700);
  };

  const handleCopy = () => {
    if (!response) return;
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Bot className="w-7 h-7 text-indigo-600" />
          Assistant IA RH & Rédaction (NTEMO AI)
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Aide intelligente à la rédaction de courriers administratifs, synthèses d'activité et notes de service.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Entrée du prompt */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-indigo-600" />
            Que souhaitez-vous rédiger ?
          </h3>

          <textarea
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Décrivez votre besoin : ex. Rédiger une lettre de mise en demeure pour absence injustifiée..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />

          {/* Suggestions de prompts rapides */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Modèles de demandes rapides :
            </span>
            <div className="space-y-1.5">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(qp);
                    handleGenerate(qp);
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/60 text-xs text-slate-700 hover:text-indigo-700 transition-colors"
                >
                  ✨ {qp}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleGenerate()}
            disabled={isLoading || !prompt.trim()}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Génération assistée par IA...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Rédiger le Document avec NTEMO AI
              </>
            )}
          </button>
        </div>

        {/* Sortie du résultat rédigé */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-4 h-4" />
                Brouillon Rédigé par l'IA
              </span>
              {response && (
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Copié !
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copier le texte
                    </>
                  )}
                </button>
              )}
            </div>

            {response ? (
              <pre className="font-mono text-xs text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed max-h-[460px] overflow-y-auto">
                {response}
              </pre>
            ) : (
              <div className="py-20 text-center text-slate-400">
                <Bot className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">Saisissez un sujet ou choisissez une suggestion pour lancer la génération.</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-right">
            NTEMO AI Assistant RH • Modèle Spécialisé Entreprise
          </div>
        </div>

      </div>
    </div>
  );
}


