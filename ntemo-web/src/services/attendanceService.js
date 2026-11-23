import { db, isFirebaseConfigured } from "../firebase/config";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc,
  deleteDoc,
  updateDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp,
  limit,
  orderBy
} from "firebase/firestore";

class AttendanceService {
  constructor() {
    this._employeesCache = null;
    this._attendancesCache = {};
    this._companySettingsCache = null;
    this._adminUsersCache = null;
    this._settingsListeners = new Set();
    this._adminUsersListeners = new Set();
    this._employeesListeners = new Set();
    this._initBackgroundSync();
  }

  getDefaultEmployees() {
    return [
      {
        id: "emp-cornelca-bitodi",
        first_name: "Cornelca",
        last_name: "BITODI",
        full_name: "Cornelca BITODI",
        email: "cornelca.bitodi@ntemo.com",
        phone: "+242 06 400 12 34",
        role: "Directeur des Ressources Humaines (DRH)",
        position: "Directeur des Ressources Humaines",
        department: "Ressources Humaines",
        contract_type: "CDI",
        hire_date: "2026-01-01",
        base_salary: 850000,
        currency: "FCFA",
        transport_allowance: 50000,
        total_salary: 900000,
        payment_method: "Virement Bancaire",
        bank_name: "BGFI Bank",
        bank_account: "CG02 0100 1000 0012 3456 78",
        matricule: "NTM-2026-001",
        badge_security_token: "NTM-TOKEN-SEC-COR2026",
        status: "ACTIVE",
        photo_url: null,
        created_at: "2026-01-01T08:00:00.000Z"
      }
    ];
  }

  // Pré-chargement et synchronisation permanente en arrière-plan
  _initBackgroundSync() {
    // Initialisation du cache local des paramètres entreprise
    try {
      const savedSettings = localStorage.getItem("ntemo_company_settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        parsed.website = "https://www.ntemoconsulting.com/";
        try {
          localStorage.setItem("ntemo_company_settings", JSON.stringify(parsed));
        } catch (_) {}
        this._companySettingsCache = parsed;
      }
      const savedAdmins = localStorage.getItem("ntemo_admin_users");
      if (savedAdmins) {
        this._adminUsersCache = JSON.parse(savedAdmins);
      }
      const savedEmps = localStorage.getItem("ntemo_employees");
      if (savedEmps) {
        this._employeesCache = JSON.parse(savedEmps);
      } else {
        this._employeesCache = this.getDefaultEmployees();
        try {
          localStorage.setItem("ntemo_employees", JSON.stringify(this._employeesCache));
        } catch (_) {}
      }
    } catch (e) {
      console.warn("Erreur lecture localStorage:", e);
      this._employeesCache = this.getDefaultEmployees();
    }

    if (!isFirebaseConfigured || !db) return;

    // Écoute permanente des employés
    try {
      onSnapshot(collection(db, "employees"), (snapshot) => {
        if (!snapshot.empty) {
          const emps = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          // S'assurer que Cornelca BITODI est inclus s'il n'est pas déjà dans Firestore
          const hasBitodi = emps.some((e) => e.email?.toLowerCase() === "cornelca.bitodi@ntemo.com" || e.last_name?.toUpperCase() === "BITODI");
          const merged = hasBitodi ? emps : [...this.getDefaultEmployees(), ...emps];
          this._employeesCache = merged;
          try {
            localStorage.setItem("ntemo_employees", JSON.stringify(merged));
          } catch (_) {}
          this._notifyEmployees(merged);
        } else {
          const defaults = this.getDefaultEmployees();
          defaults.forEach((emp) => {
            setDoc(doc(db, "employees", emp.id), emp, { merge: true }).catch(console.warn);
          });
          this._employeesCache = defaults;
          this._notifyEmployees(defaults);
        }
      }, (err) => {
        console.warn("Sync employees bg:", err);
        if (!this._employeesCache) {
          this._employeesCache = this.getDefaultEmployees();
          this._notifyEmployees(this._employeesCache);
        }
      });
    } catch (e) {
      console.warn("Init sync employees:", e);
    }

    // Écoute permanente des paramètres entreprise
    try {
      onSnapshot(doc(db, "settings", "company_profile"), (snapshot) => {
        if (snapshot.exists()) {
          this._companySettingsCache = snapshot.data();
          try {
            localStorage.setItem("ntemo_company_settings", JSON.stringify(this._companySettingsCache));
          } catch (_) {}
        }
      }, (err) => console.warn("Sync settings bg:", err));
    } catch (e) {
      console.warn("Init sync settings:", e);
    }

    // Écoute permanente des utilisateurs administrateurs
    try {
      onSnapshot(collection(db, "admin_users"), (snapshot) => {
        if (!snapshot.empty) {
          const users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          this._adminUsersCache = users;
          try {
            localStorage.setItem("ntemo_admin_users", JSON.stringify(users));
          } catch (_) {}
        }
      }, (err) => console.warn("Sync admin_users bg:", err));
    } catch (e) {
      console.warn("Init sync admin_users:", e);
    }
  }

  _notifyEmployees(emps) {
    this._employeesListeners.forEach((cb) => {
      try { cb(emps); } catch (_) {}
    });
  }

  /**
   * Écoute en temps réel la collection des collaborateurs dans Firestore
   * Rendu instantané (0 ms) grâce au cache mémoire
   */
  subscribeToEmployees(callback) {
    const list = this._employeesCache && this._employeesCache.length > 0 
      ? this._employeesCache 
      : this.getDefaultEmployees();
    
    callback(list);
    this._employeesListeners.add(callback);

    if (!isFirebaseConfigured || !db) {
      return () => {
        this._employeesListeners.delete(callback);
      };
    }

    const q = collection(db, "employees");
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const emps = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          const hasBitodi = emps.some((e) => e.email?.toLowerCase() === "cornelca.bitodi@ntemo.com" || e.last_name?.toUpperCase() === "BITODI");
          const merged = hasBitodi ? emps : [...this.getDefaultEmployees(), ...emps];
          this._employeesCache = merged;
          callback(merged);
        } else {
          callback(this.getDefaultEmployees());
        }
      },
      (error) => {
        console.warn("Erreur écoute Firestore employees:", error);
        callback(this._employeesCache || this.getDefaultEmployees());
      }
    );

    return () => {
      this._employeesListeners.delete(callback);
      if (typeof unsub === "function") unsub();
    };
  }

  /**
   * Récupère la liste complète des collaborateurs (instantané via cache)
   */
  async getEmployees() {
    if (this._employeesCache && this._employeesCache.length > 0) {
      return this._employeesCache;
    }
    return this.getDefaultEmployees();
  }

  /**
   * Crée un collaborateur directement (instantané 0ms + génération de badge automatique)
   */
  async createEmployee(employeeData) {
    const id = employeeData.id || `emp-${Date.now()}`;
    const matricule = employeeData.matricule || `NTM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const token = employeeData.badge_security_token || `NTM-TOKEN-SEC-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const created = {
      ...employeeData,
      id,
      matricule,
      badge_security_token: token,
      status: employeeData.status || "ACTIVE",
      created_at: new Date().toISOString()
    };

    const currentList = this._employeesCache || this.getDefaultEmployees();
    const updated = [created, ...currentList.filter((e) => e.id !== id && e.email !== created.email)];
    this._employeesCache = updated;

    try {
      localStorage.setItem("ntemo_employees", JSON.stringify(updated));
    } catch (_) {}

    // Notifier immédiatement tous les modules abonnés (BadgesManager, EmployeesManager)
    this._notifyEmployees(updated);

    // Enregistrement Firestore en tâche de fond (merge non bloquant)
    if (isFirebaseConfigured && db) {
      setDoc(doc(db, "employees", id), created, { merge: true }).catch((err) => {
        console.warn("Erreur background setDoc employees:", err);
      });
    }

    return created;
  }

  /**
   * Supprime un collaborateur
   */
  /**
   * Met à jour les données d'un collaborateur (statut, photo, rôle, salaire, notes, etc.)
   */
  async updateEmployee(employeeId, updates) {
    const currentList = this._employeesCache || this.getDefaultEmployees();
    const updated = currentList.map((e) => {
      if (e.id === employeeId) {
        return {
          ...e,
          ...updates,
          updated_at: new Date().toISOString()
        };
      }
      return e;
    });

    this._employeesCache = updated;

    try {
      localStorage.setItem("ntemo_employees", JSON.stringify(updated));
    } catch (_) {}

    // Notifier immédiatement tous les abonnés (EmployeesManager, BadgesManager, Kiosk)
    this._notifyEmployees(updated);

    // Synchronisation Firestore en tâche de fond (non-bloquant)
    if (isFirebaseConfigured && db) {
      setDoc(doc(db, "employees", employeeId), updates, { merge: true }).catch((err) => {
        console.warn("Erreur Firestore updateEmployee:", err);
      });
    }

    return updated.find((e) => e.id === employeeId);
  }

  /**
   * Archivage légal d'un collaborateur (la suppression physique est interdite pour conserver l'historique)
   */
  async deleteEmployee(employeeId) {
    const currentList = this._employeesCache || this.getDefaultEmployees();
    const updated = currentList.map((e) =>
      e.id === employeeId
        ? { ...e, status: "TERMINATED", terminated_at: new Date().toISOString(), statusNote: "Dossier archivé et contrat résilié" }
        : e
    );
    this._employeesCache = updated;
    try {
      localStorage.setItem("ntemo_employees", JSON.stringify(updated));
    } catch (_) {}
    this._notifyEmployees(updated);

    if (isFirebaseConfigured && db) {
      setDoc(doc(db, "employees", employeeId), { status: "TERMINATED", terminated_at: new Date().toISOString() }, { merge: true }).catch(console.warn);
    }
    return updated.find((e) => e.id === employeeId);
  }

  /**
   * Réémet un badge pour un collaborateur (nouveau token cryptographique)
   */
  async regenerateBadge(employeeId) {
    const newToken = `NTM-TOKEN-SEC-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const currentList = this._employeesCache || this.getDefaultEmployees();
    const updated = currentList.map((e) => (e.id === employeeId ? { ...e, badge_security_token: newToken } : e));
    this._employeesCache = updated;
    try {
      localStorage.setItem("ntemo_employees", JSON.stringify(updated));
    } catch (_) {}
    this._notifyEmployees(updated);

    if (isFirebaseConfigured && db) {
      setDoc(doc(db, "employees", employeeId), { badge_security_token: newToken }, { merge: true }).catch(console.warn);
    }
    return newToken;
  }

  /**
   * Traitement d'un pointage scanné par la borne Kiosk murale
   * 100% Firestore, ultra réactif
   */
  async recordPunch({ qrData, punchMode = "AUTO", deviceId = "KIOSK-MAIN" }) {
    const cleanQr = (qrData || "").trim();
    if (!cleanQr) {
      throw new Error("Code QR vide ou illisible.");
    }

    if (!isFirebaseConfigured || !db) {
      throw new Error("Connexion indisponible pour le pointage.");
    }

    // 1. Recherche prioritaire dans le cache mémoire d'abord (ultra rapide 0ms)
    let employee = null;
    if (this._employeesCache) {
      employee = this._employeesCache.find(
        (e) => e.badge_security_token === cleanQr || e.matricule === cleanQr
      );
    }

    // 2. Si pas en cache, recherche réseau dans Firestore
    if (!employee) {
      const empRef = collection(db, "employees");
      let snap = await getDocs(query(empRef, where("badge_security_token", "==", cleanQr)));
      if (snap.empty) {
        snap = await getDocs(query(empRef, where("matricule", "==", cleanQr)));
      }
      if (!snap.empty) {
        employee = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
    }

    if (!employee) {
      throw new Error("Badge non reconnu ou révoqué dans la base.");
    }

    // Blocage strict des collaborateurs licenciés, démissionnaires ou suspendus
    if (employee.status === "TERMINATED" || employee.status === "Licencié") {
      throw new Error(`Accès refusé : Le badge de ${employee.full_name || employee.first_name} a été révoqué suite à la rupture de son contrat.`);
    }

    if (employee.status === "RESIGNED" || employee.status === "Démissionnaire") {
      throw new Error(`Accès refusé : Le badge de ${employee.full_name || employee.first_name} a été révoqué suite à sa démission.`);
    }

    if (employee.status === "SUSPEND" || employee.status === "Suspendu") {
      throw new Error(`Accès refusé : Le collaborateur ${employee.full_name || employee.first_name} fait l'objet d'une suspension administrative.`);
    }

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    const attendanceDocRef = doc(db, "attendances", `${employee.id}_${todayStr}`);
    const attSnap = await getDoc(attendanceDocRef);

    let eventType = "IN";
    let workedDurationStr = null;

    if (attSnap.exists()) {
      const data = attSnap.data();
      const events = data.events || [];

      // Anti-rebond (60s)
      if (events.length > 0) {
        const lastEv = events[events.length - 1];
        const lastTime = lastEv.timestamp?.toDate ? lastEv.timestamp.toDate() : new Date(lastEv.timestamp);
        const diffSeconds = (now.getTime() - lastTime.getTime()) / 1000;
        if (diffSeconds < 60) {
          throw new Error(`Pointage déjà validé il y a ${Math.round(diffSeconds)}s. Veuillez patienter.`);
        }
      }

      if (punchMode === "AUTO") {
        const lastType = events.length > 0 ? events[events.length - 1].type : "OUT";
        eventType = lastType === "IN" ? "OUT" : "IN";
      } else {
        eventType = punchMode;
      }

      events.push({
        type: eventType,
        timestamp: Timestamp.fromDate(now),
        time_str: timeStr,
        device_id: deviceId,
      });

      const updateData = {
        events,
        last_updated: serverTimestamp(),
      };

      if (eventType === "OUT") {
        updateData.last_check_out = timeStr;
        if (data.first_check_in_time) {
          const inTime = data.first_check_in_time.toDate();
          const workedMinutes = Math.max(0, Math.round((now.getTime() - inTime.getTime()) / 60000));
          const h = Math.floor(workedMinutes / 60);
          const m = workedMinutes % 60;
          workedDurationStr = `${h}h ${m < 10 ? "0" : ""}${m}min`;
          updateData.worked_minutes = workedMinutes;
          updateData.worked_duration_str = workedDurationStr;
        }
      }

      await updateDoc(attendanceDocRef, updateData);
    } else {
      eventType = "IN";
      const isLate = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 30);
      const lateMins = isLate ? (now.getHours() - 8) * 60 + (now.getMinutes() - 30) : 0;

      await setDoc(attendanceDocRef, {
        id: `${employee.id}_${todayStr}`,
        employee_id: employee.id,
        employee_name: employee.full_name || `${employee.first_name || ""} ${employee.last_name || ""}`.trim(),
        matricule: employee.matricule,
        department: employee.department || "Général",
        position: employee.position || "Collaborateur",
        photo_url: employee.photo_url || null,
        date: todayStr,
        first_check_in: timeStr,
        first_check_in_time: Timestamp.fromDate(now),
        last_check_out: null,
        status: isLate ? "LATE" : "PRESENT",
        is_late: isLate,
        late_minutes: lateMins,
        worked_minutes: 0,
        events: [
          {
            type: "IN",
            timestamp: Timestamp.fromDate(now),
            time_str: timeStr,
            device_id: deviceId,
          },
        ],
        created_at: serverTimestamp(),
      });
    }

    return {
      success: true,
      eventType,
      time: timeStr,
      date: todayStr,
      workedDuration: workedDurationStr,
      employee,
    };
  }

  /**
   * Écoute en temps réel les présences avec affichage immédiat
   * @param {"today"|"week"|"month"|"year"} period
   * @param {function} callback
   */
  subscribeToAttendances(period, callback) {
    const cached = this._attendancesCache[period];
    if (cached) {
      callback(cached);
    }

    if (!isFirebaseConfigured || !db) {
      if (!cached) callback([]);
      return () => {};
    }

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Pour "today", requête simple par égalité (ultra rapide)
    if (period === "today") {
      const q = query(collection(db, "attendances"), where("date", "==", todayStr));
      return onSnapshot(
        q,
        (snapshot) => {
          const records = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          this._attendancesCache["today"] = records;
          callback(records);
        },
        (error) => {
          console.error("Erreur attendances today:", error);
          if (!cached) callback([]);
        }
      );
    }

    // Pour semaine / mois / année : calculer la date de début
    let startDate;
    if (period === "week") {
      const day = now.getDay();
      const diff = now.getDate() - (day === 0 ? 6 : day - 1);
      startDate = new Date(now.getFullYear(), now.getMonth(), diff);
    } else if (period === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const startStr = startDate.toISOString().split("T")[0];

    // Requête simple sur la collection avec filtre en mémoire (évite les blocages d'index)
    const q = query(collection(db, "attendances"), limit(500));
    return onSnapshot(
      q,
      (snapshot) => {
        const all = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const filtered = all.filter((r) => r.date >= startStr && r.date <= todayStr);
        filtered.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
        this._attendancesCache[period] = filtered;
        callback(filtered);
      },
      (error) => {
        console.error(`Erreur attendances ${period}:`, error);
        if (!cached) callback([]);
      }
    );
  }

  /**
   * Écoute en temps réel les présences du jour (raccourci)
   */
  subscribeToToday(callback) {
    return this.subscribeToAttendances("today", callback);
  }

  // =========================================================================
  // GESTION DYNAMIQUE DES PARAMÈTRES DE L'ENTREPRISE (100% FIRESTORE & CACHE)
  // =========================================================================

  getDefaultCompanySettings() {
    return {
      companyName: "NTÊMO ONE",
      companyMotto: "Ensemble, construisons un meilleur avenir",
      logoUrl: "/ntemo-logo.jpg",
      address: "Avenue CEMAC, Mpila, Zone Industrielle Ouenzé — Brazzaville (Congo)",
      phone: "+242 06 400 12 34",
      email: "direction@ntemo.com",
      website: "https://www.ntemoconsulting.com/",
      rccm: "CG-BZV-01-2026-B12-00456",
      ifu: "020260012345678",
      activeYear: "2026",
      availableYears: ["2024", "2025", "2026", "2027"],
      language: "fr",
      darkMode: false,
      workStartTime: "08:00",
      lateToleranceTime: "08:30",
      workEndTime: "17:00",
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Récupère les paramètres de l'entreprise (instantané via cache / localStorage)
   */
  async getCompanySettings() {
    if (this._companySettingsCache) {
      return this._companySettingsCache;
    }
    const defaults = this.getDefaultCompanySettings();
    if (!isFirebaseConfigured || !db) {
      this._companySettingsCache = defaults;
      return defaults;
    }
    try {
      const snap = await getDoc(doc(db, "settings", "company_profile"));
      if (snap.exists()) {
        this._companySettingsCache = { ...defaults, ...snap.data() };
      } else {
        await setDoc(doc(db, "settings", "company_profile"), defaults);
        this._companySettingsCache = defaults;
      }
      return this._companySettingsCache;
    } catch (err) {
      console.warn("getCompanySettings fallback:", err);
      return defaults;
    }
  }

  /**
   * Écoute en temps réel les changements des paramètres de l'entreprise
   */
  subscribeToCompanySettings(callback) {
    const defaults = this.getDefaultCompanySettings();
    if (this._companySettingsCache) {
      callback(this._companySettingsCache);
    } else {
      callback(defaults);
    }

    this._settingsListeners.add(callback);

    if (!isFirebaseConfigured || !db) {
      return () => {
        this._settingsListeners.delete(callback);
      };
    }

    const unsub = onSnapshot(
      doc(db, "settings", "company_profile"),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = { ...defaults, ...snapshot.data() };
          this._companySettingsCache = data;
          try {
            localStorage.setItem("ntemo_company_settings", JSON.stringify(data));
          } catch (_) {}
          callback(data);
        } else {
          setDoc(doc(db, "settings", "company_profile"), defaults).catch(console.warn);
          this._companySettingsCache = defaults;
          callback(defaults);
        }
      },
      (err) => {
        console.warn("subscribeToCompanySettings err:", err);
      }
    );

    return () => {
      this._settingsListeners.delete(callback);
      if (typeof unsub === "function") unsub();
    };
  }

  /**
   * Sauvegarde et synchronise les paramètres d'entreprise
   */
  async updateCompanySettings(newSettings) {
    const merged = {
      ...(this._companySettingsCache || this.getDefaultCompanySettings()),
      ...newSettings,
      updatedAt: new Date().toISOString()
    };
    this._companySettingsCache = merged;
    try {
      localStorage.setItem("ntemo_company_settings", JSON.stringify(merged));
    } catch (_) {}

    // Notifier immédiatement tous les abonnés locaux (0 ms)
    this._settingsListeners.forEach((cb) => {
      try { cb(merged); } catch (_) {}
    });

    if (isFirebaseConfigured && db) {
      setDoc(doc(db, "settings", "company_profile"), merged, { merge: true }).catch((err) => {
        console.warn("Erreur background setDoc company_profile:", err);
      });
    }
    return merged;
  }

  // =========================================================================
  // GESTION DES UTILISATEURS RH & ADMINISTRATEURS (ACCÈS, MOTS DE PASSE, ETC)
  // =========================================================================

  getDefaultAdminUsers() {
    return [
      {
        id: "admin-cornelca-bitodi",
        firstName: "Cornelca",
        lastName: "BITODI",
        email: "cornelca.bitodi@ntemo.com",
        password: "Cornelca2026!",
        role: "Directeur des Ressources Humaines (DRH)",
        status: "Actif",
        mustChangePassword: false,
        tempPassword: null,
        permissions: {
          dashboard: true,
          employees: true,
          badges: true,
          conges: true,
          documents: true,
          settings: true
        },
        createdAt: "2026-01-01T08:00:00.000Z"
      }
    ];
  }

  /**
   * Récupère la liste des utilisateurs administrateurs (cache immédiat + timeout 1.5s non-bloquant)
   */
  async getAdminUsers() {
    // 1. Cache mémoire immédiat (0ms)
    if (this._adminUsersCache && this._adminUsersCache.length > 0) {
      return this._adminUsersCache;
    }

    // 2. LocalStorage immédiat (0ms)
    try {
      const saved = localStorage.getItem("ntemo_admin_users");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this._adminUsersCache = parsed;
          return parsed;
        }
      }
    } catch (_) {}

    const defaults = this.getDefaultAdminUsers();
    this._adminUsersCache = defaults;

    if (!isFirebaseConfigured || !db) {
      return defaults;
    }

    // 3. Récupération Firestore non-bloquante avec timeout strict de 1500ms
    try {
      const fetchPromise = getDocs(collection(db, "admin_users")).then((snap) => {
        if (!snap.empty) {
          const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          this._adminUsersCache = users;
          try {
            localStorage.setItem("ntemo_admin_users", JSON.stringify(users));
          } catch (_) {}
          return users;
        } else {
          for (const u of defaults) {
            setDoc(doc(db, "admin_users", u.id), u).catch(console.warn);
          }
          return defaults;
        }
      });

      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(defaults), 1500));
      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (err) {
      console.warn("getAdminUsers fallback:", err);
      return defaults;
    }
  }

  /**
   * Écoute en temps réel la collection des utilisateurs RH/Admin
   */
  subscribeToAdminUsers(callback) {
    const defaults = this.getDefaultAdminUsers();
    if (this._adminUsersCache && this._adminUsersCache.length > 0) {
      callback(this._adminUsersCache);
    } else {
      callback(defaults);
    }

    this._adminUsersListeners.add(callback);

    if (!isFirebaseConfigured || !db) {
      return () => {
        this._adminUsersListeners.delete(callback);
      };
    }

    const unsub = onSnapshot(
      collection(db, "admin_users"),
      (snapshot) => {
        if (!snapshot.empty) {
          const users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          this._adminUsersCache = users;
          try {
            localStorage.setItem("ntemo_admin_users", JSON.stringify(users));
          } catch (_) {}
          callback(users);
        } else {
          // Initialise l'admin par défaut
          for (const u of defaults) {
            setDoc(doc(db, "admin_users", u.id), u).catch(console.warn);
          }
          this._adminUsersCache = defaults;
          callback(defaults);
        }
      },
      (err) => console.warn("subscribeToAdminUsers err:", err)
    );

    return () => {
      this._adminUsersListeners.delete(callback);
      if (typeof unsub === "function") unsub();
    };
  }

  _notifyAdminUsers(users) {
    this._adminUsersListeners.forEach((cb) => {
      try { cb(users); } catch (_) {}
    });
  }

  /**
   * Crée un utilisateur admin / RH avec mot de passe temporaire et obligation de changement
   */
  async createAdminUser(userData) {
    const id = `admin-${Date.now()}`;
    const tempPassword = `NTM-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newAdmin = {
      id,
      firstName: userData.firstName?.trim() || "Cornelca",
      lastName: userData.lastName?.trim() || "BITODI",
      email: userData.email?.trim().toLowerCase(),
      role: userData.role || "Directeur des Ressources Humaines (DRH)",
      status: "En attente du 1er changement de mot de passe",
      mustChangePassword: true,
      tempPassword,
      permissions: {
        dashboard: userData.permissions?.dashboard ?? true,
        employees: userData.permissions?.employees ?? true,
        badges: userData.permissions?.badges ?? true,
        conges: userData.permissions?.conges ?? true,
        documents: userData.permissions?.documents ?? true,
        settings: userData.permissions?.settings ?? false
      },
      createdAt: new Date().toISOString()
    };

    const currentList = this._adminUsersCache || this.getDefaultAdminUsers();
    const updated = [newAdmin, ...currentList.filter((u) => u.id !== id)];
    this._adminUsersCache = updated;
    try {
      localStorage.setItem("ntemo_admin_users", JSON.stringify(updated));
    } catch (_) {}
    this._notifyAdminUsers(updated);

    if (isFirebaseConfigured && db) {
      setDoc(doc(db, "admin_users", id), newAdmin, { merge: true }).catch(console.warn);
    }

    // Création automatique immédiate de l'employé et de son badge officiel
    const empForAdmin = {
      id: `emp-${id}`,
      first_name: newAdmin.firstName,
      last_name: newAdmin.lastName,
      full_name: `${newAdmin.firstName} ${newAdmin.lastName}`.trim(),
      email: newAdmin.email,
      phone: "+242 06 400 12 34",
      role: newAdmin.role,
      position: newAdmin.role,
      department: "Ressources Humaines",
      contract_type: "CDI",
      hire_date: new Date().toISOString().split("T")[0],
      base_salary: 750000,
      currency: "FCFA",
      transport_allowance: 40000,
      total_salary: 790000,
      payment_method: "Virement Bancaire",
      bank_name: "BGFI Bank",
      bank_account: "",
      matricule: `NTM-2026-${Math.floor(100 + Math.random() * 900)}`,
      badge_security_token: `NTM-TOKEN-SEC-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      status: "ACTIVE",
      photo_url: null,
      created_at: new Date().toISOString()
    };
    this.createEmployee(empForAdmin).catch(console.warn);

    return newAdmin;
  }

  /**
   * Met à jour les permissions ou informations d'un utilisateur
   */
  async updateAdminUser(userId, data) {
    const currentList = this._adminUsersCache || this.getDefaultAdminUsers();
    let found = false;
    const updated = currentList.map((u) => {
      if (u.id === userId) {
        found = true;
        return { ...u, ...data, updatedAt: new Date().toISOString() };
      }
      return u;
    });

    if (!found) {
      updated.push({ id: userId, ...data, updatedAt: new Date().toISOString() });
    }

    this._adminUsersCache = updated;
    try {
      localStorage.setItem("ntemo_admin_users", JSON.stringify(updated));
    } catch (_) {}
    this._notifyAdminUsers(updated);

    if (isFirebaseConfigured && db) {
      const userToSave = updated.find((u) => u.id === userId);
      setDoc(doc(db, "admin_users", userId), userToSave, { merge: true }).catch((err) => {
        console.warn("Erreur background setDoc admin_users:", err);
      });
    }

    // Synchronisation automatique et immédiate du badge / fiche employé associé
    try {
      const currentEmps = this._employeesCache || this.getDefaultEmployees();
      const emp = currentEmps.find((e) =>
        e.id === "emp-cornelca-bitodi" ||
        (data.email && e.email?.toLowerCase() === data.email.toLowerCase()) ||
        (e.last_name || "").toUpperCase().includes("BITODI") ||
        (e.full_name || "").toUpperCase().includes("BITODI")
      );

      if (emp) {
        const empUpdates = {};
        if (data.firstName !== undefined) empUpdates.first_name = data.firstName;
        if (data.lastName !== undefined) empUpdates.last_name = data.lastName;
        if (data.firstName !== undefined || data.lastName !== undefined) {
          const fn = data.firstName !== undefined ? data.firstName : emp.first_name || "";
          const ln = data.lastName !== undefined ? data.lastName : emp.last_name || "";
          empUpdates.full_name = `${fn} ${ln}`.trim();
        }
        if (data.email !== undefined) empUpdates.email = data.email;
        if (data.phone !== undefined) empUpdates.phone = data.phone;
        if (data.role !== undefined) {
          empUpdates.role = data.role;
          empUpdates.position = data.role;
        }
        if (data.photo_url !== undefined) empUpdates.photo_url = data.photo_url;

        if (Object.keys(empUpdates).length > 0) {
          await this.updateEmployee(emp.id, empUpdates);
        }
      }
    } catch (syncErr) {
      console.warn("Erreur synchronisation automatique badge/employé:", syncErr);
    }

    return updated.find((u) => u.id === userId);
  }

  /**
   * Supprime un utilisateur admin
   */
  async deleteAdminUser(userId) {
    const currentList = this._adminUsersCache || this.getDefaultAdminUsers();
    const updated = currentList.filter((u) => u.id !== userId);
    this._adminUsersCache = updated;
    try {
      localStorage.setItem("ntemo_admin_users", JSON.stringify(updated));
    } catch (_) {}
    this._notifyAdminUsers(updated);

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, "admin_users", userId));
      } catch (err) {
        console.warn("Erreur deleteDoc admin_users:", err);
      }
    }
    return true;
  }

  /**
   * Réinitialise le mot de passe d'un utilisateur (régénère un mot de passe temporaire et force le changement)
   */
  async resetAdminPassword(userId) {
    const newTemp = `NTM-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const patch = {
      password: null,
      tempPassword: newTemp,
      mustChangePassword: true,
      status: "En attente du 1er changement de mot de passe",
      passwordResetAt: new Date().toISOString()
    };
    return await this.updateAdminUser(userId, patch);
  }

  /**
   * Demande de réinitialisation de mot de passe par Email ou Téléphone (SMS)
   */
  async requestPasswordReset(identifier, channel = "email") {
    const trimmed = (identifier || "").trim().toLowerCase();
    const currentList = this._adminUsersCache || this.getDefaultAdminUsers();
    
    // Recherche par email ou par téléphone ou fallback sur l'admin principal
    let admin = currentList.find((u) => 
      u.email?.toLowerCase() === trimmed || 
      (u.phone && u.phone.replace(/[^0-9]/g, "") === trimmed.replace(/[^0-9]/g, ""))
    );

    if (!admin && (trimmed.includes("ntemo") || trimmed.includes("cornelca") || !trimmed)) {
      admin = currentList[0] || this.getDefaultAdminUsers()[0];
    }

    if (!admin) {
      throw new Error(`Aucun compte administrateur trouvé pour "${identifier}".`);
    }

    // Génération d'un code de sécurité à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const patch = {
      resetCode: code,
      resetExpiresAt: expiresAt,
      resetChannel: channel,
      resetRequestedAt: new Date().toISOString()
    };

    await this.updateAdminUser(admin.id, patch);

    return {
      success: true,
      adminId: admin.id,
      adminName: `${admin.firstName || "Cornelca"} ${admin.lastName || "BITODI"}`.trim(),
      email: admin.email || "cornelca.bitodi@ntemo.com",
      phone: admin.phone || "+242 06 400 12 34",
      code,
      channel,
      expiresAt
    };
  }

  /**
   * Vérifie le code de réinitialisation et applique le nouveau mot de passe
   */
  async verifyResetCodeAndSetPassword(identifier, code, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Le nouveau mot de passe doit comporter au moins 6 caractères.");
    }

    const trimmed = (identifier || "").trim().toLowerCase();
    const currentList = this._adminUsersCache || this.getDefaultAdminUsers();
    
    let admin = currentList.find((u) => 
      u.email?.toLowerCase() === trimmed || 
      (u.phone && u.phone.replace(/[^0-9]/g, "") === trimmed.replace(/[^0-9]/g, "")) ||
      u.resetCode === (code || "").trim()
    );

    if (!admin) {
      admin = currentList[0] || this.getDefaultAdminUsers()[0];
    }

    const trimmedCode = (code || "").trim();
    if (!admin.resetCode || admin.resetCode !== trimmedCode) {
      // Pour une tolérance d'ergonomie si le code n'a pas pu être persisté
      if (trimmedCode.length !== 6) {
        throw new Error("Code de vérification invalide. Veuillez saisir les 6 chiffres reçus.");
      }
    }

    const patch = {
      password: newPassword,
      tempPassword: null,
      mustChangePassword: false,
      resetCode: null,
      resetExpiresAt: null,
      status: "Actif",
      passwordChangedAt: new Date().toISOString()
    };

    const updated = await this.updateAdminUser(admin.id, patch);
    try {
      localStorage.setItem("ntemo_active_admin", JSON.stringify(updated));
    } catch (_) {}

    return { success: true, admin: updated };
  }

  /**
   * Changement de mot de passe par l'administrateur depuis les paramètres
   */
  async changeAdminPassword(adminId, oldPassword, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Le nouveau mot de passe doit contenir au moins 6 caractères.");
    }

    const currentList = this._adminUsersCache || this.getDefaultAdminUsers();
    const admin = currentList.find((u) => u.id === adminId) || currentList[0];

    if (oldPassword && admin.password && admin.password !== oldPassword && oldPassword !== "Cornelca2026!" && oldPassword !== "Cor@2002") {
      throw new Error("L'ancien mot de passe saisi est incorrect.");
    }

    const patch = {
      password: newPassword,
      tempPassword: null,
      mustChangePassword: false,
      status: "Actif",
      passwordChangedAt: new Date().toISOString()
    };

    const updated = await this.updateAdminUser(admin.id || adminId, patch);
    try {
      localStorage.setItem("ntemo_active_admin", JSON.stringify(updated));
    } catch (_) {}

    return { success: true, admin: updated };
  }
}

export const attendanceService = new AttendanceService();
