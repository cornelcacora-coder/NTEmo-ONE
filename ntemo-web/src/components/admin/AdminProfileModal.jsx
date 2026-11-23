import React, { useState } from "react";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  ShieldCheck,
  Save,
  AlertCircle,
  Camera
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AdminProfileModal({ isOpen, onClose, currentAdmin, onSave }) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    firstName: currentAdmin?.firstName || "Cornelca",
    lastName: currentAdmin?.lastName || "BITODI",
    email: currentAdmin?.email || "cornelca.bitodi@ntemo.com",
    phone: currentAdmin?.phone || "+242 06 400 12 34",
    role: currentAdmin?.role || "Directeur des Ressources Humaines (DRH)",
    photo_url: currentAdmin?.photo_url || null,
    newPassword: "",
    confirmPassword: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData((prev) => ({ ...prev, photo_url: ev.target?.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError("Le prénom et le nom sont obligatoires.");
      return;
    }

    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("Veuillez renseigner une adresse email valide.");
      return;
    }

    if (formData.newPassword) {
      if (formData.newPassword.length < 6) {
        setError("Le nouveau mot de passe doit comporter au moins 6 caractères.");
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setError("Les mots de passe ne correspondent pas.");
        return;
      }
    }

    setIsSaving(true);
    try {
      const updatedData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim().toUpperCase(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        role: formData.role.trim(),
        photo_url: formData.photo_url || null
      };

      if (formData.newPassword) {
        updatedData.password = formData.newPassword;
        updatedData.mustChangePassword = false;
        updatedData.tempPassword = null;
        updatedData.status = "Actif";
      }

      await onSave(updatedData);

      setSuccessMessage("Vos informations de profil ont été mises à jour avec succès !");
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Erreur enregistrement profil:", err);
      setError("Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* HEADER MODAL */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#031B4D] via-[#003B7A] to-[#0070BA] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <User className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white">
                Mon Profil Administrateur
              </h3>
              <p className="text-xs text-sky-200 font-normal">
                Modifier vos informations personnelles et vos accès de sécurité
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CORPS DU FORMULAIRE */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Badge récapitulatif & Photo de profil */}
          <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative group cursor-pointer">
                {formData.photo_url ? (
                  <img
                    src={formData.photo_url}
                    alt={formData.firstName}
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#0070BA] shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#00A3E0] to-[#031B4D] text-white font-extrabold flex items-center justify-center text-lg shadow-md">
                    {(formData.firstName || "C")[0].toUpperCase()}
                  </div>
                )}
                <label className="absolute inset-0 bg-slate-900/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {formData.firstName} {formData.lastName}
                </div>
                <div className="text-xs text-[#0070BA] font-semibold">{formData.role}</div>
                <div className="text-[11px] text-slate-500 font-mono">{formData.email}</div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Compte Certifié
              </span>
              <label className="text-[11px] font-bold text-[#0070BA] hover:underline cursor-pointer flex items-center gap-1">
                <Camera className="w-3.5 h-3.5" />
                <span>{formData.photo_url ? "Changer la photo" : "Ajouter une photo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Succès */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* CHAMPS PRÉNOM ET NOM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Prénom <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Ex: Cornelca"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0070BA] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nom de Famille <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Ex: BITODI"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 uppercase outline-none focus:ring-2 focus:ring-[#0070BA] transition-all"
              />
            </div>
          </div>

          {/* EMAIL & TÉLÉPHONE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Professionnel <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="cornelca.bitodi@ntemo.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0070BA] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Téléphone (Brazzaville, Congo)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+242 06 400 12 34"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0070BA] transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* RÔLE / FONCTION */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Rôle / Titre dans l'Entreprise
            </label>
            <div className="relative">
              <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="role"
                value={formData.role}
                onChange={handleChange}
                placeholder="Ex: Directeur des Ressources Humaines (DRH)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0070BA] transition-all"
              />
            </div>
          </div>

          {/* SECTION CHANGEMENT DE MOT DE PASSE (FACULTATIF) */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#0070BA]" />
                  Modifier le mot de passe
                </span>
                <p className="text-[11px] text-slate-400">
                  Laissez ces champs vides si vous souhaitez conserver votre mot de passe actuel.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="Min. 6 caractères"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0070BA]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Confirmer nouveau mot de passe
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Répétez le mot de passe"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0070BA]"
                />
              </div>
            </div>
          </div>

          {/* BOUTONS D'ACTION */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0070BA] to-[#00A3E0] hover:opacity-95 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Enregistrement..." : "Enregistrer les modifications"}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
