const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

/**
 * =========================================================================
 * 1. MODULE PRÉSENCES & BORNE KIOSK ANTI-FRAUDE
 * =========================================================================
 */

// Endpoint de pointage Kiosk (utilisé par la tablette à l'entrée)
app.post("/kiosk/punch", async (req, res) => {
  try {
    const { qrData, punchMode = "AUTO", deviceId = "KIOSK-MAIN" } = req.body;

    if (!qrData) {
      return res.status(400).json({ success: false, message: "Données QR Code manquantes." });
    }

    // Le QR Code scanné contient soit le matricule, soit le token sécurisé du badge
    let employee = null;
    let badgeDoc = null;

    // 1. Recherche par token de badge
    const badgeSnapshot = await db.collection("badges")
      .where("security_token", "==", qrData.trim())
      .where("status", "==", "ACTIVE")
      .limit(1)
      .get();

    if (!badgeSnapshot.empty) {
      badgeDoc = badgeSnapshot.docs[0];
      const employeeId = badgeDoc.data().employee_id;
      const empSnap = await db.collection("employees").doc(employeeId).get();
      if (empSnap.exists) {
        employee = { id: empSnap.id, ...empSnap.data() };
      }
    } else {
      // 2. Recherche directe par matricule ou identifiant employé
      const empSnapshot = await db.collection("employees")
        .where("matricule", "==", qrData.trim())
        .limit(1)
        .get();

      if (!empSnapshot.empty) {
        employee = { id: empSnapshot.docs[0].id, ...empSnapshot.docs[0].data() };
      }
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Badge non reconnu ou désactivé. Veuillez contacter les RH.",
      });
    }

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    // Recherche de la fiche de présence du jour
    const attendanceRef = db.collection("attendances").doc(`${employee.id}_${todayStr}`);
    const attendanceDoc = await attendanceRef.get();

    let eventType = "IN"; // Par défaut ENTRÉE
    let workedMinutes = 0;
    let workedDurationStr = null;
    let isLate = false;
    let lateMinutes = 0;

    if (attendanceDoc.exists) {
      const data = attendanceDoc.data();
      const events = data.events || [];

      // Anti-rebond : Empêcher un double scan dans les 60 secondes
      if (events.length > 0) {
        const lastEvent = events[events.length - 1];
        const lastTime = new Date(lastEvent.timestamp.toDate ? lastEvent.timestamp.toDate() : lastEvent.timestamp);
        const diffSeconds = (now - lastTime) / 1000;
        if (diffSeconds < 60) {
          return res.status(429).json({
            success: false,
            message: `Pointage déjà validé il y a ${Math.round(diffSeconds)}s. Veuillez patienter un instant.`,
          });
        }
      }

      // Détermination du sens (ENTRÉE ou SORTIE)
      if (punchMode === "AUTO") {
        const lastType = events.length > 0 ? events[events.length - 1].type : "OUT";
        eventType = lastType === "IN" ? "OUT" : "IN";
      } else {
        eventType = punchMode;
      }

      // Mise à jour de l'événement
      const newEvent = {
        type: eventType,
        timestamp: admin.firestore.Timestamp.fromDate(now),
        time_str: timeStr,
        device_id: deviceId,
      };

      events.push(newEvent);

      const updatePayload = {
        events: events,
        last_updated: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (eventType === "OUT") {
        updatePayload.last_check_out = timeStr;
        updatePayload.last_check_out_time = admin.firestore.Timestamp.fromDate(now);

        // Calcul du temps cumulé
        if (data.first_check_in_time) {
          const inTime = data.first_check_in_time.toDate();
          workedMinutes = Math.max(0, Math.round((now - inTime) / 60000));
          const hours = Math.floor(workedMinutes / 60);
          const mins = workedMinutes % 60;
          workedDurationStr = `${hours}h ${mins < 10 ? "0" : ""}${mins}min`;
          updatePayload.worked_minutes = workedMinutes;
          updatePayload.worked_duration_str = workedDurationStr;
        }
      }

      await attendanceRef.update(updatePayload);

    } else {
      // Premier pointage de la journée -> Toujours ENTRÉE
      eventType = "IN";

      // Calcul du retard (ex: début de journée prévu à 08:30)
      const expectedHour = 8;
      const expectedMinute = 30;
      const arrivalHour = now.getHours();
      const arrivalMinute = now.getMinutes();

      if (arrivalHour > expectedHour || (arrivalHour === expectedHour && arrivalMinute > expectedMinute)) {
        isLate = true;
        lateMinutes = (arrivalHour - expectedHour) * 60 + (arrivalMinute - expectedMinute);
      }

      const initialRecord = {
        id: `${employee.id}_${todayStr}`,
        employee_id: employee.id,
        employee_name: `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || employee.full_name,
        matricule: employee.matricule,
        department: employee.department || "Général",
        date: todayStr,
        first_check_in: timeStr,
        first_check_in_time: admin.firestore.Timestamp.fromDate(now),
        last_check_out: null,
        status: isLate ? "LATE" : "PRESENT",
        is_late: isLate,
        late_minutes: lateMinutes,
        worked_minutes: 0,
        events: [
          {
            type: "IN",
            timestamp: admin.firestore.Timestamp.fromDate(now),
            time_str: timeStr,
            device_id: deviceId,
          },
        ],
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      await attendanceRef.set(initialRecord);
    }

    // Envoi de la notification Push immédiate (FCM) si l'employé a un token
    if (employee.fcm_token) {
      try {
        const notifTitle = eventType === "IN" ? "✅ Arrivée Enregistrée" : "👋 Départ Enregistré";
        const notifBody = eventType === "IN"
          ? `Bonjour ${employee.first_name || ""}, votre arrivée au bureau a été validée à ${timeStr}.`
          : `Au revoir ${employee.first_name || ""}, votre départ a été enregistré à ${timeStr}.${workedDurationStr ? " Total travaillé : " + workedDurationStr : ""}`;

        await admin.messaging().send({
          token: employee.fcm_token,
          notification: {
            title: notifTitle,
            body: notifBody,
          },
          data: {
            type: "ATTENDANCE_CONFIRMATION",
            eventType: eventType,
            time: timeStr,
          },
        });
      } catch (err) {
        console.warn("Notification push non délivrée (token expiré ou absent):", err.message);
      }
    }

    return res.json({
      success: true,
      message: eventType === "IN" ? "Arrivée enregistrée avec succès !" : "Départ enregistré avec succès !",
      data: {
        eventType,
        time: timeStr,
        date: todayStr,
        workedDuration: workedDurationStr,
        employee: {
          id: employee.id,
          matricule: employee.matricule,
          name: `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || employee.full_name,
          position: employee.position || "Collaborateur",
          department: employee.department || "Général",
          photo_url: employee.photo_url || null,
        },
      },
    });

  } catch (error) {
    console.error("Erreur punch Kiosk:", error);
    return res.status(500).json({
      success: false,
      message: "Une erreur interne est survenue lors du pointage.",
      error: error.message,
    });
  }
});

/**
 * =========================================================================
 * 2. MODULE MOTEUR DOCUMENTAIRE (DOCX, XLSX, PDF)
 * =========================================================================
 */
app.post("/documents/generate", async (req, res) => {
  try {
    const { templateType, employeeId, variables = {} } = req.body;

    if (!templateType || !employeeId) {
      return res.status(400).json({ success: false, message: "Type de document ou employé manquant." });
    }

    const empDoc = await db.collection("employees").doc(employeeId).get();
    if (!empDoc.exists) {
      return res.status(404).json({ success: false, message: "Employé introuvable." });
    }

    const emp = empDoc.data();
    const docData = {
      NOM: emp.last_name || "",
      PRENOM: emp.first_name || "",
      MATRICULE: emp.matricule || "",
      POSTE: emp.position || "",
      DEPARTEMENT: emp.department || "",
      DATE_EMBAUCHE: emp.hire_date || "",
      DATE_DU_JOUR: new Date().toLocaleDateString("fr-FR"),
      ...variables,
    };

    // Enregistrement de la génération
    const docRef = await db.collection("generated_documents").add({
      employee_id: employeeId,
      template_type: templateType,
      variables: docData,
      status: "GENERATED",
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      message: "Document généré avec succès.",
      document_id: docRef.id,
      preview_data: docData,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * =========================================================================
 * 3. MODULE ASSISTANT IA NTEMO (RÉDACTION DE COURRIERS ET SYNTHÈSES)
 * =========================================================================
 */
app.post("/ai/draft", async (req, res) => {
  const { prompt, documentType = "ATTESTATION" } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ success: false, message: "Invite de prompt manquante." });
  }

  // Modèle de réponse IA structurée
  const draftContent = `[NTEMO ONE - ASSISTANT IA RH]
Objet : ${documentType}

Monsieur/Madame,
Faisant suite à votre demande, nous vous confirmons par la présente les éléments convenus relatifs à votre mission au sein de NTEMO.

Informations complémentaires générées :
${prompt}

Fait pour servir et valoir ce que de droit.
La Direction des Ressources Humaines.`;

  return res.json({
    success: true,
    draft: draftContent,
    generated_at: new Date().toISOString(),
  });
});

exports.api = functions.https.onRequest(app);

