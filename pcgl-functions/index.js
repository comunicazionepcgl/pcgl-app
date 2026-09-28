/**
 * PCGL Cloud Functions - Server Side Logic
 * Gestione Iscrizioni, Notifiche e Sentinel System
 * Versione V2 (Cloud Functions 2nd Gen)
 */

const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const crypto = require("crypto");
const cors = require("cors")({ origin: true });

// Inizializzazione Admin
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Configurazione Globale V2
// I token sono nei Secrets di Firebase (firebase functions:secrets:set NOME) e arrivano come process.env.NOME
setGlobalOptions({
    region: "europe-west1", maxInstances: 10, timeoutSeconds: 60, memory: "512MiB",
    secrets: [
        defineSecret("MOODLE_TOKEN"),
        defineSecret("MOODLE_ADMIN_TOKEN"),
        defineSecret("TELEGRAM_BOT_TOKEN"),
        defineSecret("TELEGRAM_SECRET_TOKEN")
    ]
});

const LOGO_URL = "https://pcgl-volontari.web.app/logo.png?v=3";

// --- CONFIGURAZIONE TELEGRAM ---
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || "@gruppolucano";
const TELEGRAM_SECRET_TOKEN = process.env.TELEGRAM_SECRET_TOKEN;

async function sendTelegramMessage(chatId, text, replyMarkup = null) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    logger.info(`Inviando messaggio a ${chatId}: ${text}`);
    
    const payload = { 
        chat_id: chatId, 
        text: text, 
        parse_mode: 'HTML',
        disable_web_page_preview: false,
    };
    
    if (replyMarkup) {
        payload.reply_markup = replyMarkup;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    logger.info("Risposta da Telegram:", result);
    if (!result.ok) {
        throw new Error(result.description || "Errore sconosciuto da Telegram");
    }
    return result;
}

/**
 * TRIGGER: Nuova Iscrizione Volontario
 * Si attiva quando viene creato un documento nella collezione 'users'.
 */
exports.onVolunteerSignup = onDocumentCreated("users/{userId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const userData = snapshot.data();
    const userId = event.params.userId;
    const displayName = `${userData.nome} ${userData.cognome}`;

    logger.info(`Nuova iscrizione rilevata: ${displayName} (${userId})`);

    try {
        // 1. Log di Sistema
        await admin.firestore().collection('logs').add({
            azione: "NUOVA ISCRIZIONE",
            dettagli: `Richiesta iscrizione da ${displayName} per la sede ${userData.sede}.`,
            autore: "SISTEMA",
            data: new Date().toISOString(),
            targetUid: userId
        });

        // 2. Notifica a Presidente e Coordinamento
        const staffSnapshot = await admin.firestore().collection('users')
            .where('sede', '==', userData.sede)
            .where('ruolo', 'in', ['presidente', 'coordinamento'])
            .get();
        
        const staffTokens = staffSnapshot.docs
            .map(doc => doc.data().fcmToken)
            .filter(token => token);

        if (staffTokens.length > 0) {
            await admin.messaging().sendEachForMulticast({
                notification: {
                    title: "Nuova Iscrizione",
                    body: `${displayName} richiede approvazione in ${userData.sede}.`,
                    image: LOGO_URL
                },
                data: {
                    type: 'iscrizione',
                    title: "Nuova Iscrizione"
                },
                tokens: staffTokens
            });
        }

        // 3. Notifica di Benvenuto
        if (userData.fcmToken) {
            await admin.messaging().send({
                notification: {
                    title: "Benvenuto in PCGL!",
                    body: "La tua richiesta è stata ricevuta ed è in fase di approvazione dal Presidente.",
                    image: LOGO_URL
                },
                token: userData.fcmToken
            });
        }
    } catch (error) {
        logger.error("Errore durante onVolunteerSignup:", error);
    }
});

/**
 * ONCALL: Proxy sicuro per le API di Moodle (Corsi e Iscrizioni Utente)
 */
exports.getMoodleCoursesForUser = onCall({ region: "europe-west1", cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorizzato.');
    const email = request.auth.token.email;
    const MOODLE_URL = "https://formazione.pcgl.it";
    const TOKEN = process.env.MOODLE_TOKEN;
    
    try {
        const coursesRes = await fetch(`${MOODLE_URL}/webservice/rest/server.php?wstoken=${TOKEN}&wsfunction=core_course_get_courses&moodlewsrestformat=json`);
        const allCourses = await coursesRes.json();
        if (allCourses.exception) throw new Error(allCourses.message);
        
        const activeCourses = allCourses.filter(c => c.visible === 1 && c.id !== 1);
        
        let enrolledIds = [];
        let moodleUserFound = false;
        const userRes = await fetch(`${MOODLE_URL}/webservice/rest/server.php?wstoken=${TOKEN}&wsfunction=core_user_get_users_by_field&field=email&values[0]=${encodeURIComponent(email)}&moodlewsrestformat=json`);
        const userData = await userRes.json();
        
        if (Array.isArray(userData) && userData.length > 0) {
            moodleUserFound = true;
            const moodleUserId = userData[0].id;
            const enrolRes = await fetch(`${MOODLE_URL}/webservice/rest/server.php?wstoken=${TOKEN}&wsfunction=core_enrol_get_users_courses&userid=${moodleUserId}&moodlewsrestformat=json`);
            const enrolData = await enrolRes.json();
            if (Array.isArray(enrolData)) { enrolledIds = enrolData.map(c => c.id); }
        }
        
        return { success: true, courses: activeCourses, enrolledIds, moodleUserFound };
    } catch (error) { throw new HttpsError('internal', error.message); }
});

/**
 * ONCALL: Proxy sicuro per le API di Moodle (Report Iscritti Admin)
 */
exports.getMoodleCourseReport = onCall({ region: "europe-west1", cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorizzato.');
    const callerDoc = await admin.firestore().collection('users').doc(request.auth.uid).get();
    if (!['admin', 'superadmin', 'coordinamento'].includes(callerDoc.data().ruolo)) {
        throw new HttpsError('permission-denied', 'Permessi insufficienti.');
    }
    const { courseId } = request.data;
    const MOODLE_URL = "https://formazione.pcgl.it";
    const ADMIN_TOKEN = process.env.MOODLE_ADMIN_TOKEN;
    try {
        const res = await fetch(`${MOODLE_URL}/webservice/rest/server.php?wstoken=${ADMIN_TOKEN}&wsfunction=core_enrol_get_enrolled_users&courseid=${courseId}&moodlewsrestformat=json`);
        const data = await res.json();
        if (data.exception) throw new Error(data.message);
        return { success: true, users: data };
    } catch (error) { throw new HttpsError('internal', error.message); }
});

/**
 * TRIGGER: Approvazione Volontario
 */
exports.onVolunteerApproved = onDocumentUpdated("users/{userId}", async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    if (before.stato === 'pendente' && after.stato === 'attivo') {
        logger.info(`Utente approvato: ${after.nome} ${after.cognome}`);
        
        let moodlePassword = "";
        
        // --- 1. SINCRONIZZAZIONE AUTOMATICA CON MOODLE ---
        if (after.email && after.cf) {
            try {
                const MOODLE_URL = "https://formazione.pcgl.it";
                const MOODLE_TOKEN = process.env.MOODLE_TOKEN;
                
                const safeCf = after.cf && after.cf !== 'N/D' ? after.cf : '0000000000000000';
                moodlePassword = `Pcgl_${safeCf}!`;
                
                const baseParams = new URLSearchParams();
                baseParams.append('users[0][username]', after.email.toLowerCase().trim());
                baseParams.append('users[0][password]', moodlePassword);
                baseParams.append('users[0][firstname]', (after.nome || 'Volontario').trim());
                baseParams.append('users[0][lastname]', (after.cognome || 'PCGL').trim());
                baseParams.append('users[0][email]', after.email.toLowerCase().trim());
                if (after.cf && after.cf !== 'N/D') {
                    baseParams.append('users[0][idnumber]', after.cf.toUpperCase().trim());
                }
                if (after.sede) baseParams.append('users[0][department]', after.sede);
                baseParams.append('users[0][city]', (after.citta || 'Potenza').substring(0, 120));
                if (after.telefono) baseParams.append('users[0][phone1]', after.telefono.replace(/\s+/g, '').substring(0, 20));
                
                const paramsWithCustom = new URLSearchParams(baseParams.toString());

                let cfIdx = 0;
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][type]`, 'appartenenza');
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][value]`, 'Gruppo Lucano');
                cfIdx++;
                
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][type]`, 'cf');
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][value]`, after.cf || 'N/D');
                cfIdx++;
                
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][type]`, 'luogo');
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][value]`, after.luogoNascita || 'N/D');
                cfIdx++;
                
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][type]`, 'datanascita');
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][value]`, after.dataNascita || '01/01/1970');
                cfIdx++;
                
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][type]`, 'indirizzoemail');
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][value]`, after.email.toLowerCase().trim());
                cfIdx++;
                
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][type]`, 'cellulare');
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][value]`, (after.telefono || '0000000000').replace(/\s+/g, '').substring(0, 20));
                cfIdx++;

                const endpoint = `${MOODLE_URL}/webservice/rest/server.php?wstoken=${MOODLE_TOKEN}&wsfunction=core_user_create_users&moodlewsrestformat=json`;
                
                let res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: paramsWithCustom.toString()
                });
                
                let data = await res.json();
                
                if (data && data.exception === 'core\\exception\\invalid_parameter_exception') {
                    logger.warn("Creazione Moodle fallita con custom fields. Ritento in modalità sicura (dati base)...");
                    res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: baseParams.toString() });
                    data = await res.json();
                }

                if (data && data.exception) {
                    logger.warn("Avviso Moodle (probabilmente l'utente esiste già):", data.message);
                } else {
                    logger.info(`Account Moodle creato per ${after.email}`);
                }
            } catch (err) { logger.error("Errore sincronizzazione Moodle:", err); }
        }

        // --- 2. NOTIFICA DI BENVENUTO ---
        if (after.fcmToken) {
            try {
                await admin.messaging().send({
                    notification: {
                        title: "Iscrizione Approvata! 🎉",
                        body: `Benvenuto nel team! Il tuo account è ora attivo. La tua password per i corsi E-Learning è: ${moodlePassword}`,
                        image: LOGO_URL
                    },
                    token: after.fcmToken
                });
            } catch (error) {
                logger.error("Errore invio notifica approvazione:", error);
            }
        }
    }
});

/**
 * TRIGGER: Nuova Allerta
 */
exports.onAlertCreated = onDocumentCreated("attivazioni/{alertId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const alertData = snapshot.data();
    const alertId = event.params.alertId;

    try {
        let creatorRole = 'presidente';
        if (alertData.creatorUid) {
            const creatorDoc = await admin.firestore().collection('users').doc(alertData.creatorUid).get();
            if (creatorDoc.exists) {
                creatorRole = creatorDoc.data().ruolo;
            }
        }

        const isCoordinamento = ['admin', 'superadmin', 'coordinamento'].includes(creatorRole);
        const targetZones = Array.isArray(alertData.zone) ? alertData.zone : [alertData.zone];
        const color = alertData.colore ? alertData.colore.toLowerCase() : 'gialla';
        const isHighSeverity = ['arancione', 'rossa'].includes(color);
        const colorEmojis = { 'gialla': '🟡', 'arancione': '🟠', 'rossa': '🔴', 'verde': '🟢' };
        const emoji = colorEmojis[color] || '⚠️';

        if (!isCoordinamento) {
            await admin.firestore().collection('logs').add({
                azione: "ALLERTA_LOCALE",
                dettagli: `Il Presidente di ${targetZones[0]} ha attivato: ${alertData.titolo}`,
                autore: alertData.attivatoDa || "Presidente",
                data: new Date().toISOString(),
                alertId: alertId
            });
        }

        const usersSnapshot = await admin.firestore().collection('users').where('stato', '==', 'attivo').get();
        const targetTokens = [];

        usersSnapshot.forEach(doc => {
            const user = doc.data();
            if (!user.fcmToken) return;

            const isInZone = targetZones.includes(user.sede);
            const isLocalStaff = ['volontario', 'presidente', 'coordinamento'].includes(user.ruolo);
            const isGlobalStaff = ['admin', 'superadmin', 'coordinamento'].includes(user.ruolo);
            
            let shouldNotify = false;
            if (isInZone && isLocalStaff) shouldNotify = true;
            if (isHighSeverity && isGlobalStaff) shouldNotify = true;

            if (shouldNotify) targetTokens.push(user.fcmToken);
        });

        const uniqueTokens = [...new Set(targetTokens)];
        if (uniqueTokens.length > 0) {
            await admin.messaging().sendEachForMulticast({
                notification: {
                    title: `${emoji} ALLERTA ${color.toUpperCase()}`,
                    body: `${alertData.titolo} (${targetZones.join(', ')})`,
                    image: LOGO_URL
                },
                data: {
                    alertId: alertId,
                    type: 'attivazione',
                    color: color
                },
                android: {
                    notification: {
                        channelId: 'alert-pcgl',
                        sound: 'default',
                        vibrateTimingsMillis: [500, 200, 500, 200, 500],
                        priority: 'high',
                        defaultVibrateTimings: false
                    }
                },
                apns: {
                    payload: { aps: { sound: 'default' } }
                },
                tokens: uniqueTokens
            });
        }

        // Invia al Canale Telegram
        const alertTime = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(alertData.dataAttivazione));
        const escapeHtml = (text) => (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const channelText = `🚨 <b>ALLERTA ${color.toUpperCase()}</b>\n\n<b>${escapeHtml(alertData.titolo)}</b>\n⏰ Attivazione: ${alertTime}\n📍 Zone interessate: ${escapeHtml(targetZones.join(', '))}\n${alertData.dettagli ? '\n📝 Dettagli: ' + escapeHtml(alertData.dettagli) : ''}`;
        
        const replyMarkup = { inline_keyboard: [[{ text: "🚨 Apri l'App per Dettagli", url: "https://pcgl-volontari.web.app/" }]] };
        await sendTelegramMessage(TELEGRAM_CHANNEL_ID, channelText, replyMarkup);
    } catch (error) {
        logger.error("Errore onAlertCreated:", error);
    }
});

/**
 * SENTINEL INTEGRATION: Broadcast Alert
 */
exports.broadcastAlert = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Devi essere autenticato.');
    }

    const callerUid = request.auth.uid;
    const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
    const callerData = callerDoc.data();

    if (!['admin', 'superadmin', 'coordinamento'].includes(callerData.ruolo)) {
        throw new HttpsError('permission-denied', 'Non hai i permessi.');
    }

    const { title, body } = request.data;
    
    try {
        const usersSnapshot = await admin.firestore().collection('users').where('stato', '==', 'attivo').get();
        const tokens = usersSnapshot.docs.map(doc => doc.data().fcmToken).filter(token => token);
        const uniqueTokens = [...new Set(tokens)];

        if (uniqueTokens.length === 0) return { success: true, count: 0 };

        const response = await admin.messaging().sendEachForMulticast({
            notification: {
                title: title || "⚠️ EMERGENZA GENERALE",
                body: body || "Attivazione protocollo Sentinel. Controllare l'app.",
                image: LOGO_URL
            },
            tokens: uniqueTokens
        });

        return { success: true, count: response.successCount, failures: response.failureCount };
    } catch (error) {
        logger.error("Errore broadcastAlert:", error);
        throw new HttpsError('internal', 'Errore invio broadcast.');
    }
});

/**
 * CRON JOB: Archiviazione Automatica News
 */
exports.archiveOldNews = onSchedule({ schedule: "every day 04:00", timeZone: "Europe/Rome" }, async (event) => {
    const now = new Date();

    try {
        const oldNewsSnapshot = await admin.firestore().collection('news')
            .where('archived', '!=', true)
            .get();

        const batch = admin.firestore().batch();
        let count = 0;

        oldNewsSnapshot.forEach(doc => {
            const newsData = doc.data();
            let expirationDate;
            if (newsData.dataScadenza) {
                expirationDate = new Date(newsData.dataScadenza);
            } else {
                const publishDate = new Date(newsData.data);
                expirationDate = new Date(publishDate.getTime() + 30 * 24 * 60 * 60 * 1000);
            }

            if (now > expirationDate) {
                batch.update(doc.ref, { archived: true });
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
            logger.info(`Archiviate automaticamente ${count} news vecchie.`);
        }
    } catch (error) {
        logger.error("Errore durante archiveOldNews:", error);
    }
});

/**
 * PROFILO PUBBLICO: users_public/{uid} contiene solo i dati che servono agli altri volontari
 * (nome, sede, foto, moduli...). Codice fiscale, contatti, indirizzo, gruppo sanguigno ecc.
 * restano solo in users/{uid}, leggibile dall'interessato e dai responsabili.
 */
const PUBLIC_PROFILE_FIELDS = ['nome', 'cognome', 'sede', 'ruolo', 'stato', 'fotoProfilo', 'moduli', 'specializzazioni'];

function buildPublicProfile(data) {
    const pub = {};
    PUBLIC_PROFILE_FIELDS.forEach(f => { if (data[f] !== undefined) pub[f] = data[f]; });
    return pub;
}

function sameProfile(a, b) {
    return JSON.stringify(a || {}) === JSON.stringify(b || {});
}

exports.syncPublicProfile = onDocumentWritten("users/{uid}", async (event) => {
    const ref = admin.firestore().collection('users_public').doc(event.params.uid);
    const after = event.data.after;
    if (!after.exists) {
        await ref.delete();
        return;
    }
    const pub = buildPublicProfile(after.data());
    const before = event.data.before.exists ? buildPublicProfile(event.data.before.data()) : null;
    // Evita scritture inutili quando cambiano solo campi privati (es. fcmToken, ultimoAccesso)
    if (before && sameProfile(before, pub)) return;
    await ref.set(pub);
});

/**
 * ONCALL: Verifica socio (QR del tesserino, link o ricerca per N. tessera / codice fiscale).
 * Consentita a presidenti e staff anche per volontari di altre sedi, ma restituisce solo i dati
 * del tesserino; il codice fiscale solo al coordinamento o al presidente della stessa sede.
 * Ogni verifica viene registrata nei log.
 */
exports.verifyVolunteer = onCall({ region: "europe-west1", cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Devi essere autenticato.');
    const db = admin.firestore();
    const callerSnap = await db.collection('users').doc(request.auth.uid).get();
    const caller = callerSnap.exists ? callerSnap.data() : {};
    if (!['presidente', 'coordinamento', 'admin', 'superadmin'].includes(caller.ruolo)) {
        throw new HttpsError('permission-denied', 'Solo presidenti e staff possono verificare i soci.');
    }

    const { uid, term } = request.data || {};
    let snap = null;
    if (uid) {
        const d = await db.collection('users').doc(String(uid)).get();
        if (d.exists) snap = d;
    } else if (term) {
        const t = String(term).trim();
        let q = await db.collection('users').where('numeroTessera', '==', t).limit(1).get();
        if (q.empty) q = await db.collection('users').where('cf', '==', t.toUpperCase()).limit(1).get();
        if (!q.empty) snap = q.docs[0];
    } else {
        throw new HttpsError('invalid-argument', 'Indica un volontario da verificare.');
    }
    if (!snap) return { found: false };

    const u = snap.data();
    const card = {
        id: snap.id,
        nome: u.nome || '', cognome: u.cognome || '', sede: u.sede || '',
        stato: u.stato || '', ruolo: u.ruolo || '', fotoProfilo: u.fotoProfilo || '',
        numeroTessera: u.numeroTessera || '', specializzazioni: u.specializzazioni || []
    };
    const datiCompleti = caller.ruolo !== 'presidente' || caller.sede === u.sede;
    if (datiCompleti) card.cf = u.cf || '';

    await db.collection('logs').add({
        azione: "VERIFICA SOCIO",
        dettagli: `Verificato ${card.nome} ${card.cognome} (${card.sede})${datiCompleti ? '' : ' - dati ridotti, altra sede'}`,
        autore: `${caller.nome || ''} ${caller.cognome || ''}`.trim() || request.auth.uid,
        autoreUid: request.auth.uid,
        data: new Date().toISOString(),
        targetUid: snap.id
    });

    return { found: true, volunteer: card };
});

/**
 * CRON JOB: riallinea tutti i profili pubblici (rete di sicurezza + popolamento iniziale).
 * Scrive solo i profili cambiati e rimuove quelli di utenti non più esistenti.
 */
exports.resyncPublicProfiles = onSchedule({ schedule: "every day 03:30", timeZone: "Europe/Rome", memory: "1GiB", timeoutSeconds: 540 }, async () => {
    const db = admin.firestore();
    try {
        const [usersSnap, publicSnap] = await Promise.all([db.collection('users').get(), db.collection('users_public').get()]);
        const existing = new Map(publicSnap.docs.map(d => [d.id, d.data()]));
        let writer = db.batch(), pending = 0, scritti = 0, rimossi = 0;
        const flush = async () => { if (pending) { await writer.commit(); writer = db.batch(); pending = 0; } };

        for (const u of usersSnap.docs) {
            const pub = buildPublicProfile(u.data());
            if (!sameProfile(existing.get(u.id), pub)) {
                writer.set(db.collection('users_public').doc(u.id), pub);
                pending++; scritti++;
                if (pending >= 400) await flush();
            }
            existing.delete(u.id);
        }
        for (const orphanId of existing.keys()) {
            writer.delete(db.collection('users_public').doc(orphanId));
            pending++; rimossi++;
            if (pending >= 400) await flush();
        }
        await flush();
        logger.info(`Profili pubblici: ${usersSnap.size} utenti, ${scritti} aggiornati, ${rimossi} rimossi.`);
    } catch (error) {
        logger.error("Errore durante resyncPublicProfiles:", error);
    }
});

/**
 * CRON JOB: Classifica volontari (Top 10) per la pagina Statistiche.
 * Calcolata qui ogni 6 ore e salvata in un solo documento, così l'app legge 1 documento
 * invece dell'intera anagrafica a ogni apertura della pagina.
 * Punteggio: 10 punti per corso nel fascicolo, 50 per squadra/modulo d'appartenenza.
 */
exports.updateLeaderboard = onSchedule({ schedule: "every 6 hours", timeZone: "Europe/Rome", memory: "1GiB", timeoutSeconds: 300 }, async (event) => {
    try {
        const snap = await admin.firestore().collection('users')
            .where('stato', '==', 'attivo')
            .select('nome', 'cognome', 'sede', 'fascicoloCorsi', 'moduli')
            .get();

        const top = snap.docs.map(d => {
            const u = d.data();
            const corsi = Array.isArray(u.fascicoloCorsi) ? u.fascicoloCorsi.length : 0;
            const badge = Array.isArray(u.moduli) ? u.moduli.length : 0;
            return { id: d.id, nome: u.nome || '', cognome: u.cognome || '', sede: u.sede || '', corsi, badge, punti: corsi * 10 + badge * 50 };
        }).sort((a, b) => b.punti - a.punti).slice(0, 10);

        await admin.firestore().collection('statistiche').doc('classifica').set({
            top,
            volontariConsiderati: snap.size,
            aggiornatoIl: new Date().toISOString()
        });
        logger.info(`Classifica aggiornata su ${snap.size} volontari attivi.`);
    } catch (error) {
        logger.error("Errore durante updateLeaderboard:", error);
    }
});

/**
 * TRIGGER: Nuova News Importante
 */
exports.onNewsCreated = onDocumentCreated("news/{newsId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const newsData = snapshot.data();
    if (!newsData) return;

    try {
        // 1. Notifica Push FCM (Solo se importante)
        if (newsData.importante) {
            const usersSnapshot = await admin.firestore().collection('users').where('stato', '==', 'attivo').get();
            const tokens = usersSnapshot.docs.map(doc => doc.data().fcmToken).filter(token => token);
            const uniqueTokens = [...new Set(tokens)];

            if (uniqueTokens.length > 0) {
                await admin.messaging().sendEachForMulticast({
                    notification: {
                        title: "⚠️ AVVISO IMPORTANTE",
                        body: newsData.titolo,
                        image: LOGO_URL
                    },
                    data: {
                        newsId: event.params.newsId,
                        type: 'news'
                    },
                    tokens: uniqueTokens
                });
            }
        }

        // 2. Integrazione Bot Telegram
        const escapeHtml = (text) => (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const testoMessaggio = newsData.testoBreve || newsData.contenuto || newsData.testo || "";
        const channelText = `📰 <b>${escapeHtml(newsData.titolo)}</b>\n\n${escapeHtml(testoMessaggio)}`;

        const isPubblica = newsData.visibilita === 'pubblica';
        const isRiservataTutti = newsData.visibilita === 'riservata' && (!newsData.targetRuolo || newsData.targetRuolo === 'tutti') && (!newsData.targetSede || newsData.targetSede === 'tutte');
        const replyMarkup = { inline_keyboard: [[{ text: "📰 Leggi la News sull'App", url: "https://pcgl-volontari.web.app/" }]] };

        if (newsData.inviaTelegram !== false) {
            if (isPubblica || isRiservataTutti) {
                try {
                    await sendTelegramMessage(TELEGRAM_CHANNEL_ID, channelText, replyMarkup);
                } catch (e) {
                    logger.error("Errore invio News al Canale Telegram:", e);
                }
            }
            
            if (newsData.visibilita === 'riservata' && !isRiservataTutti) {
                try {
                    const usersSnap = await admin.firestore().collection('users').where('telegramChatId', '!=', null).get();
                    const promises = [];
                    usersSnap.forEach(doc => {
                        const user = doc.data();
                        const roleMatch = !newsData.targetRuolo || newsData.targetRuolo === 'tutti' || newsData.targetRuolo === user.ruolo;
                        const sedeMatch = !newsData.targetSede || newsData.targetSede === 'tutte' || newsData.targetSede === user.sede;
                        
                        if (roleMatch && sedeMatch && user.telegramChatId) {
                            promises.push(sendTelegramMessage(user.telegramChatId, channelText, replyMarkup).catch(() => {}));
                        }
                    });
                    await Promise.all(promises);
                } catch (e) {
                    logger.error("Errore invio News a Chat Private Telegram:", e);
                }
            }
        }
    } catch (error) {
        logger.error("Errore onNewsCreated:", error);
    }
});

/**
 * TRIGGER: Nuova Richiesta Accesso Modulo
 * Notifica il coordinatore del modulo quando c'è una nuova richiesta.
 */
exports.onModuleRequest = onDocumentUpdated("moduli/{moduloId}", async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    
    // Verifica se è stata aggiunta una nuova richiesta
    const oldRequests = before.richieste || [];
    const newRequests = after.richieste || [];
    
    if (newRequests.length > oldRequests.length) {
        const newRequesterUid = newRequests.find(uid => !oldRequests.includes(uid));
        if (!newRequesterUid) return;

        try {
            // Recupera dati richiedente
            const userDoc = await admin.firestore().collection('users').doc(newRequesterUid).get();
            const userData = userDoc.data();
            
            // Recupera token responsabile modulo
            if (after.adminId) {
                const adminDoc = await admin.firestore().collection('users').doc(after.adminId).get();
                const adminData = adminDoc.data();
                
                if (adminData.fcmToken) {
                    await admin.messaging().send({
                        notification: {
                            title: "Nuova Richiesta Modulo",
                            body: `${userData.nome} ${userData.cognome} chiede di entrare in ${after.nome}`,
                            image: LOGO_URL
                        },
                        token: adminData.fcmToken
                    });
                }
            }
        } catch (error) {
            logger.error("Errore notifica richiesta modulo:", error);
        }
    }
});

/**
 * TRIGGER: Gestione Approvazione Richiesta Modulo
 * Quando una richiesta passa a 'approvata', aggiunge l'utente al modulo
 * e popola automaticamente le specializzazioni se previsto dalle risposte.
 */
exports.onModuleRequestUpdated = onDocumentUpdated("richieste_modulo/{requestId}", async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // Esegui solo se lo stato cambia in 'approvata'
    if (before.stato !== 'approvata' && after.stato === 'approvata') {
        const { moduloId, volontarioId, risposte, nomeModulo } = after;

        try {
            const batch = admin.firestore().batch();

            // 1. Aggiungi utente ai membri del modulo
            const moduleRef = admin.firestore().collection('moduli').doc(moduloId);
            batch.update(moduleRef, {
                membri: admin.firestore.FieldValue.arrayUnion(volontarioId)
            });

            // 2. Analizza risposte per aggiornare il fascicolo (Specializzazioni)
            const newSpecs = [];
            if (risposte && Array.isArray(risposte)) {
                risposte.forEach(r => {
                    // Se la risposta è affermativa (true o "si") e c'è un requisito collegato
                    if ((r.risposta === true || r.risposta === 'si') && r.requisitoAssociato) {
                        newSpecs.push(r.requisitoAssociato);
                    }
                });
            }

            if (newSpecs.length > 0) {
                const userRef = admin.firestore().collection('users').doc(volontarioId);
                batch.update(userRef, {
                    specializzazioni: admin.firestore.FieldValue.arrayUnion(...newSpecs)
                });
                logger.info(`Aggiunte specializzazioni a ${volontarioId}:`, newSpecs);
            }

            // 3. Invia Notifica
            const userDoc = await admin.firestore().collection('users').doc(volontarioId).get();
            const fcmToken = userDoc.data()?.fcmToken;
            if (fcmToken) {
                await admin.messaging().send({
                    notification: {
                        title: "Candidatura Accettata! 🎉",
                        body: `Sei entrato ufficialmente nel modulo ${nomeModulo}.`,
                        image: LOGO_URL
                    },
                    token: fcmToken
                });
            }

            await batch.commit();
        } catch (error) {
            logger.error("Errore onModuleRequestUpdated:", error);
        }
    }
});

/**
 * ONREQUEST: Ricerca utenti in Auth senza un documento in Firestore (con CORS manuale).
 * Sostituisce la versione onCall per risolvere problemi di preflight.
 */
exports.reconcileOrphanedUsers = onRequest({ region: "europe-west1", timeoutSeconds: 60 }, async (request, response) => {
    // Wrapper Promise per CORS per gestire correttamente async/await
    try {
        await new Promise((resolve, reject) => {
            cors(request, response, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        const idToken = request.headers.authorization?.split('Bearer ')[1];
        if (!idToken) {
            response.status(401).json({ error: 'Unauthorized', details: 'Missing ID Token' });
            return;
        }

        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (e) {
            logger.error("Token verification failed", e);
            response.status(401).json({ error: 'Unauthorized', details: 'Invalid Token' });
            return;
        }

        const callerUid = decodedToken.uid;
        const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();

        if (!callerDoc.exists || callerDoc.data().ruolo !== 'superadmin') {
            response.status(403).json({ error: 'Permission-denied', details: 'User is not superadmin' });
            return;
        }

        logger.info(`Avvio riconciliazione utenti richiesta da ${callerUid}`);

        // 1. Recupera utenti Auth (max 1000)
        const listUsersResult = await admin.auth().listUsers(1000);
        const authUsers = listUsersResult.users;
        logger.info(`Recuperati ${authUsers.length} utenti da Auth.`);

        // 2. Recupera ID utenti Firestore (solo ID per risparmiare memoria)
        const firestoreUsersSnapshot = await admin.firestore().collection('users').select().get();
        const firestoreUserIds = new Set(firestoreUsersSnapshot.docs.map(doc => doc.id));
        logger.info(`Recuperati ${firestoreUserIds.size} utenti da Firestore.`);

        // 3. Trova orfani
        const orphaned = [];
        for (const user of authUsers) {
            if (!firestoreUserIds.has(user.uid)) {
                orphaned.push({ 
                    uid: user.uid, 
                    email: user.email, 
                    creationTime: user.metadata.creationTime 
                });
            }
        }

        logger.info(`Analisi completata. Trovati ${orphaned.length} orfani.`);

        response.status(200).json({ 
            count: orphaned.length, 
            orphans: orphaned 
        });

    } catch (error) {
        logger.error("Errore critico in reconcileOrphanedUsers:", error);
        if (!response.headersSent) {
            response.status(500).json({ error: 'Internal server error', details: error.message });
        }
    }
});

/**
 * ONREQUEST: Completa il profilo di un utente orfano (Server-Side).
 * Genera il tesserino e crea il documento utente con privilegi Admin.
 */
exports.completeOrphanProfile = onRequest({ region: "europe-west1", timeoutSeconds: 60 }, async (request, response) => {
    cors(request, response, async () => {
        try {
            // 1. Verifica Auth
            const idToken = request.headers.authorization?.split('Bearer ')[1];
            if (!idToken) { response.status(401).json({ error: 'Unauthorized' }); return; }
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const uid = decodedToken.uid;
            const data = request.body;

            // 1b. Codice fiscale già registrato? (controllo lato server: i client non possono più leggere i profili altrui)
            const cf = String(data.cf || '').trim().toUpperCase();
            if (cf.length !== 16) { response.status(400).json({ error: 'Codice Fiscale non valido' }); return; }
            const cfSnap = await admin.firestore().collection('users').where('cf', '==', cf).limit(2).get();
            if (cfSnap.docs.some(d => d.id !== uid)) {
                response.status(409).json({ error: 'Codice Fiscale già registrato' });
                return;
            }
            data.cf = cf;

            // 2. Generazione Tesserino (Transazione Atomica)
            const tesserino = await admin.firestore().runTransaction(async (t) => {
                const settingsRef = admin.firestore().collection("settings").doc("tesserini");
                const doc = await t.get(settingsRef);
                let newNumber = 1;
                if (doc.exists) {
                    newNumber = (doc.data().last_number || 0) + 1;
                }
                t.set(settingsRef, { last_number: newNumber }, { merge: true });
                const year = new Date().getFullYear();
                return `PCGL-${year}-${String(newNumber).padStart(4, '0')}`;
            });

            // 3. Creazione Profilo Utente
            const newUser = {
                uid: uid,
                email: decodedToken.email,
                nome: data.nome,
                cognome: data.cognome,
                dataNascita: data.dataNascita,
                luogoNascita: data.luogoNascita,
                cf: data.cf,
                sede: data.sede,
                ruolo: 'volontario',
                stato: 'pendente',
                numeroTessera: tesserino,
                fotoProfilo: '', specializzazioni: [], patenti: [], altreInfo: '', fascicoloCorsi: [],
                dataIscrizione: new Date().toISOString(),
                telefono: '', indirizzo: '', citta: '', cap: '', gruppoSanguigno: '',
                privacyAccepted: data.privacyAccepted || false,
                privacyConsentDate: data.privacyConsentDate || null
            };

            await admin.firestore().collection('users').doc(uid).set(newUser);

            // 4. Log di Sistema
            await admin.firestore().collection('logs').add({
                azione: "NUOVA ISCRIZIONE",
                dettagli: `Nuovo utente registrato: ${newUser.nome} ${newUser.cognome} (${newUser.sede})`,
                autore: "SISTEMA",
                data: new Date().toISOString(),
                targetUid: uid
            });

            // 5. Notifica Email al Presidente di Sede
            try {
                const presidentSnapshot = await admin.firestore().collection('users')
                    .where('sede', '==', newUser.sede)
                    .where('ruolo', '==', 'presidente')
                    .get();
                
                const presidentEmails = presidentSnapshot.docs.map(d => d.data().email).filter(e => e);

                if (presidentEmails.length > 0) {
                    await admin.firestore().collection('mail').add({
                        to: presidentEmails,
                        message: {
                            subject: `Nuova Iscrizione PCGL: ${newUser.nome} ${newUser.cognome}`,
                            html: `Nuova richiesta di iscrizione per la sede ${newUser.sede}.<br>Nome: ${newUser.nome} ${newUser.cognome}<br>CF: ${newUser.cf}<br>Accedi al gestionale per approvare.`
                        }
                    });
                }
            } catch (emailErr) {
                logger.error("Errore invio email presidente:", emailErr);
                // Non blocchiamo la risposta se l'email fallisce
            }

            logger.info(`Profilo orfano completato per ${uid} (${tesserino})`);
            response.status(200).json({ success: true });
        } catch (error) {
            logger.error("Errore completeOrphanProfile:", error);
            response.status(500).json({ error: error.message });
        }
    });
});

/**
 * ONREQUEST: Crea una richiesta di accesso a un modulo (Server-Side).
 * Aggira i permessi di scrittura su 'richieste_modulo' per i volontari.
 */
exports.createModuleRequest = onRequest({ region: "europe-west1" }, async (request, response) => {
    // Wrapper Promise per CORS
    try {
        await new Promise((resolve, reject) => {
            cors(request, response, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        const idToken = request.headers.authorization?.split('Bearer ')[1];
        if (!idToken) { response.status(401).json({ error: 'Unauthorized' }); return; }
        
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const data = request.body;

        // Recupera dati utente aggiornati
        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        const userData = userDoc.data();

        await admin.firestore().collection('richieste_modulo').add({
            moduloId: data.moduloId,
            nomeModulo: data.nomeModulo,
            volontarioId: uid,
            volontarioNome: `${userData.nome} ${userData.cognome}`,
            stato: 'in_attesa',
            dataRichiesta: new Date().toISOString(),
            risposte: data.risposte || []
        });

        logger.info(`Richiesta modulo creata per ${uid} -> ${data.nomeModulo}`);
        response.status(200).json({ success: true });
    } catch (error) {
        logger.error("Errore createModuleRequest:", error);
        response.status(500).json({ error: error.message });
    }
});

/**
 * ONREQUEST: Recupera le richieste modulo dell'utente (Server-Side).
 * Aggira i permessi di lettura su 'richieste_modulo'.
 */
exports.getUserModuleRequests = onRequest({ region: "europe-west1" }, async (request, response) => {
    cors(request, response, async () => {
        try {
            const idToken = request.headers.authorization?.split('Bearer ')[1];
            if (!idToken) { response.status(401).json({ error: 'Unauthorized' }); return; }
            
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const uid = decodedToken.uid;

            const snapshot = await admin.firestore().collection('richieste_modulo')
                .where('volontarioId', '==', uid)
                .get();

            const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            response.status(200).json(requests);
        } catch (error) {
            logger.error("Errore getUserModuleRequests:", error);
            response.status(500).json({ error: error.message });
        }
    });
});

/**
 * ONREQUEST: Invia notifica ai membri di un modulo
 */
exports.sendModuleNotification = onRequest({ region: "europe-west1" }, async (request, response) => {
    // Wrapper Promise per CORS
    try {
        await new Promise((resolve, reject) => {
            cors(request, response, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        const idToken = request.headers.authorization?.split('Bearer ')[1];
        if (!idToken) { response.status(401).json({ error: 'Unauthorized' }); return; }
        
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;
        
        const { moduleId, title, body } = request.body;
        if (!moduleId || !title || !body) { response.status(400).json({ error: 'Missing parameters' }); return; }

        const moduleDoc = await admin.firestore().collection('moduli').doc(moduleId).get();
        if (!moduleDoc.exists) { response.status(404).json({ error: 'Module not found' }); return; }
        
        const moduleData = moduleDoc.data();
        const callerDoc = await admin.firestore().collection('users').doc(uid).get();
        const callerData = callerDoc.data();

        const isAdmin = ['admin', 'superadmin'].includes(callerData.ruolo);
        const isModuleAdmin = moduleData.adminId === uid;

        if (!isAdmin && !isModuleAdmin) {
            response.status(403).json({ error: 'Permission denied' });
            return;
        }

        const members = moduleData.membri || [];
        if (members.length === 0) { response.status(200).json({ success: true, count: 0 }); return; }

        // Recupera i token in batch (Firestore 'in' query supporta max 10, quindi chunking necessario)
        const tokens = [];
        const chunkSize = 10;
        for (let i = 0; i < members.length; i += chunkSize) {
            const chunk = members.slice(i, i + chunkSize);
            const q = await admin.firestore().collection('users').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
            q.docs.forEach(doc => {
                const d = doc.data();
                if (d.fcmToken) tokens.push(d.fcmToken);
            });
        }

        if (tokens.length > 0) {
            await admin.messaging().sendEachForMulticast({
                notification: { title, body, image: LOGO_URL },
                tokens: tokens
            });
        }

        response.status(200).json({ success: true, count: tokens.length });

    } catch (error) {
        logger.error("Errore sendModuleNotification:", error);
        response.status(500).json({ error: error.message });
    }
});

/**
 * TRIGGER: Sincronizza membri modulo con profilo utente (Badge)
 */
exports.onModuleMembersUpdate = onDocumentUpdated("moduli/{moduloId}", async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const moduleName = after.nome;

    const oldMembers = before.membri || [];
    const newMembers = after.membri || [];

    const added = newMembers.filter(uid => !oldMembers.includes(uid));
    const removed = oldMembers.filter(uid => !newMembers.includes(uid));

    const batch = admin.firestore().batch();

    added.forEach(uid => {
        const userRef = admin.firestore().collection('users').doc(uid);
        batch.update(userRef, {
            moduli: admin.firestore.FieldValue.arrayUnion(moduleName)
        });
    });

    removed.forEach(uid => {
        const userRef = admin.firestore().collection('users').doc(uid);
        batch.update(userRef, {
            moduli: admin.firestore.FieldValue.arrayRemove(moduleName)
        });
    });

    if (added.length > 0 || removed.length > 0) {
        await batch.commit();
        logger.info(`Aggiornati badge moduli per ${added.length} aggiunti e ${removed.length} rimossi.`);
    }
});

/**
 * PROXY: Recupera il bollettino meteo della Campania per evitare CORS.
 */
exports.getMeteoCampania = onRequest({ region: "europe-west1" }, (request, response) => {
    cors(request, response, async () => {
        try {
            const campaniaResponse = await fetch("https://bollettinimeteo.regione.campania.it/");
            const text = await campaniaResponse.text();
            response.status(200).send({ html: text });
        } catch (error) {
            logger.error("Errore proxy meteo Campania:", error);
            response.status(500).send({ error: "Failed to fetch weather data." });
        }
    });
});

// --- COSTANTI PER METEO ---
const SEDI_ZONES = [
  { s: "SEDE TEST FITTIZIA", z: "TEST" },
  { s: "PERGOLA DI MARSICONUOVO (SOGL)", z: "BASI C" }, { s: "VIGGIANO (COORD. NAZIONALE)", z: "BASI C" },
  { s: "ACCETTURA", z: "BASI B" }, { s: "ALIANO", z: "BASI C" }, { s: "BERNALDA", z: "BASI E2" },
  { s: "CIRIGLIANO", z: "BASI C" }, { s: "CRACO", z: "BASI E1" }, { s: "GORGOGLIONE", z: "BASI C" },
  { s: "GRASSANO", z: "BASI B" }, { s: "MATERA", z: "BASI B" }, { s: "POLICORO", z: "BASI E1" },
  { s: "SALANDRA", z: "BASI B" }, { s: "SAN GIORGIO LUCANO", z: "BASI C" }, { s: "SCANZANO JONICO", z: "BASI E1" },
  { s: "TRICARICO", z: "BASI B" }, { s: "TURSI", z: "BASI C" }, { s: "ACERENZA", z: "BASI B" },
  { s: "ARMENTO", z: "BASI C" }, { s: "ATELLA", z: "BASI A1" }, { s: "AVIGLIANO", z: "BASI B" },
  { s: "BANZI", z: "BASI B" }, { s: "BRIENZA", z: "BASI A2" }, { s: "CANCELLARA", z: "BASI B" },
  { s: "CARBONE", z: "BASI C" }, { s: "CASTELGRANDE", z: "BASI A2" }, { s: "CASTELLUCCIO SUP.", z: "BASI D" },
  { s: "CASTELLUCCIO INFERIORE", z: "BASI D" }, { s: "CASTELMEZZANO", z: "BASI B" }, { s: "CASTRONUOVO S.ANDREA", z: "BASI C" },
  { s: "CHIAROMONTE", z: "BASI C" }, { s: "EPISCOPIA", z: "BASI C" }, { s: "FILIANO", z: "BASI A1" },
  { s: "FORENZA", z: "BASI A1" }, { s: "GUARDIA PERTICARA", z: "BASI C" }, { s: "LAURENZANA", z: "BASI B" },
  { s: "LAURIA", z: "BASI D" }, { s: "LAVELLO", z: "BASI A1" }, { s: "MARATEA", z: "BASI D" },
  { s: "MARSICO NUOVO", z: "BASI C" }, { s: "MARSICOVETERE", z: "BASI C" }, { s: "MISSANELLO", z: "BASI C" },
  { s: "MOLITERNO", z: "BASI C" }, { s: "MONTEMURRO", z: "BASI C" }, { s: "MURO LUCANO", z: "BASI A2" },
  { s: "NOEPOLI", z: "BASI C" }, { s: "PATERNO", z: "BASI C" }, { s: "PESCOPAGANO", z: "BASI A1" },
  { s: "PIETRAGALLA", z: "BASI B" }, { s: "PIGNOLA", z: "BASI B" }, { s: "POTENZA", z: "BASI B" }, { s: "RAPOLLA", z: "BASI A1" },
  { s: "RIVELLO", z: "BASI D" }, { s: "ROCCANOVA", z: "BASI C" }, { s: "ROTONDELLA", z: "BASI E1" },
  { s: "SAN COSTANTINO ALBANESE", z: "BASI C" }, { s: "SAN FELE", z: "BASI A1" }, { s: "SAN MARTINO D'AGRI", z: "BASI C" },
  { s: "SAN SEVERINO", z: "BASI C" }, { s: "SANT'ANGELO LE FRATTE", z: "BASI A2" }, { s: "SARCONI", z: "BASI C" },
  { s: "SASSO DI CASTALDA", z: "BASI A2" }, { s: "SATRIANO DI LUCANIA", z: "BASI A2" }, { s: "SAVOIA DI LUCANIA", z: "BASI A2" },
  { s: "SENISE", z: "BASI C" }, { s: "SPINOSO", z: "BASI C" }, { s: "TERRANOVA DEL POLLINO", z: "BASI C" },
  { s: "TITO", z: "BASI A2" }, { s: "TRAMUTOLA", z: "BASI C" }, { s: "TRIVIGNO", z: "BASI B" },
  { s: "VAGLIO BASILICATA", z: "BASI B" }, { s: "VIGGIANELLO", z: "BASI D" }, { s: "AMENDOLARA", z: "Cal-5" },
  { s: "CERCHIARA", z: "Cal-5" }, { s: "LAINO CASTELLO", z: "Cal-1" }, { s: "ROCCA IMPERIALE", z: "Cal-5" },
  { s: "ROSETO CAPO SPULICO", z: "Cal-5" }, { s: "SAN SOSTI", z: "Cal-2" }, { s: "SANTA CATERINA ALBANESE", z: "Cal-2" },
  { s: "VILLAPIANA", z: "Cal-5" }, { s: "BUONABITACOLO", z: "Camp-3" }, { s: "FUTANI", z: "Camp-3" },
  { s: "ISPANI", z: "Camp-3" }, { s: "MONTESANO", z: "Camp-3" }, { s: "PERDIFUMO", z: "Camp-3" },
  { s: "SALENTO", z: "Camp-3" }, { s: "SAN GIOVANNI A PIRO", z: "Camp-3" }, { s: "SASSANO", z: "Camp-3" },
  { s: "TORRE ORSAIA", z: "Camp-3" }, { s: "VALLO DELLA LUCANIA", z: "Camp-3" }
];

const normalizeColor = (c) => {
  if (!c) return "unknown";
  let v = c.toLowerCase();
  if (v.includes("green") || v.includes("verde")) return "verde";
  if (v.includes("yellow") || v.includes("gialla") || v.includes("giallo")) return "gialla";
  if (v.includes("orange") || v.includes("arancione")) return "arancione";
  if (v.includes("red") || v.includes("rossa") || v.includes("rosso")) return "rossa";
  return "unknown";
};

/**
 * CRON JOB: Controllo Aggiornamenti Meteo (Ogni giorno alle 14:00)
 */
exports.checkWeatherUpdates = onSchedule({ schedule: "every day 14:00", timeZone: "Europe/Rome" }, async (event) => {
    try {
        const ts = Date.now();
        const [resB, resC, resCamp] = await Promise.allSettled([
            fetch(`https://eatapples15.github.io/allerte_bollettino_basilicata/dati_bollettino.json?t=${ts}`).then(r => r.json()),
            fetch(`https://raw.githubusercontent.com/Eatapples15/gruppolucano/refs/heads/main/calabria.json?t=${ts}`).then(r => r.json()),
            fetch("https://bollettinimeteo.regione.campania.it/").then(r => r.text())
        ]);

        const newWeather = {};

        // BASILICATA
        if (resB.status === 'fulfilled' && resB.value?.zone) {
            const pdfLink = resB.value.link || resB.value.pdf || "https://protezionecivile.regione.basilicata.it/civile/detail.jsp?otype=1011&id=10004";
            for (const [zone, data] of Object.entries(resB.value.zone)) {
                newWeather[zone] = {
                    oggi: normalizeColor(data.oggi),
                    domani: normalizeColor(data.domani),
                    link: pdfLink
                };
            }
        }

        // CALABRIA
        if (resC.status === 'fulfilled' && resC.value?.zone_calabria) {
            const pdfLink = resC.value.pdf || "https://www.protezionecivilecalabria.it/";
            for (const [zoneId, data] of Object.entries(resC.value.zone_calabria)) {
                const zoneKey = `Cal-${zoneId}`;
                newWeather[zoneKey] = {
                    oggi: normalizeColor(data.oggi),
                    domani: normalizeColor(data.domani),
                    link: pdfLink
                };
            }
        }

        // CAMPANIA (Parsing HTML)
        if (resCamp.status === 'fulfilled') {
            const html = resCamp.value;
            const match = html.match(/Codice colore\s+(verde|giallo|gialla|arancione|rosso|rossa)/i);
            const pdfMatch = html.match(/href="([^"]*bollettini[^"]*\.pdf)"/i) || html.match(/href="([^"]*\.pdf)"/i);
            const pdfLink = pdfMatch ? (pdfMatch[1].startsWith('http') ? pdfMatch[1] : `https://bollettinimeteo.regione.campania.it/${pdfMatch[1]}`) : "https://bollettinimeteo.regione.campania.it/";

            if (match) {
                const color = normalizeColor(match[1]);
                newWeather['Camp-3'] = { oggi: color, domani: color, link: pdfLink }; 
            }
        }

        // Compare with stored state
        const weatherRef = admin.firestore().collection('settings').doc('weather');
        const weatherDoc = await weatherRef.get();
        const oldWeather = weatherDoc.exists ? weatherDoc.data() : {};

        const updates = [];
        for (const [zone, data] of Object.entries(newWeather)) {
            const oldData = oldWeather[zone];
            if (!oldData || oldData.oggi !== data.oggi || oldData.domani !== data.domani) {
                updates.push({ zone, ...data });
            }
        }

        if (updates.length > 0) {
            logger.info(`Rilevati ${updates.length} aggiornamenti meteo.`);
            await weatherRef.set(newWeather);

            const usersSnapshot = await admin.firestore().collection('users').where('stato', '==', 'attivo').get();
            const zoneGroups = {};

            usersSnapshot.forEach(doc => {
                const user = doc.data();
                if (!user.fcmToken || !user.sede) return;
                const sedeInfoMatch = SEDI_ZONES.find(s => s.s.includes(user.sede.toUpperCase()));
                if (sedeInfoMatch) {
                    const userZone = sedeInfoMatch.z;
                    const update = updates.find(u => u.zone === userZone);
                    if (update) {
                        const key = `Aggiornamento Meteo ${userZone}|Oggi: ${update.oggi.toUpperCase()} | Domani: ${update.domani.toUpperCase()}|${update.link || ''}`;
                        if (!zoneGroups[key]) zoneGroups[key] = [];
                        zoneGroups[key].push(user.fcmToken);
                    }
                }
            });

            for (const [key, tokens] of Object.entries(zoneGroups)) {
                const [title, body, link] = key.split('|');
                const chunkSize = 500;
                const uniqueTokens = [...new Set(tokens)];
                for (let i = 0; i < uniqueTokens.length; i += chunkSize) {
                    const message = {
                        notification: { title, body, image: LOGO_URL },
                        tokens: uniqueTokens.slice(i, i + chunkSize)
                    };
                    if (link) message.data = { type: 'meteo', link };
                    await admin.messaging().sendEachForMulticast(message);
                }
            }
        }
    } catch (error) {
        logger.error("Errore checkWeatherUpdates:", error);
    }
});

/**
 * TRIGGER: Chiusura Allerta (Cessata Emergenza)
 * Invia notifica ai partecipanti quando l'allerta viene disattivata.
 */
exports.onAlertClosed = onDocumentUpdated("attivazioni/{alertId}", async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // Se lo stato passa da 'attiva' a 'disattiva'
    if (before.stato === 'attiva' && after.stato === 'disattiva') {
        const alertTitle = before.titolo;
        const alertId = event.params.alertId;

        try {
            // Recupera partecipanti accettati
            const partsSnapshot = await admin.firestore().collection('partecipazioni_allerta')
                .where('alertId', '==', alertId)
                .where('status', '==', 'accepted')
                .get();

            const uids = partsSnapshot.docs.map(d => d.data().uid);
            if (uids.length === 0) return;

            let acceptedCount = 0;
            let declinedCount = 0;
            partsSnapshot.forEach(doc => {
                const s = doc.data().status;
                if (s === 'accepted') acceptedCount++;
                else if (s === 'declined') declinedCount++;
            });

            await admin.firestore().collection('logs').add({
                azione: "RIEPILOGO ALLERTA",
                dettagli: `L'allerta "${alertTitle}" è stata ricevuta/aperta da ${partsSnapshot.size} dispositivi. Partecipanti confermati: ${acceptedCount}. Rifiuti: ${declinedCount}.`,
                autore: "SISTEMA",
                data: new Date().toISOString()
            });

            // Recupera token utenti
            const tokens = [];
            for (const uid of uids) {
                const userSnap = await admin.firestore().collection('users').doc(uid).get();
                if (userSnap.exists) {
                    const t = userSnap.data().fcmToken;
                    if (t) tokens.push(t);
                }
            }

            if (tokens.length > 0) {
                const uniqueTokens = [...new Set(tokens)];
                const chunkSize = 500;
                for (let i = 0; i < uniqueTokens.length; i += chunkSize) {
                    const chunk = uniqueTokens.slice(i, i + chunkSize);
                    await admin.messaging().sendEachForMulticast({
                        notification: {
                            title: "🟢 CESSATA EMERGENZA",
                            body: `L'allerta "${alertTitle}" è terminata. Grazie per il tuo servizio.`,
                            image: LOGO_URL
                        },
                        tokens: chunk
                    });
                }
                logger.info(`Inviata notifica cessata emergenza a ${uniqueTokens.length} volontari.`);
            }
        } catch (error) {
            logger.error("Errore onAlertClosed:", error);
        }
    }
});

/**
 * TRIGGER: Nuovo Documento nel Modulo
 * Notifica i membri quando viene caricato un nuovo documento.
 */
exports.onModuleDocumentAdded = onDocumentUpdated("moduli/{moduloId}", async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    const oldDocs = before.documenti || [];
    const newDocs = after.documenti || [];

    if (newDocs.length > oldDocs.length) {
        // Trova il documento aggiunto (quello che non c'era prima)
        const addedDoc = newDocs.find(d => !oldDocs.some(od => od.url === d.url));
        
        if (addedDoc) {
            const moduleName = after.nome;
            const members = after.membri || [];
            
            if (members.length === 0) return;

            // Recupera token in batch
            const tokens = [];
            const chunkSize = 10; // Firestore 'in' limit
            for (let i = 0; i < members.length; i += chunkSize) {
                const chunk = members.slice(i, i + chunkSize);
                const q = await admin.firestore().collection('users').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
                q.docs.forEach(doc => {
                    const d = doc.data();
                    // Non notificare chi ha caricato il file
                    if (d.fcmToken && doc.id !== addedDoc.uid) tokens.push(d.fcmToken);
                });
            }

            if (tokens.length > 0) {
                await admin.messaging().sendEachForMulticast({
                    notification: {
                        title: `Nuovo Documento in ${moduleName}`,
                        body: `${addedDoc.autore} ha caricato: ${addedDoc.nome}`,
                        image: LOGO_URL
                    },
                    tokens: tokens
                });
            }
        }
    }
});

/**
 * TRIGGER: Nuovo Form/Sondaggio Modulo
 * Notifica i membri quando viene creato un nuovo form.
 */
exports.onModuleFormCreated = onDocumentCreated("module_forms/{formId}", async (event) => {
    const formData = event.data.data();
    const members = formData.targetMembers || [];

    if (members.length === 0) return;

    const tokens = [];
    const chunkSize = 10;
    for (let i = 0; i < members.length; i += chunkSize) {
        const chunk = members.slice(i, i + chunkSize);
        const q = await admin.firestore().collection('users').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
        q.docs.forEach(doc => {
            const d = doc.data();
            if (d.fcmToken && doc.id !== formData.createdBy) tokens.push(d.fcmToken);
        });
    }

    if (tokens.length > 0) {
        await admin.messaging().sendEachForMulticast({
            notification: {
                title: `Nuova Richiesta Dati: ${formData.moduleName}`,
                body: formData.title,
                image: LOGO_URL
            },
            tokens: tokens
        });
    }
});

/**
 * TRIGGER: Monitoraggio Cambio Stato (Log & Notifiche)
 */
exports.onUserStatusChange = onDocumentUpdated("users/{userId}", async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;

    if (before.stato !== after.stato) {
        // Ignora pendente -> attivo (già gestito da onVolunteerApproved)
        if (before.stato === 'pendente' && after.stato === 'attivo') return;

        const displayName = `${after.nome} ${after.cognome}`;
        
        await admin.firestore().collection('logs').add({
            azione: "CAMBIO STATO",
            dettagli: `Stato utente ${displayName} cambiato: ${before.stato} -> ${after.stato}`,
            autore: "SISTEMA",
            data: new Date().toISOString(),
            targetUid: userId
        });

        if (after.fcmToken) {
            let title, body;
            if (after.stato === 'sospeso') {
                title = "Account Sospeso";
                body = "Il tuo account è stato sospeso. Contatta il responsabile.";
            } else if (after.stato === 'attivo') {
                title = "Account Riattivato";
                body = "Il tuo account è nuovamente operativo.";
            }

            if (title) {
                try {
                    await admin.messaging().send({
                        notification: { title, body, image: LOGO_URL },
                        token: after.fcmToken
                    });
                } catch (e) { logger.error("Errore notifica stato", e); }
            }
        }
    }
});

/**
 * TRIGGER: Segnalazione Problema (Feedback Utente)
 * Notifica i Superadmin quando viene inviato un report.
 */
exports.onProblemReported = onDocumentCreated("reports_problemi/{reportId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const report = snapshot.data();
    const authorName = report.autoreNome || "Utente";

    try {
        // Recupera token Superadmin
        const adminsSnapshot = await admin.firestore().collection('users')
            .where('ruolo', '==', 'superadmin')
            .get();
        
        const tokens = adminsSnapshot.docs
            .map(doc => doc.data().fcmToken)
            .filter(token => token);

        if (tokens.length > 0) {
            await admin.messaging().sendEachForMulticast({
                notification: {
                    title: `Segnalazione: ${report.tipo}`,
                    body: `${authorName}: ${report.descrizione.substring(0, 50)}...`,
                    image: LOGO_URL
                },
                data: {
                    type: 'report_problema',
                    reportId: event.params.reportId
                },
                tokens: tokens
            });
        }
    } catch (error) {
        logger.error("Errore onProblemReported:", error);
    }
});

/**
 * TRIGGER: Aggiornamento Segnalazione (Risposta Admin)
 * Notifica l'utente quando lo stato o la risposta cambiano.
 */
exports.onReportUpdated = onDocumentUpdated("reports_problemi/{reportId}", async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // Verifica se c'è stato un cambiamento rilevante (stato o risposta)
    if (before.stato !== after.stato || before.rispostaAdmin !== after.rispostaAdmin) {
        try {
            const userDoc = await admin.firestore().collection('users').doc(after.uid).get();
            const fcmToken = userDoc.data()?.fcmToken;

            if (fcmToken) {
                let title = "Aggiornamento Segnalazione";
                let body = "Ci sono novità sulla tua segnalazione.";

                if (after.stato === 'risolto' && before.stato !== 'risolto') {
                    title = "Segnalazione Risolta ✅";
                    body = "La tua segnalazione è stata chiusa. Grazie per il feedback!";
                } else if (after.rispostaAdmin && after.rispostaAdmin !== before.rispostaAdmin) {
                    title = "Nuova Risposta Supporto 💬";
                    body = `L'admin ha risposto: "${after.rispostaAdmin.substring(0, 50)}..."`;
                }

                await admin.messaging().send({
                    notification: {
                        title: title,
                        body: body,
                        image: LOGO_URL
                    },
                    token: fcmToken
                });
            }
        } catch (error) {
            logger.error("Errore onReportUpdated:", error);
        }
    }
});

/**
 * ONREQUEST: Invia una segnalazione problema (Server-Side).
 * Aggira i permessi di scrittura su 'reports_problemi' per i volontari.
 */
exports.submitProblemReport = onRequest({ region: "europe-west1" }, async (request, response) => {
    // Wrapper Promise per CORS
    try {
        await new Promise((resolve, reject) => {
            cors(request, response, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        const idToken = request.headers.authorization?.split('Bearer ')[1];
        if (!idToken) { response.status(401).json({ error: 'Unauthorized' }); return; }
        
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const data = request.body;

        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        if (!userDoc.exists) { response.status(404).json({ error: 'User not found' }); return; }
        const userData = userDoc.data();

        await admin.firestore().collection('reports_problemi').add({
            uid: uid, autoreNome: `${userData.nome} ${userData.cognome}`, sede: userData.sede,
            tipo: data.type, sezione: data.section, descrizione: data.description,
            screenshot: data.screenshotUrl, data: new Date().toISOString(), stato: 'aperto',
            appVersion: data.appVersion
        });

        response.status(200).json({ success: true });
    } catch (error) {
        logger.error("Errore submitProblemReport:", error);
        response.status(500).json({ error: error.message });
    }
});

/**
 * CRON JOB: Controllo Scadenze Assicurazione Mezzi (Ogni giorno alle 09:00)
 * Notifica Presidente, Coordinamento e Superadmin 30 giorni prima della scadenza.
 */
exports.checkVehicleExpirations = onSchedule({ schedule: "every day 09:00", timeZone: "Europe/Rome" }, async (event) => {
    const db = admin.firestore();
    const messaging = admin.messaging();
    const today = new Date();
    
    // Target: 30 giorni da oggi
    const targetDateObj = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const targetDate = targetDateObj.toISOString().split('T')[0];

    try {
        // 1. Trova mezzi in scadenza
        const vehiclesSnapshot = await db.collection('mezzi')
            .where('scadenzaAssicurazione', '==', targetDate)
            .get();

        if (vehiclesSnapshot.empty) return;

        // 2. Recupera destinatari globali (Superadmin e Coordinamento)
        const globalStaffSnapshot = await db.collection('users')
            .where('ruolo', 'in', ['superadmin', 'coordinamento'])
            .where('stato', '==', 'attivo')
            .get();
        
        const globalTokens = globalStaffSnapshot.docs
            .map(doc => doc.data().fcmToken)
            .filter(t => t);

        // 3. Invia notifiche per ogni mezzo
        for (const doc of vehiclesSnapshot.docs) {
            const vehicle = doc.data();
            
            // Recupera Presidente della sede specifica
            const presidentSnapshot = await db.collection('users')
                .where('ruolo', '==', 'presidente')
                .where('sede', '==', vehicle.sede)
                .where('stato', '==', 'attivo')
                .get();

            const presidentTokens = presidentSnapshot.docs.map(d => d.data().fcmToken).filter(t => t);
            const allTokens = [...new Set([...globalTokens, ...presidentTokens])];

            if (allTokens.length > 0) {
                await messaging.sendEachForMulticast({
                    notification: {
                        title: "⚠️ Scadenza Assicurazione",
                        body: `L'assicurazione del mezzo ${vehicle.targa} (${vehicle.sede}) scade il ${targetDate}.`,
                        image: LOGO_URL
                    },
                    data: { type: 'gestione_mezzi', vehicleId: doc.id },
                    tokens: allTokens
                });
                logger.info(`Notifica scadenza inviata per ${vehicle.targa} a ${allTokens.length} utenti.`);
            }
        }
    } catch (error) {
        logger.error("Errore checkVehicleExpirations:", error);
    }
});

/**
 * ONREQUEST: Sincronizzazione massiva utenti esistenti su Moodle
 */
exports.syncExistingUsersToMoodle = onRequest({ region: "europe-west1", timeoutSeconds: 300 }, async (request, response) => {
    // Wrapper Promise per CORS
    try {
        await new Promise((resolve, reject) => {
            cors(request, response, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        const idToken = request.headers.authorization?.split('Bearer ')[1];
        if (!idToken) { response.status(401).json({ error: 'Unauthorized' }); return; }
        
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const callerUid = decodedToken.uid;
        
        const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
        if (!callerDoc.exists || callerDoc.data().ruolo !== 'superadmin') {
            response.status(403).json({ error: 'Solo i superadmin possono forzare la sincronizzazione.' });
            return;
        }

        const usersSnapshot = await admin.firestore().collection('users').where('stato', '==', 'attivo').get();
        
        const MOODLE_URL = "https://formazione.pcgl.it";
        const MOODLE_TOKEN = process.env.MOODLE_TOKEN;
        
        let successCount = 0;
        let errorCount = 0;
        let errorList = [];
        const users = usersSnapshot.docs.map(d => d.data());
        
        // Processiamo gli utenti a blocchi (chunking) per evitare Timeout
        const chunkSize = 10;
        for (let i = 0; i < users.length; i += chunkSize) {
            const chunk = users.slice(i, i + chunkSize);
            await Promise.all(chunk.map(async (user) => {
                if (!user.email) return;

                const safeCf = user.cf && user.cf !== 'N/D' ? user.cf : '0000000000000000';
                const moodlePassword = `Pcgl_${safeCf}!`;
                const emailStr = user.email.toLowerCase().trim();
                const fname = (user.nome || 'Volontario').trim().substring(0, 100);
                const lname = (user.cognome || 'PCGL').trim().substring(0, 100);
                const city = (user.citta || 'Potenza').substring(0, 120);
                const phone = (user.telefono || '0000000000').replace(/\s+/g, '').substring(0, 20);

                // CERCHIAMO SEMPRE PRIMA PER EMAIL PER CAPIRE SE FARE CREATE O UPDATE
                let isUpdate = false;
                let moodleUserId = null;
                
                try {
                    // 1. Cerca per email
                    const searchByEmailEndpoint = `${MOODLE_URL}/webservice/rest/server.php?wstoken=${MOODLE_TOKEN}&wsfunction=core_user_get_users_by_field&field=email&values[0]=${encodeURIComponent(emailStr)}&moodlewsrestformat=json`;
                    let searchRes = await fetch(searchByEmailEndpoint);
                    const searchData = await searchRes.json();

                    if (Array.isArray(searchData) && searchData.length > 0) {
                        isUpdate = true;
                        moodleUserId = searchData[0].id;
                    } else {
                        // 2. Se non trovato, cerca per username (che per noi è l'email)
                        const searchByUsernameEndpoint = `${MOODLE_URL}/webservice/rest/server.php?wstoken=${MOODLE_TOKEN}&wsfunction=core_user_get_users_by_field&field=username&values[0]=${encodeURIComponent(emailStr)}&moodlewsrestformat=json`;
                        searchRes = await fetch(searchByUsernameEndpoint);
                        const searchDataByUsername = await searchRes.json();
                        if (Array.isArray(searchDataByUsername) && searchDataByUsername.length > 0) {
                            isUpdate = true;
                            moodleUserId = searchDataByUsername[0].id;
                        }
                    }
                } catch(e) {
                    logger.warn(`Errore durante la ricerca dell'utente Moodle ${emailStr}. Si procederà con un tentativo di creazione. Errore: ${e.message}`);
                }

                const baseParams = new URLSearchParams();
                if (isUpdate) {
                    baseParams.append('users[0][id]', moodleUserId);
                } else {
                    baseParams.append('users[0][username]', emailStr);
                    baseParams.append('users[0][password]', moodlePassword);
                    baseParams.append('users[0][email]', emailStr);
                    if (user.cf && user.cf !== 'N/D') {
                        baseParams.append('users[0][idnumber]', user.cf.toUpperCase().trim());
                    }
                }
                baseParams.append('users[0][firstname]', fname);
                baseParams.append('users[0][lastname]', lname);
                if (user.sede) baseParams.append('users[0][department]', user.sede);
                baseParams.append('users[0][city]', city);
                if (user.telefono) baseParams.append('users[0][phone1]', phone);

                const paramsWithCustom = new URLSearchParams(baseParams.toString());
                let cfIdx = 0;
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][type]`, 'appartenenza');
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][value]`, 'Gruppo Lucano');
                cfIdx++;
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][type]`, 'cf');
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][value]`, user.cf || 'N/D');
                cfIdx++;
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][type]`, 'luogo');
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][value]`, user.luogoNascita || 'N/D');
                cfIdx++;
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][type]`, 'datanascita');
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][value]`, user.dataNascita || '01/01/1970');
                cfIdx++;
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][type]`, 'indirizzoemail');
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][value]`, emailStr);
                cfIdx++;
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][type]`, 'cellulare');
                paramsWithCustom.append(`users[0][customfields][${cfIdx}][value]`, phone);
                cfIdx++;

                const action = isUpdate ? 'core_user_update_users' : 'core_user_create_users';
                const actionEndpoint = `${MOODLE_URL}/webservice/rest/server.php?wstoken=${MOODLE_TOKEN}&wsfunction=${action}&moodlewsrestformat=json`;

                try {
                    let res = await fetch(actionEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: paramsWithCustom.toString() });
                    let data = await res.json().catch(async () => ({ exception: 'non-json', message: await res.text() }));

                    // Se fallisce per parametri invalidi (spesso i campi custom), ritenta con i dati base
                    if (data && data.exception && (data.errorcode === 'invalidparameter' || data.exception.includes('invalid_parameter_exception'))) {
                        logger.warn(`Operazione Moodle per ${emailStr} fallita con campi custom. Ritento con dati base...`);
                        res = await fetch(actionEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: baseParams.toString() });
                        data = await res.json().catch(async () => ({ exception: 'non-json', message: await res.text() }));
                    }

                    // Controllo finale degli errori
                    if (data && data.exception) {
                        // "nothingtoupdate" non è un errore, ma un successo funzionale.
                        if (data.errorcode === 'nothingtoupdate') {
                             successCount++;
                        } else {
                            throw new Error(data.message || data.debuginfo || JSON.stringify(data));
                        }
                    } else {
                        successCount++;
                    }
                } catch (e) {
                    errorCount++;
                    errorList.push(`${emailStr}: Eccezione Fetch -> ${e.message}`);
                }
            }));
        }

        const formattedError = errorList.length > 0 ? errorList.slice(0, 3).join(' | ') : null;
        response.status(200).json({ success: true, processed: users.length, synced: successCount, failedOrSkipped: errorCount, error: formattedError });
    } catch (error) {
        logger.error("Errore syncExistingUsersToMoodle:", error);
        response.status(500).json({ error: error.message });
    }
});

/**
 * TRIGGER: Notifica automatica per ogni messaggio in bacheca modulo
 * Garantisce che ogni post (testo, sondaggio o form) invii una notifica ai membri.
 */
exports.onModuleChatMessageCreated = onDocumentCreated("moduli/{moduleId}/chat/{msgId}", async (event) => {
    const msgData = event.data.data();
    const moduleId = event.params.moduleId;

    try {
        const moduleDoc = await admin.firestore().collection('moduli').doc(moduleId).get();
        if (!moduleDoc.exists) return;
        const moduleData = moduleDoc.data();
        const members = moduleData.membri || [];

        if (members.length === 0) return;

        const tokens = [];
        const chunkSize = 10;
        for (let i = 0; i < members.length; i += chunkSize) {
            const chunk = members.slice(i, i + chunkSize);
            const q = await admin.firestore().collection('users').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
            q.docs.forEach(doc => {
                const d = doc.data();
                // Notifica tutti tranne l'autore (se identificato)
                if (d.fcmToken && doc.id !== msgData.uid) tokens.push(d.fcmToken);
            });
        }

        if (tokens.length > 0) {
            let body = msgData.text || "Nuovo contenuto disponibile in bacheca";
            let type = 'module_chat';
            if (msgData.tipo === 'form') body = "📊 Nuovo sondaggio interno pubblicato";
            if (msgData.tipo === 'link_form') body = "📝 Nuovo modulo HQ da compilare";

            await admin.messaging().sendEachForMulticast({
                notification: {
                    title: `Bacheca: ${moduleData.nome}`,
                    body: body,
                    image: LOGO_URL
                },
                data: {
                    type: type,
                    moduleId: moduleId
                },
                tokens: tokens
            });
        }
    } catch (error) {
        logger.error("Errore notifica bacheca modulo:", error);
    }
});

/**
 * CRON JOB: Sincronizzazione automatica completamento corsi Moodle
 * Controlla ogni 4 ore se gli utenti hanno terminato dei corsi e assegna il badge.
 */
exports.syncMoodleCompletions = onSchedule({ schedule: "every 4 hours", timeZone: "Europe/Rome" }, async (event) => {
    const db = admin.firestore();
    const MOODLE_URL = "https://formazione.pcgl.it";
    const MOODLE_TOKEN = process.env.MOODLE_ADMIN_TOKEN; // Token con permessi di lettura report

    try {
        const usersSnapshot = await db.collection('users').where('stato', '==', 'attivo').get();
        logger.info(`Avvio sync completamento Moodle per ${usersSnapshot.size} utenti.`);

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            if (!userData.email) continue;

            try {
                // 1. Trova ID Moodle
                const userRes = await fetch(`${MOODLE_URL}/webservice/rest/server.php?wstoken=${MOODLE_TOKEN}&wsfunction=core_user_get_users_by_field&field=email&values[0]=${encodeURIComponent(userData.email.toLowerCase())}&moodlewsrestformat=json`);
                const moodleUsers = await userRes.json();

                if (Array.isArray(moodleUsers) && moodleUsers.length > 0) {
                    const moodleId = moodleUsers[0].id;

                    // 2. Prendi corsi e progresso
                    const coursesRes = await fetch(`${MOODLE_URL}/webservice/rest/server.php?wstoken=${MOODLE_TOKEN}&wsfunction=core_enrol_get_users_courses&userid=${moodleId}&moodlewsrestformat=json`);
                    const courses = await coursesRes.json();

                    if (Array.isArray(courses)) {
                        const completions = courses.filter(c => c.progress === 100 || c.completed === true);
                        
                        if (completions.length > 0) {
                            const currentFascicolo = userData.fascicoloCorsi || [];
                            let updated = false;

                            for (const course of completions) {
                                const alreadyPresent = currentFascicolo.some(f => f.titolo === course.fullname || f.moodleId === course.id);
                                
                                if (!alreadyPresent) {
                                    currentFascicolo.push({
                                        titolo: course.fullname.toUpperCase(),
                                        data: new Date().toISOString(),
                                        certificato: true,
                                        tipo: 'moodle',
                                        moodleId: course.id
                                    });
                                    updated = true;
                                    logger.info(`Nuovo badge assegnato a ${userData.email}: ${course.fullname}`);
                                }
                            }

                            if (updated) {
                                await userDoc.ref.update({ fascicoloCorsi: currentFascicolo });
                                
                                // Notifica l'utente del nuovo badge
                                if (userData.fcmToken) {
                                    await admin.messaging().send({
                                        notification: {
                                            title: "Nuovo Badge Formativo! 🏆",
                                            body: `Hai completato con successo un corso su Moodle. Il badge è stato aggiunto al tuo profilo.`,
                                            image: LOGO_URL
                                        },
                                        token: userData.fcmToken
                                    });
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                logger.error(`Errore sync Moodle per utente ${userData.email}:`, err);
            }
            
            // Delay minimo per non sovraccaricare le API Moodle in caso di molti utenti
            await new Promise(r => setTimeout(r, 200));
        }
    } catch (error) {
        logger.error("Errore generale syncMoodleCompletions:", error);
    }
});

/**
 * TRIGGER: Nuovo Documento nel Progetto (Area Tematica)
 * Notifica i membri delle sedi abilitate quando viene caricato un nuovo documento.
 */
exports.onAreaDocumentAdded = onDocumentUpdated("aree_tematiche/{areaId}", async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    const oldDocs = before.documenti || [];
    const newDocs = after.documenti || [];

    if (newDocs.length > oldDocs.length) {
        const addedDoc = newDocs.find(d => !oldDocs.some(od => od.url === d.url));
        
        if (addedDoc) {
            const areaName = after.titolo;
            const sediAbilitate = after.sediAbilitate || [];
            const utentiAbilitati = after.utentiAbilitati || [];
            
            if (sediAbilitate.length === 0 && utentiAbilitati.length === 0) return;

            // Recupera utenti delle sedi abilitate o admin/superadmin/coordinamento
            const usersSnapshot = await admin.firestore().collection('users').where('stato', '==', 'attivo').get();

            const tokens = [];
            usersSnapshot.forEach(doc => {
                const u = doc.data();
                if (u.fcmToken) {
                    const isGlobalAdmin = ['admin', 'superadmin', 'coordinamento'].includes(u.ruolo);
                    const isSedeAbilitata = sediAbilitate.includes(u.sede);
                    const isUtenteAbilitato = utentiAbilitati.includes(doc.id);
                    // Non notificare chi ha caricato il file
                    const isAuthor = addedDoc.autore === `${u.nome} ${u.cognome}`;
                    if ((isGlobalAdmin || isSedeAbilitata || isUtenteAbilitato) && !isAuthor) {
                        tokens.push(u.fcmToken);
                    }
                }
            });

            if (tokens.length > 0) {
                const uniqueTokens = [...new Set(tokens)];
                const chunkSize = 500;
                for (let i = 0; i < uniqueTokens.length; i += chunkSize) {
                    const chunk = uniqueTokens.slice(i, i + chunkSize);
                    await admin.messaging().sendEachForMulticast({
                        notification: { title: `Nuovo Documento in ${areaName}`, body: `${addedDoc.autore} ha caricato: ${addedDoc.nome}`, image: LOGO_URL },
                        data: { type: 'area_tematica', areaId: event.params.areaId },
                        tokens: chunk
                    });
                }
            }
        }
    }
});

/**
 * TRIGGER: Nuovo Messaggio nel Progetto (Area Tematica)
 * Notifica i membri delle sedi abilitate.
 */
exports.onAreaMessageCreated = onDocumentCreated("aree_tematiche/{areaId}/chat/{messageId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const msgData = snapshot.data();
    const areaId = event.params.areaId;

    try {
        const areaDoc = await admin.firestore().collection('aree_tematiche').doc(areaId).get();
        if (!areaDoc.exists) return;

        const areaData = areaDoc.data();
        const sediAbilitate = areaData.sediAbilitate || [];
        const utentiAbilitati = areaData.utentiAbilitati || [];
        if (sediAbilitate.length === 0 && utentiAbilitati.length === 0) return;

        const usersSnapshot = await admin.firestore().collection('users').where('stato', '==', 'attivo').get();
        const tokens = [];
        
        usersSnapshot.forEach(doc => {
            const u = doc.data();
            if (u.fcmToken) {
                const isGlobalAdmin = ['admin', 'superadmin', 'coordinamento'].includes(u.ruolo);
                const isSedeAbilitata = sediAbilitate.includes(u.sede);
                const isUtenteAbilitato = utentiAbilitati.includes(doc.id);
                const isAuthor = msgData.uid === doc.id;
                if ((isGlobalAdmin || isSedeAbilitata || isUtenteAbilitato) && !isAuthor) { tokens.push(u.fcmToken); }
            }
        });

        if (tokens.length > 0) {
            const uniqueTokens = [...new Set(tokens)];
            const chunkSize = 500;
            const isMeeting = msgData.tipo === 'riunione';
            const notifTitle = isMeeting ? `📢 Riunione: ${areaData.titolo}` : `Nuovo Messaggio in ${areaData.titolo}`;
            
            for (let i = 0; i < uniqueTokens.length; i += chunkSize) {
                const chunk = uniqueTokens.slice(i, i + chunkSize);
                await admin.messaging().sendEachForMulticast({
                    notification: { title: notifTitle, body: `${msgData.autore}: ${msgData.testo.length > 50 ? msgData.testo.substring(0, 50) + '...' : msgData.testo}`, image: LOGO_URL },
                    data: { type: 'area_tematica', areaId: areaId },
                    tokens: chunk
                });
            }
        }
    } catch (error) { logger.error("Errore onAreaMessageCreated:", error); }
});

/**
 * ONREQUEST: Genera un link temporaneo per collegare l'account Telegram
 */
exports.generateTelegramLink = onRequest({ region: "europe-west1" }, async (request, response) => {
    cors(request, response, async () => {
        try {
            const idToken = request.headers.authorization?.split('Bearer ')[1];
            if (!idToken) { response.status(401).json({ error: 'Unauthorized' }); return; }
            
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const uid = decodedToken.uid;
            
            // Genera token criptograficamente sicuro (6 caratteri base16)
            const linkToken = crypto.randomBytes(3).toString('hex').toUpperCase();
            
            await admin.firestore().collection('telegram_links').doc(linkToken).set({
                uid: uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            response.status(200).json({ linkToken });
        } catch (error) {
            logger.error("Errore generateTelegramLink:", error);
            response.status(500).json({ error: error.message });
        }
    });
});

/**
 * ONREQUEST: Webhook Telegram per ricevere messaggi dal Bot
 */
exports.telegramWebhook = onRequest({ region: "europe-west1" }, async (request, response) => {
    // 1. Sicurezza: Verifica che la richiesta provenga realmente dai server di Telegram
    if (request.headers['x-telegram-bot-api-secret-token'] !== TELEGRAM_SECRET_TOKEN) {
        logger.warn("Tentativo di accesso non autorizzato al Webhook Telegram. Secret token mancante o errato.");
        response.status(403).send("Forbidden");
        return;
    }

    logger.info("Webhook Telegram Ricevuto:", request.body ? JSON.stringify(request.body) : "Nessun Body");

    const message = request.body.message;
    if (!message) { response.status(200).send("OK"); return; }

    const chatId = message.chat.id;
    // Se inviano una foto senza testo, usa la didascalia se presente, altrimenti stringa vuota
    const text = message.text ? message.text.trim() : (message.caption ? message.caption.trim() : '');

    try {
        // 2b. Nuova gestione per l'upload di file e foto da parte del volontario
        if (message.photo || message.document) {
            const userSnap = await admin.firestore().collection('users').where('telegramChatId', '==', chatId.toString()).get();
            if (userSnap.empty) {
                await sendTelegramMessage(chatId, "❌ Il tuo account non è collegato all'app. Collegalo tramite l'app PCGL per inviare file.");
                response.status(200).send("OK");
                return;
            }
            const userDoc = userSnap.docs[0];
            const u = userDoc.data();
            const uid = userDoc.id;

            let fileId, fileName, mimeType, type;
            if (message.photo) {
                const photo = message.photo[message.photo.length - 1]; // Prende la risoluzione massima fornita da TG
                fileId = photo.file_id;
                fileName = `photo_${Date.now()}.jpg`;
                mimeType = 'image/jpeg';
                type = 'photo';
            } else {
                fileId = message.document.file_id;
                fileName = message.document.file_name || `doc_${Date.now()}`;
                mimeType = message.document.mime_type || 'application/octet-stream';
                type = 'document';
            }

            const caption = message.caption || '';
            
            const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
            const fileData = await fileRes.json();
            
            if (fileData.ok) {
                const filePath = fileData.result.file_path;
                const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
                
                const fileBufferRes = await fetch(downloadUrl);
                const buffer = await fileBufferRes.arrayBuffer();
                
                const bucket = admin.storage().bucket("pcgl-volontari.firebasestorage.app");
                const storagePath = `telegram_uploads/${uid}/${fileName}`;
                const file = bucket.file(storagePath);
                const token = crypto.randomUUID();
                
                await file.save(Buffer.from(buffer), { metadata: { contentType: mimeType, metadata: { firebaseStorageDownloadTokens: token } } });
                const firebaseUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
                
                await admin.firestore().collection('telegram_uploads').add({
                    uid: uid, userName: `${u.nome} ${u.cognome}`, userSede: u.sede,
                    type: type, url: firebaseUrl, caption: caption, timestamp: new Date().toISOString()
                });
                
                await sendTelegramMessage(chatId, `✅ <b>${type === 'photo' ? 'Foto' : 'Documento'} acquisito.</b>\nÈ stato inserito nella coda della Sala Operativa.`);

                // --- INIZIO: NOTIFICA PUSH PER ADMIN/PRESIDENTI ---
                try {
                    const staffSnapshot = await admin.firestore().collection('users')
                        .where('stato', '==', 'attivo')
                        .where('ruolo', 'in', ['admin', 'superadmin', 'coordinamento', 'presidente'])
                        .get();
                    
                    const tokens = [];
                    staffSnapshot.forEach(doc => {
                        const staff = doc.data();
                        if (staff.fcmToken) {
                            // Notifica il coordinamento globale O il presidente della sede del volontario
                            if (['admin', 'superadmin', 'coordinamento'].includes(staff.ruolo) || staff.sede === u.sede) {
                                tokens.push(staff.fcmToken);
                            }
                        }
                    });

                    if (tokens.length > 0) {
                        await admin.messaging().sendEachForMulticast({
                            notification: {
                                title: "Sala Operativa",
                                body: `Ricevuto nuovo file da ${u.nome} ${u.cognome} (${u.sede}) via Telegram.`,
                                image: type === 'photo' ? firebaseUrl : LOGO_URL
                            },
                            tokens: [...new Set(tokens)]
                        });
                    }
                } catch (pushErr) {
                    logger.error("Errore invio notifica push file Telegram:", pushErr);
                }
                // --- FINE NOTIFICA PUSH ---
            } else {
                await sendTelegramMessage(chatId, "❌ Errore durante l'acquisizione del file da Telegram.");
            }
            
            response.status(200).send("OK");
            return;
        }

        // Gestione Link /start 
        if (text.startsWith('/start')) {
            const parts = text.split(' ');
            
            // L'utente ha usato il link completo dall'app (es. /start ABCDEF)
            if (parts.length > 1) {
                const token = parts[1];
                const linkDocRef = admin.firestore().collection('telegram_links').doc(token);
                const linkDoc = await linkDocRef.get();
                
                if (linkDoc.exists) {
                    const linkData = linkDoc.data();
                    const createdAt = linkData.createdAt ? linkData.createdAt.toDate() : new Date();
                    const diffMinutes = (new Date() - createdAt) / 60000; // Differenza in minuti

                    // 2. Sicurezza: Limita la finestra di collegamento a 15 minuti per prevenire attacchi differiti
                    if (diffMinutes > 15) {
                        await linkDocRef.delete();
                        await sendTelegramMessage(chatId, "❌ Link di collegamento scaduto (valido 15 min). Generane uno nuovo dall'app.");
                    } else {
                        const uid = linkData.uid;
                        await admin.firestore().collection('users').doc(uid).update({
                            telegramChatId: chatId.toString()
                        });
                        await linkDocRef.delete();
                        await sendTelegramMessage(chatId, "✅ <b>Account collegato con successo!</b>\nOra riceverai qui le tue notifiche operative.");
                    }
                } else {
                    await sendTelegramMessage(chatId, "❌ Link di collegamento non valido o scaduto. Riprova dall'app.");
                }
            } else {
                // L'utente ha avviato il bot manualmente o il parametro si è perso
                await sendTelegramMessage(chatId, "👋 <b>Benvenuto nel Bot PCGL!</b>\n\n⚠️ <i>Sembra che tu abbia avviato il bot manualmente.</i>\n\nPer collegare correttamente il tuo account, apri l'app PCGL, vai nella sezione <b>Il Mio Profilo</b> e clicca sul pulsante <b>Collega Account</b>.");
            }
        } else if (text === '/stato') {
            await sendTelegramMessage(chatId, "Il tuo account è operativo e collegato al sistema PCGL.");
        } else if (text === '/profilo') {
            const userSnap = await admin.firestore().collection('users').where('telegramChatId', '==', chatId.toString()).get();
            if (!userSnap.empty) {
                const u = userSnap.docs[0].data();
                const t = `👤 <b>IL TUO PROFILO PCGL</b>\n\n<b>Nome:</b> ${u.nome} ${u.cognome}\n<b>Sede:</b> ${u.sede}\n<b>Ruolo:</b> ${u.ruolo.toUpperCase()}\n<b>Stato:</b> ${u.stato === 'attivo' ? '🟢 Operativo' : '🔴 Sospeso/Inattivo'}\n<b>N. Tessera:</b> <code>${u.numeroTessera || 'N/D'}</code>\n\n💡 <i>Per modificare i dati, accedi all'App.</i>`;
                const replyMarkup = { inline_keyboard: [[{ text: "📲 Apri App PCGL", url: "https://pcgl-volontari.web.app/" }]] };
                await sendTelegramMessage(chatId, t, replyMarkup);
            } else {
                await sendTelegramMessage(chatId, "❌ Il tuo account Telegram non è associato a nessun volontario.\n\nPer collegarlo, entra nell'app PCGL -> Il Mio Profilo -> Collega Account Telegram.");
            }
        } else if (text === '/aiuto' || text === '/help') {
            const helpText = `🆘 <b>Comandi Bot PCGL</b>\n\n🔹 /profilo - Visualizza i tuoi dati e qualifica\n🔹 /stato - Verifica lo stato di ricezione allerte\n🔹 /aiuto - Mostra questo messaggio\n\nIl bot ti avviserà in automatico in caso di Allerta Operativa, senza bisogno di scrivere nulla.`;
            await sendTelegramMessage(chatId, helpText);
        } else {
            // Risposta predefinita
            await sendTelegramMessage(chatId, "Comando non riconosciuto. Digita /aiuto per vedere le opzioni disponibili.");
        }
    } catch (error) { logger.error("Telegram Webhook Error:", error); }

    response.status(200).send("OK");
});

/**
 * ONCALL: Invia messaggio personalizzato al Canale Telegram
 */
exports.sendCustomTelegramMessage = onCall({ region: "europe-west1", cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Devi essere autenticato.');
    }

    const callerUid = request.auth.uid;
    const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
    const callerData = callerDoc.data();

    // Solo admin, superadmin e coordinamento possono inviare messaggi personalizzati al canale
    if (!['admin', 'superadmin', 'coordinamento'].includes(callerData.ruolo)) {
        throw new HttpsError('permission-denied', 'Non hai i permessi per questa operazione.');
    }

    const { text, buttonText, buttonUrl } = request.data;
    if (!text) {
        throw new HttpsError('invalid-argument', 'Testo mancante.');
    }

    try {
        let replyMarkup = null;
        // Se sono stati forniti dati per il bottone, genera l'Inline Keyboard
        if (buttonText && buttonUrl) {
            replyMarkup = { inline_keyboard: [[{ text: buttonText, url: buttonUrl }]] };
        }
        
        await sendTelegramMessage(TELEGRAM_CHANNEL_ID, text, replyMarkup);
        
        // Logga l'azione
        await admin.firestore().collection('logs').add({
            azione: "INVIO_TELEGRAM",
            dettagli: `Messaggio personalizzato inviato al canale Telegram.`,
            autore: `${callerData.nome} ${callerData.cognome}`,
            data: new Date().toISOString()
        });

        return { success: true };
    } catch (error) {
        logger.error("Errore sendCustomTelegramMessage:", error);
        throw new HttpsError('internal', `Errore Telegram: ${error.message}`);
    }
});

/**
 * ONCALL: Verifica lo stato e i permessi del Bot nel canale Telegram
 */
exports.verifyTelegramConnection = onCall({ region: "europe-west1", cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Devi essere autenticato.');
    }

    const callerUid = request.auth.uid;
    const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
    const callerData = callerDoc.data();

    if (!['admin', 'superadmin', 'coordinamento'].includes(callerData.ruolo)) {
        throw new HttpsError('permission-denied', 'Non hai i permessi.');
    }

    try {
        // 1. getChat per vedere se il bot "vede" il canale
        const chatRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChat?chat_id=${TELEGRAM_CHANNEL_ID}`).then(r => r.json());
        if (!chatRes.ok) return { success: false, error: `Canale non trovato o bot non presente: ${chatRes.description}` };

        // 2. getChatMember per controllare permessi e ruolo
        const botId = TELEGRAM_BOT_TOKEN.split(':')[0];
        const memberRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${TELEGRAM_CHANNEL_ID}&user_id=${botId}`).then(r => r.json());
        
        if (!memberRes.ok) return { success: false, error: `Errore verifica permessi: ${memberRes.description}` };

        const status = memberRes.result.status;
        const canPost = memberRes.result.can_post_messages;

        if (status !== 'administrator' && status !== 'creator') {
            return { success: false, error: `Il bot è nel canale ma non è Amministratore (stato attuale: "${status}").` };
        }

        if (canPost === false) {
            return { success: false, error: `Il bot è Amministratore ma NON ha il permesso di "Pubblicare Messaggi".` };
        }

        return { 
            success: true, 
            channelTitle: chatRes.result.title,
            botStatus: status,
            permissions: memberRes.result
        };
    } catch (error) {
        logger.error("Errore verifica Telegram:", error);
        return { success: false, error: error.message };
    }
});

/**
 * CRON JOB: Promemoria Turni Programmati (Ogni giorno alle 18:00)
 * Avvisa i volontari che hanno un turno programmato per il giorno successivo.
 */
exports.shiftReminderCron = onSchedule({ schedule: "every day 18:00", timeZone: "Europe/Rome" }, async (event) => {
    const db = admin.firestore();
    const now = new Date();
    // Data di domani (es. 2026-06-08)
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    try {
        const shiftsSnapshot = await db.collection('turni_programmati').where('data', '==', tomorrowStr).get();
        const notificationsMap = {}; // uid -> string array

        shiftsSnapshot.forEach(doc => {
            const shift = doc.data();
            if (Array.isArray(shift.slots)) {
                shift.slots.forEach(slot => {
                    if (Array.isArray(slot.iscritti)) {
                        slot.iscritti.forEach(uid => {
                            if (!notificationsMap[uid]) notificationsMap[uid] = [];
                            notificationsMap[uid].push(`${shift.titolo} (${slot.oraInizio}-${slot.oraFine})`);
                        });
                    }
                });
            }
        });

        for (const [uid, messages] of Object.entries(notificationsMap)) {
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists && userDoc.data().fcmToken) {
                await admin.messaging().send({
                    notification: { title: "⏰ Promemoria Turno Operativo", body: `Domani hai un turno: ${messages.join(', ')}. Verifica sull'app!`, image: LOGO_URL },
                    token: userDoc.data().fcmToken
                });
            }
        }
    } catch (e) { logger.error("Errore shiftReminderCron:", e); }
});

/**
 * TRIGGER: AIB Intervention Notification (Push FCM & Telegram)
 */
exports.onAibInterventionUpdated = onDocumentUpdated("aib_interventi/{aibId}", async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const messages = [];
    const escapeHtml = (text) => (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    if (before.stato !== after.stato) {
        messages.push(`🔥 <b>AGGIORNAMENTO AIB</b>\n\nIntervento: ${escapeHtml(after.comune)} - ${escapeHtml(after.localita)}\nNuovo Stato: <b>${after.stato.toUpperCase().replace('_', ' ')}</b>\nAggiornato da: ${after.autore}`);
    }

    const beforeFotos = before.foto || [];
    const afterFotos = after.foto || [];
    if (afterFotos.length > beforeFotos.length) {
        const newFoto = afterFotos[afterFotos.length - 1];
        messages.push(`📸 <b>NUOVA FOTO AIB</b>\n\nIntervento: ${escapeHtml(after.comune)} - ${escapeHtml(after.localita)}\nCaricata da: ${newFoto.autore}\n<a href="${newFoto.url}">Vedi Foto</a>`);
    }

    const beforeSediSupporto = before.sediSupporto || [];
    const afterSediSupporto = after.sediSupporto || [];
    if (afterSediSupporto.length > beforeSediSupporto.length) {
        const newSedi = afterSediSupporto.filter(s => !beforeSediSupporto.includes(s));
        messages.push(`🤝 <b>SUPPORTO AIB RICHIESTO</b>\n\nIntervento: ${escapeHtml(after.comune)} - ${escapeHtml(after.localita)}\nSede attivata in supporto: <b>${newSedi.join(', ')}</b>`);
    }

    if (messages.length === 0) return;
    try {
        const usersSnap = await admin.firestore().collection('users').where('telegramChatId', '!=', null).get();
        const chatIds = new Set();
        usersSnap.forEach(doc => {
            const user = doc.data();
            const isSoOrAdmin = ['admin', 'superadmin', 'coordinamento'].includes(user.ruolo);
            const isPresidenteSede = user.ruolo === 'presidente' && (user.sede === after.sedeRichiedente || afterSediSupporto.includes(user.sede));
            const isInSquadra = after.squadra && after.squadra.some(v => v.id === doc.id);
            if (isSoOrAdmin || isPresidenteSede || isInSquadra) chatIds.add(user.telegramChatId);
        });
        const replyMarkup = { inline_keyboard: [[{ text: "🔥 Apri Campagna AIB", url: "https://pcgl-volontari.web.app/" }]] };
        for (const chatId of chatIds) {
            for (const text of messages) await sendTelegramMessage(chatId, text, replyMarkup).catch(() => {});
        }
    } catch (e) { logger.error("Errore onAibInterventionUpdated Telegram:", e); }
});

exports.onAibInterventionCreated = onDocumentCreated("aib_interventi/{aibId}", async (event) => {
    const data = event.data.data();
    if (!data) return;
    const escapeHtml = (text) => (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const text = `🔥 <b>NUOVA SEGNALAZIONE AIB</b>\n\nComune: ${escapeHtml(data.comune)}\nLocalità: ${escapeHtml(data.localita)}\nSegnalato da: ${escapeHtml(data.sedeRichiedente)} tramite ${escapeHtml(data.fonteSegnalazione)}`;
    try {
        const usersSnap = await admin.firestore().collection('users').where('telegramChatId', '!=', null).get();
        const allActiveUsers = await admin.firestore().collection('users').where('stato', '==', 'attivo').get();

        const chatIds = new Set();
        const fcmTokens = new Set();

        usersSnap.forEach(doc => {
            const user = doc.data();
            const isSoOrAdmin = ['admin', 'superadmin', 'coordinamento'].includes(user.ruolo);
            const isPresidenteSede = user.ruolo === 'presidente' && user.sede === data.sedeRichiedente;
            if (isSoOrAdmin || isPresidenteSede) chatIds.add(user.telegramChatId);
        });

        allActiveUsers.forEach(doc => {
            const user = doc.data();
            if(!user.fcmToken) return;
            const isGlobalStaff = ['admin', 'superadmin', 'coordinamento'].includes(user.ruolo);
            const isLocalVolunteer = user.sede === data.sedeRichiedente || (data.sediSupporto || []).includes(user.sede);
            if (isGlobalStaff || isLocalVolunteer) fcmTokens.add(user.fcmToken);
        });

        const replyMarkup = { inline_keyboard: [[{ text: "🔥 Apri Campagna AIB", url: "https://pcgl-volontari.web.app/" }]] };
        for (const chatId of chatIds) await sendTelegramMessage(chatId, text, replyMarkup).catch(() => {});
        
        if (fcmTokens.size > 0) {
             await admin.messaging().sendEachForMulticast({
                notification: { title: "🔥 NUOVO INCENDIO AIB", body: `${data.comune} (${data.localita}) - Avvia l'app per i dettagli.`, image: "https://pcgl-volontari.web.app/logo.png" },
                tokens: [...fcmTokens]
            });
        }
    } catch (e) { logger.error("Errore onAibInterventionCreated Telegram:", e); }
});
