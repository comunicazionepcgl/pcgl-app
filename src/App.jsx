import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, QrCode, LogOut, User, MapPin, Home, Megaphone, CheckCircle, Users, 
  Activity, ChevronLeft, TriangleAlert, Truck, Trash2, BookOpen,
  Search, Send, Plus, X, Bell, Info,
  Settings, Check, Camera, Award, Briefcase, UserCheck, Verified, CloudRain, UserMinus,
  FileText, Lock, File, ClipboardList, Ban, MessageCircle, Download, Mail, Printer, Clock, Map as MapIcon, BarChart3, Search as SearchIcon,
  Sun, CloudLightning, CloudOff, Eye, EyeOff, ScanLine, Calendar as CalendarIcon, Paperclip, MessageSquare, ClipboardCheck, PieChart, Phone, Building,
  FileSpreadsheet, AlertTriangle, Fuel, Pencil, Share2, Link as LinkIcon, GripVertical, Upload, Pause, Play, FolderKanban, Pin, UserPlus, Radio, Flame, Video
} from 'lucide-react';
import { auth, db, storage, generateTesserinoId } from './firebase';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, query, where, onSnapshot, deleteDoc, updateDoc, addDoc, orderBy, arrayUnion, arrayRemove, limit, serverTimestamp, getCountFromServer } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { toBlob } from 'html-to-image';
import { HeaderSub, FooterLinks } from './SharedUI';
import { ModulesManager } from './ModulesManager';
import { SalaOperativaManager } from './SalaOperativaManager';
import { CampagnaAIBSOGL } from './CampagnaAIBSOGL.jsx';
import { LivePublisherSOGL } from './LiveStreamSOGL.jsx';

const BLU_PCGL = "#001a33";
const GIALLO_PCGL = "#FFCC00";
const APP_LOGO = "/logo.png?v=3"; // Cache busting per forzare aggiornamento logo (Triangolo)

// --- UTILITY: ESCAPE HTML PER TELEGRAM ---
const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

// --- CONFIGURAZIONE DATI STATICI ---
const DEFAULT_SEDI_ZONES = [
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

const DEFAULT_SPECIALIZZAZIONI = ["AIB", "Logistica", "Sala Operativa", "Autista", "Soccorritore", "Radioamatore", "Formatore"];

const DOC_TYPES = ["Atto Costitutivo e Statuto", "Verbale Elezioni", "Copertura Assicurativa", "Ricognizione Mezzi/Strumenti", "Altro"];

const QUIZ_PC = [
  { q: "Qual è il Numero Unico di Emergenza Europeo?", options: ["112", "911", "118", "115"], a: 0 },
  { q: "Chi è la massima autorità di Protezione Civile nel Comune?", options: ["Il Prefetto", "Il Sindaco", "Il Comandante dei Vigili", "Il Presidente della Regione"], a: 1 },
  { q: "Cosa indica il codice colore ARANCIONE?", options: ["Attenzione", "Preallarme", "Allarme", "Cessata Allerta"], a: 1 },
  { q: "Cosa significa l'acronimo COC?", options: ["Centro Operativo Comunale", "Comando Operativo Centrale", "Centro Osservazione Calamità", "Corpo Operativo Civile"], a: 0 },
  { q: "In caso di terremoto, cosa NON fare?", options: ["Ripararsi sotto un tavolo", "Allontanarsi da vetri", "Usare l'ascensore", "Chiudere gas e acqua"], a: 2 }
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

const getColorClass = (color) => {
  switch(color) {
    case 'rossa': return 'bg-red-600 text-white border-red-700';
    case 'arancione': return 'bg-orange-500 text-white border-orange-600';
    case 'gialla': return 'bg-yellow-400 text-black border-yellow-500';
    case 'verde': return 'bg-green-500 text-white border-green-600';
    default: return 'bg-gray-200 text-gray-500 border-gray-300';
  }
};

const getAlertMessage = (color) => {
  switch(color) {
    case 'rossa': return 'ALLARME ROSSO: Fase di emergenza. Presidio continuo.';
    case 'arancione': return 'PREALLARME: Fase operativa. Monitoraggio intensivo.';
    case 'gialla': return 'ATTENZIONE: Monitoraggio punti critici.';
    case 'verde': return 'ORDINARIA: Nessuna criticità prevista.';
    default: return 'Dati non disponibili.';
  }
};

const getWeatherIcon = (color) => {
  switch(color) {
    case 'rossa': return <CloudLightning size={32} />;
    case 'arancione': return <CloudLightning size={32} />;
    case 'gialla': return <CloudRain size={32} />;
    case 'verde': return <Sun size={32} />;
    default: return <CloudOff size={32} />;
  }
};

const playAlertAlarm = () => {
  if (localStorage.getItem('pcgl_sound') === 'false') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.5);
    osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 1);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    osc.start();
    setTimeout(() => osc.stop(), 1500);
  } catch (e) { console.error("Audio error", e); }
};

const triggerAlertHaptic = () => {
  if (localStorage.getItem('pcgl_vibration') === 'false') return;
  if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
};

const playScanSound = () => {
  if (localStorage.getItem('pcgl_sound') === 'false') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.start();
    setTimeout(() => osc.stop(), 150);
  } catch (e) { console.error("Audio error", e); }
};

const triggerHaptic = () => {
  if (localStorage.getItem('pcgl_vibration') === 'false') return;
  if (navigator.vibrate) navigator.vibrate(50);
};

const getHeroStyle = (role) => {
  switch(role) {
    case 'volontario': return { 
      cardBg: 'bg-[#FFCC00]', 
      textColor: 'text-[#001a33]', 
      subTextColor: 'text-[#001a33]/70',
      accentColor: 'text-[#001a33]', 
      iconBg: 'bg-[#001a33]', 
      iconColor: 'text-[#FFCC00]',
      blobColor: 'bg-white'
    };
    case 'presidente': return { 
      cardBg: 'bg-green-900', 
      textColor: 'text-white', 
      subTextColor: 'text-green-200',
      accentColor: 'text-green-400',
      iconBg: 'bg-green-400', 
      iconColor: 'text-green-900',
      blobColor: 'bg-green-400'
    };
    case 'coordinamento': return { 
      cardBg: 'bg-red-700', 
      textColor: 'text-white', 
      subTextColor: 'text-red-200',
      accentColor: 'text-red-200',
      iconBg: 'bg-white', 
      iconColor: 'text-red-700',
      blobColor: 'bg-red-400'
    };
    default: return { 
      cardBg: 'bg-[#001a33]', 
      textColor: 'text-white', 
      subTextColor: 'text-gray-400',
      accentColor: 'text-[#FFCC00]',
      iconBg: 'bg-[#FFCC00]', 
      iconColor: 'text-[#001a33]',
      blobColor: 'bg-[#FFCC00]'
    };
  }
};

const getRoleBorderColor = (role) => {
  switch(role) {
    case 'volontario': return 'border-pcgl-yellow';
    case 'presidente': return 'border-green-600';
    case 'coordinamento': return 'border-red-600';
    case 'admin': case 'superadmin': return 'border-pcgl-blue';
    default: return 'border-pcgl-blue';
  }
};

const AlertTimer = ({ startDate }) => {
  const [diff, setDiff] = useState('');
  
  useEffect(() => {
      const update = () => {
          if (!startDate) return;
          const start = new Date(startDate);
          const now = new Date();
          const diffMs = now - start;
          if (diffMs < 0) { setDiff('0m'); return; }
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          setDiff(`${days > 0 ? days + 'g ' : ''}${hours}h ${minutes}m`);
      };
      update();
      const interval = setInterval(update, 60000);
      return () => clearInterval(interval);
  }, [startDate]);
  return <span className="font-mono font-bold text-pcgl-blue bg-blue-50 px-2 py-1 rounded ml-2 text-xs">{diff}</span>;
};

// --- CACHE KEYS ---
const CACHE = {
  USER: 'pcgl_cache_user',
  ALERTS: 'pcgl_cache_alerts',
  VEHICLES: 'pcgl_cache_vehicles'
};

// --- COMPONENTE PUBBLICO: PRESA PRESENZE (NO LOGIN RICHIESTO) ---
const PublicAttendance = ({ sessionId }) => {
    const [sessionData, setSessionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ nome: '', cognome: '', email: '', ente: 'PCGL', cf: '' });
    const [sedePcgl, setSedePcgl] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'registro_presenze', sessionId), (snap) => {
            if (snap.exists()) {
                setSessionData(snap.data());
                setError('');
            } else {
                setError("Sessione di presenza non trovata o scaduta.");
            }
            setLoading(false);
        }, (err) => {
            console.error(err);
            setError("Errore di connessione.");
            setLoading(false);
        });
        return () => unsub();
    }, [sessionId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nome || !form.cognome || !form.email) return;
        setLoading(true);
        try {
            await addDoc(collection(db, 'presenze_registrate'), {
                sessionId,
                sessionTitle: sessionData.titolo,
                nome: form.nome.toUpperCase(),
                cognome: form.cognome.toUpperCase(),
                email: form.email.toLowerCase(),
                cf: form.cf.toUpperCase(),
                ente: form.ente,
                sede: form.ente === 'PCGL' ? sedePcgl.toUpperCase() : 'N/D',
                timestamp: new Date().toISOString(),
                validato: false
            });
            setSubmitted(true);
        } catch (err) {
            console.error(err);
            setError("Errore durante la registrazione. Riprova.");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !sessionData) return <div className="min-h-screen flex items-center justify-center bg-pcgl-bg-light"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-pcgl-blue"></div></div>;
    
    return (
        <div className="min-h-screen bg-pcgl-bg-light flex flex-col items-center justify-center p-6 font-sans">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border-t-8 border-pcgl-blue text-center animate-in zoom-in duration-500">
                <img src={APP_LOGO} alt="PCGL" className="w-20 h-20 mx-auto mb-4 drop-shadow-md"/>
                {error ? (
                    <div className="bg-red-50 p-4 rounded-xl text-red-600 font-bold uppercase">{error}</div>
                ) : submitted ? (
                    <div className="space-y-4">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto"><CheckCircle size={40}/></div>
                        <h2 className="text-2xl font-black text-pcgl-blue uppercase">Presenza Registrata!</h2>
                        <p className="text-gray-500 font-medium">Grazie {form.nome}, la tua presenza per <strong>{sessionData.titolo}</strong> è stata salvata con successo. Puoi chiudere questa pagina.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 text-left">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-black text-pcgl-blue uppercase leading-tight mb-1">Registro Presenze</h2>
                            <p className="text-sm font-bold text-gray-500 bg-gray-100 p-2 rounded-lg inline-block">{sessionData.titolo}</p>
                        </div>
                        <input type="text" placeholder="Nome" className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 font-medium uppercase focus:border-pcgl-yellow" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} required />
                        <input type="text" placeholder="Cognome" className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 font-medium uppercase focus:border-pcgl-yellow" value={form.cognome} onChange={e => setForm({...form, cognome: e.target.value})} required />
                        <input type="email" placeholder="Indirizzo Email" className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 font-medium focus:border-pcgl-yellow" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
                        <input type="text" placeholder="Codice Fiscale (Opzionale)" className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 font-medium uppercase focus:border-pcgl-yellow" value={form.cf} onChange={e => setForm({...form, cf: e.target.value})} maxLength={16} />
                        <select className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 font-medium font-bold text-pcgl-blue uppercase focus:border-pcgl-yellow" value={form.ente} onChange={e => setForm({...form, ente: e.target.value})}>
                            <option value="PCGL">Volontario PC Gruppo Lucano</option>
                            <option value="Esterno">Esterno / Altra Organizzazione</option>
                        </select>
                        {form.ente === 'PCGL' && (
                            <input type="text" placeholder="Sede PCGL (es. POTENZA)" className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 font-medium uppercase focus:border-pcgl-yellow" value={sedePcgl} onChange={e => setSedePcgl(e.target.value)} required />
                        )}
                        <button disabled={loading} className="w-full py-4 bg-pcgl-blue text-pcgl-yellow rounded-xl font-black text-lg uppercase shadow-lg hover:bg-pcgl-yellow hover:text-pcgl-blue transition-all disabled:opacity-50">{loading ? 'Invio in corso...' : 'Conferma Presenza'}</button>
                    </form>
                )}
            </div>
        </div>
    );
};

// --- COMPONENTE COMPLETAMENTO REGISTRAZIONE UTENTE ORFANO ---
const OrphanUserCompletionScreen = ({ user, config }) => {
    const [regForm, setRegForm] = useState({
        nome: '', cognome: '', dataNascita: '', luogoNascita: '', cf: '', sede: 'POTENZA', cfConfermato: false, privacyAccepted: false
    });
    const [error, setError] = useState('');
    const sediDisponibili = config.sedi.map(s => s.s).filter(s => s !== 'SEDE TEST FITTIZIA').sort();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!regForm.cfConfermato || regForm.cf.length !== 16) {
            setError("Codice Fiscale non verificato.");
            return;
        }
        if (!regForm.privacyAccepted) {
            setError("Devi accettare l'informativa sulla privacy.");
            return;
        }
        
        // Check CF duplication
        const cfQuery = query(collection(db, 'users'), where('cf', '==', regForm.cf.toUpperCase()));
        const cfSnap = await getDocs(cfQuery);
        if (!cfSnap.empty) { setError("Codice Fiscale già registrato."); return; }

        // CONFERMA DATI E SEDE
        const confirmation = window.confirm(
            `CONFERMA DATI PROFILO:\n\n` +
            `Nome: ${regForm.nome.toUpperCase()}\n` +
            `Cognome: ${regForm.cognome.toUpperCase()}\n` +
            `SEDE SELEZIONATA: ${regForm.sede.toUpperCase()}\n\n` +
            `ATTENZIONE: Verifica che la SEDE sia quella corretta dove presterai servizio. Molti utenti selezionano erroneamente "POTENZA".\n\n` +
            `Procedere con il salvataggio?`
        );
        if (!confirmation) return;

        try {
            // CHIAMATA ALLA CLOUD FUNCTION (Server-Side)
            const token = await user.getIdToken();
            const response = await fetch('https://europe-west1-pcgl-volontari.cloudfunctions.net/completeOrphanProfile', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nome: regForm.nome.toUpperCase(),
                    cognome: regForm.cognome.toUpperCase(),
                    dataNascita: regForm.dataNascita,
                    luogoNascita: regForm.luogoNascita.toUpperCase(),
                    cf: regForm.cf.toUpperCase(),
                    sede: regForm.sede,
                    privacyAccepted: true,
                    privacyConsentDate: new Date().toISOString()
                })
            });
            if (!response.ok) throw new Error("Errore server durante il salvataggio.");
            
            // ATTESA ATTIVA DEL DOCUMENTO (Evita race condition "Orfano" al reload)
            const userDocRef = doc(db, 'users', user.uid);
            let retries = 10; // Max 5 secondi di attesa
            let docExists = false;

            while (retries > 0) {
                const snap = await getDoc(userDocRef);
                if (snap.exists()) {
                    docExists = true;
                    break;
                }
                await new Promise(r => setTimeout(r, 500)); // Attendi 500ms
                retries--;
            }

            if (docExists) {
                alert("Profilo completato con successo!");
                window.location.reload();
            } else {
                throw new Error("Timeout creazione profilo. Riprova o contatta l'assistenza.");
            }
        } catch (err) {
            console.error("Errore completamento registrazione:", err);
            if (err.message.includes("Codice Fiscale già registrato")) {
                setError("Questo Codice Fiscale è già associato a un altro account. Prova a fare logout e rientrare con l'accesso corretto (es. Google o Email).");
            } else {
            setError("Si è verificato un errore. Riprova: " + err.message);
            }
        }
    };

    return (
        <div className="min-h-screen bg-pcgl-bg-light flex flex-col items-center justify-center p-8 font-sans">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-pcgl-blue uppercase">Completa il Tuo Profilo</h1>
                    <p className="text-gray-500 mt-2">Mancano alcuni dati per finalizzare la tua iscrizione.</p>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 mb-4">
                            <p className="text-[10px] text-orange-700 font-bold uppercase text-center">
                                Se sei già un volontario attivo, potresti aver effettuato l'accesso con un account diverso. 
                                <button type="button" onClick={() => signOut(auth)} className="ml-1 underline text-pcgl-blue">Clicca qui per uscire</button>
                            </p>
                        </div>

                        <p className="text-sm text-center bg-gray-50 p-3 rounded-lg">Email: <strong className="text-pcgl-blue">{user.email}</strong></p>
                        <div className="grid grid-cols-2 gap-4">
                          <input type="text" placeholder="NOME" className="p-4 bg-gray-50 rounded-xl border border-gray-200 font-medium text-sm uppercase" onChange={e => setRegForm({...regForm, nome: e.target.value})} required />
                          <input type="text" placeholder="COGNOME" className="p-4 bg-gray-50 rounded-xl border border-gray-200 font-medium text-sm uppercase" onChange={e => setRegForm({...regForm, cognome: e.target.value})} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-[10px] font-black text-gray-400 ml-3 uppercase">Data di Nascita</label><input type="date" max={new Date().toISOString().split('T')[0]} className="w-full p-4 bg-gray-50 rounded-xl border" onChange={e => setRegForm({...regForm, dataNascita: e.target.value})} required /></div>
                          <div><label className="text-[9px] font-black text-gray-400 ml-3 uppercase">Luogo di Nascita</label><input type="text" placeholder="MILANO" className="w-full p-4 bg-gray-50 rounded-xl border uppercase" onChange={e => setRegForm({...regForm, luogoNascita: e.target.value})} required /></div>
                        </div>
                        <div className="relative">
                           <input type="text" placeholder="CODICE FISCALE (16 CARATTERI)" maxLength={16} className={`w-full p-4 bg-blue-50 text-pcgl-blue rounded-lg border font-bold text-center uppercase ${regForm.cfConfermato ? 'ring-2 ring-green-400' : ''}`} value={regForm.cf} onChange={e => setRegForm({...regForm, cf: e.target.value.toUpperCase(), cfConfermato: false})} required />
                           {!regForm.cfConfermato && regForm.cf.length === 16 && (
                             <button type="button" onClick={() => { if (/^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/i.test(regForm.cf)) setRegForm({...regForm, cfConfermato: true}); else setError("CF non valido"); }} className="absolute right-2 top-2 bg-green-600 text-white px-2 py-1 rounded-md text-xs font-bold uppercase">Verifica</button>
                           )}
                           {regForm.cfConfermato && <Verified className="absolute right-4 top-3 text-green-600" size={18}/>}
                        </div>
                        <select className="w-full p-4 bg-gray-50 rounded-lg font-medium border uppercase" onChange={e => setRegForm({...regForm, sede: e.target.value})} defaultValue="POTENZA">
                          {sediDisponibili.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <div className="flex items-start space-x-2 px-2">
                            <input type="checkbox" checked={regForm.privacyAccepted} onChange={(e) => setRegForm({...regForm, privacyAccepted: e.target.checked})} className="mt-1 rounded border-gray-300 text-pcgl-blue focus:ring-pcgl-blue" />
                            <span className="text-xs text-gray-500">
                                Ho letto e accetto l'<a href="https://www.pcgl.it/privacy.html" target="_blank" rel="noopener noreferrer" className="text-pcgl-blue font-bold underline">Informativa Privacy</a> e acconsento al trattamento dei dati.
                            </span>
                        </div>
                        {error && <p className="text-red-500 font-black text-xs text-center uppercase tracking-widest bg-red-50 p-3 rounded-xl">{error}</p>}
                        <button className="w-full py-4 rounded-xl bg-pcgl-blue text-pcgl-yellow font-bold text-lg shadow-lg">Completa Registrazione</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTI UI: GUIDA PERMESSI ---
const PermissionsGuide = ({ onClose }) => {
  const [perms, setPermissions] = useState({ 
    notifications: typeof Notification !== 'undefined' ? Notification.permission : 'denied', 
    gps: 'prompt', 
    camera: 'prompt' 
  });

  useEffect(() => {
    const check = async () => {
      if (navigator.permissions && navigator.permissions.query) {
        try { const gps = await navigator.permissions.query({ name: 'geolocation' }); setPermissions(p => ({ ...p, gps: gps.state })); gps.onchange = () => setPermissions(p => ({ ...p, gps: gps.state })); } catch(e) {}
        try { const cam = await navigator.permissions.query({ name: 'camera' }); setPermissions(p => ({ ...p, camera: cam.state })); } catch(e) {} 
      }
    };
    check();
  }, []);

  const reqNotif = async () => { 
    if (typeof Notification === 'undefined') return;
    const res = await Notification.requestPermission(); setPermissions(p => ({ ...p, notifications: res })); 
  };
  const reqGPS = () => { navigator.geolocation.getCurrentPosition(() => setPermissions(p => ({ ...p, gps: 'granted' })), () => setPermissions(p => ({ ...p, gps: 'denied' }))); };
  const reqCam = async () => { try { (await navigator.mediaDevices.getUserMedia({ video: true })).getTracks().forEach(t => t.stop()); setPermissions(p => ({ ...p, camera: 'granted' })); } catch { setPermissions(p => ({ ...p, camera: 'denied' })); } };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pcgl-blue via-pcgl-yellow to-pcgl-blue"></div>
            <h2 className="text-2xl font-black text-pcgl-blue uppercase mb-2 text-center">Setup Operativo</h2>
            <p className="text-sm text-gray-500 text-center mb-8">Completa la configurazione per abilitare le funzionalità di emergenza.</p>
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3"><div className={`p-3 rounded-xl ${perms.notifications === 'granted' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}><Bell size={24} /></div><div><p className="font-bold text-sm text-pcgl-blue uppercase">Notifiche</p><p className="text-[10px] text-gray-400 uppercase font-bold">{perms.notifications === 'granted' ? 'Attive' : 'Richieste'}</p></div></div>
                    {perms.notifications !== 'granted' ? <button onClick={reqNotif} className="px-4 py-2 bg-pcgl-blue text-white rounded-lg text-xs font-bold uppercase">Abilita</button> : <CheckCircle className="text-green-600" size={24}/>}
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3"><div className={`p-3 rounded-xl ${perms.gps === 'granted' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}><MapPin size={24} /></div><div><p className="font-bold text-sm text-pcgl-blue uppercase">Posizione</p><p className="text-[10px] text-gray-400 uppercase font-bold">{perms.gps === 'granted' ? 'Attiva' : 'Richiesta'}</p></div></div>
                    {perms.gps !== 'granted' ? <button onClick={reqGPS} className="px-4 py-2 bg-pcgl-blue text-white rounded-lg text-xs font-bold uppercase">Abilita</button> : <CheckCircle className="text-green-600" size={24}/>}
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3"><div className={`p-3 rounded-xl ${perms.camera === 'granted' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}><Camera size={24} /></div><div><p className="font-bold text-sm text-pcgl-blue uppercase">Fotocamera</p><p className="text-[10px] text-gray-400 uppercase font-bold">{perms.camera === 'granted' ? 'Attiva' : 'Richiesta'}</p></div></div>
                    {perms.camera !== 'granted' ? <button onClick={reqCam} className="px-4 py-2 bg-pcgl-blue text-white rounded-lg text-xs font-bold uppercase">Abilita</button> : <CheckCircle className="text-green-600" size={24}/>}
                </div>
            </div>
            <button onClick={onClose} className="w-full mt-8 py-4 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-lg active:scale-95 transition-all">Conferma e Accedi</button>
        </div>
    </div>
  );
};

const ChangelogModal = ({ onClose, version }) => (
  <div className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pcgl-blue via-pcgl-yellow to-pcgl-blue"></div>
      <h2 className="text-2xl font-black text-pcgl-blue uppercase mb-2 text-center">Novità {version}</h2>
      <div className="space-y-4 my-6 max-h-60 overflow-y-auto pr-2">
        <div className="flex gap-3 items-start">
           <div className="mt-1 min-w-[24px]"><CheckCircle size={20} className="text-green-600"/></div>
           <div><p className="font-bold text-sm text-pcgl-blue">Foglio di Marcia Digitale</p><p className="text-xs text-gray-500">Registra uscite e rientri dei mezzi direttamente dall'app con calcolo automatico Km.</p></div>
        </div>
        <div className="flex gap-3 items-start">
           <div className="mt-1 min-w-[24px]"><CheckCircle size={20} className="text-green-600"/></div>
           <div><p className="font-bold text-sm text-pcgl-blue">Registro Spese</p><p className="text-xs text-gray-500">Inserisci spese di carburante e manutenzione durante la chiusura del foglio di marcia.</p></div>
        </div>
        <div className="flex gap-3 items-start">
           <div className="mt-1 min-w-[24px]"><CheckCircle size={20} className="text-green-600"/></div>
           <div><p className="font-bold text-sm text-pcgl-blue">Stato Flotta</p><p className="text-xs text-gray-500">Visualizza in tempo reale chi sta utilizzando i mezzi della sede.</p></div>
        </div>
        <div className="flex gap-3 items-start">
           <div className="mt-1 min-w-[24px]"><CheckCircle size={20} className="text-green-600"/></div>
           <div><p className="font-bold text-sm text-pcgl-blue">Turnistica Avanzata</p><p className="text-xs text-gray-500">Nuovo sistema di prenotazione turni a slot (Mattina/Pomeriggio/Notte).</p></div>
        </div>
      </div>
      <button onClick={onClose} className="w-full py-4 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-lg active:scale-95 transition-all">Ho Capito</button>
    </div>
  </div>
);

const UpdateModal = ({ updateData, onClose }) => {
  const isNative = Capacitor.isNativePlatform();

  const handleUpdate = () => {
    if (isNative) {
       window.open(updateData.downloadUrl, '_blank');
    } else {
       // Force reload for PWA
       if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(async (regs) => {
             // Attendi che tutti i SW siano rimossi prima di ricaricare
             await Promise.all(regs.map(reg => reg.unregister()));
             window.location.href = window.location.href; // Hard reload più sicuro
          });
       } else {
          window.location.reload();
       }
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 via-pcgl-blue to-green-400"></div>
        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><Download size={40} className="text-green-600"/></div>
        <h2 className="text-2xl font-black text-pcgl-blue uppercase mb-2">Aggiornamento Disponibile</h2>
        <p className="text-lg font-bold text-green-600 mb-4">{updateData.androidVersion}</p>
        <p className="text-sm text-gray-500 mb-8">{updateData.note || "È disponibile una nuova versione dell'app. Aggiorna subito per accedere alle ultime funzionalità."}</p>
        <button onClick={handleUpdate} className="block w-full py-4 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-lg active:scale-95 transition-all mb-3">
          {isNative ? 'Scarica Aggiornamento' : 'Aggiorna Ora'}
        </button>
        <button onClick={onClose} className="text-xs font-bold text-gray-400 uppercase hover:text-pcgl-blue">Chiudi</button>
      </div>
    </div>
  );
};

const LiveMap = ({ participations }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const pathsRef = useRef({});
  const [showPaths, setShowPaths] = useState(false);

  useEffect(() => {
    const loadLeaflet = async () => {
      if (window.L) return;
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement("link"); link.id = 'leaflet-css'; link.rel = "stylesheet"; link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(link);
      }
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement("script"); script.id = 'leaflet-js'; script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; script.async = true; script.onload = () => window.dispatchEvent(new Event('leaflet-loaded')); document.body.appendChild(script);
      }
    };
    loadLeaflet();
  }, []);

  useEffect(() => {
    const initMap = () => {
        if (!mapContainerRef.current || mapInstanceRef.current || !window.L) return;
        const map = window.L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false }).setView([40.6, 15.8], 9);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(map);
        mapInstanceRef.current = map;
        setTimeout(() => map.invalidateSize(), 100); // Fix rendering glitch
    };
    if (window.L) initMap();
    else window.addEventListener('leaflet-loaded', initMap);
    
    return () => {
        window.removeEventListener('leaflet-loaded', initMap);
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const map = mapInstanceRef.current;
    
    // FIX: Mostra tutti i volontari accettati con una posizione, non solo quelli checked-in
    const activeUsers = participations.filter(p => p.status === 'accepted' && p.lastLocation);
    
    Object.keys(markersRef.current).forEach(uid => {
        if (!activeUsers.find(p => p.uid === uid)) {
            map.removeLayer(markersRef.current[uid]);
            delete markersRef.current[uid];
            if (pathsRef.current[uid]) {
                map.removeLayer(pathsRef.current[uid]);
                delete pathsRef.current[uid];
            }
        }
    });

    const bounds = [];
    activeUsers.forEach(p => {
        const { lat, lng } = p.lastLocation;
        const isOnline = p.checkIn && !p.checkOut;
        const popupContent = `<b>${p.nome}</b><br>${p.squadra || 'No Squadra'}<br><span style="color:${isOnline?'green':'orange'}">${isOnline ? 'ONLINE' : 'OFFLINE'}</span>`;
        
        if (markersRef.current[p.uid]) {
            markersRef.current[p.uid].setLatLng([lat, lng]).setPopupContent(popupContent);
        } else {
            markersRef.current[p.uid] = window.L.marker([lat, lng]).addTo(map).bindPopup(popupContent);
        }
        bounds.push([lat, lng]);

        if (showPaths && p.path && p.path.length > 0) {
            const latlngs = p.path.map(pt => [pt.lat, pt.lng]);
            const pathColor = isOnline ? '#3b82f6' : '#9ca3af'; // Blue se online, grigio se offline
            
            if (pathsRef.current[p.uid]) {
                pathsRef.current[p.uid].setLatLngs(latlngs);
                pathsRef.current[p.uid].setStyle({ color: pathColor });
            } else {
                pathsRef.current[p.uid] = window.L.polyline(latlngs, { color: pathColor, weight: 4, opacity: 0.8 }).addTo(map);
            }
        } else if (pathsRef.current[p.uid]) {
            map.removeLayer(pathsRef.current[p.uid]);
            delete pathsRef.current[p.uid];
        }
    });
  }, [participations, showPaths]);

  return (
    <>
        <div ref={mapContainerRef} className="w-full h-full rounded-3xl shadow-inner border-2 border-gray-200 z-0" />
        <div className="absolute top-4 right-4 z-[400]">
            <button onClick={() => setShowPaths(!showPaths)} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase shadow-lg transition-all ${showPaths ? 'bg-pcgl-blue text-white border-2 border-white' : 'bg-white text-pcgl-blue border-2 border-pcgl-blue'}`}>
                {showPaths ? 'Nascondi Tracciati' : 'Mostra Tracciati'}
            </button>
        </div>
    </>
  );
};

// --- COMPONENTE GUIDA INSTALLAZIONE PWA ---
const InstallPWA = () => {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState(null); // 'ios' | 'android' | 'desktop'
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return; // Non mostrare su app nativa
    
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) return; // Già installata

    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);

    if (isIOS) setPlatform('ios');
    else if (isAndroid) setPlatform('android');
    else setPlatform('desktop');

    // Gestione Android nativo
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!localStorage.getItem('pwa_install_dismissed')) setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Per iOS mostriamo subito se non dismissed
    if (isIOS && !localStorage.getItem('pwa_install_dismissed')) setShow(true);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShow(false);
      }
    }
  };

  const dismiss = () => { setShow(false); localStorage.setItem('pwa_install_dismissed', 'true'); };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full z-[2000] p-4 animate-in slide-in-from-bottom duration-500 font-sans">
        <div className="bg-white rounded-3xl shadow-2xl p-6 border border-gray-200 relative">
            <button onClick={dismiss} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24}/></button>
            <div className="flex gap-4 items-start">
                <div className="bg-pcgl-blue p-3 rounded-2xl text-white shrink-0"><Download size={32} /></div>
                <div>
                    <h3 className="font-black text-lg text-pcgl-blue uppercase mb-1">Installa App</h3>
                    <p className="text-sm text-gray-600 mb-4 leading-tight">
                        {platform === 'ios' 
                            ? <span>Per installare su iOS: Tocca il tasto <strong>Condividi</strong> (quadrato con freccia) e seleziona <strong>"Aggiungi alla Schermata Home"</strong>.</span>
                            : "Installa l'applicazione per ricevere notifiche e accedere più velocemente."}
                    </p>
                    {platform === 'android' || platform === 'desktop' ? (
                        <button onClick={handleInstallClick} className="bg-pcgl-blue text-white px-6 py-2 rounded-xl font-bold uppercase text-sm shadow-md active:scale-95 transition-all">Installa Ora</button>
                    ) : (
                        <div className="text-[10px] font-bold text-gray-500 uppercase bg-gray-100 p-2 rounded-lg inline-block">Segui le istruzioni sopra 👆</div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

const QrScanner = ({ onScan, onClose, continuous = false }) => {
  useEffect(() => {
    if (!document.getElementById('html5-qrcode')) {
      const script = document.createElement("script");
      script.id = 'html5-qrcode';
      script.src = "https://unpkg.com/html5-qrcode";
      script.async = true;
      script.onload = () => window.dispatchEvent(new Event('html5-qrcode-loaded'));
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    let html5QrCode = null;
    let lastScannedText = null;
    let lastScanTime = 0;
    
    const startScanner = async () => {
      if (!window.Html5Qrcode) return;
      
      try {
          html5QrCode = new window.Html5Qrcode("reader");
          
          const qrCodeSuccessCallback = (decodedText) => {
            if (continuous) {
                const now = Date.now();
                if (decodedText !== lastScannedText || (now - lastScanTime > 3000)) {
                    lastScannedText = decodedText;
                    lastScanTime = now;
                    onScan(decodedText, false);
                }
            } else {
                if (html5QrCode && html5QrCode.isScanning) {
                    html5QrCode.stop().then(() => {
                        html5QrCode.clear();
                        onScan(decodedText, true);
                    }).catch((err) => {
                        console.error("Failed to stop scanner", err);
                        onScan(decodedText, true);
                    });
                } else {
                    onScan(decodedText, true);
                }
            }
          };

          await html5QrCode.start(
              { facingMode: "environment" }, 
              { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
              qrCodeSuccessCallback,
              (errorMessage) => { /* ignora errori di scansione */ }
          );
      } catch (e) {
          console.error("Scanner init error", e);
      }
    };

    // Wait for script load or DOM ready
    const timer = setTimeout(() => {
        if (window.Html5Qrcode) {
            startScanner();
        } else {
            window.addEventListener('html5-qrcode-loaded', startScanner);
        }
    }, 500);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('html5-qrcode-loaded', startScanner);
      if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().then(() => html5QrCode.clear()).catch(e => console.error("Failed to stop scanner on unmount", e));
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 z-[500] flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white p-4 rounded-3xl w-full max-w-sm relative">
         <button onClick={onClose} className="absolute top-2 right-2 p-2 bg-gray-100 rounded-full text-gray-600 z-10 hover:bg-gray-200"><X size={20}/></button>
         <h3 className="text-center font-bold text-pcgl-blue mb-4 uppercase pt-2">Inquadra QR Code</h3>
         <div id="reader" className="w-full overflow-hidden rounded-xl bg-black min-h-[250px]"></div>
         <p className="text-xs text-center text-gray-400 mt-4">Inquadra il codice presente sul tesserino.</p>
      </div>
      
      <div className="mt-8 w-full max-w-xs space-y-3">
          <a href="https://pcgl.it/verifica.html" target="_blank" rel="noopener noreferrer" className="block w-full py-3 bg-pcgl-yellow text-pcgl-blue rounded-xl font-bold uppercase text-center shadow-lg active:scale-95 transition-all">
             Apri Web App Esterna
          </a>
          <button onClick={onClose} className="block w-full py-3 bg-white text-black rounded-xl font-bold uppercase shadow-lg active:scale-95 transition-all">
             Chiudi
          </button>
      </div>
    </div>
  );
};

const LocationPicker = ({ initialPos, onConfirm, onClose }) => {
  const mapRef = useRef(null);
  const [pos, setPos] = useState(initialPos || { lat: 40.64, lng: 15.80 }); 
  const [searchQuery, setSearchQuery] = useState('');
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);

  useEffect(() => {
    const initMap = () => {
        if (!mapRef.current || mapInstance.current || !window.L) return;
        const map = window.L.map(mapRef.current).setView([pos.lat, pos.lng], 13);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
        
        const marker = window.L.marker([pos.lat, pos.lng], { draggable: true }).addTo(map);
        markerInstance.current = marker;

        marker.on('dragend', (e) => {
            const { lat, lng } = e.target.getLatLng();
            setPos({ lat, lng });
        });

        map.on('click', (e) => {
            marker.setLatLng(e.latlng);
            setPos({ lat: e.latlng.lat, lng: e.latlng.lng });
        });

        mapInstance.current = map;
        setTimeout(() => map.invalidateSize(), 200);
    };

    // Caricamento Leaflet se non presente (riutilizza logica esistente o carica se necessario)
    if (!window.L) {
       if (!document.getElementById('leaflet-js')) {
          const script = document.createElement("script"); script.id = 'leaflet-js'; script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; script.async = true; 
          script.onload = () => window.dispatchEvent(new Event('leaflet-loaded')); document.body.appendChild(script);
          const link = document.createElement("link"); link.id = 'leaflet-css'; link.rel = "stylesheet"; link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(link);
       }
       window.addEventListener('leaflet-loaded', initMap);
    } else {
       initMap();
    }

    return () => {
        window.removeEventListener('leaflet-loaded', initMap);
        if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, []);

  const updateMapFromInput = (newLat, newLng) => {
      const lat = parseFloat(newLat);
      const lng = parseFloat(newLng);
      if(!isNaN(lat) && !isNaN(lng)) {
          setPos({ lat, lng });
          if(markerInstance.current) markerInstance.current.setLatLng([lat, lng]);
          if(mapInstance.current) mapInstance.current.setView([lat, lng]);
      }
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        setPos({ lat: newLat, lng: newLng });
        if(markerInstance.current) markerInstance.current.setLatLng([newLat, newLng]);
        if(mapInstance.current) mapInstance.current.setView([newLat, newLng], 16);
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="fixed inset-0 z-[1300] bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[80vh]">
        <div className="p-4 bg-pcgl-blue text-white flex justify-between items-center">
            <h3 className="font-bold uppercase">Seleziona Posizione</h3>
            <button onClick={onClose}><X size={24}/></button>
        </div>
        <div className="p-2 bg-gray-100 flex gap-2 border-b border-gray-200">
            <input 
                type="text" 
                placeholder="Cerca indirizzo o località..." 
                className="flex-1 p-3 rounded-xl border border-gray-300 text-sm outline-none focus:border-pcgl-blue transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="p-3 bg-pcgl-blue text-white rounded-xl shadow-sm active:scale-95 transition-all"><Search size={20}/></button>
        </div>
        <div ref={mapRef} className="flex-1 w-full bg-gray-100 relative"></div>
        <div className="p-6 bg-white border-t border-gray-100 space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold uppercase text-gray-400">Latitudine</label><input type="number" value={pos.lat} onChange={(e) => updateMapFromInput(e.target.value, pos.lng)} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-mono text-sm" step="0.000001"/></div>
                <div><label className="text-[10px] font-bold uppercase text-gray-400">Longitudine</label><input type="number" value={pos.lng} onChange={(e) => updateMapFromInput(pos.lat, e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-mono text-sm" step="0.000001"/></div>
            </div>
            <button onClick={() => onConfirm(pos)} className="w-full py-4 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-lg active:scale-95 transition-all">Conferma Posizione</button>
        </div>
      </div>
    </div>
  );
};

// --- CONFIGURAZIONE MODULI STANDARD ---
const STANDARD_MODULES_DATA = [
    {
        nome: "COLONNA MOBILE E MACCHINE OPERATRICI",
        descrizione: "Gestione mezzi pesanti e macchine operatrici.",
        domande: [
            { id: "q1", testo: "Hai frequentato negli ultimi 3 anni un corso di primo livello - base?", tipo: "booleano" },
            { id: "q2", testo: "Possiedi patente di guida idonea (C, D, E, CQC)?", tipo: "booleano", requisitoAssociato: "Autista" },
            { id: "q3", testo: "Abilitazione specifiche per la conduzione di macchine operatrici?", tipo: "booleano" }
        ]
    },
    {
        nome: "AUTOMEZZI",
        descrizione: "Conduzione automezzi di protezione civile.",
        domande: [
            { id: "q1", testo: "Hai frequentato negli ultimi 3 anni un corso di primo livello - base?", tipo: "booleano" },
            { id: "q2", testo: "Possiedi patente di guida idonea (B, C, D, E, CQC)?", tipo: "booleano", requisitoAssociato: "Autista" },
            { id: "q3", testo: "Hai frequentato un Corso Guida specifico?", tipo: "booleano" }
        ]
    },
    {
        nome: "MONITORAGGIO",
        descrizione: "Attività di monitoraggio del territorio.",
        domande: [
            { id: "q1", testo: "Hai frequentato negli ultimi 3 anni un corso di primo livello - base?", tipo: "booleano" }
        ]
    },
    {
        nome: "AIB - ANTINCENDIO BOSCHIVO",
        descrizione: "Spegnimento incendi boschivi.",
        domande: [
            { id: "q1", testo: "Hai frequentato negli ultimi 3 anni un corso di primo livello - base?", tipo: "booleano" },
            { id: "q2", testo: "Possiedi un Corso AIB riconosciuto?", tipo: "booleano", requisitoAssociato: "AIB" },
            { id: "q3", testo: "Hai idoneità psico-fisica certificata?", tipo: "booleano" }
        ]
    },
    {
        nome: "IDRO, ALLUVIONI, NEVE, DRONI",
        descrizione: "Interventi idrogeologici e utilizzo droni.",
        domande: [
            { id: "q1", testo: "Hai frequentato negli ultimi 3 anni un corso di primo livello - base?", tipo: "booleano" },
            { id: "q2", testo: "Possiedi un attestato per il pilotaggio di Droni?", tipo: "scelta", opzioni: ["No", "A1-A3", "A2", "Certified", "Specific"] }
        ]
    },
    {
        nome: "RICERCA E CINOFILIA",
        descrizione: "Ricerca persone disperse e unità cinofile.",
        domande: [
            { id: "q1", testo: "Hai frequentato negli ultimi 3 anni un corso di primo livello - base?", tipo: "booleano" },
            { id: "q2", testo: "Hai frequentato un Corso Ricerca persone disperse?", tipo: "booleano", requisitoAssociato: "Soccorritore" }
        ]
    },
    {
        nome: "CUCINE DA CAMPO",
        descrizione: "Allestimento e gestione cucine in emergenza.",
        domande: [
            { id: "q1", testo: "Hai frequentato negli ultimi 3 anni un corso di primo livello - base?", tipo: "booleano" },
            { id: "q2", testo: "Possiedi formazione HACCP?", tipo: "booleano" }
        ]
    },
    {
        nome: "LOGISTICO",
        descrizione: "Supporto logistico e gestione materiali.",
        domande: [
            { id: "q1", testo: "Hai frequentato negli ultimi 3 anni un corso di primo livello - base?", tipo: "booleano" },
            { id: "q2", testo: "Hai formazione logistica?", tipo: "booleano", requisitoAssociato: "Logistica" }
        ]
    },
    {
        nome: "TLC",
        descrizione: "Telecomunicazioni e ponti radio.",
        domande: [
            { id: "q1", testo: "Hai frequentato negli ultimi 3 anni un corso di primo livello - base?", tipo: "booleano" },
            { id: "q2", testo: "Possiedi patente di Radioamatore?", tipo: "booleano", requisitoAssociato: "Radioamatore" }
        ]
    },
    {
        nome: "PMA - SALA OPERATIVA",
        descrizione: "Gestione Posto Medico Avanzato e Sala Operativa.",
        domande: [
            { id: "q1", testo: "Hai frequentato negli ultimi 3 anni un corso di primo livello - base?", tipo: "booleano" },
            { id: "q2", testo: "Capacità di utilizzo di principali strumenti informatici?", tipo: "booleano", requisitoAssociato: "Sala Operativa" }
        ]
    },
    {
        nome: "SEGRETERIA IN EMERGENZA",
        descrizione: "Supporto amministrativo in emergenza.",
        domande: [
            { id: "q1", testo: "Hai frequentato negli ultimi 3 anni un corso di primo livello - base?", tipo: "booleano" },
            { id: "q2", testo: "Utilizzo strumenti informatici?", tipo: "booleano" }
        ]
    },
    {
        nome: "COMUNICAZIONE",
        descrizione: "Gestione comunicazione e stampa.",
        domande: [
            { id: "q1", testo: "Hai frequentato negli ultimi 3 anni un corso di primo livello - base?", tipo: "booleano" }
        ]
    },
    {
        nome: "SANITARIO",
        descrizione: "Supporto sanitario.",
        domande: [
            { id: "q1", testo: "Hai frequentato negli ultimi 3 anni un corso di primo livello - base?", tipo: "booleano" },
            { id: "q2", testo: "Qualifica sanitaria riconosciuta?", tipo: "testo", placeholder: "Es. Soccorritore, Infermiere, Medico..." }
        ]
    },
    {
        nome: "FORMAZIONE",
        descrizione: "Formazione volontari.",
        domande: [
            { id: "q1", testo: "Hai frequentato negli ultimi 3 anni un corso di primo livello - base?", tipo: "booleano" },
            { id: "q2", testo: "Hai esperienza da formatore?", tipo: "booleano", requisitoAssociato: "Formatore" }
        ]
    },
    {
        nome: "JUNIOR",
        descrizione: "Gruppo giovani.",
        domande: [
            { id: "q1", testo: "Sei Under 18?", tipo: "booleano" }
        ]
    }
];


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    // Log automatico su Firestore per debug
    try {
        addDoc(collection(db, 'logs'), {
            azione: "CRASH_APP",
            dettagli: `Errore: ${error.toString()} \nStack: ${errorInfo?.componentStack?.slice(0, 500)}`,
            autore: "SISTEMA (ErrorBoundary)",
            data: new Date().toISOString(),
            userAgent: navigator.userAgent || 'Unknown'
        });
    } catch (e) { console.error("Log crash fallito", e); }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center font-sans">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md border border-gray-100 w-full">
            <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <TriangleAlert size={48} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-[#001a33] mb-2 uppercase">Ops! Qualcosa non va.</h2>
            <p className="text-gray-500 mb-8 text-sm font-medium">Si è verificato un errore imprevisto. Non preoccuparti, i tuoi dati sono al sicuro.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-4 bg-[#001a33] text-white rounded-xl font-bold uppercase shadow-lg active:scale-95 transition-all hover:bg-[#002b5c]"
            >
              Ricarica Applicazione
            </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

function AppContent() {
  // --- STATI DI SISTEMA ---
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(() => {
    const cached = localStorage.getItem(CACHE.USER);
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); 
  const [subPage, setSubPage] = useState(null); 
  const [showNotification, setShowNotification] = useState(true);
  const [cachedProfilePic, setCachedProfilePic] = useState(localStorage.getItem('pcgl_cached_profile_pic') || null);
  const [cachedDocs, setCachedDocs] = useState({}); // Cache per i documenti PDF
  
  // --- DATABASE REAL-TIME ---
  const [pendingVolunteers, setPendingVolunteers] = useState([]);
  const [risorseSede, setRisorseSede] = useState([]);
  const [attivazioniAttive, setAttivazioniAttive] = useState([]);
  const [newsFeed, setNewsFeed] = useState([]);
  const [corsiFormazione, setCorsiFormazione] = useState([]);
  const [moodleCourses, setMoodleCourses] = useState([]);
  const [moodleStatus, setMoodleStatus] = useState('idle'); // 'idle' | 'loading' | 'error' | 'success'
  const [moodleErrorMsg, setMoodleErrorMsg] = useState('');
  const [moodleUserFound, setMoodleUserFound] = useState(true);
  const [allUsers, setAllUsers] = useState([]); 
  const [mieIscrizioni, setMieIscrizioni] = useState([]);
  const [iscrittiAlCorso, setIscrittiAlCorso] = useState([]); 
  const [selectedCourseReport, setSelectedCourseReport] = useState('');
  const [userDocuments, setUserDocuments] = useState([]);
  const [documentsFeed, setDocumentsFeed] = useState([]);
  const [hasNewDocs, setHasNewDocs] = useState(false);
  const [systemLogs, setSystemLogs] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [telegramUploads, setTelegramUploads] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]); // Classifica Gamification
  const [mezzi, setMezzi] = useState(() => {
    const cached = localStorage.getItem(CACHE.VEHICLES);
    return cached ? JSON.parse(cached) : [];
  });
  const [newMessage, setNewMessage] = useState('');
  const prevPendingCount = useRef(0);
  const lastLocationUpdate = useRef(0);
  const [anagraficaTab, setAnagraficaTab] = useState('iscritti');
  const [participationStatus, setParticipationStatus] = useState('pending'); // pending, accepted, declined
  const [selectedZones, setSelectedZones] = useState([]);
  const [showMassMail, setShowMassMail] = useState(false);
  const [syncingMoodle, setSyncingMoodle] = useState(false);
  const [massMailSubject, setMassMailSubject] = useState('');
  const [massMailBody, setMassMailBody] = useState('');
  const [newAlertSpec, setNewAlertSpec] = useState('');
  const [selectedAlertForTeams, setSelectedAlertForTeams] = useState(null);
  const [alertParticipations, setAlertParticipations] = useState([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [myParticipation, setMyParticipation] = useState(null);
  const [closedAlerts, setClosedAlerts] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [verifySearch, setVerifySearch] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [isTelegramLinking, setIsTelegramLinking] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availabilities, setAvailabilities] = useState([]);
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);
  const [filterSpec, setFilterSpec] = useState('');
  const [filterSede, setFilterSede] = useState('');
  const [filterSpecializzazione, setFilterSpecializzazione] = useState('');
  const [filterStato, setFilterStato] = useState('attivo'); // attivo, sospeso, tutti
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [volunteerHistory, setVolunteerHistory] = useState([]); // NUOVO: Storico attività
  const [archivedNews, setArchivedNews] = useState([]); // NUOVO: News archiviate
  const [newNewsExpiration, setNewNewsExpiration] = useState(''); // NUOVO: Scadenza news
  const [newNewsFile, setNewNewsFile] = useState(null); // NUOVO: File allegato news
  const [newNewsImportant, setNewNewsImportant] = useState(false); // NUOVO: Importanza news
  const [newNewsTelegram, setNewNewsTelegram] = useState(true); // Integrazione Telegram
  const [showRejectionModal, setShowRejectionModal] = useState(false); // NUOVO: Modale rifiuto
  const [rejectionReason, setRejectionReason] = useState(''); // NUOVO: Motivo rifiuto
  const [volunteerToRejectId, setVolunteerToRejectId] = useState(null); // NUOVO: ID da rifiutare
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState(null); // 'verify' | 'checkin'
  const [showCameraPermissionModal, setShowCameraPermissionModal] = useState(false); // NUOVO
  const [hasNewNews, setHasNewNews] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [availabilityForm, setAvailabilityForm] = useState({ date: '', start: '08:00', end: '20:00', isEdit: false });
  const [showPermissionsGuide, setShowPermissionsGuide] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [appVersion] = useState('v1.2.2');
  const [updateAvailable, setUpdateAvailable] = useState(null); // NUOVO: Stato aggiornamento
  const [versionForm, setVersionForm] = useState({ androidVersion: '', downloadUrl: '', forceUpdate: false, note: '', maintenance: false });
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false); // NUOVO: Stato manutenzione
  const [selectedNews, setSelectedNews] = useState(null); // Stato per dettaglio news
  const [showProfileWarning, setShowProfileWarning] = useState(false);
  const [showNotifReminder, setShowNotifReminder] = useState(false);
  const [hasConfirmedRead, setHasConfirmedRead] = useState(false);
  const [readReceipts, setReadReceipts] = useState([]);
  const [dismissedAlertId, setDismissedAlertId] = useState(null);
  const [showModulesPromo, setShowModulesPromo] = useState(false);
  const [promoDontShowAgain, setPromoDontShowAgain] = useState(false);
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(false);
  const [searchedVolunteers, setSearchedVolunteers] = useState([]); // NUOVO: Risultati ricerca server-side
  const searchCache = useRef({}); // CACHE RICERCA
  const [newConfigSede, setNewConfigSede] = useState('');
  const [newConfigZone, setNewConfigZone] = useState('');
  const [newConfigSpec, setNewConfigSpec] = useState('');
  const [editingNewsId, setEditingNewsId] = useState(null);
  const [sediList, setSediList] = useState([]);
  const [selectedSedeDetail, setSelectedSedeDetail] = useState(null);
  const [showPresidentGuide, setShowPresidentGuide] = useState(false);
  const [showMoodleGuide, setShowMoodleGuide] = useState(false);
  const [totalUsersCount, setTotalUsersCount] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportColumns, setExportColumns] = useState({
      cognome: true, nome: true, cf: true, dataNascita: false, luogoNascita: false,
      sede: true, stato: true, ruolo: true, specializzazioni: true, patenti: false,
      email: true, telefono: true, indirizzo: false, citta: false, cap: false, gruppoSanguigno: false, ultimoAccesso: true
  });
  const [exportFilters, setExportFilters] = useState({ regione: '', citta: '' });
  const [pendingAreaId, setPendingAreaId] = useState(null);

  // --- STATI GESTIONE PRESENZE LIVE (NUOVI) ---
  const [attendanceSessions, setAttendanceSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionRecords, setSessionRecords] = useState([]);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionMode, setNewSessionMode] = useState('esterno');
  const [newSessionType, setNewSessionType] = useState('corso');
  const [newSessionRequireLocation, setNewSessionRequireLocation] = useState(false);
  const [newSessionLocation, setNewSessionLocation] = useState(null);
  const [showSessionLocationPicker, setShowSessionLocationPicker] = useState(false);
  const [moodleCompareSessionId, setMoodleCompareSessionId] = useState(null);
  const [moodleCompareRecords, setMoodleCompareRecords] = useState([]);

  // --- STATI MOODLE AVANZATI ---
  const [moodleEnrolledCourseIds, setMoodleEnrolledCourseIds] = useState([]);
  const [moodleCourseReport, setMoodleCourseReport] = useState(null);
  const [loadingMoodleReport, setLoadingMoodleReport] = useState(false);
  const [moodleFilterSede, setMoodleFilterSede] = useState('');
  const [moodleUserTypeFilter, setMoodleUserTypeFilter] = useState('');
  const [moodleSortBy, setMoodleSortBy] = useState('name');
  const [showMoodleMail, setShowMoodleMail] = useState(false);
  const [moodleMailSubject, setMoodleMailSubject] = useState('');
  const [moodleMailBody, setMoodleMailBody] = useState('');
  
  // --- STATI AREE TEMATICHE ---
  const [areeTematiche, setAreeTematiche] = useState([]);
  const [viewingArea, setViewingArea] = useState(null);
  const [areaMessages, setAreaMessages] = useState([]);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [areaForm, setAreaForm] = useState({ id: null, titolo: '', descrizione: '', sediAbilitate: [], utentiAbilitati: [], linkDrive: '', immagineCopertina: '' });
  const [newAreaMessage, setNewAreaMessage] = useState('');

  const togglePinAreaMessage = async (msgId, currentPin) => {
      try {
          await updateDoc(doc(db, 'aree_tematiche', viewingArea.id, 'chat', msgId), { inEvidenza: !currentPin });
          showToast(currentPin ? "Messaggio rimosso dall'evidenza." : "Messaggio messo in evidenza!");
      } catch (e) { console.error(e); }
  };

  const prevAlertsRef = useRef([]);

  // --- STATI REPORT ORE ---
  const [hoursReportRange, setHoursReportRange] = useState({ 
      start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // 1 Gennaio anno corrente
      end: new Date().toISOString().split('T')[0] // Oggi
  });
  const [hoursReportData, setHoursReportData] = useState(null);
  const [calculatingHours, setCalculatingHours] = useState(false);
  
  // --- STATI ANAGRAFICA SEDE ---
  const [sedeAnagrafica, setSedeAnagrafica] = useState({
      nomeAssociazione: '',
      codiceFiscale: '',
      dataCostituzione: '',
      iban: '',
      indirizzoLegale: '',
      posizione: null,
      telefono: '',
      pec: '',
      email: '',
      proprieta: '',
      numeroStanze: '',
      serviziIgienici: '',
      dotazioneInformatica: '',
      foresteria: '',
      altro: '',
      logo: ''
  });
  const [loadingSedeAnagrafica, setLoadingSedeAnagrafica] = useState(false);

  // --- STATI GESTIONE MODULI DATI (CUSTOM FORMS) ---
  const [customForms, setCustomForms] = useState([]);
  const [formEditor, setFormEditor] = useState({ id: null, title: '', description: '', questions: [], expirationDate: '', responsibleId: null, responsibleName: '' });
  const [showFormEditorModal, setShowFormEditorModal] = useState(false);
  const [newFormQuestion, setNewFormQuestion] = useState({ text: '', type: 'text', options: [], minDate: '', maxDate: '', required: false });
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(-1);
  const [tempOption, setTempOption] = useState('');
  const [viewingResponses, setViewingResponses] = useState(null);
  const [responsesList, setResponsesList] = useState([]);
  const [showFormExportModal, setShowFormExportModal] = useState(false);
  const [formExportColumns, setFormExportColumns] = useState({});
  const [newsFormId, setNewsFormId] = useState(''); // ID Modulo allegato alla news
  const [fillingForm, setFillingForm] = useState(null); // Modulo in compilazione (User)
  const [previewSource, setPreviewSource] = useState(null); // Per gestire il back dall'anteprima
  const [showCampiScuolaModal, setShowCampiScuolaModal] = useState(false);
  const [editingResponseId, setEditingResponseId] = useState(null); // ID risposta in modifica

  const [fillingAnswers, setFillingAnswers] = useState({}); // Risposte utente
  const [responsibleSearch, setResponsibleSearch] = useState('');
  const [responsibleSearchResults, setResponsibleSearchResults] = useState([]);
  const [occupiedSlots, setOccupiedSlots] = useState([]); // Slot date occupati

  // --- REF PER DATI UTENTE (Per listener stabili) ---
  const userDataRef = useRef(userData);
  useEffect(() => { userDataRef.current = userData; }, [userData]);

  // --- REF PER DRAG & DROP DOMANDE ---
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // --- STATI UTENTE ORFANO & RECUPERO ---
  const [isOrphanedUser, setIsOrphanedUser] = useState(false);
  const [editingOrphan, setEditingOrphan] = useState(null);
  const [orphanForm, setOrphanForm] = useState(null);
  
  // Ref per gestire il flusso di registrazione ed evitare race conditions
  const isRegistering = useRef(false);
  const [customTelegramMessage, setCustomTelegramMessage] = useState('');
  const [tgButtonText, setTgButtonText] = useState('');
  const [tgButtonUrl, setTgButtonUrl] = useState('');
  const [sendingTelegram, setSendingTelegram] = useState(false);

  // --- CONFIGURAZIONE DINAMICA (CRITICITÀ C) ---
  const [appConfig, setAppConfig] = useState({ 
      sedi: DEFAULT_SEDI_ZONES, 
      specs: DEFAULT_SPECIALIZZAZIONI 
  });

  // --- STATI RECUPERO ISCRIZIONI ---
  const [recovering, setRecovering] = useState(false);
  const [recoveredAccounts, setRecoveredAccounts] = useState(null);
  const [previousPage, setPreviousPage] = useState('admin_search'); // Navigazione back dinamica
  
  // --- STATO PREFERENZE ---
  const [prefs, setPrefs] = useState({
    sound: localStorage.getItem('pcgl_sound') !== 'false',
    vibration: localStorage.getItem('pcgl_vibration') !== 'false'
  });
  const updatePref = (key, val) => { setPrefs(prev => ({ ...prev, [key]: val })); localStorage.setItem(`pcgl_${key}`, val); };

  // --- APPLICAZIONE TEMA (FORZATO LIGHT) ---
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    localStorage.removeItem('pcgl_theme');
  }, []);
  
  // --- STATI GESTIONE MEZZI ---
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ id: null, tipo: '', tipologia: '', targa: '', scadenzaAssicurazione: '', scadenzaRevisione: '', kmAttuali: '', sede: '' });
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showVehicleDocsModal, setShowVehicleDocsModal] = useState(false);
  const [vehicleDocFile, setVehicleDocFile] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [openMovements, setOpenMovements] = useState([]); // NUOVO: Lista movimenti aperti
  const [movementForm, setMovementForm] = useState({ mode: 'uscita', km: '', motivazione: '', note: '', spese: [], newSpesaTipo: 'carburante', newSpesaImporto: '', checklist: { carrozzeria: false, pneumatici: false, attrezzatura_dpi: false, livelli_carburante: false } });
  const [profileForm, setProfileForm] = useState({ telefono: '', indirizzo: '', citta: '', cap: '', gruppoSanguigno: '' });

  // --- STATI TURNISTICA AVANZATA ---
  const [shiftEvents, setShiftEvents] = useState([]);
  const [newShift, setNewShift] = useState({ titolo: '', data: '', slots: [] });
  const [tempSlot, setTempSlot] = useState({ nome: 'Mattina', oraInizio: '08:00', oraFine: '14:00', max: 3 });
  const [modulesList, setModulesList] = useState([]); // Spostato qui per evitare errore #310

  // --- STATI UI & FORM ---
  const [showRegistration, setShowRegistration] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [newSpecializzazione, setNewSpecializzazione] = useState('');
  const [newPatente, setNewPatente] = useState('');
  const [newNewsTitle, setNewNewsTitle] = useState('');
  const [newNewsContent, setNewNewsContent] = useState('');
  const [newNewsImgPreview, setNewNewsImgPreview] = useState(''); // ID Drive Anteprima
  const [newNewsImgInternal, setNewNewsImgInternal] = useState(''); // ID Drive Interna
  const [newNewsLink, setNewNewsLink] = useState(''); // Link opzionale
  const [newNewsVisibility, setNewNewsVisibility] = useState('pubblica'); // 'pubblica' | 'riservata'
  const [newNewsTargetRole, setNewNewsTargetRole] = useState('tutti');
  const [newNewsTargetSede, setNewNewsTargetSede] = useState('tutte');
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceType, setNewResourceType] = useState('');
  const [newResourceQuantity, setNewResourceQuantity] = useState(1);
  const [newAlertTitle, setNewAlertTitle] = useState('');
  const [newAlertDetails, setNewAlertDetails] = useState('');
  const [newAlertLocation, setNewAlertLocation] = useState(null);
  const [newAlertColor, setNewAlertColor] = useState('gialla');
  const [sendNotification, setSendNotification] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('Altro');
  const [newDocFile, setNewDocFile] = useState(null);
  const [docUploadMode, setDocUploadMode] = useState('file'); // 'link' or 'file'
  const [targetSedeDoc, setTargetSedeDoc] = useState('TUTTE');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [docSearchTerm, setDocSearchTerm] = useState('');
  const [docSearchType, setDocSearchType] = useState('');
  const [newCorsoManuale, setNewCorsoManuale] = useState('');
  const [newDataCorsoManuale, setNewDataCorsoManuale] = useState('');
  const [meteoData, setMeteoData] = useState({ oggi: 'unknown', domani: 'unknown', zona: '' });
  const [reportText, setReportText] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [pendingForm, setPendingForm] = useState(null);
  const [pendingNotification, setPendingNotification] = useState(null);
  const [pendingTab, setPendingTab] = useState('info');
  const [quizState, setQuizState] = useState({ q: 0, score: 0, finished: false });
  
  const [regForm, setRegForm] = useState({
    nome: '', cognome: '', dataNascita: '', luogoNascita: '', cf: '', sede: 'POTENZA', email: '', password: '', confirmPassword: '', cfConfermato: false, privacyAccepted: false
  });

  const sediDisponibili = appConfig.sedi.map(s => s.s)
    .filter(s => s !== 'SEDE TEST FITTIZIA' || userData?.ruolo === 'superadmin' || userData?.originalRuolo === 'superadmin')
    .sort();

  // --- SISTEMA TOAST (NOTIFICHE INTERNE) ---
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- SYNC CONFIGURAZIONE (CREAZIONE AUTOMATICA SE MANCANTE) ---
  useEffect(() => {
      const docRef = doc(db, 'settings', 'app_config');
      const unsub = onSnapshot(docRef, (snap) => {
          if(snap.exists()) {
              setAppConfig({ sedi: snap.data().sedi || DEFAULT_SEDI_ZONES, specs: snap.data().specs || DEFAULT_SPECIALIZZAZIONI });
          } else if (userData && ['admin', 'superadmin'].includes(userData.ruolo)) {
              // Crea configurazione iniziale se non esiste e l'utente è admin
              setDoc(docRef, { sedi: DEFAULT_SEDI_ZONES, specs: DEFAULT_SPECIALIZZAZIONI });
              console.log("Configurazione iniziale creata su Firestore.");
          }
      }, (e) => console.error("Config sync error", e));
      return () => unsub();
  }, [userData?.ruolo]);

  // --- OFFLINE DETECTION & CACHE SYNC ---
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const handleStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => { window.removeEventListener('online', handleStatus); window.removeEventListener('offline', handleStatus); };
  }, []);

  useEffect(() => { if (userData) localStorage.setItem(CACHE.USER, JSON.stringify(userData)); }, [userData]);
  useEffect(() => { if (mezzi.length > 0) localStorage.setItem(CACHE.VEHICLES, JSON.stringify(mezzi)); }, [mezzi]);

  // --- CACHE IMMAGINE PROFILO CON CONTROLLO VERSIONE ---
  useEffect(() => {
    if (userData?.fotoProfilo) {
        const cachedUrl = localStorage.getItem('pcgl_cached_profile_url');
        // CONTROLLO VERSIONE: Se l'URL salvato è diverso da quello attuale, aggiorna la cache
        if (cachedUrl !== userData.fotoProfilo) {
            fetch(userData.fotoProfilo)
                .then(res => res.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64 = reader.result;
                        try {
                            localStorage.setItem('pcgl_cached_profile_pic', base64);
                            localStorage.setItem('pcgl_cached_profile_url', userData.fotoProfilo); // Salva versione corrente
                            setCachedProfilePic(base64);
                        } catch (e) {
                            console.warn("Quota localStorage superata per immagine profilo");
                        }
                    };
                    reader.readAsDataURL(blob);
                })
                .catch(e => console.error("Errore cache immagine:", e));
        }
    }
  }, [userData?.fotoProfilo]);

  // --- CACHE DOCUMENTI MEZZI (PDF) CON CONTROLLO VERSIONE ---
  useEffect(() => {
    if (showVehicleDocsModal && selectedVehicle?.documenti) {
        selectedVehicle.documenti.forEach(doc => {
            // Genera chiave univoca basata su nome e data (per evitare collisioni)
            const safeKey = `pcgl_doc_${doc.nome.replace(/[^a-z0-9]/gi, '_')}_${new Date(doc.data).getTime()}`;
            const cachedVersion = localStorage.getItem(`${safeKey}_version`);
            const cachedData = localStorage.getItem(`${safeKey}_data`);

            // CONTROLLO VERSIONE: Verifica se l'URL è cambiato rispetto alla cache
            if (cachedData && cachedVersion === doc.url) {
                setCachedDocs(prev => ({ ...prev, [doc.url]: cachedData }));
            } else {
                fetch(doc.url).then(res => res.blob()).then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        try {
                            localStorage.setItem(`${safeKey}_data`, reader.result);
                            localStorage.setItem(`${safeKey}_version`, doc.url); // Salva versione (URL)
                            setCachedDocs(prev => ({ ...prev, [doc.url]: reader.result }));
                        } catch(e) { console.warn("Quota localStorage superata per documenti"); }
                    };
                    reader.readAsDataURL(blob);
                }).catch(e => console.error("Errore cache PDF:", e));
            }
        });
    }
  }, [showVehicleDocsModal, selectedVehicle]);

  // --- LOGICA SINCRONIZZAZIONE (FIREBASE ENGINE) ---
  useEffect(() => {
    let unsubscribes = [];
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // --- SICUREZZA: Cleanup su cambio utente ---
      // 1. Rimuovi tutti i listener precedenti per evitare data leak tra sessioni.
      unsubscribes.forEach(unsub => unsub());
      unsubscribes = [];

      // 2. Resetta gli stati critici per evitare flash di dati vecchi.
      setUserData(null);
      setAllUsers([]);
      setPendingVolunteers([]);
      setSystemLogs([]);
      setCustomForms([]);
      setMezzi([]);

      // Se stiamo registrando, ignoriamo l'aggiornamento auth per evitare falsi orfani
      if (isRegistering.current) return;

      try {
        setUser(currentUser);
        if (currentUser) {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            
            // --- SIMULAZIONE RUOLO SUPERADMIN ---
            const simRole = localStorage.getItem('pcgl_simulated_role');
            if (data.ruolo === 'superadmin') {
                data.originalRuolo = 'superadmin';
                data.originalSede = data.sede;
                if (simRole) {
                    data.ruolo = simRole;
                    data.sede = 'SEDE TEST FITTIZIA';
                }
            } else {
                localStorage.removeItem('pcgl_simulated_role');
            }

            setUserData(data);
            
            // --- UPDATE ULTIMO ACCESSO ---
            const lastAccess = data.ultimoAccesso ? new Date(data.ultimoAccesso) : new Date(0);
            if (new Date() - lastAccess > 3600000) { // Aggiorna se è passata più di 1 ora dall'ultimo accesso
               updateDoc(doc(db, 'users', currentUser.uid), { ultimoAccesso: new Date().toISOString() }).catch(e => console.error(e));
            }
            
            unsubscribes.push(onSnapshot(collection(db, 'corsi'), s => setCorsiFormazione(s.docs.map(d => ({id: d.id, ...d.data()}))), e => console.log("Sync Corsi:", e.code)));
            unsubscribes.push(onSnapshot(query(collection(db, 'news'), orderBy('timestamp', 'desc')), s => {
              const news = s.docs.map(d => ({id: d.id, ...d.data()})).filter(n => !n.archived);
              
              const visibleNews = news.filter(n => {
                  if (['admin', 'superadmin', 'coordinamento'].includes(data.ruolo)) return true;
                  if (data.ruolo === 'presidente' && n.sede === data.sede) return true;
                  if (n.visibilita !== 'riservata') return true;
                  const roleMatch = n.targetRuolo === 'tutti' || n.targetRuolo === data.ruolo;
                  const sedeMatch = n.targetSede === 'tutte' || n.targetSede === data.sede;
                  return roleMatch && sedeMatch;
              });

              setNewsFeed(visibleNews);
              const lastViewed = localStorage.getItem('lastNewsViewed');
              if (visibleNews.length > 0) {
                const latest = visibleNews[0].timestamp ? visibleNews[0].timestamp.toMillis() : Date.now();
                if (!lastViewed || latest > Number(lastViewed)) setHasNewNews(true);
              }
            }, e => console.log("Sync News:", e.code)));
            unsubscribes.push(onSnapshot(query(collection(db, 'documenti'), orderBy('data', 'desc')), s => setDocumentsFeed(s.docs.map(d => ({id: d.id, ...d.data()}))), e => console.log("Sync Docs:", e.code)));
            
            unsubscribes.push(onSnapshot(query(collection(db, 'attivazioni'), where('stato', '==', 'attiva')), s => {
              const allAlerts = s.docs.map(d => ({id: d.id, ...d.data()}));
              // Admin/SuperAdmin/Coord vedono tutto per gestire. Altri solo se pertinente.
              const relevant = allAlerts.filter(a => {
                 if (['admin', 'superadmin', 'coordinamento'].includes(data.ruolo)) return true;
                 const zoneMatch = Array.isArray(a.zone) ? a.zone.includes(data.sede) : a.zona === data.sede;
                 const specMatch = !a.richiestaSpecializzazione || (data.specializzazioni && data.specializzazioni.includes(a.richiestaSpecializzazione));
                 return zoneMatch && specMatch;
              });
              relevant.sort((a, b) => new Date(b.dataAttivazione) - new Date(a.dataAttivazione));
              setAttivazioniAttive(relevant);
            }, e => console.log("Sync Allerte:", e.code)));

            unsubscribes.push(onSnapshot(query(collection(db, 'iscrizioni_corsi'), where('volontarioId', '==', currentUser.uid)), s => setMieIscrizioni(s.docs.map(d => d.data().corsoId)), e => console.log("Sync Iscrizioni:", e.code)));

            // SYNC DOCUMENTI VOLONTARIO (Attestati HQ)
            // FIX: Rimosso orderBy dalla query per evitare errori di indice mancante. Ordinamento fatto lato client.
            unsubscribes.push(onSnapshot(query(collection(db, 'documenti_volontari'), where('volontarioId', '==', currentUser.uid)), s => {
                let docs = s.docs.map(d => ({id: d.id, ...d.data()}));
                
                // Ordinamento Client-Side (Decrescente per data)
                docs.sort((a, b) => {
                    const dateA = a.dataEmissione?.toMillis ? a.dataEmissione.toMillis() : (a.dataEmissione ? new Date(a.dataEmissione).getTime() : 0);
                    const dateB = b.dataEmissione?.toMillis ? b.dataEmissione.toMillis() : (b.dataEmissione ? new Date(b.dataEmissione).getTime() : 0);
                    return dateB - dateA;
                });

                setUserDocuments(docs);
                
                // Check nuovi documenti
                const lastViewed = localStorage.getItem('lastDocsViewed');
                if (docs.length > 0) {
                    const latestDocDate = docs[0].dataEmissione?.toMillis ? docs[0].dataEmissione.toMillis() : (docs[0].dataEmissione ? new Date(docs[0].dataEmissione).getTime() : 0);
                    if (!lastViewed || latestDocDate > Number(lastViewed)) setHasNewDocs(true);
                }
            }, e => console.log("Sync User Docs:", e.code)));

            // SYNC MEZZI
            let qMezzi = collection(db, 'mezzi');
            if (['volontario', 'presidente'].includes(data.ruolo)) {
              qMezzi = query(qMezzi, where('sede', '==', data.sede));
            }
            unsubscribes.push(onSnapshot(qMezzi, s => setMezzi(s.docs.map(d => ({...d.data(), id: d.id}))), e => console.log("Sync Mezzi:", e.code)));

            // SYNC MOVIMENTI APERTI (FOGLI DI MARCIA)
            let qMov = query(collection(db, 'movimenti_mezzi'), where('stato', '==', 'aperto'));
            if (['volontario', 'presidente'].includes(data.ruolo)) {
                qMov = query(qMov, where('sede', '==', data.sede));
            }
            unsubscribes.push(onSnapshot(qMov, s => setOpenMovements(s.docs.map(d => ({id: d.id, ...d.data()}))), e => console.error("Movimenti sync error:", e)));

            // SYNC TURNI PROGRAMMATI
            const today = new Date().toISOString().split('T')[0];
            let qTurni = query(collection(db, 'turni_programmati'), where('data', '>=', today), orderBy('data', 'asc'));
            unsubscribes.push(onSnapshot(qTurni, s => setShiftEvents(s.docs.map(d => ({id: d.id, ...d.data()}))), e => console.error("Turni sync error:", e)));

            // Logica permessi avanzati
            if (['presidente', 'coordinamento', 'admin', 'superadmin'].includes(data.ruolo)) {
              let qPending = query(collection(db, 'users'), where('stato', '==', 'pendente'));
              let qRisorse = collection(db, 'risorse');
              let qUsers = collection(db, 'users');
              
              if (data.ruolo === 'presidente') {
                 qPending = query(qPending, where('sede', '==', data.sede));
                 qRisorse = query(qRisorse, where('sede', '==', data.sede));
                 // Il Presidente vede solo i volontari della sua sede
                 qUsers = query(qUsers, where('sede', '==', data.sede), where('stato', 'in', ['attivo', 'sospeso']));
              } else {
                 // CRITICITÀ B RISOLTA: Admin/Coord scaricano SOLO lo Staff inizialmente.
                 // I volontari vengono cercati on-demand.
                 qUsers = query(qUsers, where('ruolo', 'in', ['presidente', 'coordinamento', 'admin', 'superadmin']));
              }
              
              unsubscribes.push(onSnapshot(qPending, s => setPendingVolunteers(s.docs.map(d => ({id: d.id, ...d.data()}))), e => console.log("Sync Pending:", e.code)));
              unsubscribes.push(onSnapshot(qRisorse, s => setRisorseSede(s.docs.map(d => ({id: d.id, ...d.data()}))), e => console.log("Sync Risorse:", e.code)));
              unsubscribes.push(onSnapshot(qUsers, s => setAllUsers(s.docs.map(d => ({id: d.id, ...d.data()}))), e => console.log("Sync Users:", e.code)));
              unsubscribes.push(onSnapshot(collection(db, 'moduli'), s => setModulesList(s.docs.map(d => ({id: d.id, ...d.data()}))), e => console.warn("Moduli list sync error:", e)));
            }

            // Sync Custom Forms (Separato per gestire permessi Presidente)
            if (['coordinamento', 'admin', 'superadmin'].includes(data.ruolo)) {
              unsubscribes.push(onSnapshot(collection(db, 'custom_forms'), s => setCustomForms(s.docs.map(d => ({id: d.id, ...d.data()}))), e => console.warn("Custom forms sync error:", e)));
            } else {
              // Sync forms where user is responsible (Presidenti & Volontari)
              unsubscribes.push(onSnapshot(query(collection(db, 'custom_forms'), where('responsibleId', '==', currentUser.uid)), s => setCustomForms(s.docs.map(d => ({id: d.id, ...d.data()}))), e => console.warn("Custom forms resp sync error:", e)));
            }

            // Sync Aree Tematiche
            unsubscribes.push(onSnapshot(collection(db, 'aree_tematiche'), s => setAreeTematiche(s.docs.map(d => ({id: d.id, ...d.data()}))), e => console.error("Aree sync error", e)));

            if (data.ruolo === 'superadmin') {
              // FIX: Limite a 100 log per evitare costi eccessivi di lettura
              unsubscribes.push(onSnapshot(query(collection(db, 'logs'), orderBy('data', 'desc'), limit(100)), s => setSystemLogs(s.docs.map(d => ({id: d.id, ...d.data()}))), e => console.log("Sync Logs:", e.code)));
            }

            // --- GESTIONE DEEP LINK VERIFICA (QR CODE) ---
            if (['presidente', 'coordinamento', 'admin', 'superadmin'].includes(data.ruolo)) {
              const params = new URLSearchParams(window.location.search);
              const uidParam = params.get('uid');
              if (uidParam) {
                const targetDoc = await getDoc(doc(db, 'users', uidParam));
                if (targetDoc.exists()) {
                  setVerifyResult({ id: targetDoc.id, ...targetDoc.data() });
                  setSubPage('verifica_volontario');
                  window.history.replaceState({}, document.title, window.location.pathname); // Pulisce URL
                }
              }
            }
          } else {
            // UTENTE ORFANO: Auth esiste, ma non il documento in Firestore
            console.log("Utente orfano rilevato:", currentUser.uid);
            setIsOrphanedUser(true);
            setUserData(null);
          }
        }
        else {
          setUserData(null); // Pulisce i dati utente al logout
          setIsOrphanedUser(false); // Reset stato orfano al logout
        }
      } catch (err) { console.error("Critical Sync Error:", err); }
      finally { setLoading(false); }
    });
    return () => { unsubscribeAuth(); unsubscribes.forEach(u => u()); };
  }, []);

  // --- CHECK SETUP INIZIALE (PERMESSI) & CHANGELOG ---
  useEffect(() => {
    if (user) {
      const setupDone = localStorage.getItem(`pcgl_setup_${appVersion}`);
      if (!setupDone) {
        setShowPermissionsGuide(true);
      } else {
        const changelogSeen = localStorage.getItem(`pcgl_changelog_${appVersion}`);
        if (!changelogSeen) setShowChangelog(true);
      }
    }
  }, [user, appVersion]);

  // --- CHECK AGGIORNAMENTI & MANUTENZIONE (REAL-TIME) ---
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'settings', 'config'), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.androidVersion !== appVersion) {
                if (Capacitor.isNativePlatform()) {
                    // App Nativa: Mostra Modale per scaricare APK
                    setUpdateAvailable(data);
                } else {
                    // Web/PWA: Aggiornamento automatico (Reload forzato)
                    const lastReload = sessionStorage.getItem('pcgl_auto_reload');
                    // Evita loop: ricarica solo se non l'ha fatto nell'ultimo minuto
                    if (!lastReload || (Date.now() - Number(lastReload) > 60000)) {
                        sessionStorage.setItem('pcgl_auto_reload', Date.now().toString());
                        // Pulisce Service Worker per garantire nuovi asset
                        if ('serviceWorker' in navigator) {
                            navigator.serviceWorker.getRegistrations().then(regs => {
                                for(let reg of regs) reg.unregister();
                                window.location.reload();
                            });
                        } else { window.location.reload(); }
                    } else { setUpdateAvailable(data); } // Fallback modale se il reload non ha funzionato
                }
            }
            setMaintenanceMode(data.maintenance || false);
        }
    }, (e) => console.log("Config Sync Error", e));
    return () => unsub();
  }, [user, appVersion]);

  // --- GESTIONE CLICK NOTIFICHE ---
  const handleNotificationClick = (data, uData) => {
      const currentData = uData || userDataRef.current; // Usa il ref per avere dati aggiornati o quelli passati al momento del click
      console.log("Notification Click Data:", data);
      if (!data) return;
      
      if (data.type === 'attivazione') {
          setSubPage(currentData?.ruolo === 'volontario' ? 'allerta_view' : 'allerta_gest');
      } else if (data.type === 'meteo' && data.link) {
          window.open(data.link, '_system');
      } else if (data.type === 'news') {
          setSubPage('news_view');
          if (data.newsId) {
              setTimeout(async () => {
                  try {
                      const snap = await getDoc(doc(db, 'news', data.newsId));
                      if(snap.exists()) {
                          setSelectedNews({ id: snap.id, ...snap.data() });
                      }
                  } catch (e) { console.error(e); }
              }, 100);
          }
      } else if (data.type === 'iscrizione' || (data.title && data.title.includes('Iscrizione'))) {
           if (['presidente', 'coordinamento', 'admin', 'superadmin'].includes(currentData?.ruolo)) {
               setSubPage('admin_search');
               setAnagraficaTab('pendenti');
           }
      } else if (data.type === 'gestione_mezzi') {
           setSubPage('gestione_mezzi');
      } else if (data.type === 'area_tematica') {
           if (data.areaId) {
               setPendingAreaId(data.areaId);
               setSubPage('progetti_view');
           }
      } else if (data.type === 'module_chat') {
           setSubPage('modules_view');
      }
  };

  // --- SYNC VERSIONE ADMIN ---
  useEffect(() => {
    if (subPage === 'admin_version_control') {
        getDoc(doc(db, 'settings', 'config')).then(snap => {
            if (snap.exists()) setVersionForm(snap.data());
        });
    }
  }, [subPage]);

  // --- CHAT SYNC (LEGATA ALL'ALLERTA) ---
  useEffect(() => {
    const canViewChat = userData?.ruolo !== 'volontario' || participationStatus === 'accepted';
    
    if (userData?.sede && attivazioniAttive.length > 0 && canViewChat && attivazioniAttive[0]?.id) {
      const alertId = attivazioniAttive[0].id;
      const q = query(
        collection(db, 'chat_sede'), 
        where('sede', '==', userData.sede), 
        where('alertId', '==', alertId)
      );
      
      const unsubscribe = onSnapshot(q, s => {
        const msgs = s.docs.map(d => ({id: d.id, ...d.data()}));
        setChatMessages(msgs.sort((a, b) => new Date(a.data) - new Date(b.data)));
        
        s.docChanges().forEach(change => {
            if (change.type === "added") {
                const msg = change.doc.data();
                if (msg.uid !== user.uid && (Date.now() - new Date(msg.data).getTime() < 10000)) {
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification(`Chat ${userData.sede}: ${msg.autore}`, { body: msg.testo, icon: "/logo.png" });
                }
                }
            }
        });
      }, e => console.error("Chat sync error:", e));
      return () => unsubscribe();
    } else {
      setChatMessages([]);
    }
  }, [userData, attivazioniAttive, participationStatus, user]);

  // --- SUONO E VIBRAZIONE ALLERTE IN-APP ---
  useEffect(() => {
    if (attivazioniAttive.length > 0) {
      const newAlert = attivazioniAttive[0];
      const isNew = !prevAlertsRef.current.find(a => a.id === newAlert.id);
      const isRecent = Date.now() - new Date(newAlert.dataAttivazione).getTime() < 60000;
      if (isNew && isRecent) {
        playAlertAlarm();
        triggerAlertHaptic();
      }
    }
    prevAlertsRef.current = attivazioniAttive;
  }, [attivazioniAttive]);

  // --- RESET NOTIFICA NEWS ---
  useEffect(() => {
    if (subPage === 'news_view') {
      setHasNewNews(false);
      localStorage.setItem('lastNewsViewed', Date.now().toString());
    }
  }, [subPage]);

  // --- RESET NOTIFICA DOCUMENTI ---
  useEffect(() => {
    if (subPage === 'fascicolo_edit') {
        setHasNewDocs(false);
        localStorage.setItem('lastDocsViewed', Date.now().toString());
    }
  }, [subPage]);

  // --- SYNC CONFERME LETTURA NEWS ---
  useEffect(() => {
    let unsub;
    if (selectedNews && selectedNews.id && selectedNews.importante && user) {
        // Verifica se l'utente ha già confermato
        getDoc(doc(db, 'news', selectedNews.id, 'conferme', user.uid)).then(snap => {
            setHasConfirmedRead(snap.exists());
        });

        // Se staff, scarica lista conferme
        if (['admin', 'superadmin', 'coordinamento', 'presidente'].includes(userData?.ruolo)) {
            unsub = onSnapshot(collection(db, 'news', selectedNews.id, 'conferme'), s => {
                setReadReceipts(s.docs.map(d => d.data()));
            }, e => console.error("Read receipts sync error:", e));
        }
    } else {
        setHasConfirmedRead(false);
        setReadReceipts([]);
    }
    return () => { if (unsub) unsub(); };
  }, [selectedNews, user, userData]);

  // --- GESTIONE DEEP LINK AREA TEMATICA ---
  useEffect(() => {
    if (pendingAreaId && areeTematiche.length > 0) {
      const area = areeTematiche.find(a => a.id === pendingAreaId);
      if (area) {
        setViewingArea(area);
        setSubPage('area_detail_view');
        setPendingAreaId(null);
      }
    }
  }, [pendingAreaId, areeTematiche]);

  // --- SYNC MESSAGGI AREA TEMATICA ---
  useEffect(() => {
      if (viewingArea && viewingArea.id) {
          const unsubMsg = onSnapshot(query(collection(db, 'aree_tematiche', viewingArea.id, 'chat'), orderBy('data', 'asc')), s => {
              setAreaMessages(s.docs.map(d => ({id: d.id, ...d.data()})));
          });
          const unsubDoc = onSnapshot(doc(db, 'aree_tematiche', viewingArea.id), d => {
              if (d.exists()) setViewingArea({id: d.id, ...d.data()});
          });
          return () => { unsubMsg(); unsubDoc(); };
      }
  }, [viewingArea?.id]);

  // --- GESTIONE PARTECIPAZIONE ALLERTA ---
  useEffect(() => {
    if (attivazioniAttive.length > 0 && user) {
      if (userData?.ruolo === 'presidente') {
        setParticipationStatus('accepted');
      } else {
        const alertId = attivazioniAttive[0].id;
        const unsub = onSnapshot(doc(db, 'partecipazioni_allerta', `${alertId}_${user.uid}`), s => {
          if (s.exists()) {
             setParticipationStatus(s.data().status);
             setMyParticipation(s.data());
          } else {
             setParticipationStatus('pending');
             setMyParticipation(null);
          }
        });
        return () => unsub();
      }
    } else {
      setParticipationStatus('pending');
    }
  }, [attivazioniAttive, user, userData]);

  // --- SYNC PARTECIPAZIONI PER GESTIONE SQUADRE ---
  useEffect(() => {
    if (selectedAlertForTeams) {
      const q = query(collection(db, 'partecipazioni_allerta'), where('alertId', '==', selectedAlertForTeams.id));
      const unsub = onSnapshot(q, (s) => {
        setAlertParticipations(s.docs.map(d => ({ id: d.id, ...d.data() })));
      }, e => console.error("Alert participations sync error:", e));
      return () => unsub();
    }
  }, [selectedAlertForTeams]);

  // --- GEOLOCALIZZAZIONE CONTINUA (TRACKING) ---
  const activeAlertId = attivazioniAttive.length > 0 ? attivazioniAttive[0].id : null;
  useEffect(() => {
    let watchId;
    const isCheckedIn = myParticipation?.checkIn && !myParticipation?.checkOut;
    
    if (isCheckedIn && activeAlertId && user) {
      if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            const now = Date.now();
            if (now - lastLocationUpdate.current > 30000) { // Aggiorna ogni 30s
               lastLocationUpdate.current = now;
               const { latitude, longitude } = position.coords;
               try {
                 const locationData = { lat: latitude, lng: longitude, timestamp: new Date().toISOString() };
                 await updateDoc(doc(db, 'partecipazioni_allerta', `${activeAlertId}_${user.uid}`), {
                   lastLocation: locationData,
                   path: arrayUnion(locationData)
                 });
               } catch (e) { console.error("Tracking error", e); }
            }
          },
          (err) => console.error("GPS Error", err),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
      }
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [myParticipation?.checkIn, myParticipation?.checkOut, activeAlertId, user]);

  // --- SYNC STORICO ALLERTE (PER REPORT) ---
  useEffect(() => {
    if (['presidente', 'coordinamento', 'admin', 'superadmin'].includes(userData?.ruolo) && subPage === 'allerta_gest') {
        let q = query(collection(db, 'attivazioni'), where('stato', '==', 'disattiva'), orderBy('dataAttivazione', 'desc'), limit(20));
        
        if (userData.ruolo === 'presidente') {
            // Il presidente vede solo lo storico della sua sede
            q = query(collection(db, 'attivazioni'), where('stato', '==', 'disattiva'), where('zone', 'array-contains', userData.sede), orderBy('dataAttivazione', 'desc'), limit(20));
        }

        const unsub = onSnapshot(q, s => {
            setClosedAlerts(s.docs.map(d => ({id: d.id, ...d.data()})));
        }, e => console.error("Closed alerts sync error:", e));
        return () => unsub();
    }
  }, [userData, subPage]);

  // --- NOTIFICHE ISCRIZIONI (SOLO PRESIDENTE) ---
  useEffect(() => {
    if (userData?.ruolo === 'presidente') {
      if (pendingVolunteers.length > prevPendingCount.current && prevPendingCount.current > 0) {
        // NOTA: La notifica push arriva già dal backend (Cloud Function).
        // Rimuoviamo la notifica locale per evitare duplicati.
        // if ("Notification" in window && Notification.permission === "granted") {
        //    new Notification("Nuova Iscrizione", { ... });
        // }
        showToast("Nuova richiesta di iscrizione!");
      }
    }
    prevPendingCount.current = pendingVolunteers.length;
  }, [pendingVolunteers, userData]);

  // --- SYNC PENDING FORM ---
  useEffect(() => {
    if (userData?.stato === 'pendente' && !pendingForm) {
      setPendingForm({
        nome: userData.nome || '',
        cognome: userData.cognome || '',
        dataNascita: userData.dataNascita || '',
        luogoNascita: userData.luogoNascita || '',
        cf: userData.cf || '',
        sede: userData.sede || '',
        telefono: userData.telefono || '',
        indirizzo: userData.indirizzo || '',
        citta: userData.citta || '',
        cap: userData.cap || '',
        gruppoSanguigno: userData.gruppoSanguigno || ''
      });
    }
  }, [userData]);

  // --- LOGICA FETCH METEO ---
  useEffect(() => {
    if (userData?.sede) {
      const fetchMeteo = async () => {
        try {
          const sedeInfo = appConfig.sedi.find(s => s.s.includes(userData.sede.toUpperCase()));
          const zona = sedeInfo ? sedeInfo.z : null;

          if (!zona) { setMeteoData({ oggi: 'unknown', domani: 'unknown', zona: 'NON TROVATA' }); return; }

          const ts = Date.now();
          // Usa la nuova Cloud Function per la Campania per evitare problemi con cors-proxy
          const [resB, resC, resCampProxy] = await Promise.allSettled([
            fetch(`https://eatapples15.github.io/allerte_bollettino_basilicata/dati_bollettino.json?t=${ts}`).then(r => r.json()),
            fetch(`https://raw.githubusercontent.com/Eatapples15/gruppolucano/refs/heads/main/calabria.json?t=${ts}`).then(r => r.json()),
            fetch(`https://europe-west1-pcgl-volontari.cloudfunctions.net/getMeteoCampania`).then(r => r.json())
          ]);

          let oggi = 'unknown', domani = 'unknown';

          const processBulletin = (bulletinData, zoneData) => {
              if (!bulletinData.data_emissione) {
                  return { oggi: normalizeColor(zoneData.oggi), domani: normalizeColor(zoneData.domani) };
              }
              
              const now = new Date();
              let emissionDate = new Date(bulletinData.data_emissione);
              
              if (isNaN(emissionDate.getTime()) && typeof bulletinData.data_emissione === 'string') {
                  const parts = bulletinData.data_emissione.split('/');
                  if (parts.length === 3) {
                      emissionDate = new Date(parts[2], parts[1] - 1, parts[0]);
                  }
              }
              
              if (isNaN(emissionDate.getTime())) {
                  return { oggi: normalizeColor(zoneData.oggi), domani: normalizeColor(zoneData.domani) };
              }
              
              const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const emissionDateOnly = new Date(emissionDate.getFullYear(), emissionDate.getMonth(), emissionDate.getDate());
              
              if (nowDateOnly.getTime() === emissionDateOnly.getTime()) {
                  return { oggi: normalizeColor(zoneData.oggi), domani: normalizeColor(zoneData.domani) };
              } else {
                  return { oggi: normalizeColor(zoneData.domani), domani: 'unknown' };
              }
          };

          if (zona.startsWith('BASI') && resB.status === 'fulfilled' && resB.value?.zone?.[zona]) { 
            const { oggi: o, domani: d } = processBulletin(resB.value, resB.value.zone[zona]);
            oggi = o; domani = d;
          }
          else if (zona.startsWith('Cal') && resC.status === 'fulfilled' && resC.value?.zone_calabria?.[zona.split('-')[1]]) { 
            const { oggi: o, domani: d } = processBulletin(resC.value, resC.value.zone_calabria[zona.split('-')[1]]);
            oggi = o; domani = d;
          }
          else if (zona.startsWith('Camp') && resCampProxy.status === 'fulfilled' && resCampProxy.value.html) { 
            try {
              const match = resCampProxy.value.html.match(/Codice colore\s+(verde|giallo|gialla|arancione|rosso|rossa)/i); 
              if (match) { oggi = domani = normalizeColor(match[1]); } 
            } catch (e) { console.error("Campania parse error", e); }
          }
          
          setMeteoData({ oggi, domani, zona });
        } catch (e) { console.error(e); }
      };
      fetchMeteo();
    }
  }, [userData, appConfig.sedi]);

  // --- SYNC PROFILE FORM (ACTIVE USERS) ---
  useEffect(() => {
    if (subPage === 'fascicolo_edit' && userData) {
        setProfileForm({
            telefono: userData.telefono || '',
            indirizzo: userData.indirizzo || '',
            citta: userData.citta || '',
            cap: userData.cap || '',
            gruppoSanguigno: userData.gruppoSanguigno || ''
        });
    }
  }, [subPage]); // Rimosso userData per evitare di cancellare i dati mentre l'utente li sta digitando

  // --- SISTEMA NOTIFICHE PUSH (BROWSER) ---
  useEffect(() => {
    // NOTA: Rimosso trigger locale per evitare duplicati con FCM inviato da Cloud Functions.
    // Le notifiche arrivano via onMessage (foreground) o SW (background).
  }, []);

  // --- SYNC DISPONIBILITA (CALENDARIO) ---
  useEffect(() => {
    if (subPage === 'disponibilita_view' && user && userData) {
      const year = currentMonth.getFullYear();
      const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
      const start = `${year}-${month}-01`;
      // Calcolo fine mese approssimativo sicuro per query string
      const end = `${year}-${month}-31`; 

      const q = query(collection(db, 'disponibilita'), where('data', '>=', start), where('data', '<=', end));
      
      const unsub = onSnapshot(q, (s) => {
         const data = s.docs.map(d => ({id: d.id, ...d.data()}));
         if (userData.ruolo === 'volontario') {
           setAvailabilities(data.filter(d => d.uid === user.uid));
         } else if (userData.ruolo === 'presidente') {
           setAvailabilities(data.filter(d => d.sede === userData.sede));
         } else {
           setAvailabilities(data); // Admin/Coord vedono tutto
         }
      }, e => console.error("Availabilities sync error:", e));
      return () => unsub();
    }
  }, [subPage, currentMonth, userData, user]);

  // --- FETCH CORSI DA MOODLE ---
  useEffect(() => {
    const fetchMoodleCourses = async () => {
      setMoodleStatus('loading');
      setMoodleErrorMsg('');
      
      try {
        const getMoodleCoursesFn = httpsCallable(getFunctions(auth.app, 'europe-west1'), 'getMoodleCoursesForUser');
        const res = await getMoodleCoursesFn();
        const data = res.data;
        
        if (data.success) {
            setMoodleCourses(data.courses);
            setMoodleEnrolledCourseIds(data.enrolledIds);
            setMoodleUserFound(data.moodleUserFound);
            setMoodleStatus('success');
        } else {
            setMoodleStatus('error');
            setMoodleErrorMsg("Errore dal server proxy.");
        }
      } catch (err) {
          console.error("Errore fetch Moodle proxy:", err);
          setMoodleStatus('error');
          setMoodleErrorMsg(err.message || "Errore di connessione.");
      }
    };
    if (user && subPage === 'corsi_view') fetchMoodleCourses();
  }, [user, subPage]);

  // --- CALCOLO STATISTICHE ---
  useEffect(() => {
    if (subPage === 'stats_view' && user) {
      const fetchStats = async () => {
        const currentYear = new Date().getFullYear();
        const startOfYear = `${currentYear}-01-01T00:00:00.000Z`;
        const q = query(collection(db, 'attivazioni'), where('dataAttivazione', '>=', startOfYear));
        const snapshot = await getDocs(q);
        const counts = { gialla: 0, arancione: 0, rossa: 0, verde: 0, total: 0 };
        snapshot.docs.forEach(doc => {
          const d = doc.data();
          const c = d.colore ? d.colore.toLowerCase() : 'gialla';
          if (counts[c] !== undefined) counts[c]++;
          counts.total++;
        });
        setStatsData(counts);

        // Calcolo Classifica (Gamification)
        const qUsers = query(collection(db, 'users'), where('stato', '==', 'attivo'));
        const snapUsers = await getDocs(qUsers);
        const usersList = snapUsers.docs.map(d => ({ nome: d.data().nome, cognome: d.data().cognome, sede: d.data().sede, corsi: d.data().fascicoloCorsi?.length || 0, badge: d.data().moduli?.length || 0, id: d.id }));
        const ranked = usersList.map(u => ({ ...u, punti: (u.corsi * 10) + (u.badge * 50) })).sort((a,b) => b.punti - a.punti).slice(0, 10);
        setLeaderboard(ranked);
      };
      fetchStats();
    }
  }, [subPage, user]);

  // --- SYNC STORICO VOLONTARIO (QUANDO SI APRE IL DETTAGLIO) ---
  useEffect(() => {
    if (subPage === 'volunteer_detail' && selectedVolunteer) {
      const q = query(collection(db, 'partecipazioni_allerta'), where('uid', '==', selectedVolunteer.id));
      const unsub = onSnapshot(q, (s) => {
        const history = s.docs.map(d => ({ id: d.id, ...d.data() }));
        history.sort((a, b) => {
          const dateA = a.checkIn ? new Date(a.checkIn).getTime() : 0;
          const dateB = b.checkIn ? new Date(b.checkIn).getTime() : 0;
          return dateB - dateA;
        });
        setVolunteerHistory(history);
      }, (e) => console.log("History Sync Error:", e)); // Ignora errori se manca l'indice composto
      return () => unsub();
    }
  }, [subPage, selectedVolunteer]);

  // --- SYNC ARCHIVIO NEWS (SOLO ADMIN) ---
  useEffect(() => {
    if (subPage === 'news_archive' && ['admin', 'superadmin'].includes(userData?.ruolo)) {
        // FIX: Limite a 50 news archiviate per performance
        const q = query(collection(db, 'news'), where('archived', '==', true), orderBy('data', 'desc'), limit(50));
        const unsub = onSnapshot(q, s => {
            setArchivedNews(s.docs.map(d => ({id: d.id, ...d.data()})));
        }, e => console.error("Archived news sync error:", e));
        return () => unsub();
    }
  }, [subPage, userData]);

  // --- SYNC RICEZIONI TELEGRAM ---
  useEffect(() => {
      if (['presidente', 'coordinamento', 'admin', 'superadmin'].includes(userData?.ruolo) && subPage === 'telegram_uploads_view') {
          const q = query(collection(db, 'telegram_uploads'), orderBy('timestamp', 'desc'), limit(100));
          const unsub = onSnapshot(q, s => {
              let data = s.docs.map(d => ({id: d.id, ...d.data()}));
              if (userData.ruolo === 'presidente') data = data.filter(d => d.userSede === userData.sede);
              setTelegramUploads(data);
          });
          return () => unsub();
      }
  }, [userData, subPage]);

  // --- SYNC ANAGRAFICA SEDE ---
  useEffect(() => {
    if (subPage === 'sede_anagrafica' && userData?.sede) {
        setLoadingSedeAnagrafica(true);
        const q = query(collection(db, 'sedi_anagrafica'), where('sede', '==', userData.sede));
        const unsub = onSnapshot(q, (snap) => {
            if (!snap.empty) {
                setSedeAnagrafica(prev => ({ ...prev, ...snap.docs[0].data(), id: snap.docs[0].id }));
            } else {
                // Reset form se non esiste
                 setSedeAnagrafica(prev => ({
                    ...prev,
                    nomeAssociazione: '',
                    codiceFiscale: '',
                    dataCostituzione: '',
                    iban: '',
                    indirizzoLegale: '',
                    posizione: null,
                    telefono: '',
                    pec: '',
                    email: '',
                    proprieta: '',
                    numeroStanze: '',
                    serviziIgienici: '',
                    dotazioneInformatica: '',
                    foresteria: '',
                    altro: '',
                    logo: '',
                    sede: userData.sede
                }));
            }
            setLoadingSedeAnagrafica(false);
        }, e => console.error("Sede anagrafica sync error:", e));
        return () => unsub();
    }
  }, [subPage, userData]);

  // --- SYNC LISTA SEDI (COORDINAMENTO) ---
  useEffect(() => {
      if (subPage === 'sedi_list' && ['presidente', 'admin', 'superadmin', 'coordinamento'].includes(userData?.ruolo)) {
          const q = query(collection(db, 'sedi_anagrafica'));
          const unsub = onSnapshot(q, (s) => {
              setSediList(s.docs.map(d => ({id: d.id, ...d.data()})));
          }, e => console.error("Sedi list sync error:", e));
          return () => unsub();
      }
  }, [subPage, userData]);

  // --- SYNC SESSIONI PRESENZE ---
  useEffect(() => {
      if (subPage === 'gestione_presenze') {
          const q = query(collection(db, 'registro_presenze'), orderBy('dataCreazione', 'desc'));
          const unsub = onSnapshot(q, (s) => {
              setAttendanceSessions(s.docs.map(d => ({id: d.id, ...d.data()})));
          }, e => console.error("Attendance sessions sync error:", e));
          return () => unsub();
      }
  }, [subPage]);

  // --- SYNC RECORD PRESENZE SELEZIONATE ---
  useEffect(() => {
      if (selectedSession) {
          const q = query(collection(db, 'presenze_registrate'), where('sessionId', '==', selectedSession.id));
          const unsub = onSnapshot(q, (s) => {
              const records = s.docs.map(d => ({id: d.id, ...d.data()}));
              records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
              setSessionRecords(records);

              // Arricchimento dati in background per sedi N/D o PCGL
              records.forEach(async (r) => {
                  if (!r.sede || r.sede === 'N/D' || r.sede.toUpperCase() === 'PCGL') {
                      try {
                          let userSnap;
                          if (r.cf && r.cf !== 'N/D') {
                              const qCf = query(collection(db, 'users'), where('cf', '==', r.cf.toUpperCase()));
                              userSnap = await getDocs(qCf);
                          }
                          if ((!userSnap || userSnap.empty) && r.email) {
                              const qEmail = query(collection(db, 'users'), where('email', '==', r.email.toLowerCase()));
                              userSnap = await getDocs(qEmail);
                          }
                          
                          if (userSnap && !userSnap.empty) {
                              const foundSede = userSnap.docs[0].data().sede;
                              if (foundSede && foundSede !== r.sede) {
                                  await updateDoc(doc(db, 'presenze_registrate', r.id), { sede: foundSede });
                              }
                          }
                      } catch (e) {
                          console.error("Error enriching record", e);
                      }
                  }
              });
          }, e => console.error("Attendance records sync error:", e));
          return () => unsub();
      }
  }, [selectedSession]);

  const saveSedeAnagrafica = async () => {
      setLoadingSedeAnagrafica(true);
      try {
          if (sedeAnagrafica.id) {
              await updateDoc(doc(db, 'sedi_anagrafica', sedeAnagrafica.id), sedeAnagrafica);
          } else {
              const docRef = await addDoc(collection(db, 'sedi_anagrafica'), { ...sedeAnagrafica, sede: userData.sede });
              setSedeAnagrafica(prev => ({ ...prev, id: docRef.id }));
          }
          showToast("Dati sede salvati!");
      } catch (e) {
          console.error(e);
          showToast("Errore salvataggio.", 'error');
      } finally {
          setLoadingSedeAnagrafica(false);
      }
  };

  const handleSedeLogoUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { showToast("File troppo grande (Max 5MB)", 'error'); return; }
      
      setUploading(true);
      try {
          const storageRef = ref(storage, `sedi_logos/${userData.sede}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          setSedeAnagrafica(prev => ({ ...prev, logo: url }));
          showToast("Logo caricato! Ricorda di salvare.");
      } catch (e) {
          console.error(e);
          showToast("Errore upload logo", 'error');
      } finally {
          setUploading(false);
      }
  };

  // --- GESTIONE NOTIFICHE PUSH (CENTRALIZZATA) ---
  const initializeNotifications = async () => {
    if (!user) return false;

    // 1. LOGICA NATIVA (ANDROID APK)
    if (Capacitor.isNativePlatform()) {
        try {
            let permStatus = await PushNotifications.checkPermissions();
            
            if (permStatus.receive === 'prompt') {
                permStatus = await PushNotifications.requestPermissions();
            }
    
            if (permStatus.receive === 'granted') {
                // Creazione Canale (Prima della registrazione per evitare race conditions)
                if (Capacitor.getPlatform() === 'android') {
                    await PushNotifications.createChannel({
                        id: 'alert-pcgl',
                        name: 'Allerte PCGL',
                        description: 'Notifiche per allerte di protezione civile',
                        importance: 5,
                        visibility: 1,
                        vibration: true,
                    }).catch(e => console.error("Errore creazione canale:", e));
                }

                await PushNotifications.register();
                return true;
            }
        } catch (err) { console.error("Errore notifiche native:", err); }
        return false;
    }

    // 2. LOGICA WEB (PWA)
    if (!("Notification" in window)) return false;
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const messaging = getMessaging(auth.app);
        const vapidKey = "BJ2610ww_cfE9BxwmhEY-QqsXId5497UseMDS-j9c7oA2AltxO1VMvVS7FTm0fjiGEsr9m7KvfNbdFI5vKlL2aY";
        
        const token = await getToken(messaging, { vapidKey });
        if (token) {
          await updateDoc(doc(db, 'users', user.uid), { fcmToken: token });
          return true;
        }
      }
    } catch (err) {
      console.error("Errore attivazione notifiche:", err);
    }
    return false;
  };

  // --- REGISTRAZIONE LISTENER NATIVI FCM (AL MOUNT) ---
  useEffect(() => {
      if (Capacitor.isNativePlatform()) {
          const registerListeners = async () => {
              await PushNotifications.removeAllListeners();
  
              PushNotifications.addListener('registration', async (token) => {
                  localStorage.setItem('pcgl_fcm_token', token.value);
                  if (auth.currentUser) {
                      updateDoc(doc(db, 'users', auth.currentUser.uid), { fcmToken: token.value }).catch(e => console.error(e));
                  }
              });
  
              PushNotifications.addListener('registrationError', (error) => {
                  console.error('Error on FCM registration: ' + JSON.stringify(error));
              });
  
              PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                  const data = notification.notification.data;
                  if (userDataRef.current) {
                      handleNotificationClick(data, userDataRef.current);
                  } else {
                      // Mette la notifica in attesa finchè l'utente non viene scaricato
                      setPendingNotification(data);
                  }
              });
          };
          registerListeners();
      }
  }, []);

  // --- GESTIONE TOKEN POST-LOGIN E WEB AUTO-START ---
  useEffect(() => {
    if (user) {
        if (!Capacitor.isNativePlatform() && "Notification" in window && Notification.permission === 'granted') {
            initializeNotifications();
        } else if (Capacitor.isNativePlatform()) {
            const token = localStorage.getItem('pcgl_fcm_token');
            if (token) {
                updateDoc(doc(db, 'users', user.uid), { fcmToken: token }).catch(e => console.error(e));
            }
        }
    }
  }, [user]);

  // --- ESECUZIONE NOTIFICA IN ATTESA ---
  useEffect(() => {
      if (userData && pendingNotification) {
          handleNotificationClick(pendingNotification, userData);
          setPendingNotification(null);
      }
  }, [userData, pendingNotification]);

  // --- GESTIONE NOTIFICHE FOREGROUND (APP APERTA) ---
  useEffect(() => {
    if (user && !Capacitor.isNativePlatform() && "Notification" in window) {
      const messaging = getMessaging(auth.app);
      const unsubscribe = onMessage(messaging, (payload) => {
        // Mostra notifica di sistema anche se l'app è aperta
        // Ottimizzato per gestire il click
        // Rimosso per evitare duplicati (Gestito dal Service Worker o Sistema Nativo)
        // if (typeof Notification !== 'undefined' && Notification.permission === "granted") {
        //   const notif = new Notification(payload.notification.title || "Nuova Notifica", {
        //     body: payload.notification.body,
        //     icon: APP_LOGO,
        //     data: payload.data // Passiamo i dati per il click
        //   });
        //   
        //   notif.onclick = (event) => {
        //       event.preventDefault();
        //       window.focus();
        //       notif.close();
        //       handleNotificationClick(payload.data);
        //   };
        // }
        console.log("Foreground message received:", payload);
      });
      return () => unsubscribe();
    }
  }, [user, userData]); // Aggiunto userData per avere il ruolo aggiornato nel click handler

  // --- AZIONI UTENTE ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try { 
      const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password); 
    }
    catch (err) { 
      console.error("Login error:", err);
      let msg = "Errore durante l'accesso.";
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') msg = "Email o password non corretti.";
      else if (err.code === 'auth/too-many-requests') msg = "Troppi tentativi falliti. Riprova più tardi.";
      setError(msg); 
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Google Login Error:", err);
      setError("Errore accesso Google: " + err.message);
    }
  };

  const logAction = async (action, details) => {
    try {
      const author = userData ? `${userData.nome} ${userData.cognome} (${userData.ruolo})` : "Ospite/Sistema";
      await addDoc(collection(db, 'logs'), {
        azione: action, dettagli: details, autore: author, data: new Date().toISOString()
      });
    } catch (e) { console.error("Log error", e); }
  };

  const sendRegistrationEmail = async (volunteer) => {
    try {
      const q = query(collection(db, 'users'), where('sede', '==', volunteer.sede), where('ruolo', '==', 'presidente'));
      const snapshot = await getDocs(q);
      const emails = snapshot.docs.map(d => d.data().email).filter(e => e);
      
      if (emails.length > 0) {
        await addDoc(collection(db, 'mail'), {
          to: emails,
          message: {
            subject: `Nuova Iscrizione PCGL: ${volunteer.nome} ${volunteer.cognome}`,
            html: `Nuova richiesta di iscrizione per la sede ${volunteer.sede}.<br>Nome: ${volunteer.nome} ${volunteer.cognome}<br>CF: ${volunteer.cf}<br>Accedi al gestionale per approvare.`
          }
        });
      }
    } catch (err) { console.error("Errore invio email:", err); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.cfConfermato) { setError("Conferma la validità del Codice Fiscale"); return; }
    if (regForm.cf.length !== 16) { setError("Codice Fiscale non valido"); return; }
    if (!regForm.privacyAccepted) { setError("Devi accettare l'informativa sulla privacy."); return; }

    // CONFERMA DATI E SEDE
    const confirmation = window.confirm(
        `CONFERMA DATI DI ISCRIZIONE:\n\n` +
        `Nome: ${regForm.nome.toUpperCase()}\n` +
        `Cognome: ${regForm.cognome.toUpperCase()}\n` +
        `SEDE SELEZIONATA: ${regForm.sede.toUpperCase()}\n\n` +
        `ATTENZIONE: Assicurati che la SEDE sia quella dove effettivamente presterai servizio. Molti utenti selezionano erroneamente "POTENZA".\n\n` +
        `I dati inseriti sono corretti?`
    );
    if (!confirmation) return;

    // Validazione Password
    if (regForm.password !== regForm.confirmPassword) { setError("Le password non coincidono."); return; }
    if (regForm.password.length < 6) { setError("La password deve essere di almeno 6 caratteri."); return; }
    if (!/[A-Z]/.test(regForm.password)) { setError("La password deve contenere almeno una lettera maiuscola."); return; }
    if (!/[0-9]/.test(regForm.password)) { setError("La password deve contenere almeno un numero."); return; }

    // Attiva flag registrazione per bloccare onAuthStateChanged
    isRegistering.current = true;

    // NOTA: Controllo duplicati rimosso lato client per evitare errori di permessi (utente non ancora loggato).
    // La verifica unicità è gestita lato server o nel flusso di completamento profilo.

    try {
      const res = await createUserWithEmailAndPassword(auth, regForm.email, regForm.password);
      
      // USIAMO LA CLOUD FUNCTION PER COMPLETARE IL PROFILO IN SICUREZZA
      const token = await res.user.getIdToken();
      const response = await fetch('https://europe-west1-pcgl-volontari.cloudfunctions.net/completeOrphanProfile', {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              nome: regForm.nome.toUpperCase(),
              cognome: regForm.cognome.toUpperCase(),
              dataNascita: regForm.dataNascita,
              luogoNascita: regForm.luogoNascita.toUpperCase(),
              cf: regForm.cf.toUpperCase(),
              sede: regForm.sede
          })
      });

      if (!response.ok) throw new Error("Errore durante il salvataggio del profilo sul server.");

      // ATTESA ATTIVA DEL DOCUMENTO (Evita race condition "Orfano" al reload)
      const userDocRef = doc(db, 'users', res.user.uid);
      let retries = 10; // Max 5 secondi di attesa
      let docExists = false;

      while (retries > 0) {
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
              docExists = true;
              break;
          }
          await new Promise(r => setTimeout(r, 500)); // Attendi 500ms
          retries--;
      }

      if (docExists) {
          // Ora che il documento è visibile, possiamo ricaricare sicuri
          window.location.reload();
      } else {
          throw new Error("Timeout creazione profilo. Riprova o contatta l'assistenza.");
      }
    } catch (err) {
      console.error("Registration error:", err);
      isRegistering.current = false; // Sblocca in caso di errore
      let msg = "Errore durante la registrazione.";
      if (err.code === 'auth/email-already-in-use') msg = "Email già utilizzata da un altro account.";
      else if (err.code === 'auth/weak-password') msg = "La password è troppo debole (min. 6 caratteri).";
      else if (err.code === 'auth/invalid-email') msg = "Formato email non valido.";
      setError(msg);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setError("Inserisci la tua email.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      showToast("Email di reset inviata! Controlla la tua casella di posta.");
      setShowForgotPassword(false);
      setResetEmail('');
      setError('');
    } catch (err) {
      setError("Errore invio reset: " + err.message);
    }
  };

  const handleQuizAnswer = (answerIndex) => {
    const isCorrect = answerIndex === QUIZ_PC[quizState.q].a;
    const nextQ = quizState.q + 1;
    if (nextQ < QUIZ_PC.length) {
      setQuizState({ ...quizState, q: nextQ, score: isCorrect ? quizState.score + 1 : quizState.score });
    } else {
      setQuizState({ ...quizState, score: isCorrect ? quizState.score + 1 : quizState.score, finished: true });
    }
  };

  const getQrCodeUrl = (data) => {
    if (!data) return '';
    // Link alla pagina pubblica di verifica (struttura standard)
    const verifyUrl = `https://www.pcgl.it/verifica?uid=${data.uid}&tessera=${data.numeroTessera}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(verifyUrl)}`;
  };

  const handleScan = async (decodedText, closeOnScan = true) => {
    playScanSound();
    triggerHaptic();
    if (closeOnScan) setShowScanner(false);
    try {
        const url = new URL(decodedText);
        const uid = url.searchParams.get('uid');
        
        if (!uid) {
            showToast("QR Code non valido per PCGL.", 'error');
            return;
        }

        if (scannerMode === 'verify') {
            setLoading(true);
            const targetDoc = await getDoc(doc(db, 'users', uid));
            setLoading(false);
            if (targetDoc.exists()) {
                setVerifyResult({ id: targetDoc.id, ...targetDoc.data() });
                showToast("Socio identificato!");
            } else {
                showToast("Socio non trovato nel database.", 'error');
            }
        } else if (scannerMode === 'checkin') {
            await handleQrCheckIn(uid);
        } else if (scannerMode === 'session_checkin') {
            setLoading(true);
            try {
                const targetDoc = await getDoc(doc(db, 'users', uid));
                if (targetDoc.exists()) {
                    const uData = targetDoc.data();
                    const qExist = query(collection(db, 'presenze_registrate'), where('sessionId', '==', selectedSession.id), where('cf', '==', uData.cf));
                    const snapExist = await getDocs(qExist);
                    if (!snapExist.empty) {
                        showToast(`${uData.nome} ${uData.cognome} è già registrato.`, 'error');
                    } else {
                        await addDoc(collection(db, 'presenze_registrate'), {
                            sessionId: selectedSession.id,
                            sessionTitle: selectedSession.titolo,
                            nome: uData.nome.toUpperCase(),
                            cognome: uData.cognome.toUpperCase(),
                            email: uData.email.toLowerCase(),
                            cf: uData.cf.toUpperCase(),
                            ente: 'PCGL',
                            sede: uData.sede || 'N/D',
                            timestamp: new Date().toISOString(),
                            validato: true,
                            verificato: true,
                            distanza: 0
                        });
                        showToast(`Presenza registrata per ${uData.nome} ${uData.cognome}`);
                    }
                } else {
                    showToast("Socio non trovato.", 'error');
                }
            } catch (err) {
                console.error(err);
                showToast("Errore durante la registrazione.", 'error');
            } finally {
                setLoading(false);
            }
        }
    } catch (e) {
        console.error(e);
        showToast("Errore lettura QR Code.", 'error');
    }
  };

  const handleOpenScanner = async (mode) => {
      setScannerMode(mode);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          showToast("La fotocamera non è supportata o connessione non sicura.", 'error');
          return;
      }
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
          setShowScanner(true);
      } catch (err) {
          console.error("Camera permission denied:", err);
          setShowCameraPermissionModal(true);
      }
  };

  const handleQrCheckIn = async (uid) => {
    if (!selectedAlertForTeams) return;
    const alertId = selectedAlertForTeams.id;
    const partRef = doc(db, 'partecipazioni_allerta', `${alertId}_${uid}`);
    
    try {
        const partSnap = await getDoc(partRef);
        
        if (partSnap.exists()) {
            const data = partSnap.data();
            if (!data.checkIn) {
                await updateDoc(partRef, { checkIn: new Date().toISOString() });
                showToast(`Check-IN registrato per ${data.nome}`);
            } else if (!data.checkOut) {
                await updateDoc(partRef, { checkOut: new Date().toISOString() });
                showToast(`Check-OUT registrato per ${data.nome}`);
            } else {
                showToast(`Turno già completato per ${data.nome}`, 'error');
            }
        } else {
            // Walk-in (non registrato prima)
            const userSnap = await getDoc(doc(db, 'users', uid));
            if (userSnap.exists()) {
                const uData = userSnap.data();
                await setDoc(partRef, {
                    alertId, uid, nome: `${uData.nome} ${uData.cognome}`, sede: uData.sede,
                    status: 'accepted', checkIn: new Date().toISOString(), squadra: null
                });
                showToast(`Check-IN (Nuovo) registrato per ${uData.nome} ${uData.cognome}`);
            } else { showToast("Utente non trovato.", 'error'); }
        }
    } catch (e) { console.error(e); showToast("Errore durante la registrazione presenza.", 'error'); }
  };

  const requestNotificationPermission = async () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        showToast("Notifiche bloccate. Vai nelle impostazioni del browser per sbloccarle.", 'error');
        return;
    }

    const success = await initializeNotifications();
    if (success) {
      showToast("Notifiche attivate e sincronizzate!");
    } else {
      if (!("Notification" in window)) {
        showToast("Notifiche non supportate dal browser.", 'error');
      } else if (Notification.permission !== 'granted') {
        showToast("Permesso notifiche negato o chiuso.", 'error');
      } else {
        showToast("Errore attivazione (Verifica connessione/HTTPS).", 'error');
      }
    }
  };

  // --- CHECK PROFILO INCOMPLETO ---
  useEffect(() => {
      if (userData && userData.stato === 'attivo') {
          const isIncomplete = !userData.telefono || !userData.indirizzo || !userData.citta || !userData.fotoProfilo || !userData.gruppoSanguigno;
          const dismissed = sessionStorage.getItem('pcgl_profile_warning_dismissed');
          // Mostra solo se non siamo già in modifica profilo e non è stato ignorato in questa sessione
          if (isIncomplete && subPage !== 'fascicolo_edit' && !dismissed) {
              setShowProfileWarning(true);
          } else {
              setShowProfileWarning(false);
          }
      }
  }, [userData, subPage]);

  // --- CHECK PERMESSI NOTIFICHE ---
  useEffect(() => {
      if (user && "Notification" in window && Notification.permission !== 'granted') {
          // Mostra reminder dopo 3 secondi per non essere troppo invasivi al caricamento
          const t = setTimeout(() => setShowNotifReminder(true), 3000);
          return () => clearTimeout(t);
      }
  }, [user]);

  // --- PROMO MODULI ---
  useEffect(() => {
      if (user && !localStorage.getItem('pcgl_modules_promo_dismissed')) {
          // Mostra dopo un breve ritardo per non sovrapporsi ad altri avvisi critici
          const t = setTimeout(() => setShowModulesPromo(true), 5000);
          return () => clearTimeout(t);
      }
  }, [user]);

  // --- GUIDA PRESIDENTI (ANAGRAFICA SEDE) ---
  useEffect(() => {
      if (userData?.ruolo === 'presidente' && !localStorage.getItem('pcgl_president_guide_dismissed')) {
          // Mostra dopo un breve ritardo per non sovrapporsi ad altri avvisi
          const t = setTimeout(() => setShowPresidentGuide(true), 2000);
          return () => clearTimeout(t);
      }
  }, [userData]);

  const handleDismissPresidentGuide = () => {
      localStorage.setItem('pcgl_president_guide_dismissed', 'true');
      setShowPresidentGuide(false);
      setSubPage('sede_anagrafica');
  };

  // --- CHECK PRIVACY POLICY (UTENTI ESISTENTI) ---
  useEffect(() => {
      if (userData && !userData.privacyAccepted) {
          setShowPrivacyBanner(true);
      } else {
          setShowPrivacyBanner(false);
      }
  }, [userData]);

  const handlePrivacyConsent = async () => {
      setShowPrivacyBanner(false);
      if (user) {
          try {
              await updateDoc(doc(db, 'users', user.uid), {
                  privacyAccepted: true,
                  privacyConsentDate: new Date().toISOString()
              });
              // Aggiornamento ottimistico locale
              setUserData(prev => ({...prev, privacyAccepted: true}));
          } catch (e) { console.error("Error updating privacy consent", e); }
      }
  };

  const handleClosePromo = (navigate = false) => {
      if (promoDontShowAgain) {
          localStorage.setItem('pcgl_modules_promo_dismissed', 'true');
      }
      setShowModulesPromo(false);
      if (navigate) {
          setSubPage('modules_view');
      }
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Chiude subito lo stream
      showToast("Accesso fotocamera confermato!");
    } catch (err) {
      console.error(err);
      showToast("Errore accesso fotocamera. Verifica impostazioni.", 'error');
    }
  };

  const openAvailabilityModal = (day) => {
    const dayStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existing = availabilities.find(a => a.uid === user.uid && a.data === dayStr);
    
    setAvailabilityForm({
        date: dayStr,
        start: existing?.oraInizio || '08:00',
        end: existing?.oraFine || '20:00',
        isEdit: !!existing
    });
    setShowAvailabilityModal(true);
  };

  const saveAvailability = async () => {
    const docId = `${user.uid}_${availabilityForm.date}`;
    await setDoc(doc(db, 'disponibilita', docId), {
        uid: user.uid, nome: userData.nome, cognome: userData.cognome, sede: userData.sede,
        specializzazioni: userData.specializzazioni || [],
        data: availabilityForm.date, 
        oraInizio: availabilityForm.start,
        oraFine: availabilityForm.end,
        timestamp: new Date().toISOString()
    });
    setShowAvailabilityModal(false);
    showToast("Disponibilità salvata!");
  };

  const deleteAvailability = async () => {
    const docId = `${user.uid}_${availabilityForm.date}`;
    await deleteDoc(doc(db, 'disponibilita', docId));
    setShowAvailabilityModal(false);
    showToast("Disponibilità rimossa.");
  };

  const handleVerificationSearch = async () => {
    if (!verifySearch.trim()) return;
    setLoading(true);
    try {
      // Cerca per Tessera
      let q = query(collection(db, 'users'), where('numeroTessera', '==', verifySearch.trim()));
      let snapshot = await getDocs(q);
      
      // Se non trova, cerca per CF
      if (snapshot.empty) {
        q = query(collection(db, 'users'), where('cf', '==', verifySearch.trim().toUpperCase()));
        snapshot = await getDocs(q);
      }

      if (!snapshot.empty) {
        setVerifyResult({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        showToast("Nessun volontario trovato con questi dati.", 'error');
        setVerifyResult(null);
      }
    } catch (err) { console.error(err); showToast("Errore durante la ricerca.", 'error'); }
    finally { setLoading(false); }
  };

  // --- RICERCA VOLONTARI SERVER-SIDE (CRITICITÀ B) ---
  const searchVolunteersDB = async () => {
      if(!searchTerm) return;
      if (searchTerm.length < 3) {
          showToast("Inserisci almeno 3 caratteri.", 'error');
          return;
      }

      // CACHE CHECK
      if (searchCache.current[searchTerm]) {
          setSearchedVolunteers(searchCache.current[searchTerm]);
          return;
      }

      setLoading(true);
      try {
          // 1. Cerca per Tessera (Esatta)
          let q = query(collection(db, 'users'), where('numeroTessera', '==', searchTerm.trim()));
          let snap = await getDocs(q);
          
          // 2. Cerca per CF (Esatto)
          if(snap.empty) {
              q = query(collection(db, 'users'), where('cf', '==', searchTerm.trim().toUpperCase()));
              snap = await getDocs(q);
          }

          // 3. Cerca per Cognome (Prefisso)
          if(snap.empty && searchTerm.length > 2) {
               const term = searchTerm.toUpperCase();
               q = query(collection(db, 'users'), where('cognome', '>=', term), where('cognome', '<=', term + '\uf8ff'), limit(20));
               snap = await getDocs(q);
          }

          const results = snap.docs.map(d => ({id: d.id, ...d.data()}));
          setSearchedVolunteers(results);
          searchCache.current[searchTerm] = results; // SALVA IN CACHE
          if(snap.empty) showToast("Nessun risultato trovato nel database.", 'error');
      } catch(e) { console.error(e); showToast("Errore ricerca DB", 'error'); } finally { setLoading(false); }
  };

  // --- RICERCA PER SEDE (ADMIN/COORD) ---
  const handleSedeFilterChange = async (sede) => {
      setFilterSede(sede);
      if (sede) {
          setLoading(true);
          try {
              const q = query(collection(db, 'users'), where('sede', '==', sede));
              const snap = await getDocs(q);
              setSearchedVolunteers(snap.docs.map(d => ({id: d.id, ...d.data()})));
              if(snap.empty) showToast("Nessun volontario trovato in questa sede.", 'info');
          } catch(e) { console.error(e); showToast("Errore recupero sede", 'error'); }
          finally { setLoading(false); }
      } else {
          setSearchedVolunteers([]);
      }
  };

  // --- CONTEGGIO TOTALE ISCRITTI ---
  useEffect(() => {
    if (subPage === 'admin_search' && userData) {
        const fetchTotalCount = async () => {
            try {
                let q = collection(db, 'users');
                if (userData.ruolo === 'presidente') {
                    q = query(q, where('sede', '==', userData.sede), where('stato', 'in', ['attivo', 'sospeso']));
                } else {
                    q = query(q, where('stato', 'in', ['attivo', 'sospeso']));
                }
                const snap = await getCountFromServer(q);
                setTotalUsersCount(snap.data().count);
            } catch (e) {
                console.error("Count error:", e);
            }
        };
        fetchTotalCount();
    }
  }, [subPage, userData]);

  const loadAllVolunteers = async () => {
      if (!window.confirm("Caricare l'intera anagrafica potrebbe richiedere alcuni secondi. Continuare?")) return;
      setLoading(true);
      try {
          const q = query(collection(db, 'users')); 
          const snap = await getDocs(q);
          const results = snap.docs.map(d => ({id: d.id, ...d.data()}));
          setSearchedVolunteers(results);
          showToast(`Anagrafica completa caricata (${results.length} utenti).`);
      } catch(e) { console.error(e); showToast("Errore caricamento anagrafica", 'error'); } 
      finally { setLoading(false); }
  };

  const executeCSVExport = async () => {
      let volunteersToExport = [];
      if (['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo)) {
          setLoading(true);
          try {
              const q = query(collection(db, 'users')); 
              const snap = await getDocs(q);
              volunteersToExport = snap.docs.map(d => ({id: d.id, ...d.data()}));
          } catch(e) { 
              console.error(e); 
              showToast("Errore durante l'esportazione.", 'error'); 
              setLoading(false);
              return;
          } 
          setLoading(false);
      } else {
          volunteersToExport = anagraficaTab === 'pendenti' ? pendingVolunteers : allUsers;
      }

      const filtered = volunteersToExport.filter(v => {
          const searchString = ((v.nome || '') + (v.cognome || '') + (v.sede || '')).toLowerCase();
          const matchesSearch = searchString.includes(searchTerm.toLowerCase());
          const matchesTab = anagraficaTab === 'iscritti' ? (filterStato === 'tutti' ? ['attivo', 'sospeso'].includes(v.stato) : v.stato === filterStato) : v.stato === 'pendente';
          const matchesSede = userData.ruolo === 'presidente' ? v.sede === userData.sede : (filterSede ? v.sede === filterSede : true);
          const matchesSpec = filterSpecializzazione ? v.specializzazioni?.includes(filterSpecializzazione) : true;
          
          let matchesExportCitta = true;
          if (exportFilters.citta) {
              matchesExportCitta = (v.citta || '').toLowerCase().includes(exportFilters.citta.toLowerCase());
          }

          let matchesExportRegione = true;
          if (exportFilters.regione) {
              const sedeInfo = appConfig.sedi.find(s => s.s === v.sede);
              if (sedeInfo && sedeInfo.z) {
                  matchesExportRegione = sedeInfo.z.toLowerCase().startsWith(exportFilters.regione.toLowerCase());
              } else {
                  matchesExportRegione = false;
              }
          }

          return matchesSearch && matchesTab && matchesSede && matchesSpec && matchesExportCitta && matchesExportRegione;
      });

      if (filtered.length === 0) {
          showToast("Nessun volontario da esportare.", 'error');
          return;
      }

      const allPossibleColumns = [
          { key: 'cognome', label: 'Cognome' },
          { key: 'nome', label: 'Nome' },
          { key: 'cf', label: 'Codice Fiscale' },
          { key: 'dataNascita', label: 'Data di Nascita' },
          { key: 'luogoNascita', label: 'Luogo di Nascita' },
          { key: 'sede', label: 'Sede' },
          { key: 'stato', label: 'Stato' },
          { key: 'ruolo', label: 'Ruolo' },
          { key: 'specializzazioni', label: 'Specializzazioni' },
          { key: 'patenti', label: 'Patenti' },
          { key: 'email', label: 'Email' },
          { key: 'telefono', label: 'Telefono' },
          { key: 'indirizzo', label: 'Indirizzo' },
          { key: 'citta', label: 'Città' },
          { key: 'cap', label: 'CAP' },
          { key: 'gruppoSanguigno', label: 'Gruppo Sanguigno' },
          { key: 'ultimoAccesso', label: 'Ultimo Accesso App' }
      ];

      const selectedCols = allPossibleColumns.filter(c => exportColumns[c.key]);
      const headers = selectedCols.map(c => c.label);

      const rows = filtered.map(v => selectedCols.map(c => {
          if (c.key === 'specializzazioni' || c.key === 'patenti') {
              return v[c.key] ? v[c.key].join(", ") : "";
          }
          if (c.key === 'ultimoAccesso') {
              return v[c.key] ? new Date(v[c.key]).toLocaleString() : "Mai Entrato";
          }
          return v[c.key] || "";
      }));

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => `"${e.join('","')}"`)].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `volontari_pcgl_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast("Esportazione completata.");
      setShowExportModal(false);
  };

  // --- GESTIONE STATO UTENTE (ATTIVO/SOSPESO) ---
  const toggleUserStatus = async (uid, currentStatus) => {
      const newStatus = currentStatus === 'attivo' ? 'sospeso' : 'attivo';
      try {
          await updateDoc(doc(db, 'users', uid), { stato: newStatus });
          
          // Aggiornamento locale ottimistico
          setSearchedVolunteers(prev => prev.map(u => u.id === uid ? { ...u, stato: newStatus } : u));
          setAllUsers(prev => prev.map(u => u.id === uid ? { ...u, stato: newStatus } : u));
          
          const targetUser = allUsers.find(u => u.id === uid) || searchedVolunteers.find(u => u.id === uid);
          const targetName = targetUser ? `${targetUser.nome} ${targetUser.cognome}` : uid;
          
          await logAction("CAMBIO STATO", `Stato utente ${targetName} modificato in ${newStatus.toUpperCase()}`);
          showToast(`Stato utente aggiornato a ${newStatus.toUpperCase()}`);
      } catch (e) {
          console.error(e);
          showToast("Errore aggiornamento stato", 'error');
      }
  };

  // Accetta sia l'ID del file Drive sia un link di condivisione completo (…/file/d/ID/view, …?id=ID)
  const extractDriveId = (value) => {
      const s = String(value || '').trim();
      const m = s.match(/\/d\/([\w-]{10,})/) || s.match(/[?&]id=([\w-]{10,})/);
      return m ? m[1] : s;
  };
  const getDriveImgUrl = (value) => {
      if (!value) return null;
      const s = String(value).trim();
      // URL di un'immagine non su Drive (es. Firebase Storage): usata così com'è
      if (/^https?:\/\//i.test(s) && !/drive\.google\.com|docs\.google\.com/i.test(s)) return s;
      return `https://drive.google.com/thumbnail?id=${extractDriveId(s)}&sz=w600`;
  };

  // --- FUNZIONI DI SUPPORTO ---
  const updateRole = async (uid, newRole) => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    let updateData = { ruolo: newRole };
    // Garanzia Tessera anche in cambio ruolo (recupero storico)
    if (userSnap.exists() && !userSnap.data().numeroTessera) {
        updateData.numeroTessera = await generateTesserinoId();
    }

    await updateDoc(userRef, updateData);
    const targetUser = allUsers.find(u => u.id === uid);
    const targetName = targetUser ? `${targetUser.nome} ${targetUser.cognome}` : uid;
    
    if (['admin', 'superadmin'].includes(userData.ruolo)) {
      await logAction("AMMINISTRAZIONE RUOLI", `Modifica ruolo per ${targetName} -> ${newRole.toUpperCase()}`);
    } else {
      await logAction("CAMBIO RUOLO", `Modifica ruolo per ${targetName} -> ${newRole.toUpperCase()}`);
    }
  };

  const canEditUser = (targetUser) => {
      if (targetUser.id === userData.uid) return false; // Non modificare se stessi
      if (['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo)) return true;
      if (userData.ruolo === 'presidente' && targetUser.sede === userData.sede && targetUser.ruolo === 'volontario') return true;
      return false;
  };

  const approveVolunteer = async (id, role = 'volontario') => {
    try {
      const userRef = doc(db, 'users', id);
      const userSnap = await getDoc(userRef);
      
      let updateData = { stato: 'attivo', ruolo: role };
      
      // GARANZIA TESSERA: Se manca, la generiamo ora.
      if (userSnap.exists()) {
          const userData = userSnap.data();
          if (!userData.numeroTessera) {
              updateData.numeroTessera = await generateTesserinoId();
          }
      }

      await updateDoc(userRef, updateData);
      const targetUser = pendingVolunteers.find(u => u.id === id) || allUsers.find(u => u.id === id);
      
      // Aggiornamento locale immediato per searchedVolunteers
      setSearchedVolunteers(prev => prev.map(u => u.id === id ? { ...u, stato: 'attivo', ruolo: role } : u));

      const targetName = targetUser ? `${targetUser.nome} ${targetUser.cognome}` : id;
      await logAction("APPROVAZIONE", `Volontario ${targetName} attivato con ruolo ${role.toUpperCase()}`);
      
      // TRIGGER AUTOMATICO SINCRONIZZAZIONE MOODLE ALL'APPROVAZIONE (Sfondo)
      try {
          const authToken = await auth.currentUser.getIdToken();
          fetch('https://europe-west1-pcgl-volontari.cloudfunctions.net/syncExistingUsersToMoodle', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${authToken}` }
          }).catch(e => console.warn("Auto-sync Moodle fail:", e));
      } catch (err) { console.error("Moodle sync trigger error", err); }

      showToast(`Utente approvato come ${role.toUpperCase()}`);
    } catch (error) {
      console.error("Errore approvazione:", error);
      showToast("Errore durante l'approvazione: " + error.message, 'error');
    }
  };

  // --- GESTIONE RIFIUTO CON MOTIVAZIONE ---
  const openRejectionModal = (id) => {
    setVolunteerToRejectId(id);
    setRejectionReason('');
    setShowRejectionModal(true);
  };

  const confirmRejection = async () => {
    if (!volunteerToRejectId) return;
    
    const targetUser = pendingVolunteers.find(u => u.id === volunteerToRejectId) || allUsers.find(u => u.id === volunteerToRejectId);
    
    // Invio Email di Rifiuto
    if (targetUser && targetUser.email) {
      try {
        await addDoc(collection(db, 'mail'), {
          to: [targetUser.email],
          message: {
            subject: "Esito Iscrizione PCGL",
            html: `<p>Gentile ${targetUser.nome},</p><p>Ci dispiace informarti che la tua richiesta di iscrizione è stata <strong>rifiutata</strong>.</p><p><strong>Motivazione:</strong> ${rejectionReason || "Non specificata."}</p><p>Per maggiori informazioni o chiarimenti, ti invitiamo a contattare direttamente il Presidente della tua sede operativa.</p><br><p>Cordiali Saluti,<br>Segreteria PCGL</p>`
          }
        });
      } catch (e) { console.error("Errore invio email rifiuto:", e); }
    }

    await deleteDoc(doc(db, 'users', volunteerToRejectId));
    await logAction("RIFIUTO", `Richiesta volontario ${volunteerToRejectId} rifiutata. Motivo: ${rejectionReason}`);
    
    setShowRejectionModal(false);
    setVolunteerToRejectId(null);
    showToast("Richiesta rifiutata ed eliminata.");
  };

  const handleIscrizioneCorso = async (corsoId) => {
    await addDoc(collection(db, 'iscrizioni_corsi'), {
      corsoId, volontarioId: user.uid, nome: userData.nome, cognome: userData.cognome, 
      sede: userData.sede, cf: userData.cf, stato: 'richiesto', dataRichiesta: new Date().toISOString()
    });
    showToast("Candidatura inviata!");
  };

  const confermaPresenzaFascicolo = async (iscrizioneId, vId, corsoTitolo) => {
    await updateDoc(doc(db, 'users', vId), {
      fascicoloCorsi: arrayUnion({ titolo: corsoTitolo, data: new Date().toISOString(), certificato: true })
    });
    await deleteDoc(doc(db, 'iscrizioni_corsi', iscrizioneId));
    showToast("Corso certificato nel fascicolo del volontario!");
    await logAction("CERTIFICAZIONE", `Corso ${corsoTitolo} certificato a ${vId}`);
  };

  const toggleSpecialization = async (spec) => {
    if (userData.specializzazioni?.includes(spec)) {
        await updateDoc(doc(db, 'users', user.uid), { specializzazioni: arrayRemove(spec) });
    } else {
        await updateDoc(doc(db, 'users', user.uid), { specializzazioni: arrayUnion(spec) });
    }
  };

  const updatePendingProfile = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'users', user.uid), pendingForm);
      setUserData({ ...userData, ...pendingForm });
      showToast("Dati aggiornati con successo!");
    } catch (err) {
      showToast("Errore aggiornamento: " + err.message, 'error');
    }
  };

  const saveProfileData = async () => {
    try {
        await updateDoc(doc(db, 'users', user.uid), profileForm);
        showToast("Dati profilo aggiornati!");
    } catch (e) {
        console.error(e);
        showToast("Errore aggiornamento.", 'error');
    }
  };

  const addCorsoManuale = async () => {
    if (!newCorsoManuale || !newDataCorsoManuale) { setError("Inserisci titolo e data."); return; }
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        fascicoloCorsi: arrayUnion({ titolo: newCorsoManuale, data: newDataCorsoManuale, certificato: false, tipo: 'esterno' })
      });
      setNewCorsoManuale(''); setNewDataCorsoManuale('');
      showToast("Attestato aggiunto al fascicolo!");
    } catch (err) { setError("Errore: " + err.message); }
  };

  const handleProfilePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validazione File (Immagine & < 5MB)
    if (!file.type.startsWith('image/')) {
      showToast("Il file selezionato non è un'immagine valida.", 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("L'immagine è troppo grande. Dimensione massima: 5MB.", 'error');
      return;
    }

    setUploading(true);
    // Il path DEVE essere esattamente il UID per rispettare le regole di sicurezza di Firebase
    const storageRef = ref(storage, `profile_pictures/${user.uid}`);
    try {
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      // Aggiungiamo il timestamp all'URL scaricato per aggirare la cache locale del browser/app
      const cacheBustedUrl = `${downloadURL}&v=${Date.now()}`;
      await updateDoc(doc(db, 'users', user.uid), { fotoProfilo: cacheBustedUrl });
      if(userData.stato === 'pendente') setPendingForm({...pendingForm, fotoProfilo: cacheBustedUrl});
      showToast("Foto profilo aggiornata!");
    } catch (err) { setError("Errore caricamento foto: " + err.message); } 
    finally { setUploading(false); }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
          showToast(`Posizione acquisita: Lat ${position.coords.latitude.toFixed(4)}, Lon ${position.coords.longitude.toFixed(4)}`);
        },
        (error) => { setError("Errore nell'acquisire la posizione: " + error.message); }
      );
    } else { setError("La geolocalizzazione non è supportata dal tuo browser."); }
  };

  const sendReport = async () => {
    if (!reportText && !currentLocation) { setError("Il report non può essere vuoto."); return; }
    try {
      await addDoc(collection(db, 'reports_monitoraggio'), {
        volontarioId: user.uid, nome: userData.nome, cognome: userData.cognome, sede: userData.sede,
        data: new Date().toISOString(), testo: reportText, posizione: currentLocation,
      });
      setReportText(''); setCurrentLocation(null);
      showToast("Report inviato con successo!");
      await logAction("REPORT", `Nuovo report da ${userData.sede}`);
    } catch (err) { setError("Errore nell'inviare il report: " + err.message); }
  };

  const handleParticipation = async (alertId, status) => {
    await setDoc(doc(db, 'partecipazioni_allerta', `${alertId}_${user.uid}`), {
      alertId,
      uid: user.uid,
      nome: `${userData.nome} ${userData.cognome}`,
      sede: userData.sede,
      status
    });
  };

  const assignTeam = async (uid, teamName) => {
    if(!selectedAlertForTeams) return;
    const partId = `${selectedAlertForTeams.id}_${uid}`;
    try {
        await updateDoc(doc(db, 'partecipazioni_allerta', partId), { squadra: teamName });
    } catch (e) { console.error("Error assigning team", e); }
  };

  const handleCheckIn = async () => {
    if (!myParticipation || !attivazioniAttive.length) return;
    const alertId = attivazioniAttive[0].id;
    await updateDoc(doc(db, 'partecipazioni_allerta', `${alertId}_${user.uid}`), {
        checkIn: new Date().toISOString()
    });
  };

  const handleCheckOut = async () => {
    if (!myParticipation || !attivazioniAttive.length) return;
    const alertId = attivazioniAttive[0].id;
    await updateDoc(doc(db, 'partecipazioni_allerta', `${alertId}_${user.uid}`), {
        checkOut: new Date().toISOString()
    });
  };

  const generateReport = async (alert) => {
    const q = query(collection(db, 'partecipazioni_allerta'), where('alertId', '==', alert.id));
    const s = await getDocs(q);
    const parts = s.docs.map(d => d.data());
    // Filtra per sede se presidente
    const filteredParts = userData.ruolo === 'presidente' ? parts.filter(p => p.sede === userData.sede) : parts;
    setReportData({ alert, participations: filteredParts });
    setSubPage('report_view');
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || attivazioniAttive.length === 0) return;
    const alertId = attivazioniAttive[0].id;
    try {
      await addDoc(collection(db, 'chat_sede'), {
        testo: newMessage,
        autore: `${userData.nome} ${userData.cognome}`,
        uid: user.uid,
        sede: userData.sede,
        alertId: alertId,
        data: new Date().toISOString()
      });
      setNewMessage('');
    } catch (err) {
      console.error("Errore invio messaggio:", err);
    }
  };

  const saveVersionConfig = async () => {
    if (!versionForm.androidVersion || !versionForm.downloadUrl) {
        showToast("Versione e URL sono obbligatori.", 'error');
        return;
    }
    try {
        await setDoc(doc(db, 'settings', 'config'), versionForm);
        showToast("Configurazione aggiornamento salvata!");
    } catch (e) {
        console.error(e);
        showToast("Errore salvataggio.", 'error');
    }
  };

  const deleteVersionConfig = async () => {
    if (!window.confirm("Sei sicuro di voler ritirare questo rilascio? Gli utenti non riceveranno più la notifica di aggiornamento.")) return;
    try {
        await deleteDoc(doc(db, 'settings', 'config'));
        setVersionForm({ androidVersion: '', downloadUrl: '', forceUpdate: false, note: '', maintenance: false });
        showToast("Rilascio ritirato con successo.");
    } catch (e) {
        console.error(e);
        showToast("Errore durante l'eliminazione.", 'error');
    }
  };

  const handleSyncMoodle = async () => {
      if (!window.confirm("Attenzione: Vuoi sincronizzare tutti i volontari ATTIVI su Moodle? L'operazione potrebbe richiedere alcuni minuti se ci sono molti iscritti.")) return;
      setSyncingMoodle(true);
      try {
          const token = await auth.currentUser.getIdToken();
          const response = await fetch('https://europe-west1-pcgl-volontari.cloudfunctions.net/syncExistingUsersToMoodle', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          const result = await response.json();
          if (response.ok) {
              let msg = `Sinc. completata! Aggiornati: ${result.synced}. Falliti: ${result.failedOrSkipped}.`;
              if (result.failedOrSkipped > 0 && result.error) msg += ` (Errore: ${result.error})`;
              showToast(msg, result.failedOrSkipped > 0 ? 'error' : 'success');
          } else {
              showToast("Errore: " + result.error, "error");
          }
      } catch (e) {
          showToast("Errore di connessione durante la sincronizzazione.", "error");
      } finally {
          setSyncingMoodle(false);
      }
  };

  const sendMoodleCommunication = async () => {
      if (!moodleCourseReport || !moodleMailSubject || !moodleMailBody) return;
      const filteredUsers = moodleCourseReport.users.filter(u => !moodleFilterSede || (u.department || 'N/D') === moodleFilterSede);
      const emails = filteredUsers.map(u => u.email).filter(e => e);
      
      if (emails.length === 0) { showToast("Nessun destinatario valido.", 'error'); return; }
      
      try {
        await addDoc(collection(db, 'mail'), {
          to: emails,
          message: {
            subject: `[Corsi PCGL] ${moodleMailSubject}`,
            text: moodleMailBody,
            html: moodleMailBody.replace(/\n/g, '<br>')
          }
        });
        showToast(`Messaggio inviato a ${emails.length} iscritti.`);
        setShowMoodleMail(false); setMoodleMailSubject(''); setMoodleMailBody('');
      } catch (e) { console.error(e); showToast("Errore invio.", 'error'); }
  };

  // --- RECUPERO REPORT ISCRITTI MOODLE (ADMIN/COORD) ---
  const handleMoodleCourseReport = async (course) => {
      setLoadingMoodleReport(true);
      try {
              const getReportFn = httpsCallable(getFunctions(auth.app, 'europe-west1'), 'getMoodleCourseReport');
              const res = await getReportFn({ courseId: course.id });
              const data = res.data.users;

          if (Array.isArray(data)) {
              // Arricchiamo i dati Moodle con l'informazione se l'utente è presente nell'app
              const moodleEmails = data.map(u => u.email).filter(Boolean);
              const appUsersMap = new Map();

              if (moodleEmails.length > 0) {
                  const chunkSize = 30; // Limite 'in' di Firestore
                  for (let i = 0; i < moodleEmails.length; i += chunkSize) {
                      const chunk = moodleEmails.slice(i, i + chunkSize);
                      const q = query(collection(db, 'users'), where('email', 'in', chunk));
                      const snapshot = await getDocs(q);
                      snapshot.forEach(doc => {
                          const d = doc.data();
                          appUsersMap.set(d.email.toLowerCase(), d);
                      });
                  }
              }

              const augmentedUsers = data.map(u => {
                  let appartenenza = null;
                  if (u.customfields && Array.isArray(u.customfields)) {
                      const appField = u.customfields.find(f => f.shortname === 'appartenenza' || f.type === 'appartenenza');
                      if (appField) appartenenza = appField.value;
                  }
                  
                  const firestoreUser = appUsersMap.get((u.email || '').toLowerCase());
                  let finalDepartment = u.department;
                  
                  if (firestoreUser && (!finalDepartment || finalDepartment === 'N/D' || finalDepartment.toUpperCase() === 'PCGL')) {
                      finalDepartment = firestoreUser.sede;
                  }

                  return {
                      ...u,
                      department: finalDepartment,
                      isAppUser: !!firestoreUser,
                      appartenenza
                  };
              });

              setMoodleCourseReport({ courseName: course.fullname, users: augmentedUsers });
          } else if (data && data.exception) {
              console.error("Eccezione API Moodle:", data);
              showToast(`Errore Moodle (${data.errorcode}): ${data.message}`, "error");
          } else {
              showToast("Risposta API non valida da Moodle.", "error");
          }
      } catch (e) {
          showToast("Errore di connessione a Moodle.", "error");
      } finally {
          setLoadingMoodleReport(false);
      }
  };

  const calculateServiceHours = async () => {
    if (!hoursReportRange.start || !hoursReportRange.end) {
        showToast("Seleziona un intervallo di date.", 'error');
        return;
    }
    setCalculatingHours(true);
    try {
        const start = new Date(hoursReportRange.start).toISOString();
        const end = new Date(hoursReportRange.end + 'T23:59:59').toISOString();
        
        // Query su partecipazioni_allerta per data checkIn
        const q = query(collection(db, 'partecipazioni_allerta'), 
            where('checkIn', '>=', start), 
            where('checkIn', '<=', end)
        );
        
        const snapshot = await getDocs(q);
        const report = {};
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.checkIn && data.checkOut) {
                const durationMs = new Date(data.checkOut) - new Date(data.checkIn);
                const durationHours = durationMs / (1000 * 60 * 60);
                
                if (!report[data.uid]) {
                    report[data.uid] = {
                        uid: data.uid,
                        nome: data.nome,
                        sede: data.sede,
                        totaleOre: 0,
                        turni: 0
                    };
                }
                report[data.uid].totaleOre += durationHours;
                report[data.uid].turni += 1;
            }
        });
        
        setHoursReportData(Object.values(report).sort((a, b) => b.totaleOre - a.totaleOre));
    } catch (e) {
        console.error("Error calculating hours", e);
        showToast("Errore calcolo ore.", 'error');
    } finally {
        setCalculatingHours(false);
    }
  };

  // --- FUNZIONI GESTIONE PRESENZE LIVE ---
  const createAttendanceSession = async () => {
      if (!newSessionTitle.trim()) {
          showToast("Inserisci un titolo per la sessione.", 'error');
          return;
      }
      try {
          await addDoc(collection(db, 'registro_presenze'), {
              titolo: newSessionTitle.toUpperCase(),
              dataCreazione: new Date().toISOString(),
              creatore: `${userData.nome} ${userData.cognome}`,
              creatoreUid: user.uid,
              sede: userData.sede,
              isPaused: false,
              isClosed: false,
              mode: newSessionMode,
              tipo: newSessionType,
              requireLocation: newSessionRequireLocation,
              posizione: newSessionRequireLocation ? newSessionLocation : null
          });
          setNewSessionTitle('');
          setNewSessionMode('esterno');
          setNewSessionType('corso');
          setNewSessionRequireLocation(false);
          setNewSessionLocation(null);
          showToast("Sessione creata con successo!");
      } catch (e) {
          console.error(e);
          showToast("Errore durante la creazione della sessione.", 'error');
      }
  };

  const deleteAttendanceSession = async (id) => {
      if (!window.confirm("Sei sicuro di voler eliminare questa sessione? I dati di presenza andranno persi.")) return;
      try {
          await deleteDoc(doc(db, 'registro_presenze', id));
          setSelectedSession(null);
          showToast("Sessione eliminata.");
      } catch (e) {
          console.error(e);
          showToast("Errore durante l'eliminazione.", 'error');
      }
  };

  const togglePresenceValidation = async (id, currentStatus) => {
      try {
          await updateDoc(doc(db, 'presenze_registrate', id), {
              validato: !currentStatus
          });
          showToast(!currentStatus ? "Presenza validata!" : "Validazione annullata.");
      } catch (e) {
          console.error(e);
          showToast("Errore durante l'aggiornamento.", 'error');
      }
  };

  const toggleSessionPause = async (session) => {
      const newStatus = !session.isPaused;
      let message = "";
      if (newStatus) {
          const promptMsg = window.prompt("Inserisci un messaggio da mostrare a chi scansiona il QR Code:", "Le registrazioni sono momentaneamente chiuse.");
          if (promptMsg === null) return;
          message = promptMsg;
      }
      try {
          await updateDoc(doc(db, 'registro_presenze', session.id), {
              isPaused: newStatus,
              messaggioPausa: message,
              pauseHistory: arrayUnion({
                  isPaused: newStatus,
                  timestamp: new Date().toISOString(),
                  autore: `${userData.nome} ${userData.cognome}`,
                  messaggio: message
              })
          });
          await logAction("GESTIONE PRESENZE", `Sessione "${session.titolo}" ${newStatus ? "messa in pausa" : "riattivata"}`);
          showToast(newStatus ? "Registrazioni in pausa." : "Registrazioni riattivate!");
      } catch (e) {
          console.error(e);
          showToast("Errore durante l'aggiornamento.", 'error');
      }
  };

  const closeAttendanceSession = async (session) => {
      if (!window.confirm("Chiudere definitivamente questa sessione? Non sarà più possibile registrarsi.")) return;
      try {
          await updateDoc(doc(db, 'registro_presenze', session.id), { isClosed: true });
          await logAction("GESTIONE PRESENZE", `Sessione "${session.titolo}" chiusa definitivamente`);
          showToast("Sessione chiusa definitivamente!");
      } catch (e) {
          console.error(e);
          showToast("Errore durante la chiusura.", 'error');
      }
  };

  // --- FUNZIONI AREE TEMATICHE ---
  const saveArea = async () => {
      if (!areaForm.titolo) return;
      try {
          if (areaForm.id) {
              const { id, ...data } = areaForm;
              await updateDoc(doc(db, 'aree_tematiche', id), data);
              showToast("Progetto aggiornato!");
          } else {
              const { id, ...data } = areaForm;
              await addDoc(collection(db, 'aree_tematiche'), { ...data, documenti: [], createdAt: new Date().toISOString() });
              showToast("Progetto creato!");
          }
          setShowAreaModal(false);
      } catch (e) { console.error(e); showToast("Errore salvataggio.", "error"); }
  };

  const deleteArea = async (id) => {
      if (window.confirm("Sei sicuro di voler eliminare questo progetto?")) {
          await deleteDoc(doc(db, 'aree_tematiche', id));
          showToast("Progetto eliminato.");
      }
  };

  const uploadAreaDoc = async (file) => {
      if (!file || !viewingArea) return;
      if (file.size > 15 * 1024 * 1024) { showToast("File troppo grande (Max 15MB)", "error"); return; }
      setUploading(true);
      try {
          const storageRef = ref(storage, `aree_tematiche_docs/${viewingArea.id}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          await updateDoc(doc(db, 'aree_tematiche', viewingArea.id), {
              documenti: arrayUnion({ nome: file.name, url, autore: `${userData.nome} ${userData.cognome}`, data: new Date().toISOString() })
          });
          showToast("Documento caricato!");
      } catch (e) { console.error(e); showToast("Errore caricamento.", "error"); }
      finally { setUploading(false); }
  };

  const deleteAreaDoc = async (docData) => {
      if (window.confirm("Eliminare questo documento?")) {
          await updateDoc(doc(db, 'aree_tematiche', viewingArea.id), { documenti: arrayRemove(docData) });
      }
  };

  const sendAreaMessage = async () => {
      if (!newAreaMessage.trim() || !viewingArea) return;
      try { await addDoc(collection(db, 'aree_tematiche', viewingArea.id, 'chat'), { testo: newAreaMessage, autore: `${userData.nome} ${userData.cognome}`, sede: userData.sede, uid: user.uid, data: new Date().toISOString() }); setNewAreaMessage(''); } catch (e) { console.error(e); }
  };

  const deleteAreaMessage = async (msgId) => {
      if (window.confirm("Eliminare questo messaggio?")) { await deleteDoc(doc(db, 'aree_tematiche', viewingArea.id, 'chat', msgId)); }
  };

  const sendAreaMeetingNotification = async () => {
      if (!viewingArea) return;
      const dataRiunione = window.prompt("Quando si terrà la riunione e dove? (Es. Domani alle 18:30 in Sede Centrale)");
      if (!dataRiunione) return;
      
      const msg = `📢 CONVOCAZIONE RIUNIONE\nSi avvisano i membri iscritti che è prevista una riunione per il progetto.\nDettagli: ${dataRiunione}`;
      try { 
          await addDoc(collection(db, 'aree_tematiche', viewingArea.id, 'chat'), { 
              testo: msg, 
              autore: `${userData.nome} ${userData.cognome}`, 
              sede: userData.sede, 
              uid: user.uid, 
              data: new Date().toISOString(),
              tipo: 'riunione'
          }); 
          showToast("Convocazione inviata e notificata!");
      } catch (e) { console.error(e); }
  };

  const [extraUsers, setExtraUsers] = useState({});
  const [areaUserSearch, setAreaUserSearch] = useState('');
  const [areaUserResults, setAreaUserResults] = useState([]);

  const getUserData = (uid) => allUsers.find(u => u.id === uid) || extraUsers[uid];
  const getName = (uid) => {
      const u = getUserData(uid);
      return u ? `${u.nome} ${u.cognome}` : "Utente Sconosciuto";
  };

  useEffect(() => {
      const fetchMissingUsers = async () => {
          const uidsToFetch = new Set();
          areeTematiche.forEach(a => { if (a.utentiAbilitati) a.utentiAbilitati.forEach(uid => uidsToFetch.add(uid)); });
          const missing = [...uidsToFetch].filter(uid => uid && !allUsers.find(u => u.id === uid) && !extraUsers[uid]);
          for (const uid of missing) {
              try { const snap = await getDoc(doc(db, 'users', uid)); if (snap.exists()) setExtraUsers(prev => ({...prev, [uid]: {id: uid, ...snap.data()}})); } catch(e) {}
          }
      };
      fetchMissingUsers();
  }, [areeTematiche, allUsers]);

  const searchAreaUser = async () => {
      if (!areaUserSearch || areaUserSearch.length < 3) return;
      const q = query(collection(db, 'users'), where('cognome', '>=', areaUserSearch.toUpperCase()), where('cognome', '<=', areaUserSearch.toUpperCase() + '\uf8ff'), limit(5));
      const snap = await getDocs(q);
      const results = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setAreaUserResults(results);
      setExtraUsers(prev => { const next = {...prev}; results.forEach(r => next[r.id] = r); return next; });
  };

  // --- FUNZIONI ADMIN (NEWS, RISORSE, ALLERTE) ---
  const handleSaveNews = async () => {
    if (!newNewsTitle || !newNewsContent) return;
    
    // Calcolo testo breve (snippet 150 caratteri)
    const testoBreve = newNewsContent.length > 150 ? newNewsContent.substring(0, 150) + '...' : newNewsContent;
    
    // Calcolo scadenza: o quella personalizzata o 30 giorni da oggi
    const scadenza = newNewsExpiration 
        ? new Date(newNewsExpiration).toISOString() 
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const payload = { 
        titolo: newNewsTitle.toUpperCase(),
        testo: newNewsContent,
        testoBreve: testoBreve,
        // Se è stato incollato un link Drive completo, salva solo l'ID (lo usa anche il sito pcgl.it)
        imgAnteprima: /drive\.google\.com|docs\.google\.com/i.test(newNewsImgPreview) ? extractDriveId(newNewsImgPreview) : newNewsImgPreview.trim(),
        imgInterna: /drive\.google\.com|docs\.google\.com/i.test(newNewsImgInternal) ? extractDriveId(newNewsImgInternal) : newNewsImgInternal.trim(),
        link: newNewsLink,
        dataScadenza: scadenza,
        importante: newNewsImportant,
        inviaTelegram: newNewsTelegram,
        visibilita: newNewsVisibility,
        targetRuolo: newNewsVisibility === 'pubblica' ? null : newNewsTargetRole,
        targetSede: newNewsVisibility === 'pubblica' ? null : newNewsTargetSede,
        formId: newsFormId || null
    };

    if (editingNewsId) {
        await updateDoc(doc(db, 'news', editingNewsId), payload);
        showToast("News aggiornata!");
    } else {
        await addDoc(collection(db, 'news'), { 
            ...payload,
            timestamp: serverTimestamp(), 
            data: new Date().toLocaleDateString('it-IT'), 
            autore: userData.nome + ' ' + userData.cognome, 
            sede: userData.sede, 
            archived: false
        });
        showToast("News aggiunta!");
    }
    resetNewsForm();
  };

  const resetNewsForm = () => {
    setEditingNewsId(null);
    setNewNewsTitle(''); setNewNewsContent(''); setNewNewsExpiration(''); setNewNewsImportant(false); 
    setNewNewsImgPreview(''); setNewNewsImgInternal(''); setNewNewsLink('');
    setNewNewsVisibility('pubblica');
    setNewNewsTargetRole('tutti');
    setNewNewsTargetSede('tutte');
    setNewsFormId('');
    setNewNewsTelegram(true);
  };

  const handleEditNews = (news) => {
      setEditingNewsId(news.id);
      setNewNewsTitle(news.titolo);
      setNewNewsContent(news.testo || news.contenuto);
      setNewNewsImgPreview(news.imgAnteprima || '');
      setNewNewsImgInternal(news.imgInterna || '');
      setNewNewsLink(news.link || '');
      setNewNewsVisibility(news.visibilita || 'pubblica');
      setNewNewsTargetRole(news.targetRuolo || 'tutti');
      setNewNewsTargetSede(news.targetSede || 'tutte');
      setNewNewsExpiration(news.dataScadenza ? news.dataScadenza.split('T')[0] : '');
      setNewNewsImportant(news.importante || false);
      setNewNewsTelegram(news.inviaTelegram !== false);
      setNewsFormId(news.formId || '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteNews = async (id) => { if(!id) return; await deleteDoc(doc(db, 'news', id)); showToast("News eliminata!"); };

  const shareNewsToTelegram = async (news) => {
      if (!window.confirm(`Vuoi inoltrare la news "${news.titolo}" sul canale Telegram ufficiale?`)) return;
      
      const testoMessaggio = news.testoBreve || news.contenuto || news.testo || "";
      const channelText = `📰 <b>${escapeHtml(news.titolo)}</b>\n\n${escapeHtml(testoMessaggio)}`;
      
      try {
          const sendCustomTelegramMessage = httpsCallable(getFunctions(auth.app, 'europe-west1'), 'sendCustomTelegramMessage');
          const result = await sendCustomTelegramMessage({ 
              text: channelText,
              buttonText: "📰 Leggi di più sull'App",
              buttonUrl: "https://pcgl-volontari.web.app/" 
          });
          if (result.data.success) {
              showToast("News condivisa su Telegram con successo!");
          }
      } catch (e) {
          console.error(e);
          showToast("Errore Telegram: " + e.message, "error");
      }
  };

  const addDocument = async () => {
    if (!newDocTitle) { showToast("Inserisci un titolo.", 'error'); return; }
    
    const isStaff = ['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo);
    const sedeTarget = isStaff ? targetSedeDoc : userData.sede;

    let url = newDocUrl;
    let storagePath = null;

    if (docUploadMode === 'file') {
        if (!newDocFile) { showToast("Seleziona un file.", 'error'); return; }
        setUploading(true);
        try {
            const path = `documenti_sede/${sedeTarget}/${Date.now()}_${newDocFile.name}`;
            const storageRef = ref(storage, path);
            await uploadBytes(storageRef, newDocFile);
            url = await getDownloadURL(storageRef);
            storagePath = path;
        } catch (e) {
            console.error(e);
            showToast("Errore upload file.", 'error');
            setUploading(false);
            return;
        } finally {
            setUploading(false);
        }
    } else {
        if (!newDocUrl) { showToast("Inserisci un URL.", 'error'); return; }
    }

    await addDoc(collection(db, 'documenti'), { titolo: newDocTitle, url: url, tipo: newDocType, data: new Date().toISOString(), autore: userData.nome + ' ' + userData.cognome, sede: sedeTarget, storagePath });
    await logAction("DOCUMENTO", `Nuovo documento (${newDocType}): ${newDocTitle} per ${sedeTarget}`);
    setNewDocTitle(''); setNewDocUrl(''); setNewDocFile(null); showToast("Documento aggiunto!");
  };
  const deleteDocument = async (id) => { if(!id) return; await deleteDoc(doc(db, 'documenti', id)); showToast("Documento eliminato!"); };

  const addResource = async () => {
    if (!newResourceName || !newResourceType) return;
    await addDoc(collection(db, 'risorse'), { nome: newResourceName, tipo: newResourceType, quantita: newResourceQuantity, sede: userData.sede, dataAggiunta: new Date().toISOString() });
    await logAction("RISORSA", `Aggiunta risorsa: ${newResourceName} a ${userData.sede}`);
    
    let targetSede = userData.sede;
    if (userData.originalRuolo === 'superadmin' && userData.ruolo !== 'superadmin') {
        targetSede = 'SEDE TEST FITTIZIA';
    }

    await addDoc(collection(db, 'risorse'), { nome: newResourceName, tipo: newResourceType, quantita: newResourceQuantity, sede: targetSede, dataAggiunta: new Date().toISOString() });
    await logAction("RISORSA", `Aggiunta risorsa: ${newResourceName} a ${targetSede}`);
    setNewResourceName(''); setNewResourceType(''); setNewResourceQuantity(1); showToast("Risorsa aggiunta!");
  };
  const deleteResource = async (id) => {
      if(!id) return; 
      
      if (userData.originalRuolo === 'superadmin' && userData.ruolo !== 'superadmin') {
          const ris = risorseSede.find(r => r.id === id);
          if (ris && ris.sede !== 'SEDE TEST FITTIZIA') {
              showToast("In simulazione puoi eliminare solo le risorse della SEDE TEST FITTIZIA.", "error");
              return;
          }
      }

      await deleteDoc(doc(db, 'risorse', id)); showToast("Risorsa eliminata!"); 
  };

  const activateAlert = async () => {
    let zonesToAlert = selectedZones;
    if (userData.ruolo === 'presidente') {
        zonesToAlert = [userData.sede];
    }

    if (!newAlertTitle || zonesToAlert.length === 0) return;

    const existingAlerts = attivazioniAttive.filter(a => a.stato === 'attiva');
    for (const alert of existingAlerts) { await updateDoc(doc(db, 'attivazioni', alert.id), { stato: 'disattiva' }); }
    
    await addDoc(collection(db, 'attivazioni'), { 
      titolo: newAlertTitle, 
      dettagli: newAlertDetails,
      posizione: newAlertLocation,
      colore: newAlertColor,
      zone: zonesToAlert, 
      richiestaSpecializzazione: newAlertSpec, 
      stato: 'attiva', 
      dataAttivazione: new Date().toISOString(), 
      attivatoDa: userData.nome + ' ' + userData.cognome,
      creatorUid: user.uid, // Fondamentale per i permessi di chiusura
      inviaNotifica: sendNotification 
    });
    
    await logAction("ALLERTA", `Attivata allerta ${newAlertColor.toUpperCase()}: ${newAlertTitle} per ${zonesToAlert.join(', ')}`);
    setNewAlertTitle(''); setNewAlertDetails(''); setNewAlertLocation(null); setNewAlertColor('gialla'); setSelectedZones([]); setNewAlertSpec(''); setSendNotification(false); showToast("Allerta attivata!");
  };
  const deactivateAlert = async (id) => { 
    const alert = attivazioniAttive.find(a => a.id === id);
    const title = alert ? alert.titolo : 'Sconosciuta';
    
    try {
        await updateDoc(doc(db, 'attivazioni', id), { 
            stato: 'disattiva',
            chiusaDa: user.uid,
            dataChiusura: new Date().toISOString()
        });
        await logAction("CHIUSURA ALLERTA", `Allerta "${title}" disattivata manualmente.`);
        showToast("Allerta disattivata!");
    } catch (e) {
        console.error(e);
        showToast("Errore durante la disattivazione.", 'error');
    }
  };

  const printTesserino = () => {
    window.print();
  };

  const sendMassCommunication = async (filteredUsers) => {
    if (!massMailSubject || !massMailBody) return;
    const emails = filteredUsers.map(u => u.email).filter(e => e);
    if (emails.length === 0) { showToast("Nessun destinatario valido.", 'error'); return; }
    
    try {
      await addDoc(collection(db, 'mail'), {
        to: emails,
        message: {
          subject: `[PCGL] ${massMailSubject}`,
          text: massMailBody,
          html: massMailBody.replace(/\n/g, '<br>')
        }
      });
      showToast(`Messaggio inviato a ${emails.length} volontari.`);
      setShowMassMail(false); setMassMailSubject(''); setMassMailBody('');
    } catch (e) { console.error(e); showToast("Errore invio.", 'error'); }
  };

  // --- GENERATORE LINK CALENDARIO (GOOGLE) ---
  const generateGoogleCalendarLink = (turno, slot) => {
      const start = new Date(`${turno.data}T${slot.oraInizio}:00`).toISOString().replace(/-|:|\.\d\d\d/g, "");
      const end = new Date(`${turno.data}T${slot.oraFine}:00`).toISOString().replace(/-|:|\.\d\d\d/g, "");
      const title = encodeURIComponent(`Turno PCGL: ${turno.titolo} (${slot.nome})`);
      const details = encodeURIComponent(`Sede operativa: ${turno.sede}`);
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${encodeURIComponent(turno.sede)}`;
  };

  // --- GESTIONE MEZZI ---
  const handleVehicleSave = async () => {
    const isStaff = ['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo);
    let targetSede = isStaff ? vehicleForm.sede : userData.sede;

    // --- PROTEZIONE SIMULAZIONE ---
    if (userData.originalRuolo === 'superadmin' && userData.ruolo !== 'superadmin') {
        targetSede = 'SEDE TEST FITTIZIA';
        if (vehicleForm.id && vehicleForm.sede !== 'SEDE TEST FITTIZIA') {
            showToast("In simulazione puoi modificare solo i mezzi della SEDE TEST FITTIZIA.", "error");
            return;
        }
    }

    if (!vehicleForm.tipo || !vehicleForm.tipologia || !vehicleForm.targa || !targetSede) { setError("Compila tutti i campi obbligatori."); return; }
    try {
      if (vehicleForm.id) {
        // Modifica esistente
        const updateData = {
            tipo: vehicleForm.tipo,
            tipologia: vehicleForm.tipologia,
            targa: vehicleForm.targa,
            scadenzaAssicurazione: vehicleForm.scadenzaAssicurazione,
            scadenzaRevisione: vehicleForm.scadenzaRevisione,
            kmAttuali: parseInt(vehicleForm.kmAttuali) || 0
        };
        if (isStaff) updateData.sede = targetSede;

        await updateDoc(doc(db, 'mezzi', vehicleForm.id), updateData);
        showToast("Mezzo aggiornato!");
        await logAction("MEZZI", `Modificato mezzo ${vehicleForm.targa}`);
      } else {
        // Nuovo inserimento
        const { id, ...newVehicleData } = vehicleForm; // Rimuovi ID nullo dal payload
        await addDoc(collection(db, 'mezzi'), {
            ...newVehicleData,
            sede: targetSede,
            kmAttuali: parseInt(vehicleForm.kmAttuali) || 0,
            documenti: []
        });
        showToast("Mezzo aggiunto con successo!");
        await logAction("MEZZI", `Aggiunto mezzo ${vehicleForm.targa} a ${targetSede}`);
      }
      setShowAddVehicle(false);
      setVehicleForm({ id: null, tipo: '', tipologia: '', targa: '', scadenzaAssicurazione: '', scadenzaRevisione: '', kmAttuali: '', sede: '' });
    } catch (e) { console.error(e); setError("Errore salvataggio mezzo."); }
  };

  const deleteVehicle = async (id) => {
      if (!id) return;
      if (!window.confirm("Sei sicuro di voler eliminare questo mezzo?")) return;
      
      // --- PROTEZIONE SIMULAZIONE ---
      if (userData.originalRuolo === 'superadmin' && userData.ruolo !== 'superadmin') {
          const mezzo = mezzi.find(m => m.id === id);
          if (mezzo && mezzo.sede !== 'SEDE TEST FITTIZIA') {
              showToast("In simulazione puoi eliminare solo i mezzi della SEDE TEST FITTIZIA.", "error");
              return;
          }
      }

      try {
          await deleteDoc(doc(db, 'mezzi', id));
          showToast("Mezzo eliminato!");
          await logAction("MEZZI", `Eliminato mezzo ${id}`);
      } catch (e) {
          console.error(e);
          showToast("Errore eliminazione mezzo.", 'error');
      }
  };

  const exportVehicles = () => {
    const headers = ["Tipo", "Tipologia", "Targa", "Sede", "Scadenza Assicurazione", "Scadenza Revisione"];
    const rows = mezzi.map(m => [m.tipo, m.tipologia, m.targa, m.sede, m.scadenzaAssicurazione, m.scadenzaRevisione]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mezzi_pcgl.csv");
    document.body.appendChild(link);
    link.click();
  };

  const handleMovementSubmit = async () => {
    if (!selectedVehicle || !movementForm.km) { setError("Inserisci i Km."); return; }
    
    // --- PROTEZIONE SIMULAZIONE ---
    if (userData.originalRuolo === 'superadmin' && userData.ruolo !== 'superadmin') {
        if (selectedVehicle.sede !== 'SEDE TEST FITTIZIA') {
            setError("In simulazione puoi movimentare solo mezzi della SEDE TEST FITTIZIA.");
            return;
        }
    }

    try {
        if (movementForm.mode === 'uscita') {
            // APERTURA FOGLIO DI MARCIA
            const allChecked = Object.values(movementForm.checklist).every(v => v === true);
            if (!allChecked) {
                setError("Completa la Checklist Pre-Partenza obbligatoria.");
                return;
            }

            if (!movementForm.motivazione) { setError("Inserisci una motivazione."); return; }
            
            await addDoc(collection(db, 'movimenti_mezzi'), {
                mezzoId: selectedVehicle.id,
                targa: selectedVehicle.targa,
                volontarioId: user.uid,
                nomeVolontario: `${userData.nome} ${userData.cognome}`,
                sede: userData.sede,
                kmPartenza: parseInt(movementForm.km),
                motivazione: movementForm.motivazione,
                noteUscita: movementForm.note,
                dataUscita: new Date().toISOString(),
                stato: 'aperto',
                spese: [],
                checklist: movementForm.checklist
            });
            showToast("Foglio di marcia aperto!");
        } else {
            // CHIUSURA FOGLIO DI MARCIA (RIENTRO)
            const activeMovement = openMovements.find(m => m.mezzoId === selectedVehicle.id);
            if (!activeMovement) return;

            if (parseInt(movementForm.km) < activeMovement.kmPartenza) {
                setError(`I Km di rientro non possono essere inferiori alla partenza (${activeMovement.kmPartenza})`);
                return;
            }

            // FIRMA DIGITALE (MARCA TEMPORALE)
            const firmaDigitale = {
                autore: `${userData.nome} ${userData.cognome}`,
                uid: user.uid,
                data: new Date().toISOString(),
                tipo: 'marca_temporale_app'
            };

            await updateDoc(doc(db, 'movimenti_mezzi', activeMovement.id), {
                kmArrivo: parseInt(movementForm.km),
                noteRientro: movementForm.note,
                dataRientro: new Date().toISOString(),
                stato: 'chiuso',
                spese: movementForm.spese,
                firma: firmaDigitale
            });

            // Aggiorna Km totali del mezzo
            await updateDoc(doc(db, 'mezzi', selectedVehicle.id), { 
                kmAttuali: parseInt(movementForm.km) 
            });
            
            showToast("Rientro registrato e Km aggiornati!");
        }
        setShowMovementModal(false);
        setMovementForm({ mode: 'uscita', km: '', motivazione: '', note: '', spese: [], newSpesaTipo: 'carburante', newSpesaImporto: '', checklist: { carrozzeria: false, pneumatici: false, attrezzatura_dpi: false, livelli_carburante: false } });
    } catch (e) { 
        console.error(e); 
        setError("Errore durante il salvataggio."); 
    }
  };

  const uploadVehicleDoc = async () => {
    if (!selectedVehicle || !vehicleDocFile) return;
    
    // --- PROTEZIONE SIMULAZIONE ---
    if (userData.originalRuolo === 'superadmin' && userData.ruolo !== 'superadmin' && selectedVehicle.sede !== 'SEDE TEST FITTIZIA') {
        showToast("In simulazione puoi caricare documenti solo per i mezzi della SEDE TEST FITTIZIA.", "error");
        return;
    }

    if (vehicleDocFile.size > 10 * 1024 * 1024) {
        showToast("File troppo grande (Max 10MB).", 'error');
        return;
    }

    setUploading(true);
    try {
        const storageRef = ref(storage, `mezzi_docs/${selectedVehicle.id}/${Date.now()}_${vehicleDocFile.name}`);
        await uploadBytes(storageRef, vehicleDocFile);
        const url = await getDownloadURL(storageRef);
        
        await updateDoc(doc(db, 'mezzi', selectedVehicle.id), {
            documenti: arrayUnion({
                nome: vehicleDocFile.name,
                url: url,
                data: new Date().toISOString(),
                autore: `${userData.nome} ${userData.cognome}`
            })
        });
        
        setVehicleDocFile(null);
        showToast("Documento caricato!");
    } catch (e) {
        console.error(e);
        let errorMsg = "Errore caricamento documento.";
        if (e.code === 'storage/unauthorized') errorMsg = "Non hai i permessi per caricare file.";
        else if (e.code === 'storage/retry-limit-exceeded') errorMsg = "Limite tentativi superato. Riprova.";
        else if (e.message) errorMsg = "Errore: " + e.message;
        
        showToast(errorMsg, 'error');
    } finally {
        setUploading(false);
    }
  };

  const deleteVehicleDoc = async (docData) => {
    if (!selectedVehicle || !selectedVehicle.id) return;

    // --- PROTEZIONE SIMULAZIONE ---
    if (userData.originalRuolo === 'superadmin' && userData.ruolo !== 'superadmin' && selectedVehicle.sede !== 'SEDE TEST FITTIZIA') {
        showToast("In simulazione non puoi eliminare documenti di mezzi reali.", "error");
        return;
    }

    try {
        await updateDoc(doc(db, 'mezzi', selectedVehicle.id), {
            documenti: arrayRemove(docData)
        });
        showToast("Documento rimosso.");
    } catch (e) { console.error(e); showToast("Errore rimozione.", 'error'); }
  };

  const handleRecovery = async () => {
    setRecovering(true);
    setRecoveredAccounts(null);
    try {
        const token = await user.getIdToken();
        const response = await fetch('https://europe-west1-pcgl-volontari.cloudfunctions.net/reconcileOrphanedUsers', {
            method: 'POST', // Le onRequest con CORS richiedono un metodo esplicito
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(`Errore server: ${response.status} - ${errData.details || errData.error || 'Errore sconosciuto'}`);
        }
        const result = await response.json();
        setRecoveredAccounts(result);
        if (result.count > 0) {
            showToast(`${result.count} iscrizioni incomplete trovate.`);
        } else {
            showToast("Nessuna iscrizione incompleta trovata.");
        }
    } catch (e) {
        console.error("Errore recupero iscrizioni:", e);
        showToast(`Errore: ${e.message}`, 'error');
    } finally {
        setRecovering(false);
    }
  };

  const handleCompleteOrphanProfile = async (e) => {
      e.preventDefault();
      if (!editingOrphan || !orphanForm) return;
      if (!orphanForm.cfConfermato || orphanForm.cf.length !== 16) {
          showToast("Codice Fiscale non valido o non verificato.", 'error');
          return;
      }
      try {
          const numeroTessera = await generateTesserinoId();
          const newVolunteerData = {
              uid: editingOrphan.uid,
              email: editingOrphan.email,
              nome: orphanForm.nome.toUpperCase(),
              cognome: orphanForm.cognome.toUpperCase(),
              dataNascita: orphanForm.dataNascita,
              luogoNascita: orphanForm.luogoNascita.toUpperCase(),
              cf: orphanForm.cf.toUpperCase(),
              sede: orphanForm.sede,
              ruolo: 'volontario',
              stato: 'pendente',
              numeroTessera,
              fotoProfilo: '',
              specializzazioni: [],
              patenti: [],
              altreInfo: '',
              fascicoloCorsi: [],
              dataIscrizione: new Date().toISOString(),
              telefono: '', indirizzo: '', citta: '', cap: '', gruppoSanguigno: ''
          };
          await setDoc(doc(db, 'users', editingOrphan.uid), newVolunteerData);
          await logAction("RECUPERO ISCRIZIONE", `Profilo completato per l'utente orfano ${editingOrphan.email}`);
          showToast("Profilo completato e messo in pendenza.");
          setRecoveredAccounts(prev => ({ ...prev, orphans: prev.orphans.filter(o => o.uid !== editingOrphan.uid), count: prev.count - 1 }));
          setEditingOrphan(null);
      } catch (err) {
          console.error("Errore completamento profilo orfano:", err);
          showToast("Errore durante il salvataggio.", 'error');
      }
  };

  const shareTesserino = async () => {
    const element = document.getElementById('tesserino-card');
    if (!element) return;
    
    try {
        const blob = await toBlob(element, { 
            backgroundColor: '#ffffff',
            skipFonts: true,
            pixelRatio: 2
        });

        if (!blob) throw new Error("Generazione immagine fallita");

        const file = new File([blob], "tesserino.png", { type: "image/png" });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'Tesserino PCGL',
                text: `Tesserino Digitale - ${userData.nome} ${userData.cognome}`
            });
        } else {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'tesserino.png';
            link.click();
        }
    } catch (e) {
        console.error("Sharing failed", e);
        showToast("Errore durante la condivisione", 'error');
    }
  };

  const removeArrayItem = async (field, value) => {
    try {
        await updateDoc(doc(db, 'users', user.uid), { [field]: arrayRemove(value) });
        showToast("Elemento rimosso.");
    } catch (e) { console.error(e); showToast("Errore rimozione.", 'error'); }
  };

  const removeCourse = async (courseObj) => {
    try {
        await updateDoc(doc(db, 'users', user.uid), { fascicoloCorsi: arrayRemove(courseObj) });
        showToast("Attestato rimosso.");
    } catch (e) { console.error(e); showToast("Errore rimozione.", 'error'); }
  };

  const generateTelegramLink = async () => {
    setIsTelegramLinking(true);
    try {
        const token = await auth.currentUser.getIdToken();
        const response = await fetch('https://europe-west1-pcgl-volontari.cloudfunctions.net/generateTelegramLink', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            const botUsername = "grulu_bot"; 
            const tgLink = `https://t.me/${botUsername}?start=${data.linkToken}`;
            window.location.href = tgLink; // Molto più reattivo su mobile
        } else {
            showToast("Errore durante la generazione del link.", "error");
        }
    } catch (e) {
        console.error(e);
        showToast("Errore di connessione al server.", "error");
    } finally {
        setIsTelegramLinking(false);
    }
  };

  const deleteShift = async (id) => {
      if (!id) return;
      if (!confirm("Eliminare questo turno?")) return;
      try {
          await deleteDoc(doc(db, 'turni_programmati', id));
          showToast("Turno eliminato.");
      } catch (e) { console.error(e); showToast("Errore eliminazione.", 'error'); }
  };

  const markAlertAsViewed = async (alertId) => {
    if (!user || !userData) return;
    const docRef = doc(db, 'partecipazioni_allerta', `${alertId}_${user.uid}`);
    try {
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
            await setDoc(docRef, {
                alertId, uid: user.uid,
                nome: `${userData.nome} ${userData.cognome}`,
                sede: userData.sede,
                status: 'pending',
                viewedAt: new Date().toISOString()
            });
        } else if (!snap.data().viewedAt) {
            await updateDoc(docRef, { viewedAt: new Date().toISOString() });
        }
    } catch (e) { console.error("Error marking view:", e); }
  };

  const confirmReadNews = async () => {
      if (!selectedNews || !user) return;
      try {
          await setDoc(doc(db, 'news', selectedNews.id, 'conferme', user.uid), {
              uid: user.uid,
              nome: userData.nome,
              cognome: userData.cognome,
              sede: userData.sede,
              dataConferma: new Date().toISOString()
          });
          setHasConfirmedRead(true);
          showToast("Lettura confermata!");
      } catch (e) {
          console.error(e);
          showToast("Errore conferma.", 'error');
      }
  };

  const addShiftEvent = async () => {
    if (!newShift.titolo || !newShift.data || newShift.slots.length === 0) {
        showToast("Compila tutti i campi e aggiungi almeno uno slot.", 'error');
        return;
    }
    try {
        await addDoc(collection(db, 'turni_programmati'), {
            ...newShift,
            sede: userData.sede,
            slots: newShift.slots.map(s => ({ ...s, iscritti: [] }))
        });
        setNewShift({ titolo: '', data: '', slots: [] });
        showToast("Turno pubblicato!");
    } catch (e) {
        console.error(e);
        showToast("Errore pubblicazione turno.", 'error');
    }
  };

  const bookShiftSlot = async (eventId, slotIndex) => {
    const eventRef = doc(db, 'turni_programmati', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (eventSnap.exists()) {
            const eventData = eventSnap.data();
            const slots = [...eventData.slots];
            
            if (!slots[slotIndex].iscritti) slots[slotIndex].iscritti = [];
            
            if (slots[slotIndex].iscritti.includes(user.uid)) {
                showToast("Sei già iscritto a questo turno.", 'error');
                return;
            }

            if (slots[slotIndex].iscritti.length >= slots[slotIndex].max) {
                showToast("Slot completo.", 'error');
                return;
            }

            slots[slotIndex].iscritti.push(user.uid);
            await updateDoc(eventRef, { slots });
            showToast("Prenotazione confermata!");
        }
    } catch (e) {
        console.error(e);
        showToast("Errore prenotazione.", 'error');
    }
  };

  // --- GESTIONE CONFIGURAZIONI ---
  const restoreDefaultSedi = async () => {
      if(!confirm("Ripristinare le sedi predefinite?")) return;
      try {
          await updateDoc(doc(db, 'settings', 'app_config'), { sedi: DEFAULT_SEDI_ZONES });
          showToast("Sedi ripristinate!");
      } catch(e) { console.error(e); showToast("Errore ripristino.", 'error'); }
  };

  const addSedeToConfig = async () => {
      if(!newConfigSede || !newConfigZone) { showToast("Inserisci nome e zona.", 'error'); return; }
      try {
          const newSedi = [...appConfig.sedi, { s: newConfigSede.toUpperCase(), z: newConfigZone }];
          await updateDoc(doc(db, 'settings', 'app_config'), { sedi: newSedi });
          setNewConfigSede(''); setNewConfigZone('');
          showToast("Sede aggiunta!");
      } catch(e) { console.error(e); showToast("Errore salvataggio.", 'error'); }
  };

  const removeSedeFromConfig = async (sedeName) => {
      if(!confirm("Eliminare questa sede?")) return;
      const newSedi = appConfig.sedi.filter(s => s.s !== sedeName);
      await updateDoc(doc(db, 'settings', 'app_config'), { sedi: newSedi });
  };

  const addSpecToConfig = async () => {
      if(!newConfigSpec) return;
      const newSpecs = [...appConfig.specs, newConfigSpec];
      await updateDoc(doc(db, 'settings', 'app_config'), { specs: newSpecs });
      setNewConfigSpec('');
  };

  const removeSpecFromConfig = async (spec) => {
      const newSpecs = appConfig.specs.filter(s => s !== spec);
      await updateDoc(doc(db, 'settings', 'app_config'), { specs: newSpecs });
  };

  // --- FUNZIONI GESTIONE MODULI DATI ---
  const handleSaveCustomForm = async () => {
      if (!formEditor.title) { showToast("Inserisci il titolo del modulo.", 'error'); return; }

      // Include la domanda in compilazione se l'utente non ha premuto "Aggiungi Domanda"
      let questions = [...(formEditor.questions || [])];
      if (newFormQuestion.text?.trim()) {
          const pending = buildQuestionFromDraft();
          if (editingQuestionIndex >= 0) questions[editingQuestionIndex] = pending;
          else questions.push(pending);
      }
      // Firestore rifiuta i valori undefined
      questions = questions.map(q => ({
          id: q.id || Date.now().toString() + Math.random().toString(36).slice(2, 6),
          text: q.text || '',
          type: q.type || 'text',
          options: Array.isArray(q.options) ? q.options : [],
          minDate: q.minDate || null,
          maxDate: q.maxDate || null,
          required: !!q.required
      }));

      const basePayload = {
          title: formEditor.title,
          description: formEditor.description || '',
          questions,
          expirationDate: formEditor.expirationDate || null,
          responsibleId: formEditor.responsibleId || null,
          responsibleName: formEditor.responsibleName || null,
          updatedBy: user.uid,
          updatedAt: new Date().toISOString()
      };

      try {
          if (formEditor.id) {
              await updateDoc(doc(db, 'custom_forms', formEditor.id), basePayload);
              showToast("Modulo aggiornato!");
          } else {
              const createPayload = { ...basePayload, createdBy: user.uid, createdAt: new Date().toISOString() };
              const docRef = await addDoc(collection(db, 'custom_forms'), createPayload);
              setCustomForms(prev => [...prev, { ...createPayload, id: docRef.id }]);
              showToast("Modulo creato!");
              if (subPage === 'news_gest') {
                  setNewsFormId(docRef.id);
              }
          }
          setShowFormEditorModal(false);
          setFormEditor({ id: null, title: '', description: '', questions: [], expirationDate: '', responsibleId: null, responsibleName: '' });
          cancelEditQuestion();
      } catch (e) { console.error(e); showToast("Errore salvataggio: " + (e.code || e.message), 'error'); }
  };

  const deleteCustomForm = async (id) => {
      if (!id) return;
      if (!window.confirm("Eliminare questo modulo?")) return;
      await deleteDoc(doc(db, 'custom_forms', id));
      showToast("Modulo eliminato.");
  };

  const buildQuestionFromDraft = () => ({
      id: editingQuestionIndex >= 0 ? formEditor.questions[editingQuestionIndex].id : Date.now().toString(),
      text: newFormQuestion.text.trim(),
      type: newFormQuestion.type,
      options: (newFormQuestion.type === 'choice' || newFormQuestion.type === 'checkbox') ? newFormQuestion.options : [],
      minDate: newFormQuestion.type === 'date_range' ? (newFormQuestion.minDate || null) : null,
      maxDate: newFormQuestion.type === 'date_range' ? (newFormQuestion.maxDate || null) : null,
      required: newFormQuestion.required || false
  });

  const addQuestionToEditor = () => {
      if (!newFormQuestion.text?.trim()) { showToast("Inserisci il testo della domanda.", 'error'); return; }
      const q = buildQuestionFromDraft();

      if (editingQuestionIndex >= 0) {
          const updatedQuestions = [...formEditor.questions];
          updatedQuestions[editingQuestionIndex] = q;
          setFormEditor(prev => ({ ...prev, questions: updatedQuestions }));
          setEditingQuestionIndex(-1);
      } else {
          setFormEditor(prev => ({ ...prev, questions: [...prev.questions, q] }));
      }
      setNewFormQuestion({ text: '', type: 'text', options: [], minDate: '', maxDate: '', required: false });
  };

  const startEditingQuestion = (index) => {
      const q = formEditor.questions[index];
      setNewFormQuestion({
          text: q.text,
          type: q.type,
          options: q.options ? [...q.options] : [],
          minDate: q.minDate || '',
          maxDate: q.maxDate || '',
          required: q.required || false
      });
      setEditingQuestionIndex(index);
  };

  const cancelEditQuestion = () => {
      setEditingQuestionIndex(-1);
      setNewFormQuestion({ text: '', type: 'text', options: [], minDate: '', maxDate: '', required: false });
  };

  const removeQuestionFromEditor = (idx) => {
      if (editingQuestionIndex === idx) cancelEditQuestion();
      setFormEditor(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== idx) }));
  };

  const handleSortQuestions = () => {
      const _questions = [...formEditor.questions];
      const draggedItemContent = _questions.splice(dragItem.current, 1)[0];
      _questions.splice(dragOverItem.current, 0, draggedItemContent);
      dragItem.current = null;
      dragOverItem.current = null;
      setFormEditor(prev => ({ ...prev, questions: _questions }));
      if (editingQuestionIndex !== -1) cancelEditQuestion();
  };

  const openFormResponses = async (form) => {
      setViewingResponses(form);
      const q = query(collection(db, 'form_responses'), where('formId', '==', form.id));
      const snap = await getDocs(q);
      setResponsesList(snap.docs.map(d => d.data()));
      setSubPage('form_responses_view');
  };

  const executeFormCSVExport = () => {
      if (!viewingResponses) return;

      const headers = [];
      if (formExportColumns.data) headers.push("Data");
      if (formExportColumns.utente) headers.push("Utente");
      if (formExportColumns.cf) headers.push("Codice Fiscale");
      if (formExportColumns.sede) headers.push("Sede");
      if (formExportColumns.telefono) headers.push("Telefono");

      const activeQuestions = viewingResponses.questions.filter(q => formExportColumns[q.id]);
      headers.push(...activeQuestions.map(q => q.text));

      const rows = responsesList.map(r => {
          const row = [];
          if (formExportColumns.data) row.push(`"${new Date(r.submittedAt).toLocaleString()}"`);
          if (formExportColumns.utente) row.push(`"${String(r.userName || '').replace(/"/g, '""')}"`);
          if (formExportColumns.cf) {
              let cf = r.userCf;
              if (!cf && allUsers) {
                  const u = allUsers.find(user => user.id === r.userId);
                  if (u) cf = u.cf;
              }
              row.push(`"${String(cf || 'N/D').replace(/"/g, '""')}"`);
          }
          if (formExportColumns.sede) row.push(`"${String(r.userSede || '').replace(/"/g, '""')}"`);
          if (formExportColumns.telefono) row.push(`"${String(r.userPhone || '').replace(/"/g, '""')}"`);

          activeQuestions.forEach(q => {
              const ans = r.answers[q.id];
              let textVal = '';
              if (typeof ans === 'object' && ans !== null && ans.start) {
                  textVal = `${ans.start} -> ${ans.end}`;
              } else if (typeof ans === 'object' && ans !== null && ans.url) {
                  textVal = ans.url;
              } else if (Array.isArray(ans)) {
                  textVal = ans.join(', ');
              } else if (ans === true) {
                  textVal = 'SÌ';
              } else if (ans === false) {
                  textVal = 'NO';
              } else {
                  textVal = ans || '';
              }
              row.push(`"${String(textVal).replace(/"/g, '""')}"`);
          });
          return row;
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","), ...rows.map(e => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `risposte_${viewingResponses.title.replace(/[^a-z0-9]/gi, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setShowFormExportModal(false);
      showToast("Esportazione completata.");
  };

  const submitCustomForm = async () => {
      if (!fillingForm) return;
      try {
          await addDoc(collection(db, 'form_responses'), {
              formId: fillingForm.id,
              formTitle: fillingForm.title,
              newsId: selectedNews?.id || null,
              userId: user.uid,
              userName: `${userData.nome} ${userData.cognome}`,
              userSede: userData.sede,
              userPhone: userData.telefono || 'N/D',
              userCf: userData.cf || 'N/D',
              answers: fillingAnswers,
              submittedAt: new Date().toISOString()
          });
          showToast("Modulo inviato!");
          setFillingForm(null);
          setFillingAnswers({});
      } catch (e) { console.error(e); showToast("Errore invio.", 'error'); }
  };

  const handleFormFileUpload = async (e, qId) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { showToast("File troppo grande (Max 10MB)", 'error'); return; }
      
      setUploading(true);
      try {
          const storageRef = ref(storage, `form_attachments/${fillingForm.id}/${user.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          
          setFillingAnswers(prev => ({ ...prev, [qId]: { name: file.name, url: url, type: 'file' } }));
          showToast("File caricato!");
      } catch (err) {
          console.error(err);
          showToast("Errore caricamento file.", 'error');
      } finally { setUploading(false); }
  };

  const handleFillForm = async (formId) => {
      if (!formId) return;
      let form = customForms.find(f => f.id === formId);
      if (!form) {
          try {
            const snap = await getDoc(doc(db, 'custom_forms', formId));
            if (snap.exists()) form = { id: snap.id, ...snap.data() };
          } catch (e) {
            console.error("Error fetching form:", e);
          }
      }
      if (form) {
          if (form.expirationDate && new Date() > new Date(form.expirationDate)) {
              // PERMETTI ACCESSO AI GESTORI ANCHE SE SCADUTO
              const isStaff = ['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo);
              const isResponsible = form.responsibleId === user.uid;

              if (!isStaff && !isResponsible) {
                  showToast("Il modulo è scaduto e non può più essere compilato.", 'error');
                  return;
              }
              showToast("Modulo scaduto (Accesso Gestore)", 'info');
          }

          // CHECK SE L'UTENTE HA GIÀ RISPOSTO (Per abilitare la modifica)
          try {
            const qResp = query(collection(db, 'form_responses'), where('formId', '==', form.id), where('userId', '==', user.uid));
            const snapResp = await getDocs(qResp);
            if (!snapResp.empty) {
                const existingDoc = snapResp.docs[0];
                setFillingAnswers(existingDoc.data().answers || {});
                setEditingResponseId(existingDoc.id);
                showToast("Risposta precedente caricata. Puoi modificarla.", 'info');
            } else {
                setFillingAnswers({});
                setEditingResponseId(null);
            }
          } catch (e) {
            console.error("Error checking existing response", e);
            setFillingAnswers({});
            setEditingResponseId(null);
          }

          // CHECK DATE OCCUPATE (Per domande tipo date_range)
          const dateRangeQuestions = form.questions.filter(q => q.type === 'date_range');
          if (dateRangeQuestions.length > 0) {
              try {
                  const q = query(collection(db, 'form_responses'), where('formId', '==', form.id));
                  const snap = await getDocs(q);
                  const occupied = [];
                  snap.docs.forEach(d => {
                      const ans = d.data().answers;
                      dateRangeQuestions.forEach(dq => {
                          if (ans[dq.id] && ans[dq.id].start && ans[dq.id].end) {
                              occupied.push({ qId: dq.id, start: ans[dq.id].start, end: ans[dq.id].end, user: d.data().userSede });
                          }
                      });
                  });
                  setOccupiedSlots(occupied);
              } catch (e) {
                  console.warn("Unable to fetch occupied slots (permissions?):", e);
                  setOccupiedSlots([]);
              }
          } else { setOccupiedSlots([]); }

          setFillingForm(form);
          setSubPage('fill_form'); // Imposta la pagina dedicata invece del modale
      } else {
          showToast("Modulo non trovato.", 'error');
      }
  };

  const handleSendCustomTelegram = async () => {
      if (!customTelegramMessage.trim()) {
          showToast("Inserisci un messaggio da inviare.", "error");
          return;
      }
      
      if (!window.confirm("Sei sicuro di voler inviare questo messaggio a tutto il canale Telegram?")) return;
      
      setSendingTelegram(true);
      try {
          const sendCustomTelegramMessage = httpsCallable(getFunctions(auth.app, 'europe-west1'), 'sendCustomTelegramMessage');
          const result = await sendCustomTelegramMessage({ 
              text: customTelegramMessage,
              buttonText: tgButtonText,
              buttonUrl: tgButtonUrl
          });
          if (result.data.success) {
              showToast("Messaggio inviato al canale Telegram con successo!");
              setCustomTelegramMessage('');
              setTgButtonText(''); setTgButtonUrl('');
          }
      } catch (e) {
          console.error(e);
          showToast("Errore invio messaggio: " + e.message, "error");
      } finally {
          setSendingTelegram(false);
      }
  };

  const shareMeteoToTelegram = async () => {
      if (!window.confirm(`Vuoi inoltrare il bollettino meteo attuale sul canale Telegram?`)) return;
      
      let iconaOggi = '🟢';
      if (meteoData.oggi === 'gialla') iconaOggi = '🟡';
      if (meteoData.oggi === 'arancione') iconaOggi = '🟠';
      if (meteoData.oggi === 'rossa') iconaOggi = '🔴';

      let iconaDomani = '🟢';
      if (meteoData.domani === 'gialla') iconaDomani = '🟡';
      if (meteoData.domani === 'arancione') iconaDomani = '🟠';
      if (meteoData.domani === 'rossa') iconaDomani = '🔴';

      const text = `⛈ <b>BOLLETTINO METEO: ${meteoData.zona}</b> ⛈\n\nOggi: ${iconaOggi} <b>${meteoData.oggi.toUpperCase()}</b>\nDomani: ${iconaDomani} <b>${meteoData.domani.toUpperCase()}</b>`;
      
      try {
          const sendCustomTelegramMessage = httpsCallable(getFunctions(auth.app, 'europe-west1'), 'sendCustomTelegramMessage');
          const result = await sendCustomTelegramMessage({ 
              text: text,
              buttonText: "⛈ Apri l'App per i Dettagli",
              buttonUrl: "https://pcgl-volontari.web.app/"
          });
          if (result.data.success) {
              showToast("Bollettino condiviso su Telegram con successo!");
          }
      } catch (e) {
          console.error(e);
          showToast("Errore Telegram: " + e.message, "error");
      }
  };

  // --- GESTIONE DEEP LINK (FORM) ---
  useEffect(() => {
      if (user) {
          const params = new URLSearchParams(window.location.search);
          const formId = params.get('formId');
          if (formId) {
              handleFillForm(formId);
              // Pulisci URL mantenendo lo stato
              const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
              window.history.replaceState({path: newUrl}, '', newUrl);
          }
      }
  }, [user]);

  const searchResponsibleUser = async () => {
      if (!responsibleSearch || responsibleSearch.length < 3) return;
      const q = query(collection(db, 'users'), where('cognome', '>=', responsibleSearch.toUpperCase()), where('cognome', '<=', responsibleSearch.toUpperCase() + '\uf8ff'), limit(5));
      const snap = await getDocs(q);
      setResponsibleSearchResults(snap.docs.map(d => ({id: d.id, ...d.data()})));
  };

  const handleDateRangeChange = (qId, field, value) => {
      const currentRange = fillingAnswers[qId] || { start: '', end: '' };
      const newRange = { ...currentRange, [field]: value };
      
      // Validazione Overlap
      if (newRange.start && newRange.end) {
          if (new Date(newRange.start) > new Date(newRange.end)) {
              showToast("La data di fine deve essere successiva all'inizio.", 'error');
              return;
          }
          const hasOverlap = occupiedSlots.filter(s => s.qId === qId).some(slot => {
              return (new Date(newRange.start) <= new Date(slot.end) && new Date(newRange.end) >= new Date(slot.start));
          });
          if (hasOverlap) {
              showToast("Intervallo non disponibile (già prenotato).", 'error');
              return; // Non aggiorna lo stato se overlap
          }
      }
      setFillingAnswers({ ...fillingAnswers, [qId]: newRange });
  };

  const handlePreviewForm = () => {
    setFillingForm({ ...formEditor });
    setPreviewSource('editor');
    setShowFormEditorModal(false);
    setSubPage('fill_form');
  };

  // --- TRACKING VISUALIZZAZIONE ALLERTA ---
  useEffect(() => {
      if (attivazioniAttive.length > 0 && user && userData) {
          const alert = attivazioniAttive[0];
          if (subPage === 'allerta_view' || (participationStatus === 'pending' && !dismissedAlertId)) {
              markAlertAsViewed(alert.id);
          }
      }
  }, [attivazioniAttive, subPage, participationStatus, dismissedAlertId, user, userData]);

  const handleViewVolunteer = (volunteer) => {
      setSelectedVolunteer(volunteer);
      setPreviousPage('modules_view');
      setSubPage('volunteer_detail');
  };

  // --- RENDER SOTTOPAGINE ---
  const renderSubPage = () => {
    switch(subPage) {
      case 'sala_operativa': return <SalaOperativaManager currentUser={userData} onBack={() => setSubPage(previousPage || 'home')} onNavigate={setSubPage} />;

      case 'live_diretta': return <LivePublisherSOGL currentUser={userData} onBack={() => setSubPage(null)} />;

      case 'campagna_aib': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
           <HeaderSub title="Campagna AIB" onBack={() => setSubPage(null)} />
           <div className="px-4 md:px-0">
               <CampagnaAIBSOGL currentUser={userData} />
           </div>
        </div>
      );

      case 'form_manager': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
            <HeaderSub title="Gestione Moduli Dati" onBack={() => setSubPage('settings_view')} />
            
            <button onClick={() => { setFormEditor({ id: null, title: '', description: '', questions: [], expirationDate: '', responsibleId: null, responsibleName: '' }); setShowFormEditorModal(true); }} className="w-full py-4 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-md mb-6 flex items-center justify-center">
                <Plus className="mr-2"/> Crea Nuovo Modulo
            </button>

            <div className="space-y-4 font-sans text-pcgl-text-dark">
                {customForms.filter(f => ['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) || f.responsibleId === user.uid).map(form => (
                    <div key={form.id} className="bg-white p-6 rounded-2xl shadow-card border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-lg text-pcgl-blue uppercase">{form.title}</h3>
                                    {form.expirationDate && new Date() > new Date(form.expirationDate) && (
                                        <span className="bg-red-100 text-red-600 text-[9px] font-bold px-2 py-0.5 rounded uppercase">Scaduto</span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500">{form.description}</p>
                                <p className="text-xs text-gray-400 mt-1">{form.questions?.length || 0} Domande</p>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => {
                                    setPreviewSource('manager_list');
                                    handleFillForm(form.id);
                                }} className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100"><Eye size={18}/></button>
                                <button onClick={() => { cancelEditQuestion(); setFormEditor({ ...form, description: form.description || '', questions: form.questions || [], expirationDate: form.expirationDate || '', responsibleId: form.responsibleId || null, responsibleName: form.responsibleName || '' }); setShowFormEditorModal(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Pencil size={18}/></button>
                                <button onClick={() => {
                                    const link = `${window.location.origin}?formId=${form.id}`;
                                    navigator.clipboard.writeText(link);
                                    showToast("Link copiato negli appunti!");
                                }} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"><LinkIcon size={18}/></button>
                                <button onClick={() => deleteCustomForm(form.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={18}/></button>
                            </div>
                        </div>
                        <button onClick={() => openFormResponses(form)} className="w-full mt-2 py-2 bg-gray-100 text-pcgl-blue rounded-lg text-xs font-bold uppercase hover:bg-gray-200">Visualizza Risposte</button>
                    </div>
                ))}
                {customForms.length === 0 && <p className="text-center text-gray-500 font-medium py-8">Nessun modulo creato.</p>}
            </div>

            {/* MODALE EDITOR MODULO */}
            {showFormEditorModal && (
                <div className="fixed inset-0 bg-black/80 z-[1500] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setShowFormEditorModal(false)} className="absolute top-4 right-4 text-gray-400"><X/></button>
                        <h3 className="font-black text-xl text-pcgl-blue uppercase mb-4">{formEditor.id ? 'Modifica Modulo' : 'Nuovo Modulo'}</h3>
                        
                        <div className="space-y-4">
                            <input type="text" placeholder="Titolo Modulo" className="w-full p-3 bg-gray-50 rounded-xl border font-bold uppercase" value={formEditor.title} onChange={e => setFormEditor({...formEditor, title: e.target.value})} />
                            <input type="text" placeholder="Descrizione" className="w-full p-3 bg-gray-50 rounded-xl border" value={formEditor.description} onChange={e => setFormEditor({...formEditor, description: e.target.value})} />
                            
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 ml-2">Scadenza Modulo</label>
                                    <input type="date" className="w-full p-3 bg-gray-50 rounded-xl border" value={formEditor.expirationDate} onChange={e => setFormEditor({...formEditor, expirationDate: e.target.value})} min={new Date().toISOString().split('T')[0]} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 ml-2">Assegna Responsabile (Opzionale)</label>
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Cerca cognome..." className="flex-1 p-3 bg-gray-50 rounded-xl border text-sm uppercase" value={responsibleSearch} onChange={e => setResponsibleSearch(e.target.value)} />
                                        <button onClick={searchResponsibleUser} className="p-3 bg-pcgl-blue text-white rounded-xl"><Search size={20}/></button>
                                    </div>
                                    {responsibleSearchResults.length > 0 && (
                                        <div className="mt-2 bg-white border rounded-xl overflow-hidden shadow-sm">
                                            {responsibleSearchResults.map(u => (
                                                <div key={u.id} onClick={() => { setFormEditor({...formEditor, responsibleId: u.id, responsibleName: `${u.nome} ${u.cognome}`}); setResponsibleSearchResults([]); setResponsibleSearch(''); }} className="p-2 hover:bg-gray-50 cursor-pointer text-xs border-b last:border-0">{u.cognome} {u.nome} ({u.sede})</div>
                                            ))}
                                        </div>
                                    )}
                                    {formEditor.responsibleName && <div className="mt-2 p-2 bg-blue-50 text-blue-800 rounded-lg text-xs font-bold flex justify-between items-center">Resp: {formEditor.responsibleName} <button onClick={() => setFormEditor({...formEditor, responsibleId: null, responsibleName: ''})}><X size={14}/></button></div>}
                                </div>
                            </div>
                            
                            <div className="border-t pt-4">
                                <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">Domande</label>
                                <div className="bg-gray-50 p-4 rounded-xl border mb-4 space-y-3">
                                    <input type="text" placeholder="Testo Domanda" className="w-full p-2 bg-white rounded-lg border text-sm" value={newFormQuestion.text} onChange={e => setNewFormQuestion({...newFormQuestion, text: e.target.value})} />
                                    <select className="w-full p-2 bg-white rounded-lg text-sm border" value={newFormQuestion.type} onChange={e => setNewFormQuestion({...newFormQuestion, type: e.target.value})}>
                                        <option value="text">Testo Libero</option>
                                        <option value="boolean">Sì / No</option>
                                        <option value="choice">Scelta Singola (Menu)</option>
                                        <option value="checkbox">Scelta Multipla (Caselle)</option>
                                        <option value="date_range">Prenotazione Date (Esclusiva)</option>
                                        <option value="file">Caricamento Documento</option>
                                    </select>
                                    {(newFormQuestion.type === 'choice' || newFormQuestion.type === 'checkbox') && (
                                        <div className="flex flex-col gap-2">
                                            <div className="flex gap-2">
                                                <input type="text" placeholder="Nuova Opzione" className="flex-1 min-w-0 p-2 bg-white rounded-lg text-sm border" value={tempOption} onChange={e => setTempOption(e.target.value)} onKeyDown={e => { if(e.key === 'Enter'){ e.preventDefault(); if(tempOption) { setNewFormQuestion(prev => ({...prev, options: [...prev.options, tempOption]})); setTempOption(''); } } }} />
                                                <button onClick={() => { if(tempOption) { setNewFormQuestion(prev => ({...prev, options: [...prev.options, tempOption]})); setTempOption(''); } }} className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Plus size={16}/></button>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {newFormQuestion.options.map((opt, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-white border rounded text-xs flex items-center gap-1">
                                                        {opt} <button onClick={() => setNewFormQuestion(prev => ({...prev, options: prev.options.filter((_, i) => i !== idx)}))} className="text-red-500"><X size={12}/></button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        )}
                                    {newFormQuestion.type === 'date_range' && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Data Minima</label>
                                                <input type="date" className="w-full p-2 bg-white rounded-lg text-sm border" value={newFormQuestion.minDate} onChange={e => setNewFormQuestion({...newFormQuestion, minDate: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Data Massima</label>
                                                <input type="date" className="w-full p-2 bg-white rounded-lg text-sm border" value={newFormQuestion.maxDate} onChange={e => setNewFormQuestion({...newFormQuestion, maxDate: e.target.value})} />
                                            </div>
                                        </div>
                                    )}
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="req-check" className="w-4 h-4 rounded text-pcgl-blue focus:ring-pcgl-blue" checked={newFormQuestion.required} onChange={e => setNewFormQuestion({...newFormQuestion, required: e.target.checked})} />
                                    <label htmlFor="req-check" className="text-xs font-bold uppercase text-gray-500 cursor-pointer">Campo Obbligatorio</label>
                                </div>
                                <div className="flex gap-2">
                                    {editingQuestionIndex >= 0 && (
                                        <button onClick={cancelEditQuestion} className="flex-1 py-2 bg-gray-200 text-gray-600 rounded-lg font-bold text-xs uppercase">Annulla</button>
                                    )}
                                    <button onClick={addQuestionToEditor} className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase text-white ${editingQuestionIndex >= 0 ? 'bg-orange-500' : 'bg-green-600'}`}>
                                        {editingQuestionIndex >= 0 ? "Aggiorna Domanda" : "Aggiungi Domanda"}
                                    </button>
                                </div>
                                </div>
                                <div className="space-y-2">
                                    {formEditor.questions.map((q, i) => (
                                <div 
                                    key={q.id} 
                                    draggable
                                    onDragStart={(e) => { dragItem.current = i; }}
                                    onDragEnter={(e) => { dragOverItem.current = i; }}
                                    onDragEnd={handleSortQuestions}
                                    onDragOver={(e) => e.preventDefault()}
                                    className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm cursor-move active:bg-blue-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <GripVertical size={16} className="text-gray-300" />
                                        <div>
                                            <p className="font-bold text-sm flex items-center">
                                                {q.text} 
                                                {q.required && <span className="text-red-500 ml-1">*</span>}
                                            </p>
                                            <p className="text-xs text-gray-500 uppercase">{q.type} {(q.type === 'choice' || q.type === 'checkbox') && `[${q.options.join(', ')}]`} {q.type === 'date_range' && `[${q.minDate || '*'} - ${q.maxDate || '*'}]`}</p>
                                        </div>
                                            </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => startEditingQuestion(i)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg"><Pencil size={16}/></button>
                                        <button onClick={() => removeQuestionFromEditor(i)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={16}/></button>
                                    </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button onClick={handleSaveCustomForm} className="w-full py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-lg mt-4">Salva Modulo</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      );

      case 'form_responses_view': return (
          <div className="animate-in slide-in-from-right duration-500 w-full pb-40 print:pb-0">
            <div className="print:hidden">
              <HeaderSub title="Risposte Modulo" onBack={() => setSubPage('form_manager')} />
              <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100 mb-6">
                  <h3 className="font-black text-xl text-pcgl-blue uppercase">{viewingResponses?.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">{viewingResponses?.description}</p>
                  <div className="flex gap-2">
                      <button onClick={() => setShowFormExportModal(true)} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold uppercase shadow-md flex items-center justify-center"><FileSpreadsheet className="mr-2"/> Esporta CSV</button>
                      <button onClick={() => window.print()} className="flex-1 py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-md flex items-center justify-center"><Printer className="mr-2"/> Stampa Report</button>
                  </div>
              </div>
              <div className="space-y-4 font-sans text-pcgl-text-dark">
                  {responsesList.map((res, i) => (
                      <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                          <div className="flex justify-between items-start mb-2 border-b border-gray-100 pb-2">
                              <div>
                                <p className="font-bold text-pcgl-blue uppercase">{res.userName}</p>
                                <p className="text-xs text-gray-500">{res.userCf || allUsers.find(u => u.id === res.userId)?.cf || 'CF N/D'} • {res.userSede} • {res.userPhone}</p>
                              </div>
                              <span className="text-[10px] text-gray-400">{new Date(res.submittedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="space-y-2">
                              {viewingResponses.questions.map(q => (
                                  <div key={q.id} className="text-sm">
                                      <p className="text-xs font-bold text-gray-500">{q.text}</p>
                                      <p className="font-medium">
                                          {res.answers[q.id] === true ? 'SÌ' : 
                                           res.answers[q.id] === false ? 'NO' : 
                                           Array.isArray(res.answers[q.id]) ? res.answers[q.id].join(', ') :
                                           (typeof res.answers[q.id] === 'object' && res.answers[q.id]?.start) ? 
                                           `${new Date(res.answers[q.id].start).toLocaleDateString()} - ${new Date(res.answers[q.id].end).toLocaleDateString()}` : 
                                           (typeof res.answers[q.id] === 'object' && res.answers[q.id]?.url) ?
                                           <a href={res.answers[q.id].url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center"><Paperclip size={14} className="mr-1"/> {res.answers[q.id].name}</a> :
                                           (res.answers[q.id] || '-')}
                                      </p>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))}
                  {responsesList.length === 0 && <p className="text-center text-gray-500 font-medium py-8">Nessuna risposta ricevuta.</p>}
              </div>
            </div>

              {/* PRINT LAYOUT */}
              <div className="hidden print:block w-full bg-white p-8 text-black font-sans">
                  <h1 className="text-3xl font-black uppercase mb-2">Report: {viewingResponses?.title}</h1>
                  <p className="text-sm text-gray-500 mb-8">Generato il {new Date().toLocaleDateString()}</p>
                  <table className="w-full text-left text-sm border-collapse">
                      <thead>
                          <tr className="border-b-2 border-black">
                              <th className="py-2">Data</th><th className="py-2">Volontario</th><th className="py-2">Sede</th><th className="py-2">Risposte</th>
                          </tr>
                      </thead>
                      <tbody>
                          {responsesList.map((r, i) => (
                              <tr key={i} className="border-b border-gray-200">
                                  <td className="py-2 text-xs">{new Date(r.submittedAt).toLocaleDateString()}</td>
                                  <td className="py-2 font-bold uppercase">
                                      {r.userName}<br/>
                                      <span className="text-xs font-normal text-gray-500">{r.userCf || allUsers.find(u => u.id === r.userId)?.cf || 'CF N/D'}</span><br/>
                                      <span className="text-xs font-normal">{r.userPhone}</span>
                                  </td>
                                  <td className="py-2">{r.userSede}</td>
                                  <td className="py-2 text-xs">{viewingResponses.questions.map(q => <div key={q.id}><b>{q.text}:</b> {
                                      r.answers[q.id] === true ? 'SÌ' : 
                                      r.answers[q.id] === false ? 'NO' : 
                                      Array.isArray(r.answers[q.id]) ? r.answers[q.id].join(', ') :
                                      (typeof r.answers[q.id] === 'object' && r.answers[q.id]?.start) ? 
                                      `${r.answers[q.id].start} / ${r.answers[q.id].end}` : 
                                      (typeof r.answers[q.id] === 'object' && r.answers[q.id]?.url) ? r.answers[q.id].name :
                                      r.answers[q.id]
                                  }</div>)}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>

              {showFormExportModal && (
                  <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 animate-in fade-in print:hidden">
                    <div className="bg-white p-6 rounded-3xl w-full max-w-xl shadow-2xl relative max-h-[90vh] flex flex-col">
                      <button onClick={() => setShowFormExportModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24}/></button>
                      <h3 className="font-black text-xl mb-4 text-pcgl-blue uppercase">Esporta Risposte Modulo</h3>
                      
                      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                          <div>
                              <h4 className="font-bold text-sm text-gray-600 uppercase mb-3 border-b pb-1">Dati Utente</h4>
                              <div className="grid grid-cols-2 gap-3">
                                  <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 p-2 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                                      <input type="checkbox" checked={formExportColumns.data} onChange={e => setFormExportColumns({...formExportColumns, data: e.target.checked})} className="rounded text-pcgl-blue focus:ring-pcgl-blue" />
                                      <span className="text-xs font-medium text-gray-700 uppercase">Data Compilazione</span>
                                  </label>
                                  <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 p-2 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                                      <input type="checkbox" checked={formExportColumns.utente} onChange={e => setFormExportColumns({...formExportColumns, utente: e.target.checked})} className="rounded text-pcgl-blue focus:ring-pcgl-blue" />
                                      <span className="text-xs font-medium text-gray-700 uppercase">Nome Utente</span>
                                  </label>
                                  <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 p-2 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                                      <input type="checkbox" checked={formExportColumns.cf || false} onChange={e => setFormExportColumns({...formExportColumns, cf: e.target.checked})} className="rounded text-pcgl-blue focus:ring-pcgl-blue" />
                                      <span className="text-xs font-medium text-gray-700 uppercase">Codice Fiscale</span>
                                  </label>
                                  <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 p-2 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                                      <input type="checkbox" checked={formExportColumns.sede} onChange={e => setFormExportColumns({...formExportColumns, sede: e.target.checked})} className="rounded text-pcgl-blue focus:ring-pcgl-blue" />
                                      <span className="text-xs font-medium text-gray-700 uppercase">Sede</span>
                                  </label>
                                  <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 p-2 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                                      <input type="checkbox" checked={formExportColumns.telefono} onChange={e => setFormExportColumns({...formExportColumns, telefono: e.target.checked})} className="rounded text-pcgl-blue focus:ring-pcgl-blue" />
                                      <span className="text-xs font-medium text-gray-700 uppercase">Telefono</span>
                                  </label>
                                  <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 p-2 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                                      <input type="checkbox" checked={exportColumns.ultimoAccesso || false} onChange={e => setExportColumns({...exportColumns, ultimoAccesso: e.target.checked})} className="rounded text-pcgl-blue focus:ring-pcgl-blue" />
                                      <span className="text-xs font-medium text-gray-700 uppercase">Ultimo Accesso App</span>
                                  </label>
                              </div>
                          </div>

                          <div>
                              <h4 className="font-bold text-sm text-gray-600 uppercase mb-3 border-b pb-1">Domande del Modulo</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {viewingResponses?.questions.map(q => (
                                      <label key={q.id} className="flex items-center space-x-2 cursor-pointer bg-gray-50 p-2 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                                          <input 
                                              type="checkbox" 
                                              checked={formExportColumns[q.id] || false} 
                                              onChange={e => setFormExportColumns({...formExportColumns, [q.id]: e.target.checked})} 
                                              className="rounded text-pcgl-blue focus:ring-pcgl-blue" 
                                          />
                                          <span className="text-xs font-medium text-gray-700 uppercase line-clamp-2">{q.text}</span>
                                      </label>
                                  ))}
                              </div>
                          </div>
                      </div>

                      <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100">
                        <button onClick={() => setShowFormExportModal(false)} className="flex-1 py-3 bg-gray-200 text-gray-600 rounded-xl font-bold uppercase hover:bg-gray-300 transition-colors">Annulla</button>
                        <button onClick={() => executeFormCSVExport()} className="flex-[2] py-3 bg-pcgl-blue text-pcgl-yellow rounded-xl font-bold uppercase shadow-md flex items-center justify-center hover:bg-pcgl-yellow hover:text-pcgl-blue transition-all">
                            <Download className="mr-2" size={20}/> Scarica CSV
                        </button>
                      </div>
                    </div>
                  </div>
              )}
          </div>
      );

      case 'fascicolo_edit': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
          <HeaderSub title="Il Mio Profilo" onBack={() => setSubPage(null)} />
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 flex flex-col items-center text-center">
               <div className="w-40 h-40 rounded-full bg-gray-100 border-4 border-pcgl-yellow shadow-lg overflow-hidden mb-6 relative group">
                  {userData.fotoProfilo || cachedProfilePic ? <img src={cachedProfilePic || userData.fotoProfilo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Camera size={64}/></div>}
                  <label htmlFor="profile-pic-upload" className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                     {uploading ? <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div> : <Camera size={32} />}
                  </label>
               </div>
               <input type="file" id="profile-pic-upload" className="hidden" accept="image/*" onChange={handleProfilePicUpload} disabled={uploading} />
               <h3 className="text-3xl font-black text-pcgl-blue uppercase">{userData.nome} {userData.cognome}</h3>
               <p className="text-gray-500 font-bold uppercase tracking-widest mt-2">{userData.ruolo} • {userData.sede}</p>
               <p className="text-xs text-gray-400 mt-1">CF: {userData.cf}</p>
            </div>

            {/* Collegamento Telegram */}
            <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100 flex flex-col items-center text-center">
               <h4 className="font-bold text-lg text-blue-500 uppercase mb-2 flex items-center">
                 <svg className="w-6 h-6 mr-2 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.21-1.12-.33-1.08-.7.02-.19.27-.39.75-.59 2.95-1.28 4.91-2.13 5.89-2.53 2.8-1.14 3.38-1.34 3.75-1.35.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z"/></svg>
                 Notifiche Telegram
               </h4>
               <p className="text-sm text-gray-500 mb-4">Collega il tuo account al bot per ricevere allerte e avvisi operativi istantanei in chat privata.</p>
               {userData.telegramChatId ? (
                  <div className="w-full space-y-3">
                      <div className="bg-green-100 text-green-700 px-4 py-3 rounded-xl text-sm font-bold uppercase flex items-center justify-center">
                         <Verified size={18} className="mr-2"/> Account Collegato
                      </div>
                      <button onClick={async () => {
                          if (window.confirm("Vuoi scollegare il tuo account Telegram? Potrai ricollegarlo generando un nuovo link.")) {
                              try {
                                  await updateDoc(doc(db, 'users', user.uid), { telegramChatId: null });
                                  setUserData(prev => ({...prev, telegramChatId: null}));
                                  showToast("Account scollegato.");
                              } catch (e) {
                                  console.error(e);
                                  showToast("Errore durante lo scollegamento.", 'error');
                              }
                          }
                      }} className="w-full py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold uppercase hover:bg-gray-200 transition-colors">
                          Scollega o Ripristina Bot
                      </button>
                  </div>
               ) : (
                  <button onClick={generateTelegramLink} disabled={isTelegramLinking} className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all hover:bg-blue-600 disabled:opacity-50">
                     {isTelegramLinking ? 'Collegamento...' : 'Collega Account'}
                  </button>
               )}
            </div>

            {/* QR Code nel Fascicolo */}
            <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100 flex flex-col items-center">
               <h4 className="font-bold text-lg text-pcgl-blue uppercase mb-4 flex items-center"><QrCode className="mr-2"/> Tesserino Digitale</h4>
               <div className="p-4 bg-white rounded-2xl shadow-inner border-2 border-dashed border-gray-200 mb-2">
                  <img src={getQrCodeUrl(userData)} alt="QR Code Personale" className="w-32 h-32 object-contain mix-blend-multiply" />
               </div>
               <p className="font-mono font-black text-xl text-pcgl-blue tracking-widest uppercase">{userData.numeroTessera}</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-6">
               <h4 className="font-bold text-xl text-pcgl-blue uppercase flex items-center"><UserCheck className="mr-3 text-pcgl-yellow"/> Dati Personali & Contatti</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="text-xs font-bold uppercase text-gray-400 ml-2">Telefono</label>
                      <input type="tel" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-medium" value={profileForm.telefono} onChange={e => setProfileForm({...profileForm, telefono: e.target.value})} placeholder="Es. 333 1234567" />
                  </div>
                  <div>
                      <label className="text-xs font-bold uppercase text-gray-400 ml-2">Gruppo Sanguigno</label>
                      <select className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-medium" value={profileForm.gruppoSanguigno} onChange={e => setProfileForm({...profileForm, gruppoSanguigno: e.target.value})}>
                          <option value="">Seleziona...</option>
                          {['0-', '0+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                  </div>
                  <div className="md:col-span-2">
                      <label className="text-xs font-bold uppercase text-gray-400 ml-2">Indirizzo di Residenza</label>
                      <input type="text" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-medium" value={profileForm.indirizzo} onChange={e => setProfileForm({...profileForm, indirizzo: e.target.value})} placeholder="Via Roma 1" />
                  </div>
                  <div>
                      <label className="text-xs font-bold uppercase text-gray-400 ml-2">Città</label>
                      <input type="text" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-medium" value={profileForm.citta} onChange={e => setProfileForm({...profileForm, citta: e.target.value})} placeholder="Potenza" />
                  </div>
                  <div>
                      <label className="text-xs font-bold uppercase text-gray-400 ml-2">CAP</label>
                      <input type="text" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-medium" value={profileForm.cap} onChange={e => setProfileForm({...profileForm, cap: e.target.value})} placeholder="85100" />
                  </div>
               </div>
               <button onClick={saveProfileData} className="w-full py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-md hover:bg-pcgl-yellow hover:text-pcgl-blue transition-all">Salva Dati Personali</button>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-6">
               <h4 className="font-bold text-xl text-pcgl-blue uppercase flex items-center"><Briefcase className="mr-3 text-pcgl-yellow"/> Specializzazioni & Patenti</h4>
               <div>
                  <label className="text-xs font-bold uppercase text-gray-400 ml-2 mb-2 block">Specializzazioni PCGL</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {appConfig.specs.map(spec => (
                      <button key={spec} onClick={() => toggleSpecialization(spec)} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase border transition-all ${userData.specializzazioni?.includes(spec) ? 'bg-pcgl-blue text-pcgl-yellow border-pcgl-blue' : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-pcgl-blue'}`}>{spec}</button>
                    ))}
                  </div>

                  <label className="text-xs font-bold uppercase text-gray-400 ml-2 mb-2 block">Aggiungi Specializzazione</label>
                  <div className="flex space-x-3">
                     <input type="text" className="flex-1 p-4 bg-gray-50 rounded-xl font-medium border border-gray-200 focus:border-pcgl-yellow transition-all" value={newSpecializzazione} onChange={e => setNewSpecializzazione(e.target.value)} placeholder="Es. Antincendio Boschivo" />
                     <button onClick={async () => { if(newSpecializzazione) { await updateDoc(doc(db,'users',user.uid), {specializzazioni: arrayUnion(newSpecializzazione)}); setNewSpecializzazione(''); } }} className="p-4 bg-pcgl-blue text-pcgl-yellow rounded-xl shadow-md hover:bg-pcgl-yellow hover:text-pcgl-blue transition-all"><Plus/></button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {userData.specializzazioni?.map((s, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-50 text-pcgl-blue rounded-lg text-xs font-bold uppercase border border-blue-100 flex items-center gap-2">
                            {s}
                            <button onClick={() => removeArrayItem('specializzazioni', s)} className="text-red-400 hover:text-red-600"><X size={12}/></button>
                        </span>
                    ))}
                  </div>
               </div>
               <div>
                  <label className="text-xs font-bold uppercase text-gray-400 ml-2 mb-2 block">Aggiungi Patente</label>
                  <div className="flex space-x-3">
                     <input type="text" className="flex-1 p-4 bg-gray-50 rounded-xl font-medium border border-gray-200 focus:border-pcgl-yellow transition-all" value={newPatente} onChange={e => setNewPatente(e.target.value)} placeholder="Es. Patente C, Nautica" />
                     <button onClick={async () => { if(newPatente) { await updateDoc(doc(db,'users',user.uid), {patenti: arrayUnion(newPatente)}); setNewPatente(''); } }} className="p-4 bg-pcgl-blue text-pcgl-yellow rounded-xl shadow-md hover:bg-pcgl-yellow hover:text-pcgl-blue transition-all"><Plus/></button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {userData.patenti?.map((p, i) => (
                        <span key={i} className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-bold uppercase border border-yellow-100 flex items-center gap-2">
                            {p}
                            <button onClick={() => removeArrayItem('patenti', p)} className="text-red-400 hover:text-red-600"><X size={12}/></button>
                        </span>
                    ))}
                  </div>
               </div>
            </div>

               {/* Moduli Operativi */}
               <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-6">
                   <h4 className="font-bold text-xl text-pcgl-blue uppercase flex items-center"><Shield className="mr-3 text-pcgl-yellow"/> Moduli Operativi</h4>
                   <div className="flex flex-wrap gap-2">
                       {userData.moduli?.length > 0 ? userData.moduli.map((m, i) => <span key={i} className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-bold uppercase border border-green-100">{m}</span>) : <span className="text-gray-400 text-sm italic">Nessun modulo assegnato</span>}
                   </div>
               </div>

            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-6">
               <h4 className="font-bold text-xl text-pcgl-blue uppercase flex items-center"><Award className="mr-3 text-pcgl-yellow"/> Storico Formazione</h4>
               <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                 <p className="text-xs font-bold text-gray-400 uppercase mb-3">Aggiungi Attestato Esterno</p>
                 <div className="grid grid-cols-1 gap-3">
                   <input type="text" placeholder="Nome Corso / Attestato" className="w-full p-3 bg-white rounded-lg border border-gray-200 text-sm font-medium" value={newCorsoManuale} onChange={e => setNewCorsoManuale(e.target.value)} />
                   <div className="flex space-x-3">
                     <input type="date" className="flex-1 p-3 bg-white rounded-lg border border-gray-200 text-sm font-medium" value={newDataCorsoManuale} onChange={e => setNewDataCorsoManuale(e.target.value)} />
                     <button onClick={addCorsoManuale} className="px-6 bg-pcgl-blue text-white rounded-lg font-bold text-sm shadow-md hover:bg-pcgl-yellow hover:text-pcgl-blue transition-all">Aggiungi</button>
                   </div>
                 </div>
               </div>
               <div className="space-y-3">
                  {userData.fascicoloCorsi?.length > 0 ? userData.fascicoloCorsi.map((c, i) => (
                    <div key={i} className={`p-4 rounded-xl border flex justify-between items-center shadow-sm ${c.tipo === 'moodle' ? 'bg-blue-50 border-blue-100' : (c.certificato ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-200')}`}>
                       <div>
                         <p className={`font-bold uppercase text-sm ${c.tipo === 'moodle' ? 'text-blue-700' : (c.certificato ? 'text-pcgl-blue' : 'text-gray-600')}`}>{c.titolo}</p>
                         <p className="text-xs text-gray-400">{new Date(c.data).toLocaleDateString()} • {c.tipo === 'moodle' ? 'Badge E-Learning' : (c.certificato ? 'Certificato PCGL' : 'Autodichiarato')}</p>
                       </div>
                       {c.tipo === 'moodle' ? <Award className="text-blue-600" size={24} /> : 
                        (c.certificato ? <Verified className="text-green-600" size={20}/> : <button onClick={() => removeCourse(c)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={18}/></button>)}
                       {c.tipo === 'moodle' ? (
                           <button onClick={() => window.open(`https://formazione.pcgl.it/course/view.php?id=${c.moodleId}`, '_blank')} className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors shadow-sm" title="Scarica/Apri Attestato Moodle">
                               <Award size={20} />
                           </button>
                       ) : (
                           c.certificato ? <Verified className="text-green-600" size={20}/> : <button onClick={() => removeCourse(c)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={18}/></button>
                       )}
                    </div>
                  )) : <p className="text-center text-gray-400 text-sm py-4">Nessun corso presente nel fascicolo.</p>}
               </div>
            </div>

            {/* CREDENZIALI MOODLE */}
            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-6">
               <h4 className="font-bold text-xl text-pcgl-blue uppercase flex items-center"><BookOpen className="mr-3 text-pcgl-yellow"/> Accesso E-Learning</h4>
               <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                 <p className="text-sm text-blue-800 mb-4">Usa queste credenziali per accedere ai corsi online sulla piattaforma Moodle.</p>
                 <div className="space-y-3 bg-white p-4 rounded-xl border border-blue-50">
                     <div>
                         <p className="text-[10px] font-bold text-gray-400 uppercase">Username (Email)</p>
                         <p className="font-mono font-bold text-pcgl-blue text-sm break-all">{user.email}</p>
                     </div>
                     <div>
                         <p className="text-[10px] font-bold text-gray-400 uppercase">Password predefinita</p>
                         <div className="flex justify-between items-center">
                             <p className="font-mono font-bold text-pcgl-blue text-sm">{`Pcgl_${userData.cf}!`}</p>
                             <button onClick={() => { navigator.clipboard.writeText(`Pcgl_${userData.cf}!`); showToast("Password copiata!"); }} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-pcgl-yellow hover:text-pcgl-blue transition-colors">
                                 <ClipboardList size={16} />
                             </button>
                         </div>
                     </div>
                 </div>
                 <button onClick={() => window.open('https://formazione.pcgl.it', '_blank')} className="w-full mt-4 py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all hover:bg-pcgl-yellow hover:text-pcgl-blue">Apri Portale Formazione</button>
               </div>
            </div>

            {/* NUOVA SEZIONE: DOCUMENTI UFFICIALI HQ */}
            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-6">
               <h4 className="font-bold text-xl text-pcgl-blue uppercase flex items-center"><FileText className="mr-3 text-pcgl-yellow"/> Documenti Ufficiali HQ</h4>
               <div className="space-y-3">
                  {userDocuments.length > 0 ? userDocuments.map((doc) => (
                    <div key={doc.id} onClick={() => window.open(doc.url, '_blank')} className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex justify-between items-center shadow-sm cursor-pointer hover:bg-gray-100 transition-colors">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-100 text-red-600 rounded-lg"><FileText size={24}/></div>
                          <div>
                             <p className="font-bold uppercase text-sm text-pcgl-blue">{doc.titolo}</p>
                             <p className="text-xs text-gray-400">{doc.dataEmissione?.toDate ? doc.dataEmissione.toDate().toLocaleDateString() : new Date(doc.dataEmissione).toLocaleDateString()} • {doc.categoria || 'Attestato'}</p>
                          </div>
                       </div>
                       <Download size={20} className="text-gray-400"/>
                    </div>
                  )) : <p className="text-center text-gray-400 text-sm py-4">Nessun documento ufficiale disponibile.</p>}
               </div>
            </div>
          </div>
        </div>
      );

      case 'gestione_corsi_admin': {
        const allCompletedCourses = [...new Set(allUsers.flatMap(u => (u.fascicoloCorsi || []).filter(c => c.certificato).map(c => c.titolo)))].sort();
        
        return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
          <HeaderSub title="Conferma Presenze e Attestati" onBack={() => setSubPage(null)} />
          
          <div className="mb-8">
              <button onClick={() => setSubPage('gestione_presenze')} className="w-full py-4 bg-pcgl-blue text-white rounded-2xl font-black uppercase shadow-lg hover:bg-blue-800 transition-all flex items-center justify-center">
                  <QrCode className="mr-3" size={24}/> Gestione Presenze Live (QR)
              </button>
          </div>

          <div className="space-y-6 font-sans text-pcgl-text-dark">
            {corsiFormazione.map(c => (
              <div key={c.id} className="bg-white p-8 rounded-2xl shadow-card border border-gray-100">
                <h3 className="font-bold text-xl uppercase mb-4 text-pcgl-blue border-b pb-3">{c.titolo}</h3>
                <button onClick={() => onSnapshot(query(collection(db, 'iscrizioni_corsi'), where('corsoId', '==', c.id)), s => setIscrittiAlCorso(s.docs.map(d => ({id: d.id, ...d.data()}))))} className="w-full py-3 bg-gray-100 rounded-lg font-bold text-xs uppercase mb-4 hover:bg-gray-200 transition-colors">Carica Candidati</button>
                <div className="space-y-4">
                   {iscrittiAlCorso.filter(isc => isc.corsoId === c.id).map(isc => (
                     <div key={isc.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg shadow-inner hover:bg-gray-100 transition-colors">
                        <div><p className="font-bold text-base uppercase leading-tight">{isc.nome} {isc.cognome}</p><p className="text-xs font-medium text-gray-500 mt-0.5">{isc.sede} • {isc.cf}</p></div>
                        <button onClick={() => confermaPresenzaFascicolo(isc.id, isc.volontarioId, c.titolo)} className="bg-pcgl-blue text-pcgl-yellow p-2 rounded-lg shadow-md active:scale-90 transition-all hover:bg-pcgl-yellow hover:text-pcgl-blue"><UserCheck size={20}/></button>
                     </div>
                   ))}
                </div>
              </div>
            ))}
          </div>

          {/* NUOVA SEZIONE ALBO ATTESTATI */}
          {['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) && (
              <div className="bg-white p-8 rounded-2xl shadow-card border border-gray-100 mt-8">
                  <div className="flex justify-between items-center mb-6 border-b pb-3">
                      <h3 className="font-bold text-xl uppercase text-pcgl-blue">Albo Attestati Rilasciati</h3>
                      {selectedCourseReport && (
                          <button onClick={() => {
                              const usersWithCourse = allUsers.filter(u => u.fascicoloCorsi?.some(c => c.certificato && c.titolo === selectedCourseReport));
                              const headers = ["Cognome Nome", "CF", "Sede", "Data Conseguimento"];
                              const rows = usersWithCourse.map(u => {
                                  const courseData = u.fascicoloCorsi.find(c => c.certificato && c.titolo === selectedCourseReport);
                                  return [`${u.cognome} ${u.nome}`, u.cf, u.sede, new Date(courseData.data).toLocaleDateString()];
                              });
                              const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => `"${e.join('","')}"`)].join("\n");
                              const link = document.createElement("a");
                              link.setAttribute("href", encodeURI(csvContent));
                              link.setAttribute("download", `attestati_${selectedCourseReport.replace(/[^a-z0-9]/gi, '_')}.csv`);
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                          }} className="text-xs font-bold text-green-600 uppercase bg-green-50 px-3 py-2 rounded-lg hover:bg-green-100 flex items-center transition-colors">
                              <Download size={16} className="mr-1"/> Esporta CSV
                          </button>
                      )}
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Seleziona un corso per visualizzare l'elenco completo dei volontari che hanno conseguito l'attestato (inclusi badge Moodle).</p>
                  <select className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 font-bold text-sm uppercase mb-6 outline-none focus:border-pcgl-yellow transition-all" value={selectedCourseReport} onChange={e => setSelectedCourseReport(e.target.value)}>
                      <option value="">-- Seleziona un Corso --</option>
                      {allCompletedCourses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  {selectedCourseReport && (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                          {allUsers.filter(u => u.fascicoloCorsi?.some(c => c.certificato && c.titolo === selectedCourseReport)).map(u => {
                              const courseData = u.fascicoloCorsi.find(c => c.certificato && c.titolo === selectedCourseReport);
                              return (
                                  <div key={u.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                                      <div className="flex items-center gap-3">
                                          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                              {courseData.tipo === 'moodle' ? <Award size={20}/> : <Verified size={20}/>}
                                          </div>
                                          <div>
                                              <p className="font-bold text-sm uppercase text-pcgl-blue">{u.cognome} {u.nome}</p>
                                              <p className="text-xs text-gray-500">{u.sede} • CF: {u.cf}</p>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Conseguito il</span>
                                          <span className="text-xs font-mono font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">{new Date(courseData.data).toLocaleDateString()}</span>
                                      </div>
                                  </div>
                              );
                          })}
                          {allUsers.filter(u => u.fascicoloCorsi?.some(c => c.certificato && c.titolo === selectedCourseReport)).length === 0 && (
                              <p className="text-center text-gray-500 italic py-4">Nessun volontario trovato per questo corso.</p>
                          )}
                      </div>
                  )}
              </div>
          )}

        </div>
      );
      }

      case 'gestione_presenze': {
        const activeSessionData = selectedSession ? (attendanceSessions.find(s => s.id === selectedSession.id) || selectedSession) : null;
        return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
            <HeaderSub title="Presenze Live" onBack={() => { if(selectedSession) setSelectedSession(null); else setSubPage('gestione_corsi_admin'); }} />
            
            {activeSessionData ? (
                <div className="space-y-6 font-sans text-pcgl-text-dark animate-in zoom-in duration-300">
                    {/* MODALITA' PROIEZIONE QR CODE */}
                    <div className="bg-white p-8 rounded-3xl shadow-2xl border-t-8 border-pcgl-blue text-center relative overflow-hidden">
                        {activeSessionData.isClosed ? (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><Ban size={40}/></div>
                                <h2 className="text-3xl font-black text-pcgl-blue uppercase mb-2">Terminata</h2>
                                <p className="text-gray-600 font-bold uppercase">Questa sessione è stata chiusa definitivamente</p>
                            </div>
                        ) : activeSessionData.isPaused && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                                <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4"><Pause size={40}/></div>
                                <h2 className="text-3xl font-black text-pcgl-blue uppercase mb-2">In Pausa</h2>
                                <p className="text-gray-600 font-bold uppercase mb-6">Le registrazioni sono momentaneamente chiuse</p>
                                <button onClick={() => toggleSessionPause(activeSessionData)} className="py-4 px-8 rounded-full font-black uppercase text-sm shadow-lg transition-all flex items-center mx-auto bg-green-500 text-white hover:bg-green-600">
                                    <Play className="mr-2" size={20}/>
                                    Riattiva Registrazioni
                                </button>
                            </div>
                        )}
                        <h2 className="text-2xl font-black text-pcgl-blue uppercase mb-2">{activeSessionData.titolo}</h2>
                        <div className="mb-6 flex justify-center gap-2">
                           <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{activeSessionData.tipo === 'evento' ? 'Evento in Campo' : 'Corso in Aula'}</span>
                           <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{activeSessionData.mode === 'interno' ? 'Solo App' : 'Aperto a Tutti'}</span>
                        </div>

                        {(!activeSessionData.tipo || activeSessionData.tipo === 'corso') ? (
                            <>
                                <p className="text-gray-500 mb-8 uppercase font-bold text-xs">Inquadra per registrare la presenza</p>
                                <div className="inline-block p-4 bg-white rounded-3xl shadow-inner border-4 border-dashed border-gray-200 mb-6">
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(window.location.origin + '?presenza=' + activeSessionData.id)}`} alt="QR Code Presenze" className={`w-64 h-64 object-contain mix-blend-multiply ${activeSessionData.isPaused ? 'opacity-20' : ''}`} />
                                </div>
                                <p className="text-sm font-bold text-gray-400">Oppure vai al link:</p>
                                <p className="font-mono text-pcgl-blue text-xs mt-1 select-all">{window.location.origin}?presenza={activeSessionData.id}</p>
                            </>
                        ) : (
                            <div className="py-8">
                                <p className="text-gray-500 mb-6 uppercase font-bold text-sm">Registrazione Presenze Evento</p>
                                <div className="w-24 h-24 bg-blue-50 text-pcgl-blue rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                    <QrCode size={48} />
                                </div>
                                <p className="text-sm text-gray-400 max-w-xs mx-auto">Utilizza il pulsante "Scansiona Tesserini" per inquadrare il codice QR dei volontari e registrarne l'effettiva presenza in campo.</p>
                            </div>
                        )}
                        
                        <div className="mt-8 pt-6 border-t border-gray-100 relative z-20">
                            <div className="flex flex-wrap gap-4 justify-center">
                                {activeSessionData.tipo === 'evento' && (
                                    <button onClick={() => handleOpenScanner('session_checkin')} className="flex-1 min-w-[250px] py-4 px-8 rounded-full font-black uppercase text-sm shadow-lg transition-all flex items-center justify-center bg-pcgl-yellow text-pcgl-blue hover:bg-yellow-500 scale-105">
                                        <ScanLine className="mr-2" size={20}/> Scansiona Tesserini
                                    </button>
                                )}
                                {(!activeSessionData.tipo || activeSessionData.tipo === 'corso') && (
                                    <button onClick={() => toggleSessionPause(activeSessionData)} className={`flex-1 min-w-[200px] py-4 px-8 rounded-full font-black uppercase text-sm shadow-lg transition-all flex items-center justify-center ${activeSessionData.isPaused ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
                                        {activeSessionData.isPaused ? <Play className="mr-2" size={20}/> : <Pause className="mr-2" size={20}/>}
                                        {activeSessionData.isPaused ? 'Riattiva' : 'Pausa'}
                                    </button>
                                )}
                                <button onClick={() => closeAttendanceSession(activeSessionData)} className="flex-1 min-w-[200px] py-4 px-8 rounded-full font-black uppercase text-sm shadow-lg transition-all flex items-center justify-center bg-red-600 text-white hover:bg-red-700">
                                    <Ban className="mr-2" size={20}/> Chiudi Definitivamente
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* LISTA PRESENZE IN TEMPO REALE */}
                    <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h3 className="font-black text-xl text-pcgl-blue uppercase flex items-center"><Users className="mr-2"/> Registrati ({sessionRecords.length})</h3>
                            <div className="flex gap-2">
                                <button onClick={() => {
                                    const headers = ["Cognome Nome", "Email", "CF", "Ente", "Sede", "Data/Ora", "Validato", "Posizione GPS"];
                                    const rows = sessionRecords.map(r => [
                                        `${r.cognome} ${r.nome}`,
                                        r.email,
                                        r.cf || "N/D",
                                        r.ente,
                                        r.sede || "N/D",
                                        new Date(r.timestamp).toLocaleString(),
                                        r.validato ? "SI" : "NO",
                                        r.verificato ? (r.distanza < 0.5 ? "IN ZONA" : `${r.distanza.toFixed(2)} km`) : (r.erroreGps || "N/A")
                                    ]);
                                    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => `"${e.join('","')}"`)].join("\n");
                                    const link = document.createElement("a");
                                    link.setAttribute("href", encodeURI(csvContent));
                                    link.setAttribute("download", `presenze_${activeSessionData.titolo.replace(/[^a-z0-9]/gi, '_')}.csv`);
                                    document.body.appendChild(link);
                                    link.click();
                                }} className="text-xs font-bold text-green-600 uppercase bg-green-50 px-3 py-2 rounded-lg hover:bg-green-100 inline-flex items-center">
                                    <Download size={16} className="mr-1"/> Esporta CSV
                                </button>
                                <button onClick={() => deleteAttendanceSession(activeSessionData.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><Trash2 size={20}/></button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {sessionRecords.length > 0 ? sessionRecords.map(r => (
                                <div key={r.id} className={`p-4 rounded-xl border flex justify-between items-center transition-all ${r.validato ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <div>
                                        <p className="font-bold uppercase text-pcgl-blue">{r.cognome} {r.nome}</p>
                                        <p className="text-xs text-gray-500">{r.email} • {r.ente} {r.sede && r.sede !== 'N/D' ? `(${r.sede})` : ''}</p>
                                        <p className="text-[10px] text-gray-400">{new Date(r.timestamp).toLocaleTimeString()}</p>
                                        {activeSessionData.requireLocation && (
                                            <p className={`text-[10px] font-bold mt-1 ${r.verificato ? (r.distanza < 0.5 ? 'text-green-600' : 'text-orange-500') : 'text-red-500'}`}>
                                                📍 GPS: {r.verificato ? (r.distanza < 0.5 ? 'In Zona' : `${r.distanza.toFixed(2)} km di distanza`) : (r.erroreGps || 'Non rilevato')}
                                            </p>
                                        )}
                                    </div>
                                    <button onClick={() => togglePresenceValidation(r.id, r.validato)} className={`p-3 rounded-xl shadow-md transition-all ${r.validato ? 'bg-green-500 text-white' : 'bg-white border text-gray-400 hover:text-green-500'}`}>
                                        <CheckCircle size={24} />
                                    </button>
                                </div>
                            )) : <p className="text-center text-gray-400 italic py-8">In attesa di scansioni...</p>}
                        </div>
                    </div>

                    {/* STORICO SOSPENSIONI */}
                    {activeSessionData.pauseHistory && activeSessionData.pauseHistory.length > 0 && (
                        <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
                            <h3 className="font-black text-lg text-pcgl-blue uppercase flex items-center mb-4"><Clock className="mr-2"/> Storico Sospensioni</h3>
                            <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                                {[...activeSessionData.pauseHistory].reverse().map((evento, idx) => (
                                    <div key={idx} className={`p-3 rounded-xl border text-xs ${evento.isPaused ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`font-bold uppercase ${evento.isPaused ? 'text-orange-700' : 'text-green-700'}`}>
                                                {evento.isPaused ? 'Messa in Pausa' : 'Riattivata'}
                                            </span>
                                            <span className="text-gray-500">{new Date(evento.timestamp).toLocaleString()}</span>
                                        </div>
                                        <p className="text-gray-600">Da: <strong>{evento.autore}</strong></p>
                                        {evento.messaggio && <p className="text-gray-500 italic mt-1">"{evento.messaggio}"</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-8 font-sans text-pcgl-text-dark">
                    <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
                        <h3 className="font-bold text-lg text-pcgl-blue mb-4 uppercase">Nuova Sessione Presenze</h3>
                        <div className="space-y-4">
                            <input type="text" placeholder="Nome Sessione/Evento (es. Lezione 1 AIB)" className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 font-bold uppercase text-sm focus:border-pcgl-yellow" value={newSessionTitle} onChange={e => setNewSessionTitle(e.target.value)} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <select className="p-3 bg-gray-50 rounded-xl border border-gray-200 font-medium text-sm" value={newSessionType} onChange={e => setNewSessionType(e.target.value)}>
                                    <option value="corso">Corso (QR in vista)</option>
                                    <option value="evento">Evento (Presidente Scansiona)</option>
                                </select>
                                <select className="p-3 bg-gray-50 rounded-xl border border-gray-200 font-medium text-sm" value={newSessionMode} onChange={e => setNewSessionMode(e.target.value)}>
                                    <option value="esterno">Aperto a Tutti (Esterno)</option>
                                    <option value="interno">Solo Utenti App (Interno)</option>
                                </select>
                            </div>

                            <label className="flex items-center space-x-2 bg-gray-50 p-3 rounded-xl border border-gray-200 cursor-pointer">
                                <input type="checkbox" checked={newSessionRequireLocation} onChange={e => setNewSessionRequireLocation(e.target.checked)} className="rounded text-pcgl-blue focus:ring-pcgl-blue" />
                                <span className="text-[10px] font-bold text-gray-600 uppercase">Verifica Posizione</span>
                            </label>

                            {newSessionRequireLocation && (
                                <button onClick={() => setShowSessionLocationPicker(true)} className="w-full py-3 bg-white border border-gray-200 text-pcgl-blue rounded-xl text-sm font-bold uppercase hover:bg-gray-50 transition-all">
                                    <MapPin size={16} className="inline mr-2"/> {newSessionLocation ? 'Posizione Impostata (Modifica)' : 'Imposta Posizione su Mappa'}
                                </button>
                            )}

                            <button onClick={createAttendanceSession} className="w-full py-4 bg-pcgl-blue text-white rounded-xl shadow-md font-bold uppercase flex justify-center items-center"><Plus size={20} className="mr-2"/> Crea Sessione</button>
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
                        <h3 className="font-bold text-lg text-pcgl-blue mb-4 uppercase">Archivio Sessioni</h3>
                        <div className="space-y-3">
                            {attendanceSessions.map(session => {
                                return (
                                    <div key={session.id} onClick={() => setSelectedSession(session)} className="bg-gray-50 p-4 rounded-xl border border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-pcgl-blue uppercase">{session.titolo}</p>
                                                {session.isClosed && <span className="bg-red-100 text-red-600 text-[9px] font-bold px-2 py-0.5 rounded uppercase">Terminata</span>}
                                            </div>
                                            <p className="text-xs text-gray-500">{new Date(session.dataCreazione).toLocaleDateString()} • Creata da {session.creatore}</p>
                                        </div>
                                        <QrCode size={24} className="text-gray-400"/>
                                    </div>
                                )
                            })}
                            {attendanceSessions.length === 0 && <p className="text-center text-gray-400 italic">Nessuna sessione creata.</p>}
                        </div>
                    </div>

                    {showSessionLocationPicker && (
                        <LocationPicker initialPos={newSessionLocation} onConfirm={(pos) => { setNewSessionLocation(pos); setShowSessionLocationPicker(false); showToast("Posizione impostata"); }} onClose={() => setShowSessionLocationPicker(false)} />
                    )}
                </div>
            )}
        </div>
      );
      }

      case 'admin_search': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40 print:pb-0">
          <div className="print:hidden">
          <HeaderSub title="Anagrafica" onBack={() => {
              if (previousPage === 'sedi_list') {
                  setSubPage('sedi_list');
                  setPreviousPage(null);
              } else {
                  setSubPage(null);
              }
          }} />
          
          {/* Tabs Anagrafica */}
          <div className="flex p-1 bg-gray-100 rounded-xl mb-6 mx-1">
            <button 
              onClick={() => setAnagraficaTab('iscritti')}
              className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${anagraficaTab === 'iscritti' ? 'bg-white text-pcgl-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Iscritti {totalUsersCount !== null && <span className={`ml-2 text-white text-[10px] px-2 py-0.5 rounded-full ${anagraficaTab === 'iscritti' ? 'bg-pcgl-blue' : 'bg-gray-400'}`}>{totalUsersCount}</span>}
            </button>
            <button 
              onClick={() => setAnagraficaTab('pendenti')}
              className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${anagraficaTab === 'pendenti' ? 'bg-white text-pcgl-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Pendenti {pendingVolunteers.length > 0 && <span className="ml-2 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{pendingVolunteers.length}</span>}
            </button>
          </div>

          {/* Filtri e Azioni */}
          <div className="flex flex-col gap-3 mb-6">
             <div className="flex gap-2">
                 <input type="text" placeholder="Cerca (Cognome, CF, Tessera)..." className="flex-1 p-4 bg-white shadow-card rounded-lg font-medium border border-gray-200 outline-none focus:border-pcgl-yellow transition-all text-sm sm:text-base" onChange={e => setSearchTerm(e.target.value)} onKeyPress={e => e.key === 'Enter' && searchVolunteersDB()} />
                 <button onClick={searchVolunteersDB} className="p-4 bg-pcgl-blue text-white rounded-lg shadow-md shrink-0"><Search size={20}/></button>
             </div>
             <div className="flex flex-wrap gap-2">
                 {['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) && (
                     <button onClick={loadAllVolunteers} className="flex-1 min-w-[100px] max-w-[150px] p-3 bg-pcgl-yellow text-pcgl-blue rounded-lg shadow-md font-bold text-xs uppercase" title="Carica Tutti">Tutti</button>
                 )}
                 {['admin', 'superadmin', 'coordinamento', 'presidente'].includes(userData.ruolo) && (
                     <button onClick={() => setShowExportModal(true)} className="flex-1 min-w-[100px] max-w-[150px] p-3 bg-green-600 text-white rounded-lg shadow-md font-bold text-xs uppercase flex items-center justify-center" title="Esporta CSV"><FileSpreadsheet size={16} className="mr-1"/> CSV</button>
                 )}
                 <select className="flex-1 min-w-[140px] p-3 bg-white shadow-card rounded-lg font-medium border border-gray-200 outline-none focus:border-pcgl-yellow transition-all text-sm" value={filterSede} onChange={e => handleSedeFilterChange(e.target.value)}>
                    <option value="">Tutte le Sedi</option>
                    {sediDisponibili.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
                 <select className="flex-1 min-w-[100px] p-3 bg-white shadow-card rounded-lg font-medium border border-gray-200 outline-none focus:border-pcgl-yellow transition-all text-sm" value={filterStato} onChange={e => setFilterStato(e.target.value)}>
                    <option value="attivo">Attivi</option>
                    <option value="sospeso">Sospesi</option>
                    <option value="tutti">Tutti</option>
                 </select>
                 <select className="flex-1 min-w-[160px] p-3 bg-white shadow-card rounded-lg font-medium border border-gray-200 outline-none focus:border-pcgl-yellow transition-all text-sm" value={filterSpecializzazione} onChange={e => setFilterSpecializzazione(e.target.value)}>
                    <option value="">Specializzazioni (Tutte)</option>
                    {appConfig.specs.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
                 <button onClick={() => setShowMassMail(true)} className="p-3 bg-pcgl-blue text-white rounded-lg shadow-md flex-none"><Mail size={20}/></button>
                 {userData.ruolo === 'presidente' && <button onClick={() => window.print()} className="p-3 bg-white text-pcgl-blue border border-pcgl-blue rounded-lg shadow-md flex-none"><Printer size={20}/></button>}
             </div>
          </div>

          {/* Modale Invio Massivo */}
          {showMassMail && (
            <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
              <div className="bg-white p-6 rounded-3xl w-full max-w-md shadow-2xl">
                <h3 className="font-black text-xl mb-4">Invia Comunicazione</h3>
                <input className="w-full p-3 mb-3 bg-gray-50 rounded-xl border" placeholder="Oggetto" value={massMailSubject} onChange={e => setMassMailSubject(e.target.value)} />
                <textarea className="w-full p-3 mb-4 bg-gray-50 rounded-xl border h-32" placeholder="Messaggio..." value={massMailBody} onChange={e => setMassMailBody(e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={() => setShowMassMail(false)} className="flex-1 py-3 bg-gray-200 rounded-xl font-bold">Annulla</button>
                  <button onClick={() => sendMassCommunication((anagraficaTab === 'iscritti' && userData.ruolo !== 'presidente' ? searchedVolunteers : allUsers).filter(v => {
                      const matchesSearch = (v.nome + v.cognome + v.sede).toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesTab = anagraficaTab === 'iscritti' ? v.stato === 'attivo' : v.stato === 'pendente';
                      const matchesSede = userData.ruolo === 'presidente' ? v.sede === userData.sede : true;
                      const matchesSpec = filterSpecializzazione ? v.specializzazioni?.includes(filterSpecializzazione) : true;
                      return matchesSearch && matchesTab && matchesSede && matchesSpec;
                  }))} className="flex-1 py-3 bg-pcgl-blue text-white rounded-xl font-bold">Invia</button>
                </div>
              </div>
            </div>
          )}

          {/* Modale Esportazione CSV */}
          {showExportModal && (
            <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white p-6 rounded-3xl w-full max-w-xl shadow-2xl relative max-h-[90vh] flex flex-col">
                <button onClick={() => setShowExportModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24}/></button>
                <h3 className="font-black text-xl mb-4 text-pcgl-blue uppercase">Esporta Report CSV</h3>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                    <div>
                        <h4 className="font-bold text-sm text-gray-600 uppercase mb-3 border-b pb-1">Seleziona Colonne da Esportare</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {Object.keys(exportColumns).map(col => (
                                <label key={col} className="flex items-center space-x-2 cursor-pointer bg-gray-50 p-2 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={exportColumns[col]} 
                                        onChange={e => setExportColumns({...exportColumns, [col]: e.target.checked})} 
                                        className="rounded text-pcgl-blue focus:ring-pcgl-blue" 
                                    />
                                    <span className="text-xs font-medium text-gray-700 uppercase">{col}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-sm text-gray-600 uppercase mb-3 border-b pb-1">Filtri Aggiuntivi</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-400">Filtra per Regione (Prefisso Zona Sede)</label>
                                <select className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-medium focus:border-pcgl-yellow outline-none" value={exportFilters.regione} onChange={e => setExportFilters({...exportFilters, regione: e.target.value})}>
                                    <option value="">Tutte le Regioni</option>
                                    <option value="BASI">Basilicata</option>
                                    <option value="Cal">Calabria</option>
                                    <option value="Camp">Campania</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-400">Filtra per Città di Residenza</label>
                                <input type="text" placeholder="Es. Potenza" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-medium focus:border-pcgl-yellow outline-none" value={exportFilters.citta} onChange={e => setExportFilters({...exportFilters, citta: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100">
                  <button onClick={() => setShowExportModal(false)} className="flex-1 py-3 bg-gray-200 text-gray-600 rounded-xl font-bold uppercase hover:bg-gray-300 transition-colors">Annulla</button>
                  <button onClick={executeCSVExport} className="flex-[2] py-3 bg-pcgl-blue text-pcgl-yellow rounded-xl font-bold uppercase shadow-md flex items-center justify-center hover:bg-pcgl-yellow hover:text-pcgl-blue transition-all">
                      <Download className="mr-2" size={20}/> Scarica CSV
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 font-sans text-pcgl-text-dark">
            {/* LOGICA VISUALIZZAZIONE LISTA: 
                - Se Presidente: Usa allUsers (che contiene già solo i suoi)
                - Se Tab Pendenti: Usa pendingVolunteers (sempre visibili)
                - Se Admin/Coord e Tab Iscritti: Usa searchedVolunteers (risultati ricerca server) o allUsers se filtrato per sede
            */}
            {(anagraficaTab === 'pendenti' ? pendingVolunteers : (userData.ruolo === 'presidente' ? allUsers : searchedVolunteers)).filter(v => {
                const matchesSearch = (v.nome + v.cognome + v.sede).toLowerCase().includes(searchTerm.toLowerCase());
                // Se tab iscritti, filtra per stato selezionato (attivo/sospeso/tutti), altrimenti solo pendenti
                const matchesTab = anagraficaTab === 'iscritti' ? (filterStato === 'tutti' ? ['attivo', 'sospeso'].includes(v.stato) : v.stato === filterStato) : v.stato === 'pendente';
                const matchesSede = userData.ruolo === 'presidente' ? v.sede === userData.sede : (filterSede ? v.sede === filterSede : true);
                const matchesSpec = filterSpecializzazione ? v.specializzazioni?.includes(filterSpecializzazione) : true;
                return matchesSearch && matchesTab && matchesSede && matchesSpec;
            }).map(v => (
              <div key={v.id} onClick={() => { setSelectedVolunteer(v); setPreviousPage('admin_search'); setSubPage('volunteer_detail'); }} className="p-4 bg-white rounded-lg flex justify-between items-center shadow-card border border-gray-100 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:bg-pcgl-bg-light cursor-pointer">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-pcgl-blue text-pcgl-yellow rounded-md flex items-center justify-center font-bold text-xl mr-3 shadow-md overflow-hidden relative">
                     {v.fotoProfilo ? <img src={v.fotoProfilo} className="w-full h-full object-cover" alt={v.nome} /> : v.nome[0]}
                  </div>
                  <div>
                      <p className="font-bold text-base uppercase leading-tight">{v.nome} {v.cognome}</p>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-0.5">{v.sede} • {v.cf}</p>
                      {['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) && v.ultimoAccesso && (
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">Accesso: {new Date(v.ultimoAccesso).toLocaleString()}</p>
                      )}
                      {v.moduli && v.moduli.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                              {v.moduli.map((m, i) => <span key={i} className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 uppercase">{m}</span>)}
                          </div>
                      )}
                  </div>
                </div>
                {anagraficaTab === 'pendenti' ? (
                   <div className="flex flex-col space-y-1 items-end" onClick={(e) => e.stopPropagation()}>
                      {userData.ruolo === 'superadmin' && (
                        <>
                          <button onClick={() => approveVolunteer(v.id, 'volontario')} className="text-green-600 font-bold text-[10px] uppercase hover:underline">Volontario</button>
                          <button onClick={() => approveVolunteer(v.id, 'presidente')} className="text-blue-600 font-bold text-[10px] uppercase hover:underline">Presidente</button>
                          <button onClick={() => approveVolunteer(v.id, 'coordinamento')} className="text-purple-600 font-bold text-[10px] uppercase hover:underline">Coord.</button>
                          <button onClick={() => approveVolunteer(v.id, 'admin')} className="text-orange-600 font-bold text-[10px] uppercase hover:underline">Admin</button>
                        </>
                      )}
                      {userData.ruolo === 'admin' && (
                         <>
                           <button onClick={() => approveVolunteer(v.id, 'volontario')} className="text-green-600 font-bold text-[10px] uppercase hover:underline">Volontario</button>
                           <button onClick={() => approveVolunteer(v.id, 'presidente')} className="text-blue-600 font-bold text-[10px] uppercase hover:underline">Presidente</button>
                           <button onClick={() => approveVolunteer(v.id, 'coordinamento')} className="text-purple-600 font-bold text-[10px] uppercase hover:underline">Coord.</button>
                         </>
                      )}
                      {userData.ruolo === 'presidente' && (
                         <button onClick={() => approveVolunteer(v.id, 'volontario')} className="text-green-600 font-bold text-[10px] uppercase hover:underline">Accetta</button>
                      )}
                      {userData.ruolo !== 'coordinamento' && <button onClick={() => openRejectionModal(v.id)} className="text-red-500 font-bold text-[10px] uppercase hover:underline">Rifiuta</button>}
                   </div>
                 ) : (
                   <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
                       {['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) ? (
                          <select className="text-xs font-medium p-2 bg-gray-50 rounded-md border border-gray-200 outline-none shadow-inner focus:border-pcgl-yellow transition-all" value={v.ruolo} onChange={(e) => updateRole(v.id, e.target.value)}>
                            <option value="volontario">Volontario</option><option value="presidente">Presidente</option>
                            <option value="coordinamento">Coordinamento</option>
                            {userData.ruolo === 'superadmin' && <option value="admin">Admin</option>}
                          </select>
                       ) : (
                          <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-500">{v.ruolo.toUpperCase()}</span>
                       )}
                       
                       {canEditUser(v) && (
                           <button onClick={() => toggleUserStatus(v.id, v.stato)} className={`text-[10px] font-bold uppercase px-2 py-1 rounded border transition-colors ${v.stato === 'attivo' ? 'text-red-500 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`}>
                               {v.stato === 'attivo' ? 'Sospendi' : 'Attiva'}
                           </button>
                       )}
                       {v.stato === 'sospeso' && !canEditUser(v) && <span className="text-[10px] font-bold text-red-500 uppercase border border-red-200 px-2 py-0.5 rounded">SOSPESO</span>}
                   </div>
                 )}
              </div>
            ))}
            {(anagraficaTab === 'pendenti' ? pendingVolunteers : (userData.ruolo === 'presidente' ? allUsers : searchedVolunteers)).filter(v => {
                const matchesSearch = (v.nome + v.cognome + v.sede).toLowerCase().includes(searchTerm.toLowerCase());
                const matchesTab = anagraficaTab === 'iscritti' ? (filterStato === 'tutti' ? ['attivo', 'sospeso'].includes(v.stato) : v.stato === filterStato) : v.stato === 'pendente';
                const matchesSede = filterSede ? v.sede === filterSede : true;
                const matchesSpec = filterSpecializzazione ? v.specializzazioni?.includes(filterSpecializzazione) : true;
                return matchesSearch && matchesTab && matchesSede && matchesSpec;
            }).length === 0 && (
                <p className="text-center text-gray-400 text-sm mt-10 font-medium">
                    {anagraficaTab === 'iscritti' && userData.ruolo !== 'presidente' ? "Usa la barra di ricerca per trovare volontari." : "Nessun volontario trovato."}
                </p>
            )}
          </div>
          </div>

          {/* SEZIONE STAMPA REPORT (NASCOSTA A VIDEO) */}
          <div className="hidden print:block w-full bg-white p-8 text-black font-sans">
            <h1 className="text-2xl font-black mb-4">
              Report Volontari {filterSede ? `- Sede ${filterSede}` : (userData.ruolo === 'presidente' ? `- Sede ${userData.sede}` : '- Tutte le Sedi')}
            </h1>
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b"><th className="py-2">Cognome Nome</th><th className="py-2">CF</th><th className="py-2">Sede</th><th className="py-2">Ruolo</th></tr></thead>
              <tbody>
                {(anagraficaTab === 'pendenti' ? pendingVolunteers : (userData.ruolo === 'presidente' ? allUsers : searchedVolunteers)).filter(v => {
                    const matchesSearch = (v.nome + v.cognome + v.sede).toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesTab = anagraficaTab === 'iscritti' ? (filterStato === 'tutti' ? ['attivo', 'sospeso'].includes(v.stato) : v.stato === filterStato) : v.stato === 'pendente';
                    const matchesSede = userData.ruolo === 'presidente' ? v.sede === userData.sede : (filterSede ? v.sede === filterSede : true);
                    const matchesSpec = filterSpecializzazione ? v.specializzazioni?.includes(filterSpecializzazione) : true;
                    return matchesSearch && matchesTab && matchesSede && matchesSpec;
                }).map(v => (
                  <tr key={v.id} className="border-b">
                    <td className="py-2">{v.cognome} {v.nome}</td>
                    <td className="py-2">{v.cf}</td>
                    <td className="py-2">{v.sede}</td>
                    <td className="py-2">{v.ruolo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

      case 'volunteer_detail': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40 print:pb-0">
          <div className="print:hidden">
          <HeaderSub title="Dettaglio Volontario" onBack={() => setSubPage(previousPage)} />
          {selectedVolunteer && (
             <div className="space-y-8 font-sans text-pcgl-text-dark">
                {/* Profile Card */}
                <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 flex flex-col items-center text-center">
                   <div className="w-40 h-40 rounded-full bg-gray-100 border-4 border-pcgl-yellow shadow-lg overflow-hidden mb-6">
                      {selectedVolunteer.fotoProfilo ? <img src={selectedVolunteer.fotoProfilo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><User size={64}/></div>}
                   </div>
                   <h3 className="text-3xl font-black text-pcgl-blue uppercase">{selectedVolunteer.nome} {selectedVolunteer.cognome}</h3>
                   <p className="text-gray-500 font-bold uppercase tracking-widest mt-2">{selectedVolunteer.ruolo} • {selectedVolunteer.sede}</p>
                   <p className="text-xs text-gray-400 mt-1">CF: {selectedVolunteer.cf}</p>
                   <p className="text-xs text-gray-400 mt-1">Tessera: {selectedVolunteer.numeroTessera}</p>
                   {selectedVolunteer.telefono && <p className="text-xs text-gray-400 mt-1">Tel: {selectedVolunteer.telefono}</p>}
                   {selectedVolunteer.gruppoSanguigno && <p className="text-xs text-gray-400 mt-1">Gruppo: {selectedVolunteer.gruppoSanguigno}</p>}
                   {selectedVolunteer.ultimoAccesso && ['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) && <p className="text-xs text-gray-400 mt-1 font-bold">Ultimo Accesso App: {new Date(selectedVolunteer.ultimoAccesso).toLocaleString()}</p>}
                   <div className="flex flex-wrap gap-1 justify-center mt-2">
                       {selectedVolunteer.moduli?.map(m => <span key={m} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 uppercase">{m}</span>)}
                   </div>
                   {selectedVolunteer.privacyConsentDate && <p className="text-[10px] text-gray-400 mt-1">Privacy: {new Date(selectedVolunteer.privacyConsentDate).toLocaleDateString()}</p>}
                   <div className={`mt-4 px-4 py-1 rounded-full text-xs font-bold uppercase ${selectedVolunteer.stato === 'attivo' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {selectedVolunteer.stato}
                   </div>

                   {/* AZIONI APPROVAZIONE (SOLO PER PENDENTI) */}
                   {selectedVolunteer.stato === 'pendente' && (
                     <div className="mt-6 flex flex-wrap justify-center gap-2 w-full animate-in slide-in-from-bottom duration-300">
                        {userData.ruolo === 'superadmin' && (
                          <>
                            <button onClick={async () => { await approveVolunteer(selectedVolunteer.id, 'volontario'); setSubPage(previousPage); }} className="bg-green-500 text-white px-4 py-2 rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all hover:bg-green-600">Volontario</button>
                            <button onClick={async () => { await approveVolunteer(selectedVolunteer.id, 'presidente'); setSubPage(previousPage); }} className="bg-blue-500 text-white px-4 py-2 rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all hover:bg-blue-600">Presidente</button>
                            <button onClick={async () => { await approveVolunteer(selectedVolunteer.id, 'coordinamento'); setSubPage(previousPage); }} className="bg-purple-500 text-white px-4 py-2 rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all hover:bg-purple-600">Coord.</button>
                            <button onClick={async () => { await approveVolunteer(selectedVolunteer.id, 'admin'); setSubPage(previousPage); }} className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all hover:bg-orange-600">Admin</button>
                          </>
                        )}
                        {userData.ruolo === 'admin' && (
                           <>
                             <button onClick={async () => { await approveVolunteer(selectedVolunteer.id, 'volontario'); setSubPage(previousPage); }} className="bg-green-500 text-white px-4 py-2 rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all hover:bg-green-600">Volontario</button>
                             <button onClick={async () => { await approveVolunteer(selectedVolunteer.id, 'presidente'); setSubPage(previousPage); }} className="bg-blue-500 text-white px-4 py-2 rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all hover:bg-blue-600">Presidente</button>
                             <button onClick={async () => { await approveVolunteer(selectedVolunteer.id, 'coordinamento'); setSubPage(previousPage); }} className="bg-purple-500 text-white px-4 py-2 rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all hover:bg-purple-600">Coord.</button>
                           </>
                        )}
                        {userData.ruolo === 'presidente' && (
                           <button onClick={async () => { await approveVolunteer(selectedVolunteer.id, 'volontario'); setSubPage(previousPage); }} className="bg-green-500 text-white px-4 py-2 rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all hover:bg-green-600">Accetta Iscrizione</button>
                        )}
                        {userData.ruolo !== 'coordinamento' && (
                            <button onClick={() => openRejectionModal(selectedVolunteer.id)} className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all hover:bg-red-600">Rifiuta</button>
                        )}
                     </div>
                   )}
                </div>

                {/* Specs */}
                <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-6">
                   <h4 className="font-bold text-xl text-pcgl-blue uppercase flex items-center"><Briefcase className="mr-3 text-pcgl-yellow"/> Specializzazioni & Patenti</h4>
                   <div>
                      <label className="text-xs font-bold uppercase text-gray-400 ml-2 mb-2 block">Specializzazioni</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedVolunteer.specializzazioni?.length > 0 ? selectedVolunteer.specializzazioni.map((s, i) => <span key={i} className="px-3 py-1 bg-blue-50 text-pcgl-blue rounded-lg text-xs font-bold uppercase border border-blue-100">{s}</span>) : <span className="text-gray-400 text-sm italic">Nessuna specializzazione</span>}
                      </div>
                   </div>
                   <div>
                      <label className="text-xs font-bold uppercase text-gray-400 ml-2 mb-2 block">Patenti</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedVolunteer.patenti?.length > 0 ? selectedVolunteer.patenti.map((p, i) => <span key={i} className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-bold uppercase border border-yellow-100">{p}</span>) : <span className="text-gray-400 text-sm italic">Nessuna patente</span>}
                      </div>
                   </div>
                </div>

                {/* Corsi */}
                <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-6">
                   <div className="flex justify-between items-center">
                      <h4 className="font-bold text-xl text-pcgl-blue uppercase flex items-center"><Award className="mr-3 text-pcgl-yellow"/> Fascicolo Formativo</h4>
                      <button onClick={() => window.print()} className="p-2 bg-pcgl-blue text-white rounded-lg shadow-md hover:bg-pcgl-yellow hover:text-pcgl-blue transition-colors print:hidden" title="Stampa Fascicolo"><Download size={20}/></button>
                   </div>
                   <div className="space-y-3">
                      {selectedVolunteer.fascicoloCorsi?.length > 0 ? selectedVolunteer.fascicoloCorsi.map((c, i) => (
                        <div key={i} className={`p-4 rounded-xl border flex justify-between items-center shadow-sm ${c.certificato ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-200'}`}>
                           <div>
                             <p className={`font-bold uppercase text-sm ${c.certificato ? 'text-pcgl-blue' : 'text-gray-600'}`}>{c.titolo}</p>
                             <p className="text-xs text-gray-400">{new Date(c.data).toLocaleDateString()} • {c.certificato ? 'Certificato PCGL' : 'Autodichiarato'}</p>
                           </div>
                           {c.certificato ? <Verified className="text-green-600" size={20}/> : <FileText className="text-gray-400" size={20}/>}
                           {c.tipo === 'moodle' ? (
                               <button onClick={() => window.open(`https://formazione.pcgl.it/course/view.php?id=${c.moodleId}`, '_blank')} className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors shadow-sm" title="Scarica/Apri Attestato Moodle">
                                   <Award size={20} />
                               </button>
                           ) : (c.certificato ? <Verified className="text-green-600" size={20}/> : <FileText className="text-gray-400" size={20}/>)}
                        </div>
                      )) : <p className="text-center text-gray-400 text-sm py-4">Nessun corso presente nel fascicolo.</p>}
                   </div>
                </div>

                {/* Storico Attività (Allerte) */}
                <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-6">
                   <h4 className="font-bold text-xl text-pcgl-blue uppercase flex items-center"><Activity className="mr-3 text-pcgl-yellow"/> Storico Attività</h4>
                   <div className="space-y-3 max-h-60 overflow-y-auto">
                      {volunteerHistory.length > 0 ? volunteerHistory.map((h, i) => (
                        <div key={i} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex justify-between items-center">
                           <div>
                             <p className="font-bold uppercase text-sm text-pcgl-blue">{h.nome}</p>
                             <p className="text-xs text-gray-500">Check-In: {h.checkIn ? new Date(h.checkIn).toLocaleDateString() + ' ' + new Date(h.checkIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'N/D'}</p>
                           </div>
                           <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${h.checkOut ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{h.checkOut ? 'Completato' : 'In Corso'}</div>
                        </div>
                      )) : <p className="text-center text-gray-400 text-sm py-4">Nessuna attività registrata.</p>}
                   </div>
                </div>
             </div>
          )}
          </div>

          {/* LAYOUT DI STAMPA FASCICOLO (NASCOSTO A VIDEO) */}
          {selectedVolunteer && (
            <div className="hidden print:block w-full bg-white p-8 text-black font-sans">
                <div className="flex items-center justify-between border-b-4 border-[#001a33] pb-6 mb-8">
                    <div>
                        <h1 className="text-4xl font-black uppercase text-[#001a33] leading-none">Fascicolo Volontario</h1>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-[0.2em] mt-2">Protezione Civile Gruppo Lucano</p>
                    </div>
                    <img src={APP_LOGO} className="w-24 h-24 object-contain" alt="Logo PCGL" />
                </div>

                <div className="grid grid-cols-2 gap-12 mb-10">
                    <div>
                        <h3 className="font-bold text-lg uppercase border-b-2 border-gray-200 mb-4 pb-1 text-[#001a33]">Dati Anagrafici</h3>
                        <div className="space-y-2 text-sm">
                            <p><span className="font-bold text-gray-500 w-32 inline-block">Cognome e Nome:</span> <span className="uppercase font-bold">{selectedVolunteer.cognome} {selectedVolunteer.nome}</span></p>
                            <p><span className="font-bold text-gray-500 w-32 inline-block">Codice Fiscale:</span> <span className="uppercase font-mono">{selectedVolunteer.cf}</span></p>
                            <p><span className="font-bold text-gray-500 w-32 inline-block">Data di Nascita:</span> {selectedVolunteer.dataNascita}</p>
                            <p><span className="font-bold text-gray-500 w-32 inline-block">Luogo di Nascita:</span> <span className="uppercase">{selectedVolunteer.luogoNascita}</span></p>
                            <p><span className="font-bold text-gray-500 w-32 inline-block">Telefono:</span> {selectedVolunteer.telefono || 'N/D'}</p>
                            <p><span className="font-bold text-gray-500 w-32 inline-block">Gruppo Sanguigno:</span> {selectedVolunteer.gruppoSanguigno || 'N/D'}</p>
                            <p><span className="font-bold text-gray-500 w-32 inline-block">Indirizzo:</span> {selectedVolunteer.indirizzo ? `${selectedVolunteer.indirizzo}, ${selectedVolunteer.citta}` : 'N/D'}</p>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg uppercase border-b-2 border-gray-200 mb-4 pb-1 text-[#001a33]">Dati Operativi</h3>
                        <div className="space-y-2 text-sm">
                            <p><span className="font-bold text-gray-500 w-32 inline-block">Sede Operativa:</span> <span className="uppercase font-bold">{selectedVolunteer.sede}</span></p>
                            <p><span className="font-bold text-gray-500 w-32 inline-block">Ruolo:</span> <span className="uppercase">{selectedVolunteer.ruolo}</span></p>
                            <p><span className="font-bold text-gray-500 w-32 inline-block">Matricola/Tessera:</span> <span className="uppercase font-mono">{selectedVolunteer.numeroTessera}</span></p>
                            <p><span className="font-bold text-gray-500 w-32 inline-block">Stato Servizio:</span> <span className="uppercase">{selectedVolunteer.stato}</span></p>
                        </div>
                    </div>
                </div>

                <div className="mb-10">
                    <h3 className="font-bold text-lg uppercase border-b-2 border-gray-200 mb-4 pb-1 text-[#001a33]">Qualifiche e Abilitazioni</h3>
                    <div className="grid grid-cols-2 gap-12">
                        <div>
                            <p className="font-bold text-xs uppercase text-gray-400 mb-2">Specializzazioni</p>
                            <div className="flex flex-wrap gap-2">{selectedVolunteer.specializzazioni?.length > 0 ? selectedVolunteer.specializzazioni.map(s => <span key={s} className="px-2 py-1 border border-gray-300 rounded text-xs font-bold uppercase">{s}</span>) : <span className="italic text-gray-400 text-sm">Nessuna registrata</span>}</div>
                        </div>
                        <div>
                            <p className="font-bold text-xs uppercase text-gray-400 mb-2">Patenti di Guida</p>
                            <div className="flex flex-wrap gap-2">{selectedVolunteer.patenti?.length > 0 ? selectedVolunteer.patenti.map(p => <span key={p} className="px-2 py-1 border border-gray-300 rounded text-xs font-bold uppercase">{p}</span>) : <span className="italic text-gray-400 text-sm">Nessuna registrata</span>}</div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-lg uppercase border-b-2 border-gray-200 mb-4 pb-1 text-[#001a33]">Storico Formazione</h3>
                    <table className="w-full text-left text-sm border-collapse">
                        <thead><tr className="bg-gray-100 border-b border-gray-300"><th className="p-3 font-bold text-gray-600 uppercase text-xs">Data</th><th className="p-3 font-bold text-gray-600 uppercase text-xs">Corso / Attestato</th><th className="p-3 font-bold text-gray-600 uppercase text-xs">Ente / Tipo</th><th className="p-3 font-bold text-gray-600 uppercase text-xs text-center">Esito</th></tr></thead>
                        <tbody>{selectedVolunteer.fascicoloCorsi?.length > 0 ? selectedVolunteer.fascicoloCorsi.map((c, i) => (<tr key={i} className="border-b border-gray-200"><td className="p-3 font-mono text-xs">{new Date(c.data).toLocaleDateString()}</td><td className="p-3 font-bold uppercase">{c.titolo}</td><td className="p-3 text-xs uppercase">{c.certificato ? 'PC Gruppo Lucano' : 'Esterno'}</td><td className="p-3 text-center">{c.certificato ? <span className="text-green-700 font-bold text-[10px] uppercase border border-green-200 px-2 py-0.5 rounded">Certificato</span> : <span className="text-gray-500 text-[10px] uppercase border border-gray-200 px-2 py-0.5 rounded">Autodichiarato</span>}</td></tr>)) : <tr><td colSpan="4" className="p-4 text-center italic text-gray-400">Nessun corso presente nel fascicolo.</td></tr>}</tbody>
                    </table>
                </div>
                <div className="mt-8 text-center border-t border-gray-200 pt-4"><p className="text-[10px] text-gray-400 uppercase font-bold">Documento generato automaticamente il {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()} • PCGL.IT</p></div>
            </div>
          )}
        </div>
      );

      case 'progetti_view': 
        const canManageAree = ['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo);
        return (
          <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
              <HeaderSub title="Progetti & Campi" onBack={() => setSubPage(null)} />
              
              {canManageAree && (
                  <div className="mb-8">
                      <button onClick={() => { setAreaForm({ id: null, titolo: '', descrizione: '', sediAbilitate: [], utentiAbilitati: [], linkDrive: '', immagineCopertina: '' }); setShowAreaModal(true); setAreaUserSearch(''); setAreaUserResults([]); }} className="w-full py-4 bg-pcgl-blue text-pcgl-yellow rounded-xl font-bold uppercase shadow-md flex justify-center items-center">
                          <Plus className="mr-2"/> Crea Nuovo Progetto
                      </button>
                  </div>
              )}

              <div className="space-y-4">
                  {areeTematiche.filter(a => canManageAree || a.sediAbilitate?.includes(userData.sede) || a.utentiAbilitati?.includes(userData.uid)).map(area => (
                      <div key={area.id} className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
                          {area.immagineCopertina && (
                              <div className="w-full h-32 mb-4 rounded-xl overflow-hidden bg-gray-100">
                                  <img src={area.immagineCopertina} className="w-full h-full object-cover" alt={area.titolo} />
                              </div>
                          )}
                          <div className="flex justify-between items-start mb-4">
                              <div>
                                  <h3 className="font-black text-xl text-pcgl-blue uppercase">{area.titolo}</h3>
                                  <p className="text-sm text-gray-500 mt-1">{area.descrizione}</p>
                                  <p className="text-xs text-gray-400 mt-2 font-bold uppercase">Sedi Abilitate: {area.sediAbilitate?.length > 0 ? area.sediAbilitate.length : 'Nessuna'} | Utenti Singoli: {area.utentiAbilitati?.length > 0 ? area.utentiAbilitati.length : 'Nessuno'}</p>
                              </div>
                              {canManageAree && (
                                  <div className="flex gap-2">
                                      <button onClick={() => { setAreaForm({...area, utentiAbilitati: area.utentiAbilitati || []}); setShowAreaModal(true); setAreaUserSearch(''); setAreaUserResults([]); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Pencil size={18}/></button>
                                      <button onClick={() => deleteArea(area.id)} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={18}/></button>
                                  </div>
                              )}
                          </div>
                          <button onClick={() => { setViewingArea(area); setSubPage('area_detail_view'); }} className="w-full py-3 bg-gray-100 text-pcgl-blue rounded-xl font-bold uppercase text-sm hover:bg-gray-200 transition-colors">
                              Accedi alla Bacheca
                          </button>
                      </div>
                  ))}
                  {areeTematiche.filter(a => canManageAree || a.sediAbilitate?.includes(userData.sede) || a.utentiAbilitati?.includes(userData.uid)).length === 0 && (
                      <p className="text-center text-gray-500 font-medium py-8">Nessun progetto o campo scuola disponibile.</p>
                  )}
              </div>

              {/* MODALE CREAZIONE/MODIFICA AREA TEMATICA */}
              {showAreaModal && (
                  <div className="fixed inset-0 bg-black/80 z-[1500] flex items-center justify-center p-4 animate-in fade-in">
                      <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                          <button onClick={() => setShowAreaModal(false)} className="absolute top-4 right-4 text-gray-400"><X/></button>
                          <h3 className="font-black text-xl text-pcgl-blue uppercase mb-4">{areaForm.id ? 'Modifica Progetto' : 'Nuovo Progetto'}</h3>
                          <div className="space-y-4">
                              <input type="text" placeholder="Titolo Progetto (es. Campi Scuola 2026)" className="w-full p-3 bg-gray-50 rounded-xl border font-bold uppercase" value={areaForm.titolo} onChange={e => setAreaForm({...areaForm, titolo: e.target.value})} />
                              <textarea placeholder="Descrizione o info generali" className="w-full p-3 bg-gray-50 rounded-xl border resize-none h-24" value={areaForm.descrizione} onChange={e => setAreaForm({...areaForm, descrizione: e.target.value})} />
                              <input type="text" placeholder="Link Cartella Condivisa (Es. Google Drive)" className="w-full p-3 bg-gray-50 rounded-xl border text-sm" value={areaForm.linkDrive || ''} onChange={e => setAreaForm({...areaForm, linkDrive: e.target.value})} />
                              
                              <div>
                                  <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">Immagine Copertina (Opzionale)</label>
                                  <div className="flex items-center gap-4">
                                      {areaForm.immagineCopertina && <img src={areaForm.immagineCopertina} className="w-16 h-16 object-cover rounded-xl border border-gray-200" alt="Cover" />}
                                      <label className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase cursor-pointer hover:bg-gray-200 transition-colors shadow-sm">
                                          {uploading ? 'Caricamento...' : 'Carica Immagine'}
                                          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={async (e) => {
                                              const file = e.target.files[0];
                                              if (!file) return;
                                              if (file.size > 5 * 1024 * 1024) { showToast("Max 5MB", "error"); return; }
                                              setUploading(true);
                                              try { const storageRef = ref(storage, `aree_tematiche_covers/${Date.now()}_${file.name}`); await uploadBytes(storageRef, file); const url = await getDownloadURL(storageRef); setAreaForm(prev => ({...prev, immagineCopertina: url})); showToast("Immagine caricata!"); } catch (err) { console.error(err); showToast("Errore upload", "error"); } finally { setUploading(false); }
                                          }} />
                                      </label>
                                      {areaForm.immagineCopertina && <button onClick={() => setAreaForm({...areaForm, immagineCopertina: ''})} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>}
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">Utenti Abilitati (Singoli)</label>
                                  <div className="flex gap-2 mb-2">
                                      <input type="text" placeholder="Cerca cognome..." className="flex-1 p-3 bg-gray-50 rounded-xl border text-sm uppercase" value={areaUserSearch} onChange={e => setAreaUserSearch(e.target.value)} onKeyPress={e => e.key === 'Enter' && searchAreaUser()} />
                                      <button onClick={(e) => { e.preventDefault(); searchAreaUser(); }} className="p-3 bg-pcgl-blue text-white rounded-xl"><Search size={20}/></button>
                                  </div>
                                  {areaUserResults.length > 0 && (
                                      <div className="mt-2 bg-white border rounded-xl overflow-hidden shadow-sm mb-2">
                                          {areaUserResults.map(u => (
                                              <div key={u.id} onClick={() => { 
                                                  if (!(areaForm.utentiAbilitati || []).includes(u.id)) { setAreaForm({...areaForm, utentiAbilitati: [...(areaForm.utentiAbilitati || []), u.id]}); }
                                                  setAreaUserResults([]); setAreaUserSearch(''); 
                                              }} className="p-2 hover:bg-gray-50 cursor-pointer text-xs border-b last:border-0">{u.cognome} {u.nome} ({u.sede})</div>
                                          ))}
                                      </div>
                                  )}
                                  <div className="flex flex-wrap gap-2">
                                      {(areaForm.utentiAbilitati || []).map(uid => (
                                          <span key={uid} className="px-2 py-1 bg-gray-100 border rounded-lg text-xs font-bold uppercase flex items-center">{getName(uid)} <button onClick={() => setAreaForm({...areaForm, utentiAbilitati: areaForm.utentiAbilitati.filter(id => id !== uid)})} className="ml-1 text-red-500"><X size={12}/></button></span>
                                      ))}
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">Sedi Abilitate</label>
                                  <div className="flex justify-between items-center mb-2 px-1">
                                      <button onClick={() => setAreaForm({...areaForm, sediAbilitate: areaForm.sediAbilitate.length === sediDisponibili.length ? [] : [...sediDisponibili]})} className="px-3 py-1 bg-blue-50 text-pcgl-blue rounded-lg text-xs font-bold uppercase hover:bg-blue-100 transition-colors">
                                          {areaForm.sediAbilitate.length === sediDisponibili.length ? 'Deseleziona Tutte' : 'Seleziona Tutte'}
                                      </button>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                                      {sediDisponibili.map(s => (
                                          <div key={s} onClick={() => {
                                              const sedi = areaForm.sediAbilitate.includes(s) ? areaForm.sediAbilitate.filter(x => x !== s) : [...areaForm.sediAbilitate, s];
                                              setAreaForm({...areaForm, sediAbilitate: sedi});
                                          }} className={`p-2 text-xs font-bold rounded cursor-pointer border ${areaForm.sediAbilitate.includes(s) ? 'bg-pcgl-blue text-white' : 'bg-gray-50'}`}>
                                              {s}
                                          </div>
                                      ))}
                                  </div>
                              </div>

                              <button onClick={saveArea} className="w-full py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-lg mt-4">Salva Progetto</button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
        );

      case 'area_detail_view': 
        const isAreaManager = ['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo);
        return (
          <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
              <HeaderSub title="Bacheca Progetto" onBack={() => { setSubPage('progetti_view'); setViewingArea(null); }} />
              {viewingArea && (
                  <div className="space-y-6">
                      <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
                          {viewingArea.immagineCopertina && (
                              <div className="w-full h-48 mb-6 rounded-2xl overflow-hidden bg-gray-100 shadow-inner">
                                  <img src={viewingArea.immagineCopertina} className="w-full h-full object-cover" alt={viewingArea.titolo} />
                              </div>
                          )}
                          <h3 className="font-black text-2xl text-pcgl-blue uppercase mb-2">{viewingArea.titolo}</h3>
                          <p className="text-sm text-gray-600">{viewingArea.descrizione}</p>
                          {viewingArea.linkDrive ? (
                              <div className="mt-4 flex items-center gap-2">
                                  <a href={viewingArea.linkDrive} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm shadow-sm hover:bg-blue-100 transition-colors">
                                      <LinkIcon className="mr-2" size={16}/> Apri Cartella Esterna
                                  </a>
                                  {isAreaManager && (
                                      <button onClick={async () => {
                                          const newLink = window.prompt("Modifica il link della cartella condivisa:", viewingArea.linkDrive);
                                          if (newLink !== null) { try { await updateDoc(doc(db, 'aree_tematiche', viewingArea.id), { linkDrive: newLink }); showToast("Link aggiornato!"); } catch (e) { console.error(e); } }
                                      }} className="p-2 text-gray-400 hover:text-pcgl-blue" title="Modifica Link"><Pencil size={16}/></button>
                                  )}
                              </div>
                          ) : (
                              isAreaManager && (
                                  <button onClick={async () => {
                                      const newLink = window.prompt("Inserisci il link di una cartella Drive o Dropbox per questo progetto:");
                                      if (newLink) { try { await updateDoc(doc(db, 'aree_tematiche', viewingArea.id), { linkDrive: newLink }); showToast("Cartella collegata!"); } catch (e) { console.error(e); } }
                                  }} className="mt-4 inline-flex items-center px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm shadow-sm hover:bg-gray-200 transition-colors">
                                      <LinkIcon className="mr-2" size={16}/> Aggiungi Cartella Condivisa
                                  </button>
                              )
                          )}
                      </div>

                      {/* MATERIALE E DOCUMENTI */}
                      <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
                          <div className="flex justify-between items-center mb-4">
                              <h4 className="font-bold text-lg text-pcgl-blue flex items-center"><FileText className="mr-2" size={20}/> Materiale</h4>
                              {isAreaManager && (
                                  <label className="text-xs bg-blue-50 text-blue-600 px-3 py-2 rounded-lg font-bold uppercase cursor-pointer hover:bg-blue-100 transition-colors">
                                      <Upload size={14} className="inline mr-1"/> Carica
                                      <input type="file" className="hidden" onChange={(e) => uploadAreaDoc(e.target.files[0])} />
                                  </label>
                              )}
                          </div>
                          {uploading && <div className="text-xs text-blue-500 font-bold mb-4 animate-pulse">Caricamento in corso...</div>}
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {(viewingArea.documenti || []).map((doc, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm font-bold text-pcgl-blue hover:underline truncate">
                                          <FileText size={16} className="mr-2 flex-shrink-0"/> <span className="truncate">{doc.nome}</span>
                                      </a>
                                      {isAreaManager && (
                                          <button onClick={() => deleteAreaDoc(doc)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg flex-shrink-0"><Trash2 size={16}/></button>
                                      )}
                                  </div>
                              ))}
                              {(viewingArea.documenti || []).length === 0 && <p className="text-sm text-gray-400 italic">Nessun materiale caricato.</p>}
                          </div>
                      </div>

                      {/* BACHECA MESSAGGI */}
                      <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
                          <div className="flex justify-between items-center mb-4">
                              <h4 className="font-bold text-lg text-pcgl-blue flex items-center"><MessageSquare className="mr-2" size={20}/> Bacheca & Avvisi</h4>
                              {isAreaManager && (
                                  <button onClick={sendAreaMeetingNotification} className="text-xs bg-red-50 text-red-600 px-3 py-2 rounded-lg font-bold uppercase cursor-pointer hover:bg-red-100 transition-colors flex items-center shadow-sm">
                                      <Users size={14} className="mr-1"/> Convoca Riunione
                                  </button>
                              )}
                          </div>
                          
                          <div className="flex gap-2 mb-4">
                              <input type="text" placeholder="Scrivi un avviso o messaggio..." className="flex-1 p-3 bg-gray-50 rounded-xl border text-sm" value={newAreaMessage} onChange={e => setNewAreaMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendAreaMessage()} />
                              <button onClick={sendAreaMessage} className="p-3 bg-pcgl-blue text-white rounded-xl shadow-md"><Send size={18}/></button>
                          </div>

                          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                              {[...areaMessages].sort((a, b) => (b.inEvidenza ? 1 : 0) - (a.inEvidenza ? 1 : 0)).map(msg => (
                                  <div key={msg.id} className={`p-3 rounded-xl shadow-sm border ${msg.inEvidenza ? 'bg-yellow-50 border-yellow-200' : (msg.uid === user.uid ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-100')}`}>
                                      <div className="flex justify-between items-start mb-1">
                                          <p className={`text-xs font-bold ${msg.inEvidenza ? 'text-yellow-800' : 'text-gray-600'}`}>
                                              {msg.inEvidenza && <Pin size={12} className="inline mr-1 fill-yellow-600 text-yellow-600"/>}
                                              {msg.autore} <span className="font-normal opacity-70">({msg.sede})</span>
                                          </p>
                                          <div className="flex gap-2">
                                              {isAreaManager && (
                                                  <button onClick={() => togglePinAreaMessage(msg.id, msg.inEvidenza)} className={`text-gray-400 hover:text-yellow-600 ${msg.inEvidenza ? 'text-yellow-600' : ''}`} title="Metti in evidenza"><Pin size={14} className={msg.inEvidenza ? "fill-yellow-600" : ""}/></button>
                                              )}
                                              {(isAreaManager || msg.uid === user.uid) && (
                                                  <button onClick={() => deleteAreaMessage(msg.id)} className="text-red-400 hover:text-red-600" title="Elimina"><X size={14}/></button>
                                              )}
                                          </div>
                                      </div>
                                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.testo}</p>
                                      <p className="text-[9px] text-gray-400 text-right mt-1">{new Date(msg.data).toLocaleString()}</p>
                                  </div>
                              ))}
                              {areaMessages.length === 0 && <p className="text-sm text-gray-400 italic">Nessun messaggio in bacheca.</p>}
                          </div>
                      </div>
                  </div>
              )}
          </div>
        );

      case 'news_view': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
          <HeaderSub title={selectedNews ? "Dettaglio News" : "Notizie"} onBack={() => selectedNews ? setSelectedNews(null) : setSubPage(null)} />
          <div className="space-y-6 font-sans text-pcgl-text-dark">
            {selectedNews ? (
                // VISTA DETTAGLIO
                <div className="bg-white rounded-[2.5rem] shadow-card border border-gray-100 overflow-hidden animate-in zoom-in duration-300">
                  {/* Cover Image (Interna o Fallback Anteprima) */}
                  <div className="w-full h-64 bg-gray-200 relative">
                     {(selectedNews.imgInterna || selectedNews.imgAnteprima) ? (
                        <img src={getDriveImgUrl(selectedNews.imgInterna || selectedNews.imgAnteprima)} className="w-full h-full object-cover" alt="Cover" />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center bg-pcgl-blue text-white"><Megaphone size={48}/></div>
                     )}
                     {selectedNews.importante && <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-black uppercase shadow-lg">Importante</div>}
                  </div>
                  
                  <div className="p-8">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">{selectedNews.data} • {selectedNews.sede}</p>
                    <h1 className="text-3xl font-black text-pcgl-blue uppercase leading-tight mb-6">{selectedNews.titolo}</h1>
                    
                    {selectedNews.visibilita === 'riservata' && <span className="inline-block bg-pcgl-blue text-white text-[10px] font-bold px-2 py-1 rounded mb-4 uppercase">Riservato: {selectedNews.targetRuolo}</span>}

                    <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap mb-8">
                        {selectedNews.testo || selectedNews.contenuto}
                    </div>

                    {selectedNews.link && (
                        <a href={selectedNews.link} target="_blank" rel="noopener noreferrer" className="block w-full py-4 bg-pcgl-yellow text-pcgl-blue text-center rounded-xl font-bold uppercase shadow-lg hover:bg-pcgl-blue hover:text-pcgl-yellow transition-all">
                            Apri Link Esterno
                        </a>
                    )}

                    {/* SEZIONE MODULO DATI ALLEGATO */}
                    {selectedNews.formId && (
                        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200 animate-in fade-in">
                            <p className="text-sm font-bold text-blue-800 mb-3 uppercase flex items-center">
                                <ClipboardList size={16} className="mr-2"/> Modulo Dati Richiesto
                            </p>
                            <button onClick={() => handleFillForm(selectedNews.formId)} className="w-full py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all flex items-center justify-center">
                                <Pencil size={20} className="mr-2"/> Compila Modulo
                            </button>
                        </div>
                    )}

                    {/* SEZIONE CONFERMA LETTURA */}
                    {selectedNews.importante && (
                        <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200 animate-in fade-in">
                            <p className="text-sm font-bold text-yellow-800 mb-3 uppercase flex items-center">
                                <TriangleAlert size={16} className="mr-2"/> Conferma Lettura Richiesta
                            </p>
                            {hasConfirmedRead ? (
                                <div className="w-full py-3 bg-green-100 text-green-700 rounded-xl font-bold uppercase text-center flex items-center justify-center border border-green-200">
                                    <CheckCircle size={20} className="mr-2"/> Lettura Confermata
                                </div>
                            ) : (
                                <button onClick={confirmReadNews} className="w-full py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all flex items-center justify-center">
                                    <Check size={20} className="mr-2"/> Conferma di aver letto
                                </button>
                            )}
                        </div>
                    )}

                    {/* LISTA CONFERME (SOLO STAFF) */}
                    {selectedNews.importante && ['admin', 'superadmin', 'coordinamento', 'presidente'].includes(userData.ruolo) && (
                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-lg text-pcgl-blue flex items-center"><Users size={20} className="mr-2"/> Conferme di Lettura ({readReceipts.length})</h4>
                                <button onClick={() => {
                                    const headers = ["Cognome Nome", "Sede", "Data Conferma"];
                                    const rows = readReceipts.map(r => [
                                        `${r.cognome} ${r.nome}`,
                                        r.sede,
                                        new Date(r.dataConferma).toLocaleString()
                                    ]);
                                    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => `"${e.join('","')}"`)].join("\n");
                                    const link = document.createElement("a");
                                    link.setAttribute("href", encodeURI(csvContent));
                                    link.setAttribute("download", `conferme_lettura_${selectedNews.titolo.replace(/[^a-z0-9]/gi, '_')}.csv`);
                                    document.body.appendChild(link);
                                    link.click();
                                }} className="text-xs font-bold text-green-600 uppercase bg-green-50 px-3 py-1 rounded-lg hover:bg-green-100">Esporta CSV</button>
                            </div>
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                {readReceipts.length > 0 ? readReceipts.map((r, i) => (
                                    <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg text-xs border border-gray-100">
                                        <div>
                                            <p className="font-bold uppercase text-pcgl-blue">{r.nome} {r.cognome}</p>
                                            <p className="text-gray-500">{r.sede}</p>
                                        </div>
                                        <span className="text-gray-400 font-mono">{new Date(r.dataConferma).toLocaleDateString()}</span>
                                    </div>
                                )) : <p className="text-sm text-gray-400 italic">Nessuna conferma ricevuta.</p>}
                            </div>
                        </div>
                    )}
                  </div>
                </div>
            ) : (
                // LISTA NEWS VERTICALE
                newsFeed.length > 0 ? newsFeed.map(news => (
                <div key={news.id} onClick={() => setSelectedNews(news)} className={`${news.importante ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'} p-4 rounded-2xl shadow-card border flex gap-4 cursor-pointer active:scale-95 transition-transform`}>
                  <div className="w-24 h-24 bg-gray-200 rounded-xl flex-shrink-0 overflow-hidden">
                     {news.imgAnteprima ? <img src={getDriveImgUrl(news.imgAnteprima)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><Megaphone size={24}/></div>}
                  </div>
                  <div className="flex-1">
                     <div className="flex justify-between items-start mb-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">{news.data}</p>
                        {news.importante && <span className="text-[10px] font-black text-red-600 uppercase">⚠️ Importante</span>}
                        {news.visibilita === 'riservata' && <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase ml-2">Riservato</span>}
                        {news.formId && <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase ml-2 flex items-center"><ClipboardList size={10} className="mr-1"/> Modulo</span>}
                     </div>
                     <h3 className="font-bold text-base text-pcgl-blue uppercase leading-tight mb-2 line-clamp-2">{news.titolo}</h3>
                     <p className="text-xs text-gray-600 line-clamp-2">{news.testoBreve || news.contenuto}</p>
                  </div>
                </div>
              )) : <p className="text-center text-gray-500 font-medium">Nessuna news disponibile.</p>
            )}
          </div>

          {/* MODALE COMPILAZIONE MODULO CUSTOM */}
          {fillingForm && (
            <div className="fixed inset-0 bg-black/80 z-[1600] flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto relative">
                    <button onClick={() => setFillingForm(null)} className="absolute top-4 right-4 text-gray-400"><X/></button>
                    <h3 className="font-black text-xl text-pcgl-blue uppercase mb-2">{fillingForm.title}</h3>
                    <p className="text-sm text-gray-500 mb-6">{fillingForm.description}</p>
                    
                    <div className="space-y-4">
                        {fillingForm.questions.map(q => (
                            <div key={q.id} className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                                <p className="font-bold text-sm text-gray-700 mb-2">{q.text}</p>
                                {q.type === 'boolean' && (
                                    <div className="flex gap-2">
                                        <button onClick={() => setFillingAnswers({...fillingAnswers, [q.id]: true})} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border ${fillingAnswers[q.id] === true ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-500 border-gray-300'}`}>SÌ</button>
                                        <button onClick={() => setFillingAnswers({...fillingAnswers, [q.id]: false})} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border ${fillingAnswers[q.id] === false ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-500 border-gray-300'}`}>NO</button>
                                    </div>
                                )}
                                {q.type === 'text' && <input type="text" className="w-full p-2 border rounded-lg text-sm" placeholder="Risposta..." onChange={e => setFillingAnswers({...fillingAnswers, [q.id]: e.target.value})} />}
                                {q.type === 'choice' && <select className="w-full p-2 border rounded-lg text-sm" onChange={e => setFillingAnswers({...fillingAnswers, [q.id]: e.target.value})} defaultValue=""><option value="" disabled>Seleziona...</option>{q.options.map(o => <option key={o} value={o}>{o}</option>)}</select>}
                                {q.type === 'checkbox' && (
                                    <div className="space-y-2">
                                        {q.options?.map(opt => (
                                            <label key={opt} className="flex items-center space-x-2 cursor-pointer bg-white p-2 rounded border border-gray-100">
                                                <input type="checkbox" 
                                                    checked={fillingAnswers[q.id]?.includes(opt) || false}
                                                    onChange={e => {
                                                        const current = fillingAnswers[q.id] || [];
                                                        if (e.target.checked) setFillingAnswers({...fillingAnswers, [q.id]: [...current, opt]});
                                                        else setFillingAnswers({...fillingAnswers, [q.id]: current.filter(x => x !== opt)});
                                                    }}
                                                    className="rounded text-pcgl-blue focus:ring-pcgl-blue"
                                                />
                                                <span className="text-sm font-medium text-gray-700">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                                {(q.type === 'file' || q.tipo === 'file') && (
                                    <div>
                                        {fillingAnswers[q.id] ? (
                                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                                                <a href={fillingAnswers[q.id].url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-700 flex items-center truncate hover:underline"><FileText size={16} className="mr-2"/> {fillingAnswers[q.id].name}</a>
                                                <button onClick={() => { const newAns = {...fillingAnswers}; delete newAns[q.id]; setFillingAnswers(newAns); }} className="text-red-500 p-1 hover:bg-red-50 rounded"><X size={16}/></button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <Upload className="w-8 h-8 mb-3 text-gray-400" />
                                                    <p className="mb-1 text-sm text-gray-500"><span className="font-bold text-pcgl-blue">Clicca per caricare</span></p>
                                                    <p className="text-xs text-gray-400">PDF, JPG, PNG (Max 10MB)</p>
                                                </div>
                                                <input type="file" className="hidden" onChange={(e) => handleFormFileUpload(e, q.id)} />
                                            </label>
                                        )}
                                    </div>
                                )}
                                {q.type === 'date_range' && (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold uppercase text-gray-400">Dal</label>
                                                <input type="date" className="w-full p-2 border rounded-lg text-sm" 
                                                    min={q.minDate} max={q.maxDate}
                                                    value={fillingAnswers[q.id]?.start || ''}
                                                    onChange={e => handleDateRangeChange(q.id, 'start', e.target.value)} 
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold uppercase text-gray-400">Al</label>
                                                <input type="date" className="w-full p-2 border rounded-lg text-sm" 
                                                    min={q.minDate} max={q.maxDate}
                                                    value={fillingAnswers[q.id]?.end || ''}
                                                    onChange={e => handleDateRangeChange(q.id, 'end', e.target.value)} 
                                                />
                                            </div>
                                        </div>
                                        {occupiedSlots.filter(s => s.qId === q.id).length > 0 && (
                                            <div className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100"><p className="font-bold mb-1">Date già impegnate:</p><ul className="list-disc pl-4 space-y-0.5">{occupiedSlots.filter(s => s.qId === q.id).map((s, idx) => <li key={idx}>{new Date(s.start).toLocaleDateString()} - {new Date(s.end).toLocaleDateString()} : Un'altra sede ha selezionato questo periodo</li>)}</ul></div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        <button onClick={submitCustomForm} className="w-full py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-lg mt-4">Invia Risposte</button>
                    </div>
                </div>

                <div className="border-t border-gray-200 mt-8 pt-6">
                    <h4 className="font-bold text-lg text-pcgl-blue mb-4">Notifiche di Sistema</h4>
                    <button onClick={async () => {
                        if (!window.confirm("Vuoi inviare a tutti gli utenti la notifica push di lancio del nuovo modulo SOGL?")) return;
                        try {
                            await addDoc(collection(db, 'news'), {
                                titolo: 'LANCIO NUOVO MODULO S.O.G.L.',
                                testo: 'È ora disponibile il nuovo modulo Sala Operativa (SOGL). Tutti gli utenti abilitati possono ora gestire emergenze, logistica, campagne AIB e monitorare la flotta mezzi direttamente dall\'app. Accedi alla sezione Sala Op. per scoprire le novità!',
                                testoBreve: 'Nuovo modulo Sala Operativa (SOGL) disponibile. Scopri le nuove funzionalità.',
                                importante: true,
                                visibilita: 'pubblica',
                                dataScadenza: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
                                timestamp: serverTimestamp(),
                                data: new Date().toLocaleDateString('it-IT'),
                                autore: 'Direzione Generale',
                                sede: 'TUTTE',
                                archived: false
                            });
                            showToast("Notifica di lancio inviata con successo!");
                        } catch (e) {
                            console.error(e);
                            showToast("Errore invio notifica.", 'error');
                        }
                    }} className="w-full py-4 bg-green-600 text-white font-bold text-sm rounded-xl shadow-md hover:bg-green-700 transition-all uppercase">
                        Invia Notifica Lancio SOGL a tutti
                    </button>
                </div>
            </div>
          )}
        </div>
      );

      case 'fill_form': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
            <HeaderSub 
                title={previewSource === 'editor' ? "Anteprima Modulo" : "Compilazione Modulo"} 
                onBack={() => { 
                    setFillingForm(null); 
                    if (previewSource === 'editor') {
                        setSubPage('form_manager');
                        setShowFormEditorModal(true);
                        setPreviewSource(null);
                    } else if (previewSource === 'manager_list') {
                        setSubPage('form_manager');
                        setPreviewSource(null);
                    } else { setSubPage(null); }
                }} />
            {fillingForm && (
                <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100 max-w-2xl mx-auto">
                    <h3 className="font-black text-xl text-pcgl-blue uppercase mb-2">{fillingForm.title}</h3>
                    <p className="text-sm text-gray-500 mb-6">{fillingForm.description}</p>
                    
                    <div className="space-y-4">
                        {fillingForm.questions.map(q => (
                            <div key={q.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <p className="font-bold text-sm text-gray-700 mb-3">{q.text} {q.required && <span className="text-red-500">*</span>}</p>
                                {q.type === 'boolean' && (
                                    <div className="flex gap-2">
                                        <button onClick={() => setFillingAnswers({...fillingAnswers, [q.id]: true})} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase border transition-all ${fillingAnswers[q.id] === true ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-500 border-gray-300'}`}>SÌ</button>
                                        <button onClick={() => setFillingAnswers({...fillingAnswers, [q.id]: false})} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase border transition-all ${fillingAnswers[q.id] === false ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-gray-500 border-gray-300'}`}>NO</button>
                                    </div>
                                )}
                                {q.type === 'text' && <input type="text" className="w-full p-3 border rounded-xl text-sm" placeholder="Risposta..." onChange={e => setFillingAnswers({...fillingAnswers, [q.id]: e.target.value})} />}
                                {q.type === 'choice' && <select className="w-full p-3 border rounded-xl text-sm bg-white" onChange={e => setFillingAnswers({...fillingAnswers, [q.id]: e.target.value})} defaultValue=""><option value="" disabled>Seleziona...</option>{q.options.map(o => <option key={o} value={o}>{o}</option>)}</select>}
                                {q.type === 'checkbox' && (
                                    <div className="space-y-2">
                                        {q.options?.map(opt => (
                                            <label key={opt} className="flex items-center space-x-3 cursor-pointer bg-white p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                                                <input type="checkbox" 
                                                    checked={fillingAnswers[q.id]?.includes(opt) || false}
                                                    onChange={e => {
                                                        const current = fillingAnswers[q.id] || [];
                                                        if (e.target.checked) setFillingAnswers({...fillingAnswers, [q.id]: [...current, opt]});
                                                        else setFillingAnswers({...fillingAnswers, [q.id]: current.filter(x => x !== opt)});
                                                    }}
                                                    className="w-5 h-5 rounded text-pcgl-blue focus:ring-pcgl-blue border-gray-300"
                                                />
                                                <span className="text-sm font-medium text-gray-700">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                                {(q.type === 'file' || q.tipo === 'file') && (
                                    <div>
                                        {fillingAnswers[q.id] ? (
                                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                                                <a href={fillingAnswers[q.id].url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-700 flex items-center truncate hover:underline"><FileText size={16} className="mr-2"/> {fillingAnswers[q.id].name}</a>
                                                <button onClick={() => { const newAns = {...fillingAnswers}; delete newAns[q.id]; setFillingAnswers(newAns); }} className="text-red-500 p-1 hover:bg-red-50 rounded"><X size={16}/></button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <Upload className="w-8 h-8 mb-3 text-gray-400" />
                                                    <p className="mb-1 text-sm text-gray-500"><span className="font-bold text-pcgl-blue">Clicca per caricare</span></p>
                                                    <p className="text-xs text-gray-400">PDF, JPG, PNG (Max 10MB)</p>
                                                </div>
                                                <input type="file" className="hidden" onChange={(e) => handleFormFileUpload(e, q.id)} />
                                            </label>
                                        )}
                                    </div>
                                )}
                                {q.type === 'date_range' && (
                                    <div className="space-y-2">
                                        <div className="flex gap-2"><div className="flex-1"><label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Dal</label><input type="date" className="w-full p-3 border rounded-xl text-sm bg-white" min={q.minDate} max={q.maxDate} value={fillingAnswers[q.id]?.start || ''} onChange={e => handleDateRangeChange(q.id, 'start', e.target.value)} /></div><div className="flex-1"><label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Al</label><input type="date" className="w-full p-3 border rounded-xl text-sm bg-white" min={q.minDate} max={q.maxDate} value={fillingAnswers[q.id]?.end || ''} onChange={e => handleDateRangeChange(q.id, 'end', e.target.value)} /></div></div>
                                        {occupiedSlots.filter(s => s.qId === q.id).length > 0 && <div className="text-xs text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 mt-2"><p className="font-bold mb-1">Date già impegnate:</p><ul className="list-disc pl-4 space-y-1">{occupiedSlots.filter(s => s.qId === q.id).map((s, idx) => <li key={idx}>{new Date(s.start).toLocaleDateString()} - {new Date(s.end).toLocaleDateString()} : Un'altra sede ha selezionato questo periodo</li>)}</ul></div>}
                                    </div>
                                )}
                            </div>
                        ))}
                        <button 
                            onClick={submitCustomForm} 
                            disabled={previewSource === 'editor' || uploading}
                            className="w-full py-4 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-lg mt-6 active:scale-95 transition-all hover:bg-pcgl-yellow hover:text-pcgl-blue disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                        >
                            {uploading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span> : null}
                            {uploading ? 'Caricamento in corso...' : (previewSource === 'editor' ? 'Anteprima (Invio disabilitato)' : 'Invia Risposte')}
                        </button>
                    </div>
                </div>
            )}
        </div>
      );

      case 'monitoraggio': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
          <HeaderSub title="Report Monitoraggio" onBack={() => setSubPage(null)} />
          <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-6 font-sans text-pcgl-text-dark">
            <h3 className="font-bold text-xl text-pcgl-blue mb-4">Invia un Report</h3>
            <textarea className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all resize-none" rows="5" placeholder="Descrivi la situazione..." value={reportText} onChange={(e) => setReportText(e.target.value)}></textarea>
            <div className="flex items-center space-x-4">
              <button onClick={getCurrentLocation} className="flex-1 py-3 bg-pcgl-blue text-white rounded-xl shadow-md active:scale-95 transition-all hover:bg-pcgl-yellow hover:text-pcgl-blue flex items-center justify-center">
                <MapPin size={20} className="mr-2"/> Acquisisci Posizione
              </button>
              {currentLocation && <span className="text-sm text-gray-600">Lat: {currentLocation.latitude.toFixed(4)}, Lon: {currentLocation.longitude.toFixed(4)}</span>}
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button onClick={sendReport} className="w-full py-4 bg-pcgl-yellow text-pcgl-blue font-bold text-lg rounded-xl shadow-lg active:scale-95 transition-all hover:bg-pcgl-blue hover:text-pcgl-yellow hover:shadow-xl">Invia Report</button>
          </div>
        </div>
      );

      case 'corsi_view': {
        const filteredUsers = moodleCourseReport ? moodleCourseReport.users.filter(u => {
            const sedeMatch = !moodleFilterSede || (u.department || 'N/D') === moodleFilterSede;
            const typeMatch = moodleUserTypeFilter === 'app' ? u.isAppUser : moodleUserTypeFilter === 'external' ? !u.isAppUser : true;
            return sedeMatch && typeMatch;
        }).sort((a, b) => {
            if (moodleSortBy === 'name') return (a.fullname || '').localeCompare(b.fullname || '');
            if (moodleSortBy === 'sede') {
                const sA = a.isAppUser ? (a.department || 'N/D') : (a.appartenenza || a.department || 'N/D');
                const sB = b.isAppUser ? (b.department || 'N/D') : (b.appartenenza || b.department || 'N/D');
                return sA.localeCompare(sB) || (a.fullname || '').localeCompare(b.fullname || '');
            }
            if (moodleSortBy === 'type') {
                const tA = a.isAppUser ? 'Interno' : 'Esterno';
                const tB = b.isAppUser ? 'Interno' : 'Esterno';
                return tA.localeCompare(tB) || (a.fullname || '').localeCompare(b.fullname || '');
            }
            return 0;
        }) : [];

        const exportMoodleCSV = () => {
            if (!moodleCourseReport) return;
            const headers = ["Cognome e Nome", "Email", "Tipo", "Sede/Organizzazione", "Ultimo Accesso"];
            const rows = filteredUsers.map(u => [
                u.fullname,
                u.email,
                u.isAppUser ? 'Interno' : 'Esterno',
                u.isAppUser ? (u.department || 'N/D') : (u.appartenenza || u.department || 'N/D'),
                u.lastcourseaccess ? new Date(u.lastcourseaccess * 1000).toLocaleDateString() : 'Mai Entrato'
            ]);
            const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => `"${e.join('","')}"`)].join("\n");
            const link = document.createElement("a");
            link.setAttribute("href", encodeURI(csvContent));
            link.setAttribute("download", `iscritti_${moodleCourseReport.courseName.replace(/ /g, "_")}.csv`);
            document.body.appendChild(link);
            link.click();
        };

        return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
          <HeaderSub title="Corsi di Formazione" onBack={() => setSubPage(null)} />
          <div className="space-y-6 font-sans text-pcgl-text-dark">
            
            {/* SEZIONE CORSI FIREBASE (INTERNI) */}
            <div>
              <h3 className="font-bold text-xl text-pcgl-blue mb-4">Corsi Interni (In Presenza)</h3>
              {corsiFormazione.length > 0 ? corsiFormazione.map(corso => (
                  <div key={corso.id} className="bg-white p-6 rounded-2xl shadow-card border border-gray-100 mb-4">
                    <h3 className="font-bold text-lg text-pcgl-blue mb-2">{corso.titolo}</h3>
                    <p className="text-sm text-gray-600 mb-4">{corso.descrizione}</p>
                    <p className="text-xs text-gray-400 mb-4">Data: {new Date(corso.data).toLocaleDateString()}</p>
                    <button onClick={() => handleIscrizioneCorso(corso.id)} className="w-full py-3 bg-pcgl-yellow text-pcgl-blue font-bold text-sm rounded-lg shadow-md active:scale-95 transition-all hover:bg-pcgl-blue hover:text-pcgl-yellow">Candidati al Corso</button>
                  </div>
                )) : <p className="text-gray-500 font-medium">Nessun corso in presenza programmato.</p>}
            </div>

            {/* SEZIONE CORSI MOODLE */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-xl text-pcgl-blue">Corsi E-Learning (Moodle)</h3>
                <button onClick={() => setShowMoodleGuide(true)} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-bold text-xs uppercase flex items-center">
                    <Info size={16} className="mr-1"/> Guida
                </button>
              </div>
              
              {!moodleUserFound && moodleStatus === 'success' && (
                  <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between animate-in slide-in-from-top duration-500">
                      <div className="flex-1 pr-4">
                          <p className="text-sm font-bold text-orange-800 uppercase">Profilo E-Learning non attivo</p>
                          <p className="text-xs text-orange-600">Sincronizza il tuo account per accedere ai corsi online.</p>
                      </div>
                      <button onClick={handleSyncMoodle} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold uppercase shadow-sm active:scale-95 transition-all">Attiva Ora</button>
                  </div>
              )}

              {moodleStatus === 'loading' && <p className="text-gray-500 animate-pulse">Caricamento corsi da Moodle in corso...</p>}
              
              {moodleStatus === 'error' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                      <p className="font-bold">Impossibile caricare i corsi Moodle.</p>
                      <p className="mt-1">{moodleErrorMsg || "Ciò è probabilmente causato da un blocco di sicurezza (CORS) del browser o da un token non valido. Apri la console per i dettagli (F12)."}</p>
                      {['admin', 'superadmin'].includes(userData.ruolo) && (
                          <button onClick={handleSyncMoodle} className="mt-3 w-full py-2 bg-red-600 text-white rounded-lg font-bold uppercase text-xs shadow-sm">
                              Forza Sincronizzazione Database
                          </button>
                      )}
                  </div>
              )}

              {moodleStatus === 'success' && moodleCourses.length === 0 && <p className="text-gray-500 font-medium">Nessun corso online disponibile.</p>}

              {moodleStatus === 'success' && moodleCourses.length > 0 && moodleCourses.map(course => {
                  const isEnrolled = moodleEnrolledCourseIds.includes(course.id);
                  return (
                  <div key={course.id} className="bg-white p-6 rounded-2xl shadow-card border border-blue-100 mb-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase">Attivo</div>
                    {isEnrolled && <div className="absolute top-0 left-0 bg-pcgl-blue text-pcgl-yellow text-[10px] font-bold px-3 py-1 rounded-br-xl uppercase shadow-md">Iscritto</div>}
                    
                    <h4 className="font-bold text-lg text-pcgl-blue mb-1 pr-12 mt-2">{course.fullname}</h4>
                    <p className="text-xs text-gray-500 mb-3">{course.shortname}</p>
                    
                    <div className="flex gap-2">
                        <button onClick={() => window.open(`https://formazione.pcgl.it/course/view.php?id=${course.id}`, '_blank')} className="flex-[2] py-3 bg-blue-50 text-blue-700 font-bold text-sm rounded-lg shadow-sm active:scale-95 transition-all hover:bg-blue-100">
                            {isEnrolled ? "Riprendi Corso" : "Vai al Corso"}
                        </button>
                        {['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) && (
                            <button onClick={() => handleMoodleCourseReport(course)} disabled={loadingMoodleReport} className="flex-[1] py-3 bg-pcgl-yellow text-pcgl-blue font-bold text-xs uppercase rounded-lg shadow-sm active:scale-95 transition-all hover:bg-yellow-500 disabled:opacity-50 flex items-center justify-center">
                                <Users size={16} className="mr-1"/> Iscritti
                            </button>
                        )}
                    </div>
                  </div>
              )})}
            </div>

          </div>
          
          {/* MODALE REPORT ISCRITTI MOODLE */}
          {moodleCourseReport && (
            <React.Fragment>
            <div className="fixed inset-0 bg-black/80 z-[1700] flex items-center justify-center p-4 animate-in fade-in print:hidden" onClick={() => { setMoodleCourseReport(null); setMoodleFilterSede(''); setMoodleUserTypeFilter(''); setMoodleSortBy('name'); setShowMoodleMail(false); }}>
                <div className="bg-white w-full max-w-4xl rounded-3xl p-6 shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-4">
                        <div>
                            <h3 className="font-black text-xl text-pcgl-blue uppercase truncate pr-4">Iscritti: {moodleCourseReport.courseName}</h3>
                            <p className="text-xs font-bold text-gray-500 mt-1">
                                Totale: <span className="text-pcgl-blue">{moodleCourseReport.users.length}</span> | Interni: <span className="text-green-600">{moodleCourseReport.users.filter(u => u.isAppUser).length}</span> | Esterni: <span className="text-purple-600">{moodleCourseReport.users.filter(u => !u.isAppUser).length}</span>
                            </p>
                        </div>
                        <button onClick={() => { setMoodleCourseReport(null); setMoodleFilterSede(''); setMoodleUserTypeFilter(''); setMoodleSortBy('name'); setShowMoodleMail(false); }} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
                    </div>
                    
                    <div className="flex flex-col lg:flex-row gap-4 mb-6">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <select className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-bold text-sm uppercase" value={moodleFilterSede} onChange={e => setMoodleFilterSede(e.target.value)}>
                                <option value="">Tutte le Sedi</option>
                                {sediDisponibili.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-bold text-sm uppercase" value={moodleUserTypeFilter} onChange={e => setMoodleUserTypeFilter(e.target.value)}>
                                <option value="">Tutti gli Utenti</option>
                                <option value="app">Solo Utenti App</option>
                                <option value="external">Solo Utenti Esterni</option>
                            </select>
                            <select className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-bold text-sm uppercase" value={moodleSortBy} onChange={e => setMoodleSortBy(e.target.value)}>
                                <option value="name">Ordina per Nome</option>
                                <option value="sede">Ordina per Sede</option>
                                <option value="type">Ordina per Tipo</option>
                            </select>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setShowMoodleMail(!showMoodleMail)} className={`flex-1 min-w-[120px] px-4 py-3 ${showMoodleMail ? 'bg-gray-200 text-gray-600' : 'bg-pcgl-yellow text-pcgl-blue'} rounded-xl font-bold uppercase shadow-md flex items-center justify-center`}>
                                <Mail className="mr-2" size={18}/> {showMoodleMail ? 'Annulla' : 'Invia Email'}
                            </button>
                            <button onClick={exportMoodleCSV} className="flex-1 min-w-[120px] px-4 py-3 bg-green-600 text-white rounded-xl font-bold uppercase shadow-md flex items-center justify-center">
                                <FileSpreadsheet className="mr-2" size={18}/> Esporta CSV
                            </button>
                            <button onClick={() => window.print()} className="flex-1 min-w-[120px] px-4 py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-md flex items-center justify-center">
                                <Printer className="mr-2" size={18}/> Stampa PDF
                            </button>
                        </div>
                    </div>

                    {showMoodleMail && (
                        <div className="mb-4 bg-yellow-50 p-4 rounded-xl border border-yellow-200 animate-in fade-in">
                            <h4 className="font-bold text-sm text-pcgl-blue mb-2 uppercase">Invia Email agli Iscritti</h4>
                            <input className="w-full p-3 mb-2 bg-white rounded-xl border border-yellow-100 text-sm" placeholder="Oggetto" value={moodleMailSubject} onChange={e => setMoodleMailSubject(e.target.value)} />
                            <textarea className="w-full p-3 mb-2 bg-white rounded-xl border border-yellow-100 text-sm h-24 resize-none" placeholder="Messaggio..." value={moodleMailBody} onChange={e => setMoodleMailBody(e.target.value)} />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowMoodleMail(false)} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-xs font-bold uppercase hover:bg-gray-300 transition-colors">Annulla</button>
                                <button onClick={sendMoodleCommunication} className="px-4 py-2 bg-pcgl-blue text-white rounded-lg text-xs font-bold uppercase shadow-md hover:bg-blue-800 transition-colors">Invia ({moodleCourseReport.users.filter(u => !moodleFilterSede || (u.department || 'N/D') === moodleFilterSede).filter(u => u.email).length})</button>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                        {filteredUsers.length > 0 ? 
                            filteredUsers.map(u => (
                            <div key={u.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <p className="font-bold text-sm text-pcgl-blue uppercase flex items-center">
                                        {u.fullname}
                                        {!u.isAppUser && <span className="ml-2 text-[9px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full uppercase">Esterno</span>}
                                    </p>
                                    <p className="text-xs text-gray-500">{u.email} <span className="font-bold text-gray-400 ml-1">• {!u.isAppUser && u.appartenenza ? u.appartenenza : (u.department || 'N/D')}</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Ultimo accesso</p>
                                    <p className={`text-xs font-mono font-bold ${u.lastcourseaccess ? 'text-green-600' : 'text-orange-500'}`}>
                                        {u.lastcourseaccess ? new Date(u.lastcourseaccess * 1000).toLocaleDateString() : 'Mai Entrato'}
                                    </p>
                                </div>
                            </div>
                        )) : <p className="text-center text-gray-500 text-sm italic py-4">Nessun utente iscritto a questo corso per la sede selezionata.</p>}
                    </div>
                    <button onClick={() => { setMoodleCourseReport(null); setMoodleFilterSede(''); setMoodleUserTypeFilter(''); setMoodleSortBy('name'); setShowMoodleMail(false); }} className="w-full mt-4 py-3 bg-gray-200 text-gray-600 rounded-xl font-bold uppercase hover:bg-gray-300 transition-colors">Chiudi Report</button>
                </div>
            </div>
          
          {/* PRINT LAYOUT FOR MOODLE REPORT */}
            <div className="hidden print:block w-full bg-white p-8 text-black font-sans">
                <div className="flex items-center justify-between border-b-4 border-[#001a33] pb-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-black uppercase text-[#001a33] leading-none">Report Iscritti Corso</h1>
                        <p className="text-xl font-bold text-gray-500 mt-2">{moodleCourseReport.courseName}</p>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-[0.2em] mt-2">Protezione Civile Gruppo Lucano</p>
                    </div>
                    <img src={APP_LOGO} className="w-24 h-24 object-contain" alt="Logo PCGL" />
                </div>
                <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200 print:bg-white print:border-0 print:p-0">
                    <p className="font-bold uppercase text-gray-600">Filtro Sede: <span className="text-pcgl-blue">{moodleFilterSede || 'Tutte le Sedi'}</span> | Tipo: <span className="text-pcgl-blue">{moodleUserTypeFilter === 'app' ? 'Solo App' : moodleUserTypeFilter === 'external' ? 'Solo Esterni' : 'Tutti'}</span></p>
                    <p className="text-sm text-gray-500 mt-1">Generato il {new Date().toLocaleString()} - Totale Iscritti Mostrati: <b>{filteredUsers.length}</b></p>
                </div>
                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                            <th className="p-3 font-bold text-gray-600 uppercase text-xs">Cognome Nome</th>
                            <th className="p-3 font-bold text-gray-600 uppercase text-xs">Email</th>
                            <th className="p-3 font-bold text-gray-600 uppercase text-xs">Tipo</th>
                            <th className="p-3 font-bold text-gray-600 uppercase text-xs">Sede/Org.</th>
                            <th className="p-3 font-bold text-gray-600 uppercase text-xs">Ultimo Accesso</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((u, i) => (
                            <tr key={i} className="border-b border-gray-200">
                                <td className="p-3 uppercase font-bold">{u.fullname}</td>
                                <td className="p-3 text-xs text-gray-500">{u.email}</td>
                                <td className="p-3 text-xs font-bold uppercase">{u.isAppUser ? <span className="text-green-600">Interno</span> : <span className="text-purple-600">Esterno</span>}</td>
                                <td className="p-3 uppercase font-medium">{u.isAppUser ? (u.department || 'N/D') : (u.appartenenza || u.department || 'N/D')}</td>
                                <td className="p-3 text-xs font-mono">{u.lastcourseaccess ? new Date(u.lastcourseaccess * 1000).toLocaleDateString() : 'Mai Entrato'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            </React.Fragment>
          )}

          {/* MODALE GUIDA MOODLE */}
          {showMoodleGuide && (
            <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-6 animate-in fade-in" onClick={() => setShowMoodleGuide(false)}>
                <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm text-center relative" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setShowMoodleGuide(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24}/></button>
                    <BookOpen size={48} className="text-pcgl-blue mx-auto mb-4"/>
                    <h3 className="text-xl font-black text-pcgl-blue uppercase mb-2">Come accedere a Moodle?</h3>
                    <div className="text-sm text-gray-500 mb-6 space-y-3">
                        <p>Per accedere alla piattaforma di formazione E-Learning (Moodle) devi utilizzare le tue credenziali personali.</p>
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-left">
                            <p className="font-bold text-pcgl-blue mb-1">Dove trovo la Password?</p>
                            <p>Puoi trovare la tua password predefinita andando nella sezione <strong>Il Mio Profilo</strong> (cliccando in basso sull'icona dell'utente) e scorrendo fino alla scheda "Accesso E-Learning".</p>
                        </div>
                        <p>La username corrisponde alla tua email istituzionale.</p>
                    </div>
                    <button onClick={() => { setShowMoodleGuide(false); setSubPage('fascicolo_edit'); }} className="w-full py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-lg hover:bg-pcgl-yellow hover:text-pcgl-blue transition-colors">Vai al Mio Profilo</button>
                </div>
            </div>
          )}
        </div>
      );
      }

      case 'news_gest': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
          <HeaderSub title="Gestione News" onBack={() => setSubPage(null)} />
          <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-6 font-sans text-pcgl-text-dark mb-8">
            <h3 className="font-bold text-xl text-pcgl-blue mb-4">{editingNewsId ? 'Modifica News' : 'Aggiungi Nuova News'}</h3>
            <input type="text" placeholder="Titolo della News" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all" value={newNewsTitle} onChange={(e) => setNewNewsTitle(e.target.value)} />
            <textarea className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all resize-none" rows="3" placeholder="Contenuto della News..." value={newNewsContent} onChange={(e) => setNewNewsContent(e.target.value)}></textarea>
            
            <input type="text" placeholder="Immagine Anteprima: link o ID Drive (file condiviso con 'Chiunque abbia il link')" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium text-sm focus:border-pcgl-yellow transition-all" value={newNewsImgPreview} onChange={(e) => setNewNewsImgPreview(e.target.value)} />
            <input type="text" placeholder="Immagine Interna: link o ID Drive (Opzionale)" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium text-sm focus:border-pcgl-yellow transition-all" value={newNewsImgInternal} onChange={(e) => setNewNewsImgInternal(e.target.value)} />
            <input type="text" placeholder="Link Esterno (Opzionale)" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium text-sm focus:border-pcgl-yellow transition-all" value={newNewsLink} onChange={(e) => setNewNewsLink(e.target.value)} />

            {/* SELEZIONE MODULO DATI */}
            <div>
                <label className="text-xs font-bold uppercase text-gray-400 ml-2">Allega Modulo Dati (Opzionale)</label>
                <div className="flex gap-2">
                    <select className="flex-1 p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all" value={newsFormId} onChange={(e) => setNewsFormId(e.target.value)}>
                        <option value="">Nessun Modulo</option>
                        {customForms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                    </select>
                    <button onClick={() => { setFormEditor({ id: null, title: '', description: '', questions: [], expirationDate: '', responsibleId: null, responsibleName: '' }); setShowFormEditorModal(true); }} className="p-4 bg-pcgl-blue text-white rounded-lg shadow-md" title="Crea Nuovo Modulo"><Plus size={20}/></button>
                </div>
            </div>

            {/* VISIBILITA' */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase text-gray-400">Visibilità</label>
                    <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                        <button onClick={() => setNewNewsVisibility('pubblica')} className={`px-3 py-1 rounded-md text-xs font-bold uppercase transition-all ${newNewsVisibility === 'pubblica' ? 'bg-pcgl-blue text-white shadow-sm' : 'text-gray-400'}`}>Pubblica</button>
                        <button onClick={() => setNewNewsVisibility('riservata')} className={`px-3 py-1 rounded-md text-xs font-bold uppercase transition-all ${newNewsVisibility === 'riservata' ? 'bg-pcgl-blue text-white shadow-sm' : 'text-gray-400'}`}>Riservata</button>
                    </div>
                </div>

                {newNewsVisibility === 'riservata' && (
                    <div className="animate-in slide-in-from-top duration-300 space-y-4 pt-2 border-t border-gray-200">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block">Ruolo Target</label>
                            <select className="w-full p-3 bg-white rounded-lg border border-gray-200 text-sm font-medium focus:border-pcgl-yellow outline-none" value={newNewsTargetRole} onChange={(e) => setNewNewsTargetRole(e.target.value)}>
                                <option value="tutti">Tutti i Ruoli</option>
                                <option value="volontario">Volontari</option>
                                <option value="presidente">Presidenti</option>
                                <option value="coordinamento">Coordinamento</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block">Sede Target</label>
                            <select className="w-full p-3 bg-white rounded-lg border border-gray-200 text-sm font-medium focus:border-pcgl-yellow outline-none" value={newNewsTargetSede} onChange={(e) => setNewNewsTargetSede(e.target.value)}>
                                <option value="tutte">Tutte le Sedi</option>
                                {sediDisponibili.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            <div>
                <label className="text-xs font-bold uppercase text-gray-400 ml-2">Data Scadenza (Opzionale - Default 30gg)</label>
                <input type="date" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all" value={newNewsExpiration} onChange={(e) => setNewNewsExpiration(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="flex items-center space-x-3 p-2 cursor-pointer" onClick={() => setNewNewsImportant(!newNewsImportant)}>
               <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${newNewsImportant ? 'bg-red-600 border-red-600' : 'border-gray-300'}`}>
                  {newNewsImportant && <Check size={14} className="text-white" />}
               </div>
               <span className={`text-sm font-bold uppercase select-none ${newNewsImportant ? 'text-red-600' : 'text-gray-600'}`}>Contrassegna come Importante / Allerta</span>
            </div>
            <div className="flex items-center space-x-3 p-2 cursor-pointer" onClick={() => setNewNewsTelegram(!newNewsTelegram)}>
               <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${newNewsTelegram ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                  {newNewsTelegram && <Check size={14} className="text-white" />}
               </div>
               <span className={`text-sm font-bold uppercase select-none ${newNewsTelegram ? 'text-blue-500' : 'text-gray-600'}`}>Invia notifica tramite Bot Telegram</span>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-2">
                {editingNewsId && <button onClick={resetNewsForm} className="flex-1 py-4 bg-gray-200 text-gray-600 font-bold text-lg rounded-xl shadow-sm active:scale-95 transition-all">Annulla</button>}
                <button onClick={handleSaveNews} disabled={uploading} className="flex-[2] py-4 bg-pcgl-blue text-pcgl-yellow font-bold text-lg rounded-xl shadow-lg active:scale-95 transition-all hover:bg-pcgl-yellow hover:text-pcgl-blue hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">{uploading ? 'Caricamento...' : (editingNewsId ? 'Aggiorna News' : 'Pubblica News')}</button>
            </div>
          </div>
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-xl text-pcgl-blue">News Attive</h3>
             {['admin', 'superadmin'].includes(userData.ruolo) && <button onClick={() => setSubPage('news_archive')} className="text-xs font-bold uppercase text-gray-400 hover:text-pcgl-blue underline">Vedi Archivio</button>}
          </div>
          <div className="space-y-4 font-sans text-pcgl-text-dark">
            {newsFeed.length > 0 ? newsFeed.map(news => (
                <div key={news.id} className={`${news.importante ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'} p-4 rounded-lg shadow-card border flex justify-between items-center`}>
                  <div>
                      <p className={`font-bold text-base ${news.importante ? 'text-red-700' : 'text-pcgl-blue'}`}>{news.importante && "⚠️ "}{news.titolo}</p>
                      <p className="text-xs text-gray-500">Data: {news.data}</p>
                      {news.visibilita === 'riservata' && <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase mt-1 inline-block">Riservata</span>}
                      {news.formId && <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase mt-1 ml-2 inline-block">Modulo Dati</span>}
                  </div>
                  <div className="flex gap-1">
                      {['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) && (news.visibilita === 'pubblica' || (news.visibilita === 'riservata' && (!news.targetRuolo || news.targetRuolo === 'tutti') && (!news.targetSede || news.targetSede === 'tutte'))) && (
                          <button onClick={() => shareNewsToTelegram(news)} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors" title="Condividi su Telegram"><Send size={20}/></button>
                      )}
                      <button onClick={() => handleEditNews(news)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"><Pencil size={20}/></button>
                      <button onClick={() => deleteNews(news.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"><Trash2 size={20}/></button>
                  </div>
                </div>
              )) : <p className="text-center text-gray-500 font-medium">Nessuna news pubblicata.</p>}
          </div>
        </div>
      );

      case 'news_archive': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
          <HeaderSub title="Archivio News" onBack={() => setSubPage('news_gest')} />
          <div className="space-y-4 font-sans text-pcgl-text-dark">
            {archivedNews.length > 0 ? archivedNews.map(news => (
                <div key={news.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center opacity-75 hover:opacity-100 transition-opacity">
                  <div>
                      <p className="font-bold text-base text-gray-600">{news.titolo}</p>
                      <p className="text-xs text-gray-400">Scaduta il {news.dataScadenza ? new Date(news.dataScadenza).toLocaleDateString() : 'N/D'}</p>
                  </div>
                  <button onClick={() => deleteNews(news.id)} className="p-2 bg-white text-red-400 border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 size={20}/></button>
                </div>
              )) : <p className="text-center text-gray-400 font-medium italic py-10">L'archivio è vuoto.</p>}
          </div>
        </div>
      );

      case 'risorse_gestione': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
          <HeaderSub title="Gestione Risorse Sede" onBack={() => setSubPage(null)} />
          <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-6 font-sans text-pcgl-text-dark mb-8">
            <h3 className="font-bold text-xl text-pcgl-blue mb-4">Aggiungi Nuova Risorsa</h3>
            <input type="text" placeholder="Nome Risorsa (es. Pick-up, Tenda)" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all" value={newResourceName} onChange={(e) => setNewResourceName(e.target.value)} />
            <input type="text" placeholder="Tipo Risorsa (es. Mezzo, Attrezzatura)" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all" value={newResourceType} onChange={(e) => setNewResourceType(e.target.value)} />
            <input type="number" placeholder="Quantità" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all" value={newResourceQuantity} onChange={(e) => setNewResourceQuantity(parseInt(e.target.value) || 1)} min="1" />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button onClick={addResource} className="w-full py-4 bg-pcgl-blue text-pcgl-yellow font-bold text-lg rounded-xl shadow-lg active:scale-95 transition-all hover:bg-pcgl-yellow hover:text-pcgl-blue hover:shadow-xl">Aggiungi Risorsa</button>
          </div>
          <h3 className="font-bold text-xl text-pcgl-blue mb-4">Risorse della Sede ({userData?.sede})</h3>
          <div className="space-y-4 font-sans text-pcgl-text-dark">
            {risorseSede.filter(r => r.sede === userData.sede).length > 0 ? risorseSede.filter(r => r.sede === userData.sede).map(resource => (
                <div key={resource.id} className="bg-white p-4 rounded-lg shadow-card border border-gray-100 flex justify-between items-center">
                  <div><p className="font-bold text-base text-pcgl-blue">{resource.nome} ({resource.tipo})</p><p className="text-sm text-gray-500">Quantità: {resource.quantita}</p></div>
                  <button onClick={() => deleteResource(resource.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"><Trash2 size={20}/></button>
                </div>
              )) : <p className="text-center text-gray-500 font-medium">Nessuna risorsa registrata per questa sede.</p>}
          </div>
        </div>
      );

      case 'gestione_mezzi': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
          <HeaderSub title="Gestione Mezzi" onBack={() => {
              if (previousPage === 'sedi_list') {
                  setSubPage('sedi_list');
                  setPreviousPage(null);
              } else {
                  setSubPage(null);
              }
          }} />
          
          {/* Dashboard Coordinamento */}
          {['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) && (
            <div className="mb-8 space-y-4">
              {/* Filtro Sede */}
              <select className="w-full p-3 bg-white rounded-xl border border-gray-200 font-bold text-sm" value={filterSede} onChange={e => setFilterSede(e.target.value)}>
                  <option value="">Tutte le Sedi</option>
                  {sediDisponibili.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <div className="flex gap-2">
                <button onClick={exportVehicles} className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold uppercase shadow-md flex items-center justify-center"><FileSpreadsheet className="mr-2"/> Esporta CSV</button>
                <div className="flex-1 bg-white p-4 rounded-xl shadow-md border border-gray-100 text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase">Mezzi Totali</p>
                  <p className="text-2xl font-black text-pcgl-blue">{mezzi.length}</p>
                </div>
              </div>
              
              {/* Report Scadenze */}
              <div className="bg-white p-6 rounded-2xl shadow-card border border-gray-100">
                <h4 className="font-bold text-lg text-pcgl-blue mb-4 flex items-center"><AlertTriangle className="mr-2 text-orange-500"/> Scadenze Imminenti (30gg)</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {mezzi.filter(m => {
                    const today = new Date();
                    const next30 = new Date(); next30.setDate(today.getDate() + 30);
                    const ass = new Date(m.scadenzaAssicurazione);
                    const rev = new Date(m.scadenzaRevisione);
                    return (ass > today && ass < next30) || (rev > today && rev < next30);
                  }).map(m => (
                    <div key={m.id} className="p-3 bg-orange-50 rounded-lg border border-orange-100 text-sm">
                      <p className="font-bold text-pcgl-blue">{m.targa} - {m.sede}</p>
                      <p className="text-xs text-gray-600">Ass: {m.scadenzaAssicurazione} | Rev: {m.scadenzaRevisione}</p>
                    </div>
                  ))}
                  {mezzi.filter(m => {
                    const today = new Date();
                    const next30 = new Date(); next30.setDate(today.getDate() + 30);
                    const ass = new Date(m.scadenzaAssicurazione);
                    const rev = new Date(m.scadenzaRevisione);
                    return (ass > today && ass < next30) || (rev > today && rev < next30);
                  }).length === 0 && <p className="text-center text-gray-400 text-xs italic">Nessuna scadenza imminente.</p>}
                </div>
              </div>
            </div>
          )}

          {/* Aggiunta Mezzo (Presidente, Admin, Superadmin, Coordinamento) */}
          {['presidente', 'admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) && (!filterSede || filterSede === userData.sede || ['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo)) && (
            <div className="mb-8">
              <button onClick={() => {
                  if(!showAddVehicle) setVehicleForm({ id: null, tipo: '', tipologia: '', targa: '', scadenzaAssicurazione: '', scadenzaRevisione: '', kmAttuali: '', sede: (userData.originalRuolo === 'superadmin' && userData.ruolo !== 'superadmin') ? 'SEDE TEST FITTIZIA' : userData.sede });
                  setShowAddVehicle(!showAddVehicle);
              }} className="w-full py-4 bg-pcgl-blue text-pcgl-yellow rounded-xl font-bold uppercase shadow-md mb-4">{showAddVehicle ? 'Annulla' : 'Aggiungi Nuovo Mezzo'}</button>
              {showAddVehicle && (
                <div className="bg-white p-6 rounded-2xl shadow-card border border-gray-100 space-y-4 animate-in slide-in-from-top duration-300">
                  {['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) && (
                      <select className="w-full p-3 bg-gray-50 rounded-lg border" value={vehicleForm.sede} onChange={e => setVehicleForm({...vehicleForm, sede: e.target.value})} disabled={userData.originalRuolo === 'superadmin' && userData.ruolo !== 'superadmin'}>
                          <option value="">Seleziona Sede</option>
                          {sediDisponibili.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                  )}
                  <input type="text" placeholder="Nome Risorsa (es. Defender, Torre Fari)" className="w-full p-3 bg-gray-50 rounded-lg border" value={vehicleForm.tipologia} onChange={e => setVehicleForm({...vehicleForm, tipologia: e.target.value})} />
                  <input type="text" placeholder="Tipo (es. Autovettura, Rimorchio)" className="w-full p-3 bg-gray-50 rounded-lg border" value={vehicleForm.tipo} onChange={e => setVehicleForm({...vehicleForm, tipo: e.target.value})} />
                  <input type="text" placeholder="Targa" className="w-full p-3 bg-gray-50 rounded-lg border uppercase" value={vehicleForm.targa} onChange={e => setVehicleForm({...vehicleForm, targa: e.target.value.toUpperCase()})} />
                  <input type="number" placeholder="Km Attuali" className="w-full p-3 bg-gray-50 rounded-lg border" value={vehicleForm.kmAttuali} onChange={e => setVehicleForm({...vehicleForm, kmAttuali: e.target.value})} />
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[10px] font-bold uppercase text-gray-400">Scad. Assicurazione</label><input type="date" className="w-full p-3 bg-gray-50 rounded-lg border" value={vehicleForm.scadenzaAssicurazione} onChange={e => setVehicleForm({...vehicleForm, scadenzaAssicurazione: e.target.value})} /></div>
                    <div><label className="text-[10px] font-bold uppercase text-gray-400">Scad. Revisione</label><input type="date" className="w-full p-3 bg-gray-50 rounded-lg border" value={vehicleForm.scadenzaRevisione} onChange={e => setVehicleForm({...vehicleForm, scadenzaRevisione: e.target.value})} /></div>
                  </div>
                  <button onClick={handleVehicleSave} className="w-full py-3 bg-green-600 text-white rounded-lg font-bold uppercase">{vehicleForm.id?"Aggiorna Mezzo":"Salva Mezzo"}</button>
                </div>
              )}
            </div>
          )}

          {/* Lista Mezzi */}
          <div className="space-y-4">
            {mezzi.filter(m => !filterSede || m.sede === filterSede).map(m => {
              const activeMovement = openMovements.find(mov => mov.mezzoId === m.id);
              const isMyMovement = activeMovement?.volontarioId === user.uid;

              return (
              <div key={m.id} className={`bg-white p-6 rounded-2xl shadow-card border ${activeMovement ? 'border-l-8 border-l-pcgl-yellow border-gray-100' : 'border-gray-100'} relative overflow-hidden`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-black text-xl text-pcgl-blue">{m.tipologia}</h3>
                    <p className="text-sm font-bold text-gray-500 uppercase">{m.tipo} • {m.targa}</p>
                    <p className="text-xs text-gray-400 mt-1">{m.sede}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase">Km Attuali</p>
                    <p className="font-mono font-black text-lg text-pcgl-blue">{m.kmAttuali || 0}</p>
                    {['presidente', 'admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) && (
                        <button onClick={() => {
                            setVehicleForm({
                                id: m.id,
                                tipo: m.tipo,
 tipologia: m.tipologia,
                                targa: m.targa,
                                scadenzaAssicurazione: m.scadenzaAssicurazione,
                                scadenzaRevisione: m.scadenzaRevisione,
                                kmAttuali: m.kmAttuali || 0,
                                sede: m.sede
                            });
                            setShowAddVehicle(true);
                        }} className="mt-1 p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-pcgl-yellow hover:text-pcgl-blue transition-colors" title="Modifica Dati">
                            <Pencil size={16} />
                        </button>
                    )}
                    {['presidente', 'admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) && (
                        <button onClick={() => deleteVehicle(m.id)} className="mt-1 ml-1 p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors" title="Elimina Mezzo">
                            <Trash2 size={16} />
                        </button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div><span className="font-bold text-gray-500">Assicurazione:</span> <br/> {new Date(m.scadenzaAssicurazione).toLocaleDateString()}</div>
                  <div><span className="font-bold text-gray-500">Revisione:</span> <br/> {new Date(m.scadenzaRevisione).toLocaleDateString()}</div>
                </div>

                <button onClick={() => { setSelectedVehicle(m); setShowVehicleDocsModal(true); }} className="w-full mt-2 py-2 bg-gray-100 text-pcgl-blue rounded-xl font-bold uppercase text-xs shadow-sm flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <FileText className="mr-2" size={16}/> Documenti ({m.documenti?.length || 0})
                </button>

                {/* GESTIONE FOGLIO DI MARCIA */}
                {activeMovement ? (
                    isMyMovement ? (
                        <button onClick={() => { 
                            setSelectedVehicle(m); 
                            setMovementForm({ mode: 'rientro', km: '', motivazione: '', note: '', spese: [], newSpesaTipo: 'carburante', newSpesaImporto: '', checklist: {} }); 
                            setShowMovementModal(true); 
                        }} className="w-full mt-4 py-3 bg-green-600 text-white rounded-xl font-bold uppercase shadow-sm flex items-center justify-center hover:bg-green-700 transition-colors animate-pulse">
                            <CheckCircle className="mr-2" size={20}/> Chiudi Foglio Marcia
                        </button>
                    ) : (
                        <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 rounded-xl text-xs font-bold uppercase text-center border border-yellow-200">
                            In uso da: {activeMovement.nomeVolontario}
                        </div>
                    )
                ) : (
                    <button onClick={() => { 
                        setSelectedVehicle(m); 
                        setMovementForm({ mode: 'uscita', km: m.kmAttuali || '', motivazione: '', note: '', spese: [], newSpesaTipo: 'carburante', newSpesaImporto: '', checklist: { carrozzeria: false, pneumatici: false, attrezzatura_dpi: false, livelli_carburante: false } }); 
                        setShowMovementModal(true); 
                    }} className="w-full mt-4 py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-sm flex items-center justify-center hover:bg-pcgl-yellow hover:text-pcgl-blue transition-colors">
                        <Truck className="mr-2" size={20}/> Apri Foglio Marcia
                    </button>
                )}
              </div>
            );
            })}
            {mezzi.length === 0 && <p className="text-center text-gray-500 font-medium py-8">Nessun mezzo disponibile.</p>}
          </div>

          {/* Modale Movimento */}
          {showMovementModal && selectedVehicle && (
            <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowMovementModal(false)}>
              <div className="bg-white p-6 rounded-3xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="font-black text-xl text-pcgl-blue mb-4 uppercase border-b pb-2">
                    {movementForm.mode === 'uscita' ? 'Nuova Uscita' : 'Registra Rientro'} - {selectedVehicle.targa}
                </h3>
                
                <div className="space-y-4">
                  {movementForm.mode === 'uscita' ? (
                      <>
                        <div>
                            <label className="text-xs font-bold uppercase text-gray-400">Km Partenza</label>
                            <input type="number" className="w-full p-3 bg-gray-50 rounded-xl border font-mono text-lg" value={movementForm.km} onChange={e => setMovementForm({...movementForm, km: e.target.value})} placeholder={selectedVehicle.kmAttuali} />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-gray-400">Motivazione / Destinazione</label>
                            <input type="text" className="w-full p-3 bg-gray-50 rounded-xl border" value={movementForm.motivazione} onChange={e => setMovementForm({...movementForm, motivazione: e.target.value})} placeholder="Es. Servizio AIB, Trasferimento..." />
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <label className="text-xs font-bold uppercase text-gray-400 mb-2 block flex items-center"><CheckCircle size={14} className="mr-1"/> Checklist Pre-Partenza</label>
                            <div className="space-y-2">
                                {Object.keys(movementForm.checklist).map(key => (
                                    <label key={key} className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                                        <input type="checkbox" checked={movementForm.checklist[key]} onChange={e => setMovementForm({...movementForm, checklist: {...movementForm.checklist, [key]: e.target.checked}})} className="rounded text-pcgl-blue focus:ring-pcgl-blue w-4 h-4" />
                                        <span className="text-xs font-bold text-gray-600 uppercase">{key.replace('_', ' ')} controllati</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                      </>
                  ) : (
                      <>
                        <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-800 mb-2">
                            <span className="font-bold">Partenza:</span> {openMovements.find(m => m.mezzoId === selectedVehicle.id)?.kmPartenza} Km<br/>
                            <span className="font-bold">Motivo:</span> {openMovements.find(m => m.mezzoId === selectedVehicle.id)?.motivazione}
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-gray-400">Km Arrivo</label>
                            <input type="number" className="w-full p-3 bg-gray-50 rounded-xl border font-mono text-lg" value={movementForm.km} onChange={e => setMovementForm({...movementForm, km: e.target.value})} />
                        </div>
                        
                        {/* SEZIONE SPESE */}
                        <div className="border-t pt-4 mt-4">
                            <label className="text-xs font-bold uppercase text-gray-400 mb-2 block flex items-center"><Fuel size={14} className="mr-1"/> Spese Viaggio (Opzionale)</label>
                            <div className="flex gap-2 mb-2">
                                <select className="p-2 bg-gray-50 rounded-lg text-sm border" value={movementForm.newSpesaTipo} onChange={e => setMovementForm({...movementForm, newSpesaTipo: e.target.value})}>
                                    <option value="carburante">Carburante</option>
                                    <option value="manutenzione">Manutenzione</option>
                                    <option value="altro">Altro</option>
                                </select>
                                <input type="number" placeholder="€ Importo" className="flex-1 p-2 bg-gray-50 rounded-lg text-sm border" value={movementForm.newSpesaImporto} onChange={e => setMovementForm({...movementForm, newSpesaImporto: e.target.value})} />
                                <button onClick={() => {
                                    if(movementForm.newSpesaImporto) {
                                        setMovementForm({
                                            ...movementForm, 
                                            spese: [...movementForm.spese, { tipo: movementForm.newSpesaTipo, importo: parseFloat(movementForm.newSpesaImporto) }],
                                            newSpesaImporto: ''
                                        });
                                    }
                                }} className="p-2 bg-pcgl-blue text-white rounded-lg"><Plus size={16}/></button>
                            </div>
                            {movementForm.spese.length > 0 && (
                                <div className="space-y-1">
                                    {movementForm.spese.map((s, i) => (
                                        <div key={i} className="flex justify-between text-xs bg-gray-50 p-2 rounded border">
                                            <span className="uppercase font-bold">{s.tipo}</span>
                                            <span>€ {s.importo.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* SEZIONE FIRMA DIGITALE */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center gap-3">
                            <div className="p-2 bg-green-100 text-green-600 rounded-full"><Verified size={20}/></div>
                            <div>
                                <p className="text-[10px] font-bold uppercase text-gray-400">Firma Digitale Automatica</p>
                                <p className="text-sm font-bold text-pcgl-blue uppercase">{userData.nome} {userData.cognome}</p>
                                <p className="text-[10px] text-gray-500">{new Date().toLocaleString()}</p>
                            </div>
                        </div>

            {/* CLASSIFICA E RICONOSCIMENTI (GAMIFICATION) */}
            <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100 mt-8">
                <h4 className="font-bold text-xl text-pcgl-blue mb-4 flex items-center"><Award className="mr-2 text-pcgl-yellow"/> Top 10 Volontari (Gamification)</h4>
                <p className="text-sm text-gray-500 mb-4">Punteggio operativo calcolato in base alla formazione completata (10pt) e alle squadre d'appartenenza (50pt).</p>
                
                <div className="space-y-3">
                    {leaderboard.map((u, i) => (
                        <div key={u.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-md ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-700' : 'bg-pcgl-blue'}`}>{i + 1}</div>
                                <div><p className="font-bold text-sm uppercase text-pcgl-blue">{u.nome} {u.cognome}</p><p className="text-[10px] text-gray-500 uppercase">{u.sede}</p></div>
                            </div>
                            <div className="text-right">
                                <span className="font-black text-lg text-pcgl-blue">{u.punti}</span><span className="text-[10px] text-gray-400 font-bold uppercase block -mt-1">Punti</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
                      </>
                  )}
                  
                  <div>
                      <label className="text-xs font-bold uppercase text-gray-400">Note {movementForm.mode === 'uscita' ? 'Partenza' : 'Rientro'}</label>
                      <textarea className="w-full p-3 bg-gray-50 rounded-xl border resize-none" rows="2" value={movementForm.note} onChange={e => setMovementForm({...movementForm, note: e.target.value})}></textarea>
                  </div>

                  {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
                  <button onClick={handleMovementSubmit} className={`w-full py-4 text-white rounded-xl font-bold uppercase shadow-lg ${movementForm.mode === 'uscita' ? 'bg-pcgl-blue' : 'bg-green-600'}`}>
                      {movementForm.mode === 'uscita' ? 'Registra Uscita' : 'Conferma Rientro'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modale Documenti Mezzo */}
          {showVehicleDocsModal && selectedVehicle && (
            <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowVehicleDocsModal(false)}>
              <div className="bg-white p-6 rounded-3xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="font-black text-xl text-pcgl-blue mb-4 uppercase border-b pb-2">Documenti - {selectedVehicle.targa}</h3>
                
                <div className="mb-4">
                    <label className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                        <Paperclip size={20} className="text-gray-400 mr-3"/>
                        <span className="text-sm font-medium text-gray-500 truncate">{vehicleDocFile ? vehicleDocFile.name : "Carica Documento"}</span>
                        <input type="file" className="hidden" onChange={(e) => setVehicleDocFile(e.target.files[0])} />
                    </label>
                    <p className="text-[10px] text-gray-400 mt-1 ml-1">Dimensione massima file: 10MB</p>
                    {vehicleDocFile && <button onClick={uploadVehicleDoc} disabled={uploading} className="w-full mt-2 py-2 bg-pcgl-blue text-white rounded-lg font-bold text-xs uppercase">{uploading ? 'Caricamento...' : 'Conferma Upload'}</button>}
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {(mezzi.find(m => m.id === selectedVehicle.id)?.documenti || []).map((doc, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <a 
                                href={cachedDocs[doc.url] || doc.url} 
                                download={cachedDocs[doc.url] ? doc.nome : undefined}
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center text-sm font-bold text-pcgl-blue hover:underline truncate max-w-[200px]"
                            >
                                <FileText size={16} className="mr-2"/> {doc.nome}
                                {cachedDocs[doc.url] && <CheckCircle size={12} className="ml-1 text-green-500" title="Disponibile Offline"/>}
                            </a>
                            {['presidente', 'admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) && (
                                <button onClick={() => deleteVehicleDoc(doc)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                            )}
                        </div>
                    ))}
                    {(mezzi.find(m => m.id === selectedVehicle.id)?.documenti || []).length === 0 && <p className="text-center text-gray-400 text-xs italic">Nessun documento caricato.</p>}
                </div>
                <button onClick={() => setShowVehicleDocsModal(false)} className="w-full mt-4 py-3 bg-gray-200 text-gray-600 rounded-xl font-bold uppercase">Chiudi</button>
              </div>
            </div>
          )}
        </div>
      );

      case 'allerta_gest': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
          <HeaderSub title="Gestione Allerta GL" onBack={() => setSubPage(null)} />
          <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-6 font-sans text-pcgl-text-dark mb-8">
            <h3 className="font-bold text-xl text-pcgl-blue mb-4">Attiva Nuova Allerta</h3>
            <input type="text" placeholder="Titolo Allerta (es. Allerta Meteo)" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all" value={newAlertTitle} onChange={(e) => setNewAlertTitle(e.target.value)} />
            
            <div>
                <label className="text-xs font-bold uppercase text-gray-400 ml-2 mb-1 block">Info Evento / Dettagli</label>
                <textarea className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all resize-none" rows="3" placeholder="Dettagli operativi (opzionale)..." value={newAlertDetails} onChange={(e) => setNewAlertDetails(e.target.value)}></textarea>
            </div>
            
            <div className="flex items-center space-x-2">
              <button onClick={() => {
                  if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                          (p) => { setNewAlertLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); showToast("Posizione allerta acquisita!"); },
                          (e) => showToast("Errore GPS: " + e.message, 'error')
                      );
                  } else { showToast("GPS non supportato", 'error'); }
              }} className={`flex-1 py-3 rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center ${newAlertLocation ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-white border border-gray-200 text-pcgl-blue'}`}>
                <MapIcon size={20} className="mr-2"/> {newAlertLocation ? 'GPS OK' : 'Usa GPS'}
              </button>
              <button onClick={() => setShowLocationPicker(true)} className="flex-1 py-3 bg-white border border-gray-200 text-pcgl-blue rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center hover:bg-gray-50">
                <MapPin size={20} className="mr-2"/> Mappa / Manuale
              </button>
              {newAlertLocation && (
                <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${newAlertLocation.lat},${newAlertLocation.lng}`, '_blank')} className="p-3 bg-blue-100 text-blue-600 rounded-xl"><MapIcon size={20}/></button>
              )}
              {newAlertLocation && <button onClick={() => setNewAlertLocation(null)} className="p-3 bg-red-100 text-red-600 rounded-xl"><Trash2 size={20}/></button>}
            </div>
            
            <select className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all" value={newAlertColor} onChange={(e) => setNewAlertColor(e.target.value)}>
              <option value="gialla">🟡 Allerta Gialla</option>
              <option value="arancione">🟠 Allerta Arancione</option>
              <option value="rossa">🔴 Allerta Rossa</option>
            </select>

            <select className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all" value={newAlertSpec} onChange={(e) => setNewAlertSpec(e.target.value)}>
              <option value="">Tutte le qualifiche</option>
              {appConfig.specs.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {userData.ruolo !== 'presidente' ? (
              <>
              <div className="flex justify-between items-center mb-2 px-1">
                  <label className="text-xs font-bold uppercase text-gray-400">Zone Interessate</label>
                  <button 
                    onClick={() => setSelectedZones(selectedZones.length === sediDisponibili.length ? [] : [...sediDisponibili])} 
                    className="px-3 py-1 bg-blue-50 text-pcgl-blue rounded-lg text-xs font-bold uppercase hover:bg-blue-100 transition-colors"
                  >
                      {selectedZones.length === sediDisponibili.length ? 'Deseleziona Tutte' : 'Seleziona Tutte'}
                  </button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                {sediDisponibili.map(s => (
                  <div key={s} onClick={() => setSelectedZones(prev => prev.includes(s) ? prev.filter(z => z !== s) : [...prev, s])} 
                       className={`p-2 text-xs font-bold rounded cursor-pointer border ${selectedZones.includes(s) ? 'bg-pcgl-blue text-white' : 'bg-gray-50'}`}>
                    {s}
                  </div>
                ))}
              </div>
              </>
            ) : (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
                  <p className="text-xs font-bold text-pcgl-blue uppercase">Target: {userData.sede}</p>
              </div>
            )}

            <div className="flex items-center space-x-3 p-2 cursor-pointer" onClick={() => setSendNotification(!sendNotification)}>
               <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${sendNotification ? 'bg-red-600 border-red-600' : 'border-gray-300'}`}>
                  {sendNotification && <Check size={14} className="text-white" />}
               </div>
               <span className="text-sm font-bold text-gray-600 uppercase select-none">Invia Notifica Push / Email</span>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button onClick={activateAlert} className="w-full py-4 bg-red-600 text-white font-bold text-lg rounded-xl shadow-lg active:scale-95 transition-all hover:bg-red-700 hover:shadow-xl">Attiva Allerta</button>
          </div>
          <h3 className="font-bold text-xl text-pcgl-blue mb-4">Allerte Attive</h3>
          <div className="space-y-4 font-sans text-pcgl-text-dark">
            {attivazioniAttive.length > 0 ? attivazioniAttive.map(alert => (
                <div key={alert.id} className="bg-red-50 p-4 rounded-lg shadow-card border border-red-100 flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <p className="font-bold text-base text-red-700">{alert.titolo}</p>
                    <p className="text-xs text-red-500">Target: {alert.richiestaSpecializzazione || 'Tutti'} • {new Date(alert.dataAttivazione).toLocaleDateString()}</p>
                    <div className="mt-1"><span className="text-[10px] font-bold text-gray-500 uppercase">Durata:</span> <AlertTimer startDate={alert.dataAttivazione} /></div>
                    {alert.dettagli && (
                        <div className="mt-2 p-2 bg-white/50 rounded-lg border border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Info Evento</p>
                            <p className="text-xs text-gray-600 italic">{alert.dettagli}</p>
                        </div>
                    )}
                    
                    {alert.posizione && (
                        <div className="mt-2">
                            <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${alert.posizione.lat},${alert.posizione.lng}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                                <MapIcon size={14} className="mr-1.5"/> Vedi su Mappa
                            </a>
                        </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setSelectedAlertForTeams(alert); setSubPage('map_view'); }} className="p-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"><MapIcon size={20}/></button>
                    <button onClick={() => { setSelectedAlertForTeams(alert); setSubPage('gestione_operativa'); }} className="p-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"><Users size={20}/></button>
                    {(['admin', 'superadmin'].includes(userData.ruolo) || alert.creatorUid === user.uid) && (
                        <button onClick={() => deactivateAlert(alert.id)} className="p-2 bg-red-200 text-red-800 rounded-lg hover:bg-red-300 transition-colors"><X size={20}/></button>
                    )}
                  </div>
                </div>
              )) : <p className="text-center text-gray-500 font-medium">Nessuna allerta attiva.</p>}
          </div>

          {/* LOCATION PICKER MODAL */}
          {showLocationPicker && (
            <LocationPicker initialPos={newAlertLocation} onConfirm={(pos) => { setNewAlertLocation(pos); setShowLocationPicker(false); showToast("Posizione impostata manualmente"); }} onClose={() => setShowLocationPicker(false)} />
          )}

          {/* STORICO ALLERTE (REPORT) */}
          <h3 className="font-bold text-xl text-gray-400 mb-4 mt-8 uppercase">Archivio Eventi</h3>
          <div className="space-y-4 font-sans text-pcgl-text-dark">
            {closedAlerts.length > 0 ? closedAlerts.map(alert => (
                <div key={alert.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity">
                  <div><p className="font-bold text-base text-gray-600">{alert.titolo}</p><p className="text-xs text-gray-400">{new Date(alert.dataAttivazione).toLocaleDateString()}</p></div>
                  <button onClick={() => generateReport(alert)} className="p-2 bg-white text-pcgl-blue border border-gray-200 rounded-lg hover:bg-pcgl-blue hover:text-white transition-colors"><Printer size={20}/></button>
                </div>
              )) : <p className="text-center text-gray-400 text-sm italic">Nessun evento in archivio.</p>}
          </div>

        </div>
      );

      case 'allerta_view': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
          <HeaderSub title="Bollettino Meteo" onBack={() => setSubPage(null)} />
          <div className="space-y-8 font-sans text-pcgl-text-dark">
            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 text-center">
               <p className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-2">Zona di Allerta</p>
               <h3 className="text-4xl font-black text-pcgl-blue uppercase">{meteoData.zona}</h3>
               <p className="text-sm font-bold text-gray-500 mt-2">Sede: {userData.sede}</p>
            </div>
            <div className={`p-10 rounded-3xl shadow-xl border-b-8 text-center ${getColorClass(meteoData.oggi)}`}>
               <p className="text-sm font-black uppercase tracking-[0.3em] opacity-80 mb-4">Previsione Oggi</p>
               <h2 className="text-6xl font-black uppercase italic tracking-tighter mb-6">{meteoData.oggi}</h2>
               <div className="bg-black/10 p-4 rounded-xl backdrop-blur-sm inline-block">
                 <p className="text-xs font-bold uppercase leading-relaxed">{getAlertMessage(meteoData.oggi)}</p>
               </div>
            </div>
            <div className={`p-8 rounded-3xl shadow-lg border-b-4 text-center opacity-90 ${getColorClass(meteoData.domani)}`}>
               <p className="text-xs font-black uppercase tracking-[0.3em] opacity-80 mb-2">Previsione Domani</p>
               <h3 className="text-4xl font-black uppercase italic tracking-tighter">{meteoData.domani}</h3>
            </div>
            <p className="text-center text-[10px] text-gray-400 font-bold uppercase mt-8">Fonte: Dati Protezione Civile Regionale</p>
            
            {['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) && (
                <button onClick={shareMeteoToTelegram} className="mt-4 w-full py-3 bg-[#0088cc] text-white rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all flex items-center justify-center hover:bg-[#0077b3]">
                    <Send size={20} className="mr-2"/> Condividi su Telegram
                </button>
            )}
            
            {/* LISTA ALLERTE ATTIVE */}
            <div className="mt-8">
              <h3 className="font-black text-xl text-[#001a33] mb-4 uppercase">Allerte Attive</h3>
              {attivazioniAttive.length > 0 ? attivazioniAttive.map(alert => (
                <div key={alert.id} className={`p-6 rounded-3xl shadow-lg mb-4 border-l-8 ${getColorClass(alert.colore)} bg-white text-[#001a33]`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-black text-lg uppercase leading-tight">{alert.titolo}</h4>
                      <p className="text-xs font-bold opacity-70 mt-1">{new Date(alert.dataAttivazione).toLocaleString()}</p>
                      <div className="mt-1"><AlertTimer startDate={alert.dataAttivazione} /></div>
                    </div>
                    {participationStatus === 'accepted' ? (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide">Partecipi</span>
                    ) : (
                      <button onClick={() => handleParticipation(alert.id, 'accepted')} className="bg-[#001a33] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase shadow-md active:scale-95 transition-all">Partecipa</button>
                    )}
                  </div>
                  <p className="text-sm font-medium opacity-80 mb-2">Zone: {Array.isArray(alert.zone) ? alert.zone.join(", ") : alert.zona}</p>
                  {alert.richiestaSpecializzazione && <p className="text-xs font-bold text-red-600 uppercase">Richiesto: {alert.richiestaSpecializzazione}</p>}
                  {alert.dettagli && <p className="text-sm text-gray-600 mt-2 mb-2 italic bg-white/50 p-2 rounded-lg border border-gray-100">"{alert.dettagli}"</p>}
                  {alert.posizione && (
                    <button 
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${alert.posizione.lat},${alert.posizione.lng}`, '_system')}
                      className="inline-flex items-center mt-2 px-4 py-2 bg-white border border-gray-200 text-pcgl-blue rounded-lg text-xs font-bold uppercase shadow-sm hover:bg-gray-50 transition-colors"
                    >
                      <MapPin size={16} className="mr-2"/> Avvia Navigazione
                    </button>
                  )}
                </div>
              )) : (
                <p className="text-center text-gray-400 font-medium py-4">Nessuna allerta operativa al momento.</p>
              )}
            </div>

            {/* SEZIONE OPERATIVA VOLONTARIO */}
            {myParticipation?.status === 'accepted' && attivazioniAttive.length > 0 && (
                <div className="bg-pcgl-blue text-white p-6 rounded-3xl shadow-xl border-4 border-white animate-in slide-in-from-bottom duration-700">
                    <h3 className="font-black text-xl uppercase mb-2 flex items-center"><Clock className="mr-2"/> Operatività</h3>
                    <p className="text-sm opacity-80 mb-4">Squadra: <span className="font-black text-pcgl-yellow text-lg">{myParticipation.squadra || "NON ASSEGNATO"}</span></p>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={handleCheckIn} disabled={!!myParticipation.checkIn} className={`py-4 rounded-xl font-black uppercase text-sm shadow-lg transition-all ${myParticipation.checkIn ? 'bg-green-800 text-white/50 cursor-not-allowed' : 'bg-green-500 hover:bg-green-400'}`}>
                            {myParticipation.checkIn ? `IN: ${new Date(myParticipation.checkIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : "CHECK-IN"}
                        </button>
                        <button onClick={handleCheckOut} disabled={!myParticipation.checkIn || !!myParticipation.checkOut} className={`py-4 rounded-xl font-black uppercase text-sm shadow-lg transition-all ${!myParticipation.checkIn || myParticipation.checkOut ? 'bg-red-900 text-white/50 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500'}`}>
                            {myParticipation.checkOut ? `OUT: ${new Date(myParticipation.checkOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : "CHECK-OUT"}
                        </button>
                    </div>
                    {myParticipation.checkIn && !myParticipation.checkOut && (
                        <div className="mt-4 flex flex-col items-center space-y-2">
                           <div className="text-xs font-bold text-green-400 animate-pulse">TURNO ATTIVO</div>
                           <div className="grid grid-cols-2 gap-2 w-full">
                             <button onClick={() => { setSelectedAlertForTeams(attivazioniAttive[0]); setSubPage('map_view'); }} className="py-3 bg-white/10 rounded-lg text-xs font-bold uppercase hover:bg-white/20 transition-colors flex items-center justify-center"><MapIcon size={16} className="mr-2"/> Mappa</button>
                             <button onClick={() => { setSubPage('chat_sede'); }} className="py-3 bg-white/10 rounded-lg text-xs font-bold uppercase hover:bg-white/20 transition-colors flex items-center justify-center"><MessageCircle size={16} className="mr-2"/> Chat</button>
                             <button onClick={() => setSubPage('monitoraggio')} className="col-span-2 py-3 bg-white/10 rounded-lg text-xs font-bold uppercase hover:bg-white/20 transition-colors flex items-center justify-center"><Activity size={16} className="mr-2"/> Invia Report</button>
                           </div>
                        </div>
                    )}
                </div>
            )}
          </div>
        </div>
      );

      case 'map_view': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40 h-screen flex flex-col">
            <HeaderSub title="Mappa Operativa" onBack={() => { setSelectedAlertForTeams(null); setSubPage(userData.ruolo === 'volontario' ? 'allerta_view' : 'allerta_gest'); }} />
            <div className="flex-1 bg-gray-100 rounded-[2.5rem] overflow-hidden shadow-inner border border-gray-200 relative">
                <LiveMap participations={alertParticipations} />
                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg z-[400]">
                    <p className="text-[10px] font-black uppercase text-gray-500 mb-1">Legenda</p>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center"><div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div><span className="text-xs font-bold">Volontari Attivi</span></div>
                    </div>
                </div>
            </div>
        </div>
      );

      case 'documenti_view': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
          <HeaderSub title="Documenti & Circolari" onBack={() => {
              if (previousPage === 'sedi_list') {
                  setSubPage('sedi_list');
                  setPreviousPage(null);
              } else {
                  setSubPage(null);
              }
          }} />
          
          {/* Filtro Sede (Admin/Coord) */}
          {['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) && (
             <div className="mb-4"><select className="w-full p-3 bg-white rounded-xl border border-gray-200 font-bold text-sm" value={filterSede} onChange={e => setFilterSede(e.target.value)}><option value="">Tutte le Sedi</option>{sediDisponibili.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          )}

          {['presidente', 'coordinamento', 'admin', 'superadmin'].includes(userData.ruolo) && (!filterSede || filterSede === userData.sede || ['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo)) && (
             <button onClick={() => setSubPage('documenti_gest')} className="w-full mb-6 py-4 bg-white text-pcgl-blue border-2 border-pcgl-blue rounded-2xl font-bold uppercase shadow-sm flex items-center justify-center active:scale-95 transition-all hover:bg-blue-50"><FileText className="mr-2" size={20}/> Gestisci Documenti</button>
          )}
          <div className="space-y-4 font-sans text-pcgl-text-dark">
            {documentsFeed.filter(d => {
                if (['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo)) {
                    return !filterSede || d.sede === filterSede || d.sede === 'TUTTE';
                }
                return d.sede === userData.sede || d.sede === 'TUTTE';
            }).length > 0 ? documentsFeed.filter(d => {
                if (['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo)) {
                    return !filterSede || d.sede === filterSede || d.sede === 'TUTTE';
                }
                return d.sede === userData.sede || d.sede === 'TUTTE';
            }).map(doc => (
                <div key={doc.id} className="bg-white p-6 rounded-2xl shadow-card border border-gray-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-pcgl-blue mb-1">{doc.titolo}</h3>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">{doc.tipo || 'Documento'} • {doc.sede === 'TUTTE' ? 'Tutte le Sedi' : doc.sede}</p>
                    <p className="text-[10px] text-gray-400">Caricato da {doc.autore} il {new Date(doc.data).toLocaleDateString()}</p>
                  </div>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-3 bg-blue-50 text-pcgl-blue rounded-xl hover:bg-pcgl-blue hover:text-white transition-colors"><FileText size={24}/></a>
                </div>
              )) : <p className="text-center text-gray-500 font-medium">Nessun documento disponibile.</p>}
          </div>
        </div>
      );

      case 'documenti_gest': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
          <HeaderSub title="Gestione Documenti" onBack={() => setSubPage(null)} />
          <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-6 font-sans text-pcgl-text-dark mb-8">
            <h3 className="font-bold text-xl text-pcgl-blue mb-4">Carica Documento Sede</h3>
            
            <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                <button onClick={() => setDocUploadMode('file')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${docUploadMode === 'file' ? 'bg-white text-pcgl-blue shadow-sm' : 'text-gray-400'}`}>File PDF</button>
                <button onClick={() => setDocUploadMode('link')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${docUploadMode === 'link' ? 'bg-white text-pcgl-blue shadow-sm' : 'text-gray-400'}`}>Link Esterno</button>
            </div>

            <input type="text" placeholder="Titolo Documento" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all" value={newDocTitle} onChange={(e) => setNewDocTitle(e.target.value)} />
            
            <select className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all" value={newDocType} onChange={(e) => setNewDocType(e.target.value)}>
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            {['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) && (
                <select className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all" value={targetSedeDoc} onChange={(e) => setTargetSedeDoc(e.target.value)}>
                    <option value="TUTTE">Tutte le Sedi</option>
                    {sediDisponibili.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            )}

            {docUploadMode === 'file' ? (
                <div className="relative">
                    <input type="file" id="doc-upload" className="hidden" accept="application/pdf" onChange={(e) => setNewDocFile(e.target.files[0])} />
                    <label htmlFor="doc-upload" className="flex items-center justify-center w-full p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors">
                        <span className="text-sm font-bold text-gray-500">{newDocFile ? newDocFile.name : "Seleziona PDF"}</span>
                    </label>
                    <p className="text-[10px] text-gray-400 mt-1 text-center">Dimensione massima file: 10MB</p>
                </div>
            ) : (
                <input type="text" placeholder="URL Documento (es. Google Drive)" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all" value={newDocUrl} onChange={(e) => setNewDocUrl(e.target.value)} />
            )}

            <button onClick={addDocument} disabled={uploading} className="w-full py-4 bg-pcgl-blue text-pcgl-yellow font-bold text-lg rounded-xl shadow-lg active:scale-95 transition-all hover:bg-pcgl-yellow hover:text-pcgl-blue hover:shadow-xl disabled:opacity-50">{uploading ? 'Caricamento...' : 'Carica Documento'}</button>
          </div>
          <h3 className="font-bold text-xl text-pcgl-blue mb-4">Documenti Esistenti</h3>
          
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
                <SearchIcon className="absolute left-4 top-3.5 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Cerca per titolo o sede..." 
                  className="w-full p-3 pl-12 bg-white rounded-xl border border-gray-200 shadow-sm focus:border-pcgl-blue outline-none transition-all"
                  value={docSearchTerm}
                  onChange={(e) => setDocSearchTerm(e.target.value)}
                />
            </div>
            <select 
                className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm focus:border-pcgl-blue outline-none transition-all max-w-[150px] text-sm font-medium"
                value={docSearchType}
                onChange={(e) => setDocSearchType(e.target.value)}
            >
                <option value="">Tutti i Tipi</option>
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="space-y-4 font-sans text-pcgl-text-dark">
            {documentsFeed.filter(d => {
                const matchesRole = ['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) ? true : d.sede === userData.sede;
                const matchesSearch = (d.titolo + (d.sede || '')).toLowerCase().includes(docSearchTerm.toLowerCase());
                const matchesType = docSearchType ? d.tipo === docSearchType : true;
                return matchesRole && matchesSearch && matchesType;
            }).length > 0 ? documentsFeed.filter(d => {
                const matchesRole = ['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) ? true : d.sede === userData.sede;
                const matchesSearch = (d.titolo + (d.sede || '')).toLowerCase().includes(docSearchTerm.toLowerCase());
                const matchesType = docSearchType ? d.tipo === docSearchType : true;
                return matchesRole && matchesSearch && matchesType;
            }).map(doc => (
                <div key={doc.id} className="bg-white p-4 rounded-lg shadow-card border border-gray-100 flex justify-between items-center">
                  <div className="flex-1 cursor-pointer" onClick={() => window.open(doc.url, '_blank')}>
                      <p className="font-bold text-base text-pcgl-blue hover:underline">{doc.titolo}</p>
                      <p className="text-xs text-gray-500">{doc.tipo} • {new Date(doc.data).toLocaleDateString()}</p>
                      {['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) && <p className="text-[10px] text-gray-400 font-bold uppercase">{doc.sede}</p>}
                  </div>
                  <button onClick={() => deleteDocument(doc.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors ml-2"><Trash2 size={20}/></button>
                </div>
              )) : <p className="text-center text-gray-500 font-medium">Nessun documento trovato.</p>}
          </div>
        </div>
      );

      case 'telegram_uploads_view': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
            <HeaderSub title="Ricezioni Telegram" onBack={() => setSubPage('sala_operativa')} />
            <div className="space-y-4">
                {telegramUploads.map(upload => (
                    <div key={upload.id} className="bg-white p-6 rounded-2xl shadow-card border border-gray-100 flex flex-col md:flex-row gap-4 items-start">
                        {upload.type === 'photo' ? (
                            <img src={upload.url} alt="Upload" className="w-full md:w-32 h-32 object-cover rounded-xl cursor-pointer" onClick={() => window.open(upload.url, '_blank')} />
                        ) : (
                            <div className="w-full md:w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center cursor-pointer" onClick={() => window.open(upload.url, '_blank')}>
                                <FileText size={48} className="text-pcgl-blue"/>
                            </div>
                        )}
                        <div className="flex-1 w-full">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-black text-lg text-pcgl-blue uppercase">{upload.userName}</h4>
                                    <p className="text-xs font-bold text-gray-500 uppercase">{upload.userSede} • {new Date(upload.timestamp).toLocaleString()}</p>
                                </div>
                                <button onClick={async () => {
                                    if (window.confirm("Eliminare questo file?")) {
                                        await deleteDoc(doc(db, 'telegram_uploads', upload.id));
                                        showToast("File eliminato.");
                                    }
                                }} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                                    <Trash2 size={20}/>
                                </button>
                            </div>
                            <p className="mt-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 italic">{upload.caption || "Nessuna descrizione fornita."}</p>
                            <a href={upload.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-bold text-pcgl-blue uppercase hover:underline">Apri File Originale</a>
                        </div>
                    </div>
                ))}
                {telegramUploads.length === 0 && <p className="text-center text-gray-500 font-medium py-8">Nessun file ricevuto da Telegram.</p>}
            </div>
        </div>
      );

      case 'hours_report': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
            <HeaderSub title="Report Ore Servizio" onBack={() => setSubPage('stats_view')} />
            
            <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100 mb-6">
                <h3 className="font-bold text-lg text-pcgl-blue mb-4 uppercase">Intervallo Temporale</h3>
                <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Dal</label>
                        <input type="date" className="w-full p-3 bg-gray-50 rounded-xl border font-medium" value={hoursReportRange.start} onChange={e => setHoursReportRange({...hoursReportRange, start: e.target.value})} />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Al</label>
                        <input type="date" className="w-full p-3 bg-gray-50 rounded-xl border font-medium" value={hoursReportRange.end} onChange={e => setHoursReportRange({...hoursReportRange, end: e.target.value})} />
                    </div>
                </div>
                <button onClick={calculateServiceHours} disabled={calculatingHours} className="w-full py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-md flex items-center justify-center disabled:opacity-50">
                    {calculatingHours ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div> : <Clock className="mr-2" size={20}/>}
                    {calculatingHours ? 'Calcolo in corso...' : 'Calcola Ore'}
                </button>
            </div>

            {hoursReportData && (
                <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100 animate-in fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-pcgl-blue uppercase">Risultati ({hoursReportData.length})</h3>
                        <button onClick={() => {
                            const headers = ["Volontario", "Sede", "Turni", "Ore Totali"];
                            const rows = hoursReportData.map(r => [r.nome, r.sede, r.turni, r.totaleOre.toFixed(2)]);
                            const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
                            const link = document.createElement("a");
                            link.setAttribute("href", encodeURI(csvContent));
                            link.setAttribute("download", `report_ore_${hoursReportRange.start}_${hoursReportRange.end}.csv`);
                            document.body.appendChild(link);
                            link.click();
                        }} className="text-xs font-bold text-green-600 uppercase bg-green-50 px-3 py-1 rounded-lg hover:bg-green-100">Esporta CSV</button>
                    </div>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                        {hoursReportData.map((r, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div><p className="font-bold text-sm uppercase text-pcgl-blue">{r.nome}</p><p className="text-xs text-gray-500">{r.sede} • {r.turni} Turni</p></div>
                                <div className="text-right"><span className="font-mono font-black text-lg text-pcgl-blue">{r.totaleOre.toFixed(1)}</span><span className="text-[10px] font-bold text-gray-400 uppercase block">Ore</span></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      );

      case 'stats_view': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
          <HeaderSub title="Statistiche Allerte" onBack={() => setSubPage(null)} />
          <div className="space-y-6 font-sans text-pcgl-text-dark">
            {!statsData ? (
              <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pcgl-blue"></div></div>
            ) : (
            <>
            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 text-center">
              <h3 className="font-bold text-xl text-pcgl-blue mb-2">Riepilogo {new Date().getFullYear()}</h3>
              <p className="text-sm text-gray-500">Totale attivazioni registrate quest'anno</p>
              <div className="mt-6 text-6xl font-black text-pcgl-blue">{statsData?.total || 0}</div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-200 flex justify-between items-center">
                <div><p className="font-black text-yellow-600 uppercase text-sm tracking-widest">Gialla</p><p className="text-3xl font-black text-yellow-700">{statsData?.gialla || 0}</p></div>
                <div className="p-3 bg-yellow-100 rounded-full text-yellow-600"><TriangleAlert size={32}/></div>
              </div>
              <div className="bg-orange-50 p-6 rounded-2xl border border-orange-200 flex justify-between items-center">
                <div><p className="font-black text-orange-600 uppercase text-sm tracking-widest">Arancione</p><p className="text-3xl font-black text-orange-700">{statsData?.arancione || 0}</p></div>
                <div className="p-3 bg-orange-100 rounded-full text-orange-600"><TriangleAlert size={32}/></div>
              </div>
              <div className="bg-red-50 p-6 rounded-2xl border border-red-200 flex justify-between items-center">
                <div><p className="font-black text-red-600 uppercase text-sm tracking-widest">Rossa</p><p className="text-3xl font-black text-red-700">{statsData?.rossa || 0}</p></div>
                <div className="p-3 bg-red-100 rounded-full text-red-600"><TriangleAlert size={32}/></div>
              </div>
            </div>

            {['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) && (
                <div className="bg-white p-6 rounded-2xl shadow-card border border-gray-100 mt-4">
                    <h4 className="font-bold text-lg text-pcgl-blue mb-4">Reportistica Avanzata</h4>
                    <button onClick={() => setSubPage('hours_report')} className="w-full py-4 bg-blue-50 text-pcgl-blue font-bold text-center rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center uppercase text-sm"><Clock className="mr-2" size={20}/> Calcolo Ore Servizio Volontari</button>
                </div>
            )}

            <div className="bg-white p-6 rounded-2xl shadow-card border border-gray-100 mt-8">
              <h4 className="font-bold text-lg text-pcgl-blue mb-4">Gestione Esterna</h4>
              <p className="text-sm text-gray-500 mb-4">Accesso alla piattaforma di monitoraggio meteo regionale.</p>
              <a href="https://www.monitoraggiopcgl.it/meteo/allertamento.html" target="_blank" rel="noopener noreferrer" className="block w-full py-4 bg-gray-100 text-pcgl-blue font-bold text-center rounded-xl hover:bg-gray-200 transition-colors">
                Vai al Monitoraggio Meteo →
              </a>
            </div>
            </>
            )}
          </div>
        </div>
        );

      case 'disponibilita_view': 
        const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay(); // 0 = Dom, 1 = Lun
        const padding = firstDay === 0 ? 6 : firstDay - 1; // Adatta per Lunedì primo giorno
        const monthName = currentMonth.toLocaleString('it-IT', { month: 'long', year: 'numeric' });

        return (
          <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
            <HeaderSub title="Disponibilità" onBack={() => setSubPage(null)} />
            
            <button onClick={() => setSubPage('turni_view')} className="w-full mb-6 py-4 bg-white text-pcgl-blue border-2 border-pcgl-blue rounded-2xl font-bold uppercase shadow-sm flex items-center justify-center active:scale-95 transition-all hover:bg-blue-50">
                <ClipboardList className="mr-2" size={20}/> Gestione Turni Programmati
            </button>

            <div className="bg-white p-6 rounded-[2.5rem] shadow-card border border-gray-100">
              {/* Navigazione Mese */}
              <div className="flex justify-between items-center mb-6 px-4">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><ChevronLeft/></button>
                <h3 className="text-xl font-black uppercase text-pcgl-blue">{monthName}</h3>
                {userData.ruolo !== 'volontario' && (
                  <select className="ml-2 p-2 bg-gray-50 rounded-lg text-xs font-bold uppercase border border-gray-200" value={filterSpec} onChange={e => setFilterSpec(e.target.value)}>
                    <option value="">Tutti</option>
                    {appConfig.specs.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><ChevronLeft className="rotate-180"/></button>
              </div>

              {/* Griglia Calendario */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(d => <div key={d} className="text-xs font-bold text-gray-400 uppercase">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: padding }).map((_, i) => <div key={`pad-${i}`} className="aspect-square"></div>)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  
                  let dayAvails = availabilities.filter(a => a.data === dayStr);
                  if (filterSpec) {
                    dayAvails = dayAvails.filter(a => a.specializzazioni && a.specializzazioni.includes(filterSpec));
                  }

                  const isAvailable = dayAvails.some(a => a.uid === user.uid);
                  const isPast = new Date(dayStr) < new Date(new Date().setHours(0,0,0,0));
                  const isCourseDay = corsiFormazione.some(c => c.data.startsWith(dayStr));

                  return (
                    <div key={day} 
                         onClick={() => {
                           if (userData.ruolo === 'volontario') { if(!isPast) openAvailabilityModal(day); }
                           else if (dayAvails.length > 0) setSelectedDayDetails({ date: dayStr, list: dayAvails });
                         }}
                         className={`aspect-square rounded-xl flex flex-col items-center justify-center relative border transition-all cursor-pointer
                           ${userData.ruolo === 'volontario' 
                             ? (isAvailable ? 'bg-green-500 text-white border-green-600 shadow-md' : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100')
                             : (dayAvails.length > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100')
                           } ${isPast ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}>
                      <span className="text-sm font-bold">{day}</span>
                      {isCourseDay && <div className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full" title="Corso di Formazione"></div>}
                      {userData.ruolo !== 'volontario' && dayAvails.length > 0 && (
                        <span className="absolute bottom-1 right-1 bg-pcgl-blue text-white text-[9px] w-5 h-5 flex items-center justify-center rounded-full font-bold">{dayAvails.length}</span>
                      )}
                      {userData.ruolo === 'volontario' && isAvailable && <Check size={16} strokeWidth={4} className="mt-1"/>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modale Dettagli (Pres/Admin) */}
            {selectedDayDetails && (
              <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedDayDetails(null)}>
                <div className="bg-white p-6 rounded-3xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                  <h3 className="font-black text-xl text-pcgl-blue mb-4 uppercase border-b pb-2">Disponibilità {new Date(selectedDayDetails.date).toLocaleDateString()}</h3>
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {selectedDayDetails.list.map(v => (
                      <div key={v.uid} className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <p className="font-bold text-sm uppercase">{v.nome} {v.cognome}</p>
                        <p className="text-xs text-gray-500 mb-2">{v.sede} • {v.oraInizio || '08:00'} - {v.oraFine || '20:00'}</p>
                        <div className="flex flex-wrap gap-1">
                          {v.specializzazioni?.map(s => <span key={s} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold uppercase">{s}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setSelectedDayDetails(null)} className="w-full mt-4 py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase">Chiudi</button>
                </div>
              </div>
            )}

            {/* Modale Inserimento Disponibilità (Volontario) */}
            {showAvailabilityModal && (
              <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowAvailabilityModal(false)}>
                <div className="bg-white p-6 rounded-3xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                  <h3 className="font-black text-xl text-pcgl-blue mb-4 uppercase border-b pb-2">Gestione Turno</h3>
                  <p className="text-sm font-bold text-gray-500 mb-4 uppercase">Data: {new Date(availabilityForm.date).toLocaleDateString()}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Dalle</label>
                      <input type="time" className="w-full p-3 bg-gray-50 rounded-xl font-bold border border-gray-200" value={availabilityForm.start} onChange={e => setAvailabilityForm({...availabilityForm, start: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Alle</label>
                      <input type="time" className="w-full p-3 bg-gray-50 rounded-xl font-bold border border-gray-200" value={availabilityForm.end} onChange={e => setAvailabilityForm({...availabilityForm, end: e.target.value})} />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {availabilityForm.isEdit && <button onClick={deleteAvailability} className="flex-1 py-3 bg-red-100 text-red-600 rounded-xl font-bold uppercase">Rimuovi</button>}
                    <button onClick={saveAvailability} className="flex-1 py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase">Salva</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'turni_view': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
            <HeaderSub title="Turni Programmati" onBack={() => setSubPage('disponibilita_view')} />
            
            {/* CREAZIONE TURNO (SOLO STAFF) */}
            {['presidente', 'coordinamento', 'admin', 'superadmin'].includes(userData.ruolo) && (
                <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100 mb-8">
                    <h3 className="font-bold text-lg text-pcgl-blue mb-4">Crea Nuovo Turno</h3>
                    <div className="space-y-3">
                        <input type="text" placeholder="Titolo Evento (es. Servizio Viabilità)" className="w-full p-3 bg-gray-50 rounded-xl border" value={newShift.titolo} onChange={e => setNewShift({...newShift, titolo: e.target.value})} />
                        <input type="date" className="w-full p-3 bg-gray-50 rounded-xl border" value={newShift.data} onChange={e => setNewShift({...newShift, data: e.target.value})} />
                        
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <p className="text-xs font-bold text-blue-800 uppercase mb-2">Aggiungi Slot</p>
                            <div className="flex gap-2 mb-2">
                                <input type="text" placeholder="Nome (es. Mattina)" className="flex-1 p-2 rounded-lg text-sm" value={tempSlot.nome} onChange={e => setTempSlot({...tempSlot, nome: e.target.value})} />
                                <input type="number" placeholder="Max" className="w-16 p-2 rounded-lg text-sm" value={tempSlot.max} onChange={e => setTempSlot({...tempSlot, max: parseInt(e.target.value)})} />
                            </div>
                            <div className="flex gap-2 mb-2">
                                <input type="time" className="flex-1 p-2 rounded-lg text-sm" value={tempSlot.oraInizio} onChange={e => setTempSlot({...tempSlot, oraInizio: e.target.value})} />
                                <input type="time" className="flex-1 p-2 rounded-lg text-sm" value={tempSlot.oraFine} onChange={e => setTempSlot({...tempSlot, oraFine: e.target.value})} />
                            </div>
                            <button onClick={() => { setNewShift({...newShift, slots: [...newShift.slots, tempSlot]}); }} className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase">Aggiungi Slot</button>
                        </div>

                        {newShift.slots.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {newShift.slots.map((s, i) => (
                                    <span key={i} className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">{s.nome} ({s.max})</span>
                                ))}
                            </div>
                        )}
                        <button onClick={addShiftEvent} className="w-full py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-md">Pubblica Turno</button>
                    </div>
                </div>
            )}

            {/* LISTA TURNI */}
            <div className="space-y-4">
                {shiftEvents.map(event => (
                    <div key={event.id} className="bg-white p-6 rounded-2xl shadow-card border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-black text-xl text-pcgl-blue uppercase">{event.titolo}</h3>
                                <p className="text-sm font-bold text-gray-500">{new Date(event.data).toLocaleDateString()} • {event.sede}</p>
                            </div>
                            {['presidente', 'admin'].includes(userData.ruolo) && <button onClick={() => deleteShift(event.id)} className="text-red-500"><Trash2 size={20}/></button>}
                        </div>
                        
                        <div className="space-y-3">
                            {event.slots.map((slot, idx) => {
                                const isFull = (slot.iscritti?.length || 0) >= slot.max;
                                const isBooked = slot.iscritti?.includes(user.uid);
                                const available = slot.max - (slot.iscritti?.length || 0);

                                return (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                                        <div>
                                            <p className="font-bold text-sm text-pcgl-blue uppercase">{slot.nome}</p>
                                            <p className="text-xs text-gray-500">{slot.oraInizio} - {slot.oraFine}</p>
                                            <p className={`text-[10px] font-bold uppercase ${available === 0 ? 'text-red-500' : 'text-green-600'}`}>{available} Posti liberi</p>
                                        </div>
                                        {isBooked ? (
                                            <div className="flex flex-col gap-1 items-end">
                                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-bold uppercase">Prenotato</span>
                                                <a href={generateGoogleCalendarLink(event, slot)} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-600 font-bold uppercase hover:underline">
                                                    📅 Aggiungi a Calendar
                                                </a>
                                            </div>
                                        ) : 
                                         <button onClick={() => bookShiftSlot(event.id, idx)} disabled={isFull} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase shadow-sm ${isFull ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-pcgl-blue text-white'}`}>{isFull ? 'Completo' : 'Prenota'}</button>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
                {shiftEvents.length === 0 && <p className="text-center text-gray-500 font-medium py-8">Nessun turno programmato disponibile.</p>}
            </div>
        </div>
      );

      case 'verifica_volontario': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
          <HeaderSub title="Verifica Socio" onBack={() => { setSubPage(null); setVerifyResult(null); setVerifySearch(''); }} />
          <div className="space-y-8 font-sans text-pcgl-text-dark">
            
            {/* Barra di Ricerca */}
            <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
              <h3 className="font-bold text-lg text-pcgl-blue mb-4 uppercase">Ricerca Manuale</h3>
              <div className="flex gap-2">
                <input type="text" placeholder="N. Tessera o Codice Fiscale" className="flex-1 p-4 bg-gray-50 rounded-xl font-bold text-sm border border-gray-200 uppercase focus:border-pcgl-yellow transition-all" value={verifySearch} onChange={e => setVerifySearch(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleVerificationSearch()} />
                <button onClick={handleVerificationSearch} className="p-4 bg-pcgl-blue text-white rounded-xl shadow-md active:scale-95 transition-all shrink-0"><Search size={24}/></button>
                <button onClick={() => handleOpenScanner('verify')} className="p-4 bg-pcgl-yellow text-pcgl-blue rounded-xl shadow-md active:scale-95 transition-all shrink-0"><QrCode size={24}/></button>
              </div>
              <div className="mt-4 text-center">
                  <a href="https://pcgl.it/verifica.html" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-gray-400 uppercase hover:text-pcgl-blue underline flex items-center justify-center">
                      <ScanLine size={14} className="mr-1"/> Problemi? Usa Verifica Web
                  </a>
              </div>
            </div>

            {/* Risultato Verifica */}
            {verifyResult && (
              <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-t-8 border-pcgl-blue animate-in zoom-in duration-300">
                <div className="p-8 text-center bg-gray-50/50 border-b border-gray-100 relative">
                   <div className="w-32 h-32 mx-auto rounded-full bg-white border-4 border-pcgl-yellow shadow-lg overflow-hidden mb-4">
                      {verifyResult.fotoProfilo ? <img src={verifyResult.fotoProfilo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><User size={48}/></div>}
                   </div>
                   <h2 className="text-3xl font-black uppercase leading-tight text-pcgl-blue mb-2">{verifyResult.nome} {verifyResult.cognome}</h2>
                   <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{verifyResult.sede}</p>
                   <div className={`mt-4 inline-block px-6 py-2 rounded-full font-black text-white text-xs uppercase tracking-wide shadow-md ${verifyResult.stato === 'attivo' ? 'bg-green-600' : 'bg-red-500'}`}>
                     {verifyResult.stato === 'attivo' ? 'SOCIO ATTIVO' : 'NON OPERATIVO'}
                   </div>
                </div>
                <div className="p-8 space-y-4">
                   <div className="flex justify-between border-b border-gray-100 pb-2">
                     <span className="text-xs font-bold text-gray-400 uppercase">Ruolo</span>
                     <span className="text-sm font-black text-pcgl-blue uppercase">{verifyResult.ruolo}</span>
                   </div>
                   <div className="flex justify-between border-b border-gray-100 pb-2">
                     <span className="text-xs font-bold text-gray-400 uppercase">Codice Fiscale</span>
                     <span className="text-sm font-black text-pcgl-blue uppercase">{verifyResult.cf}</span>
                   </div>
                   <div className="flex justify-between border-b border-gray-100 pb-2">
                     <span className="text-xs font-bold text-gray-400 uppercase">Tessera</span>
                     <span className="text-sm font-black text-pcgl-blue uppercase font-mono">{verifyResult.numeroTessera}</span>
                   </div>
                   <div>
                     <span className="text-xs font-bold text-gray-400 uppercase block mb-2">Specializzazioni</span>
                     <div className="flex flex-wrap gap-2">
                       {verifyResult.specializzazioni?.length > 0 ? verifyResult.specializzazioni.map(s => <span key={s} className="px-3 py-1 bg-blue-50 text-pcgl-blue rounded-lg text-[10px] font-bold uppercase border border-blue-100">{s}</span>) : <span className="text-xs text-gray-400 italic">Nessuna specializzazione</span>}
                     </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );

      case 'logs_view': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
          <HeaderSub title="Log di Sistema" onBack={() => setSubPage(null)} />
          <div className="space-y-3 font-sans text-pcgl-text-dark">
            {systemLogs.length > 0 ? systemLogs.map(log => (
                <div key={log.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="font-black text-pcgl-blue">{log.azione}</span>
                    <span className="text-gray-400">{new Date(log.data).toLocaleString()}</span>
                  </div>
                  <p className="text-gray-600 mb-1">{log.dettagli}</p>
                  <p className="text-gray-400 italic text-[10px]">Autore: {log.autore}</p>
                </div>
              )) : <p className="text-center text-gray-500 font-medium">Nessun log presente.</p>}
          </div>
        </div>
      );

      case 'gestione_operativa': 
        const available = alertParticipations.filter(p => p.status === 'accepted' && !p.squadra);
        const teams = alertParticipations.filter(p => p.status === 'accepted' && p.squadra).reduce((acc, curr) => {
            (acc[curr.squadra] = acc[curr.squadra] || []).push(curr);
            return acc;
        }, {});

        const assignModuleMembers = (moduleName) => {
            const module = modulesList.find(m => m.nome === moduleName);
            if (!module) return;
            const membersToAssign = available.filter(p => module.membri?.includes(p.uid));
            membersToAssign.forEach(p => assignTeam(p.uid, moduleName));
        };

        return (
          <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
            <HeaderSub title="Squadre Operative" onBack={() => { setSelectedAlertForTeams(null); setSubPage('allerta_gest'); }} />
            
            <div className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-gray-50 mb-8">
                <h3 className="font-black text-xl text-pcgl-blue mb-2">{selectedAlertForTeams?.titolo}</h3>
                <p className="text-xs text-gray-400 font-bold uppercase mb-6">Gestione Disponibilità & Squadre</p>
                
                <div className="flex gap-2 mb-6">
                    <select className="p-4 bg-gray-50 rounded-2xl font-bold text-sm border border-gray-200 max-w-[150px]" onChange={(e) => { setNewTeamName(e.target.value); assignModuleMembers(e.target.value); }} value="">
                        <option value="" disabled>Usa Modulo...</option>
                        {modulesList.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
                    </select>
                    <input type="text" placeholder="Nome Nuova Squadra" className="flex-1 p-4 bg-gray-50 rounded-2xl font-bold text-sm border border-gray-200" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
                    <button onClick={() => handleOpenScanner('checkin')} className="p-4 bg-pcgl-blue text-white rounded-2xl shadow-md active:scale-95 transition-all"><QrCode size={24}/></button>
                </div>

                <div className="space-y-6">
                    <div>
                        <h4 className="font-black text-xs uppercase text-green-600 mb-3 flex items-center"><CheckCircle size={16} className="mr-2"/> Disponibili ({available.length})</h4>
                        <div className="space-y-2">
                            {available.map(p => (
                                <div key={p.uid} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                                    <div>
                                        <p className="font-bold text-xs uppercase">{p.nome}</p>
                                        <p className="text-[9px] text-gray-500">{p.sede} {p.lastLocation && `• 📍 ${p.lastLocation.lat.toFixed(3)}, ${p.lastLocation.lng.toFixed(3)}`}</p>
                                    </div>
                                    {newTeamName && (
                                        <button onClick={() => assignTeam(p.uid, newTeamName)} className="bg-pcgl-blue text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase shadow-md active:scale-95 transition-all">Assegna a {newTeamName}</button>
                                    )}
                                </div>
                            ))}
                            {available.length === 0 && <p className="text-[10px] text-gray-400 italic">Nessun volontario disponibile non assegnato.</p>}
                        </div>
                    </div>

                    {Object.entries(teams).map(([teamName, members]) => (
                        <div key={teamName} className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                            <h4 className="font-black text-sm uppercase text-pcgl-blue mb-3 flex justify-between items-center">
                                <span>{teamName} ({members.length})</span>
                            </h4>
                            <div className="space-y-2">
                                {members.map(p => (
                                    <div key={p.uid} className="flex justify-between items-center bg-white p-2 rounded-lg shadow-sm">
                                        <div>
                                            <p className="font-bold text-[10px] uppercase">{p.nome}</p>
                                            {p.lastLocation && <p className="text-[8px] text-gray-400">📍 {p.lastLocation.lat.toFixed(3)}, {p.lastLocation.lng.toFixed(3)}</p>}
                                        </div>
                                        <button onClick={() => assignTeam(p.uid, null)} className="text-red-400 hover:bg-red-50 p-1 rounded transition-colors"><X size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        );

      case 'report_view': {
        const viewedPending = reportData?.participations.filter(p => p.status === 'pending' && p.viewedAt) || [];
        const responded = reportData?.participations.filter(p => p.status !== 'pending') || [];
        const isStaff = ['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo);

        const groupBySede = (list) => list.reduce((acc, curr) => {
            (acc[curr.sede] = acc[curr.sede] || []).push(curr);
            return acc;
        }, {});

        const renderTable = (list, showPhone = false) => (
            <table className="w-full text-left text-xs mb-6">
                <thead className="bg-gray-100 uppercase text-gray-500">
                    <tr>
                        <th className="p-2 rounded-l-lg">Volontario</th>
                        <th className="p-2">Sede</th>
                        {showPhone && <th className="p-2">Telefono</th>}
                        <th className="p-2">Squadra</th>
                        <th className="p-2">In</th>
                        <th className="p-2 rounded-r-lg">Out</th>
                    </tr>
                </thead>
                <tbody>
                    {list.map((p, i) => {
                        const userDetail = allUsers.find(u => u.id === p.uid);
                        const phone = userDetail?.telefono || 'N/D';
                        return (
                            <tr key={i} className="border-b border-gray-50">
                                <td className="p-2 font-bold">{p.nome}</td>
                                <td className="p-2">{p.sede}</td>
                                {showPhone && <td className="p-2 font-mono">{phone}</td>}
                                <td className="p-2 font-bold text-pcgl-blue">{p.squadra || "-"}</td>
                                <td className="p-2 text-green-600 font-mono">{p.checkIn ? new Date(p.checkIn).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : "-"}</td>
                                <td className="p-2 text-red-600 font-mono">{p.checkOut ? new Date(p.checkOut).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : "-"}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );

        return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40 print:pb-0">
            <HeaderSub title="Report Evento" onBack={() => setSubPage('allerta_gest')} />
            {reportData && (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-card border border-gray-100 print:shadow-none print:border-none print:p-0">
                    <div className="border-b-2 border-pcgl-blue pb-4 mb-6">
                        <h1 className="text-3xl font-black uppercase text-pcgl-blue">{reportData.alert.titolo}</h1>
                        <p className="text-sm font-bold text-gray-500">Data Attivazione: {new Date(reportData.alert.dataAttivazione).toLocaleString()}</p>
                        <div className="mt-1"><span className="text-xs font-bold text-gray-500 uppercase">Tempo Trascorso:</span> <AlertTimer startDate={reportData.alert.dataAttivazione} /></div>
                        <p className="text-sm font-bold text-gray-500">Zone: {Array.isArray(reportData.alert.zone) ? reportData.alert.zone.join(", ") : reportData.alert.zona}</p>
                    </div>
                    
                    <div className="space-y-6">
                        <h3 className="font-black text-lg uppercase text-green-700">Disponibilità ({responded.length})</h3>
                        {isStaff ? (
                            Object.entries(groupBySede(responded)).map(([sede, list]) => (
                                <div key={sede} className="mb-4">
                                    <h4 className="font-bold text-sm text-pcgl-blue uppercase mb-2 border-b border-gray-100 pb-1">{sede}</h4>
                                    {renderTable(list, true)}
                                </div>
                            ))
                        ) : renderTable(responded, false)}

                        {viewedPending.length > 0 && (
                            <React.Fragment>
                                <h3 className="font-black text-lg uppercase text-orange-500 mt-8">Visualizzato (In Attesa) ({viewedPending.length})</h3>
                                {isStaff ? (
                                    Object.entries(groupBySede(viewedPending)).map(([sede, list]) => (
                                        <div key={sede} className="mb-4">
                                            <h4 className="font-bold text-sm text-gray-500 uppercase mb-2 border-b border-gray-100 pb-1">{sede}</h4>
                                            {renderTable(list, false)}
                                        </div>
                                    ))
                                ) : renderTable(viewedPending, false)}
                            </React.Fragment>
                        )}
                    </div>
                    <button onClick={() => window.print()} className="mt-8 w-full py-4 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-lg print:hidden">Stampa Report PDF</button>
                </div>
            )}
        </div>
        );
      }

      case 'sede_anagrafica': {
        const canEditSede = ['presidente', 'coordinamento', 'admin', 'superadmin'].includes(userData.ruolo);
        return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40 print:pb-0">
          <div className="print:hidden">
            <HeaderSub title={`Anagrafica ${userData.sede}`} onBack={() => setSubPage('sede_hub')} />
            
            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-6 font-sans text-pcgl-text-dark">
                <h3 className="font-bold text-xl text-pcgl-blue mb-2 uppercase border-b pb-2">Dati Principali</h3>
                
                <div className="flex justify-center mb-6">
                    <div className="w-32 h-32 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group">
                        {sedeAnagrafica.logo ? <img src={sedeAnagrafica.logo} className="w-full h-full object-cover" /> : <div className="text-center text-gray-400"><Camera size={32} className="mx-auto"/><span className="text-[10px] font-bold uppercase">Logo</span></div>}
                        {canEditSede && (
                            <>
                                <label htmlFor="sede-logo-upload" className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    {uploading ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div> : <Pencil size={24} />}
                                </label>
                                <input type="file" id="sede-logo-upload" className="hidden" accept="image/*" onChange={handleSedeLogoUpload} disabled={uploading} />
                            </>
                        )}
                    </div>
                </div>
                
                <div className="space-y-4">
                    <input type="text" placeholder="Nome Associazione" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all disabled:bg-gray-100 disabled:text-gray-500" value={sedeAnagrafica.nomeAssociazione} onChange={e => setSedeAnagrafica({...sedeAnagrafica, nomeAssociazione: e.target.value})} disabled={!canEditSede} />
                    <input type="text" placeholder="Codice Fiscale" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all uppercase disabled:bg-gray-100 disabled:text-gray-500" value={sedeAnagrafica.codiceFiscale} onChange={e => setSedeAnagrafica({...sedeAnagrafica, codiceFiscale: e.target.value.toUpperCase()})} maxLength={16} disabled={!canEditSede} />
                    <div className="relative"><label className="text-[10px] font-bold uppercase text-gray-400 absolute top-1 left-4">Data Costituzione</label><input type="date" className="w-full p-4 pt-6 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all disabled:bg-gray-100 disabled:text-gray-500" value={sedeAnagrafica.dataCostituzione} onChange={e => setSedeAnagrafica({...sedeAnagrafica, dataCostituzione: e.target.value})} disabled={!canEditSede} /></div>
                    <input type="text" placeholder="IBAN" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all uppercase disabled:bg-gray-100 disabled:text-gray-500" value={sedeAnagrafica.iban} onChange={e => setSedeAnagrafica({...sedeAnagrafica, iban: e.target.value.toUpperCase()})} disabled={!canEditSede} />
                    <input type="text" placeholder="Indirizzo Sede Legale" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all disabled:bg-gray-100 disabled:text-gray-500" value={sedeAnagrafica.indirizzoLegale} onChange={e => setSedeAnagrafica({...sedeAnagrafica, indirizzoLegale: e.target.value})} disabled={!canEditSede} />
                    
                    <div className="flex items-center space-x-2">
                        <button onClick={() => setShowLocationPicker(true)} disabled={!canEditSede} className={`flex-1 py-3 rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center ${sedeAnagrafica.posizione ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-white border border-gray-200 text-pcgl-blue'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                            <MapIcon size={20} className="mr-2"/> {sedeAnagrafica.posizione ? 'Posizione Impostata' : 'Imposta Posizione su Mappa'}
                        </button>
                        {sedeAnagrafica.posizione && canEditSede && <button onClick={() => setSedeAnagrafica({...sedeAnagrafica, posizione: null})} className="p-3 bg-red-100 text-red-600 rounded-xl"><Trash2 size={20}/></button>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="tel" placeholder="Telefono" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all disabled:bg-gray-100 disabled:text-gray-500" value={sedeAnagrafica.telefono} onChange={e => setSedeAnagrafica({...sedeAnagrafica, telefono: e.target.value})} disabled={!canEditSede} />
                        <input type="email" placeholder="Email" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all disabled:bg-gray-100 disabled:text-gray-500" value={sedeAnagrafica.email} onChange={e => setSedeAnagrafica({...sedeAnagrafica, email: e.target.value})} disabled={!canEditSede} />
                    </div>
                    <input type="email" placeholder="PEC" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all disabled:bg-gray-100 disabled:text-gray-500" value={sedeAnagrafica.pec} onChange={e => setSedeAnagrafica({...sedeAnagrafica, pec: e.target.value})} disabled={!canEditSede} />
                </div>

                <h3 className="font-bold text-xl text-pcgl-blue mb-2 uppercase border-b pb-2 pt-4">Dati Logistici (Facoltativi)</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" placeholder="Proprietà Sede (es. Comunale)" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all disabled:bg-gray-100 disabled:text-gray-500" value={sedeAnagrafica.proprieta} onChange={e => setSedeAnagrafica({...sedeAnagrafica, proprieta: e.target.value})} disabled={!canEditSede} />
                        <input type="number" placeholder="Numero Stanze" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all disabled:bg-gray-100 disabled:text-gray-500" value={sedeAnagrafica.numeroStanze} onChange={e => setSedeAnagrafica({...sedeAnagrafica, numeroStanze: e.target.value})} disabled={!canEditSede} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" placeholder="Servizi Igienici (es. 2 bagni, 1 doccia)" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all disabled:bg-gray-100 disabled:text-gray-500" value={sedeAnagrafica.serviziIgienici} onChange={e => setSedeAnagrafica({...sedeAnagrafica, serviziIgienici: e.target.value})} disabled={!canEditSede} />
                        <input type="text" placeholder="Foresteria (es. 4 posti letto)" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all disabled:bg-gray-100 disabled:text-gray-500" value={sedeAnagrafica.foresteria} onChange={e => setSedeAnagrafica({...sedeAnagrafica, foresteria: e.target.value})} disabled={!canEditSede} />
                    </div>
                    <textarea placeholder="Dotazione Informatica (es. 2 PC, 1 Stampante, WiFi)" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all resize-none disabled:bg-gray-100 disabled:text-gray-500" rows="3" value={sedeAnagrafica.dotazioneInformatica} onChange={e => setSedeAnagrafica({...sedeAnagrafica, dotazioneInformatica: e.target.value})} disabled={!canEditSede}></textarea>
                    <textarea placeholder="Altre Note..." className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all resize-none disabled:bg-gray-100 disabled:text-gray-500" rows="3" value={sedeAnagrafica.altro} onChange={e => setSedeAnagrafica({...sedeAnagrafica, altro: e.target.value})} disabled={!canEditSede}></textarea>
                </div>

                <div className="flex gap-2">
                    {canEditSede && (
                        <button onClick={saveSedeAnagrafica} disabled={loadingSedeAnagrafica} className="flex-1 py-4 bg-pcgl-blue text-pcgl-yellow font-bold text-lg rounded-xl shadow-lg active:scale-95 transition-all hover:bg-pcgl-yellow hover:text-pcgl-blue hover:shadow-xl disabled:opacity-50">
                            {loadingSedeAnagrafica ? 'Salvataggio...' : 'Salva Dati Sede'}
                        </button>
                    )}
                    <button onClick={() => window.print()} className="p-4 bg-white border-2 border-pcgl-blue text-pcgl-blue rounded-xl shadow-md active:scale-95 transition-all hover:bg-blue-50" title="Stampa Scheda PDF">
                        <Printer size={24} />
                    </button>
                </div>
            </div>

            {/* LOCATION PICKER MODAL */}
            {showLocationPicker && (
                <LocationPicker initialPos={sedeAnagrafica.posizione} onConfirm={(pos) => { setSedeAnagrafica({...sedeAnagrafica, posizione: pos}); setShowLocationPicker(false); showToast("Posizione sede impostata"); }} onClose={() => setShowLocationPicker(false)} />
            )}
          </div>

            {/* LAYOUT DI STAMPA SCHEDA SEDE (NASCOSTO A VIDEO) */}
            <div className="hidden print:block w-full bg-white p-8 text-black font-sans">
                <div className="flex items-center justify-between border-b-4 border-[#001a33] pb-6 mb-8">
                    <div>
                        <h1 className="text-4xl font-black uppercase text-[#001a33] leading-none">Scheda Sede</h1>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-[0.2em] mt-2">Protezione Civile Gruppo Lucano</p>
                    </div>
                    {sedeAnagrafica.logo ? <img src={sedeAnagrafica.logo} className="w-24 h-24 object-contain" alt="Logo Sede" /> : <img src={APP_LOGO} className="w-24 h-24 object-contain" alt="Logo PCGL" />}
                </div>
                
                <div className="mb-8">
                    <h2 className="text-2xl font-black text-pcgl-blue uppercase mb-4">{sedeAnagrafica.nomeAssociazione || userData.sede}</h2>
                    <div className="grid grid-cols-2 gap-8 text-sm">
                        <p><span className="font-bold text-gray-500 block">Codice Fiscale:</span> {sedeAnagrafica.codiceFiscale || '-'}</p>
                        <p><span className="font-bold text-gray-500 block">Data Costituzione:</span> {sedeAnagrafica.dataCostituzione ? new Date(sedeAnagrafica.dataCostituzione).toLocaleDateString() : '-'}</p>
                        <p><span className="font-bold text-gray-500 block">IBAN:</span> {sedeAnagrafica.iban || '-'}</p>
                        <p><span className="font-bold text-gray-500 block">Sede Legale:</span> {sedeAnagrafica.indirizzoLegale || '-'}</p>
                        <p><span className="font-bold text-gray-500 block">Telefono:</span> {sedeAnagrafica.telefono || '-'}</p>
                        <p><span className="font-bold text-gray-500 block">Email:</span> {sedeAnagrafica.email || '-'}</p>
                        <p><span className="font-bold text-gray-500 block">PEC:</span> {sedeAnagrafica.pec || '-'}</p>
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="font-bold text-lg uppercase border-b-2 border-gray-200 mb-4 pb-1 text-[#001a33]">Dati Logistici</h3>
                    <div className="grid grid-cols-2 gap-8 text-sm">
                        <p><span className="font-bold text-gray-500 block">Proprietà:</span> {sedeAnagrafica.proprieta || '-'}</p>
                        <p><span className="font-bold text-gray-500 block">Numero Stanze:</span> {sedeAnagrafica.numeroStanze || '-'}</p>
                        <p><span className="font-bold text-gray-500 block">Servizi Igienici:</span> {sedeAnagrafica.serviziIgienici || '-'}</p>
                        <p><span className="font-bold text-gray-500 block">Foresteria:</span> {sedeAnagrafica.foresteria || '-'}</p>
                        <p className="col-span-2"><span className="font-bold text-gray-500 block">Dotazione Informatica:</span> {sedeAnagrafica.dotazioneInformatica || '-'}</p>
                    </div>
                </div>
                
                {sedeAnagrafica.altro && (
                    <div className="mb-8">
                        <h3 className="font-bold text-lg uppercase border-b-2 border-gray-200 mb-4 pb-1 text-[#001a33]">Note</h3>
                        <p className="text-sm">{sedeAnagrafica.altro}</p>
                    </div>
                )}

                <div className="mt-8 text-center border-t border-gray-200 pt-4">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Documento generato il {new Date().toLocaleDateString()} • PCGL.IT</p>
                </div>
            </div>
        </div>
        );
      }

      case 'sedi_list': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
            <HeaderSub title={selectedSedeDetail ? "Dettaglio Sede" : "Anagrafica Sedi"} onBack={() => { if(selectedSedeDetail) { setSelectedSedeDetail(null); setFilterSede(''); } else setSubPage(null); }} />
            
            {selectedSedeDetail ? (
                <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-6 font-sans text-pcgl-text-dark animate-in zoom-in duration-300">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-32 h-32 bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-gray-200 mb-4 shadow-sm">
                             {selectedSedeDetail.logo ? <img src={selectedSedeDetail.logo} className="w-full h-full object-contain" /> : <Building size={48} className="text-gray-300"/>}
                        </div>
                        <h3 className="font-black text-2xl text-pcgl-blue uppercase">{selectedSedeDetail.sede}</h3>
                        <p className="text-lg font-bold text-gray-500">{selectedSedeDetail.nomeAssociazione || 'Associazione Non Registrata'}</p>
                    </div>

                    {/* PULSANTI NAVIGAZIONE RAPIDA */}
                    {(['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) || selectedSedeDetail.sede === userData.sede) && (
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => { setFilterSede(selectedSedeDetail.sede); handleSedeFilterChange(selectedSedeDetail.sede); setPreviousPage('sedi_list'); setSubPage('admin_search'); }} className="p-3 bg-blue-50 text-blue-700 rounded-xl font-bold uppercase text-xs flex flex-col items-center justify-center hover:bg-blue-100 transition-colors">
                                <Users size={20} className="mb-1"/> Volontari
                            </button>
                            <button onClick={() => { setFilterSede(selectedSedeDetail.sede); setPreviousPage('sedi_list'); setSubPage('gestione_mezzi'); }} className="p-3 bg-blue-50 text-blue-700 rounded-xl font-bold uppercase text-xs flex flex-col items-center justify-center hover:bg-blue-100 transition-colors">
                                <Truck size={20} className="mb-1"/> Mezzi
                            </button>
                            <button onClick={() => { setFilterSede(selectedSedeDetail.sede); setPreviousPage('sedi_list'); setSubPage('documenti_view'); }} className="p-3 bg-blue-50 text-blue-700 rounded-xl font-bold uppercase text-xs flex flex-col items-center justify-center hover:bg-blue-100 transition-colors">
                                <FileText size={20} className="mb-1"/> Documenti
                            </button>
                        </div>
                    )}

                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 space-y-3">
                        <h4 className="font-bold text-lg text-pcgl-blue uppercase border-b pb-2 mb-2">Dati Generali</h4>
                        <p><span className="font-bold text-gray-500">Codice Fiscale:</span> {selectedSedeDetail.codiceFiscale || '-'}</p>
                        <p><span className="font-bold text-gray-500">Data Costituzione:</span> {selectedSedeDetail.dataCostituzione ? new Date(selectedSedeDetail.dataCostituzione).toLocaleDateString() : '-'}</p>
                        <p><span className="font-bold text-gray-500">IBAN:</span> {selectedSedeDetail.iban || '-'}</p>
                        <p><span className="font-bold text-gray-500">Indirizzo:</span> {selectedSedeDetail.indirizzoLegale || '-'}</p>
                        <p><span className="font-bold text-gray-500">Telefono:</span> {selectedSedeDetail.telefono || '-'}</p>
                        <p><span className="font-bold text-gray-500">Email:</span> {selectedSedeDetail.email || '-'}</p>
                        <p><span className="font-bold text-gray-500">PEC:</span> {selectedSedeDetail.pec || '-'}</p>
                        {selectedSedeDetail.posizione && (
                             <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedSedeDetail.posizione.lat},${selectedSedeDetail.posizione.lng}`, '_blank')} className="mt-4 flex items-center text-xs font-bold text-blue-600 uppercase hover:underline">
                                 <MapIcon size={14} className="mr-1"/> Vedi Posizione
                             </button>
                        )}
                    </div>

                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-3">
                        <h4 className="font-bold text-lg text-pcgl-blue uppercase border-b border-blue-200 pb-2 mb-2">Dati Logistici</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div><p className="text-xs font-bold text-gray-500 uppercase">Proprietà</p><p className="font-bold">{selectedSedeDetail.proprieta || '-'}</p></div>
                            <div><p className="text-xs font-bold text-gray-500 uppercase">Stanze</p><p className="font-bold">{selectedSedeDetail.numeroStanze || '-'}</p></div>
                            <div><p className="text-xs font-bold text-gray-500 uppercase">Servizi</p><p className="font-bold">{selectedSedeDetail.serviziIgienici || '-'}</p></div>
                            <div><p className="text-xs font-bold text-gray-500 uppercase">Foresteria</p><p className="font-bold">{selectedSedeDetail.foresteria || '-'}</p></div>
                        </div>
                        <div><p className="text-xs font-bold text-gray-500 uppercase">Dotazione Informatica</p><p className="font-bold">{selectedSedeDetail.dotazioneInformatica || '-'}</p></div>
                        {selectedSedeDetail.altro && (
                            <div><p className="text-xs font-bold text-gray-500 uppercase">Note / Altro</p><p className="text-sm italic">{selectedSedeDetail.altro}</p></div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-4 font-sans text-pcgl-text-dark">
                    {appConfig.sedi && Array.isArray(appConfig.sedi) && appConfig.sedi.length > 0 ? appConfig.sedi.filter(s => s.s !== 'SEDE TEST FITTIZIA' || userData?.originalRuolo === 'superadmin' || userData?.ruolo === 'superadmin').map((s, idx) => {
                        if (!s || !s.s) return null;
                        const dbData = sediList.find(d => d.sede === s.s);
                        
                        // Calcolo stato sede
                        let status = 'red';
                        if (dbData) {
                            const hasPresident = allUsers.some(u => u.sede === s.s && u.ruolo === 'presidente' && u.stato === 'attivo');
                            const isComplete = dbData.codiceFiscale && dbData.indirizzoLegale && dbData.email && dbData.telefono;
                            if (hasPresident && isComplete) status = 'green';
                            else status = 'orange';
                        }

                        const statusColor = status === 'green' ? 'bg-green-500' : status === 'orange' ? 'bg-orange-500' : 'bg-red-500';
                        const sedeObj = dbData || { sede: s.s, nomeAssociazione: 'Dati Mancanti' };
                        const president = allUsers.find(u => u.sede === s.s && u.ruolo === 'presidente' && u.stato === 'attivo');

                        return (
                        <div key={idx} onClick={() => setSelectedSedeDetail(sedeObj)} className="bg-white p-6 rounded-2xl shadow-card border border-gray-100 cursor-pointer hover:bg-gray-50 transition-all active:scale-95 relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-2 h-full ${statusColor}`}></div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden border border-gray-200">
                                    {sedeObj.logo ? <img src={sedeObj.logo} className="w-full h-full object-contain" /> : <Building size={32} className="text-gray-300"/>}
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-pcgl-blue uppercase">{s.s}</h3>
                                    {president && <p className="text-xs font-bold text-pcgl-blue uppercase mb-1">Pres. {president.nome} {president.cognome}</p>}
                                    <p className="text-sm font-bold text-gray-500">{sedeObj.nomeAssociazione}</p>
                                    <p className="text-[10px] font-bold uppercase mt-1 flex items-center">
                                        <span className={`w-2 h-2 rounded-full mr-1 ${statusColor}`}></span>
                                        {status === 'green' ? 'Completa' : status === 'orange' ? 'Incompleta' : 'Dati Mancanti'}
                                    </p>
                                </div>
                            </div>
                            {dbData && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm pl-2">
                                    <p><span className="font-bold text-gray-400">CF:</span> {sedeObj.codiceFiscale}</p>
                                    <p><span className="font-bold text-gray-400">Tel:</span> {sedeObj.telefono}</p>
                                    <p className="md:col-span-2 truncate"><span className="font-bold text-gray-400">Indirizzo:</span> {sedeObj.indirizzoLegale}</p>
                                </div>
                            )}
                        </div>
                        );
                    }) : <p className="text-center text-gray-500 font-medium py-8">Nessuna sede configurata nel sistema.</p>}
                </div>
            )}
        </div>
      );

      case 'modules_view': return <ModulesManager currentUser={userData} onBack={() => setSubPage(previousPage || 'home')} allUsers={allUsers} onViewVolunteer={handleViewVolunteer} customForms={customForms || []} onFillForm={handleFillForm} />;

      case 'sede_hub': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
          <HeaderSub title={`Sede ${userData.sede}`} onBack={() => setSubPage(null)} />
          <div className="grid grid-cols-1 gap-6 font-sans text-pcgl-text-dark">
            {['volontario', 'presidente', 'coordinamento', 'admin', 'superadmin'].includes(userData.ruolo) && (
                <button onClick={() => setSubPage('sede_anagrafica')} className="bg-white rounded-[2.5rem] p-8 shadow-card border border-gray-100 flex items-center gap-6 active:scale-95 transition-transform">
                  <div className="bg-blue-50 p-5 rounded-2xl"><Building size={32} className="text-[#001a33]" /></div><span className="font-black italic uppercase text-xl text-[#001a33]">Dati Anagrafici</span>
                </button>
            )}
            <button onClick={() => setSubPage('gestione_mezzi')} className="bg-white rounded-[2.5rem] p-8 shadow-card border border-gray-100 flex items-center gap-6 active:scale-95 transition-transform">
              <div className="bg-blue-50 p-5 rounded-2xl"><Truck size={32} className="text-[#001a33]" /></div><span className="font-black italic uppercase text-xl text-[#001a33]">Mezzi</span>
            </button>
            <button onClick={() => setSubPage('documenti_view')} className="bg-white rounded-[2.5rem] p-8 shadow-card border border-gray-100 flex items-center gap-6 active:scale-95 transition-transform">
              <div className="bg-blue-50 p-5 rounded-2xl"><File size={32} className="text-[#001a33]" /></div><span className="font-black italic uppercase text-xl text-[#001a33]">Documenti</span>
            </button>
            <button onClick={() => setSubPage('chat_sede')} className="bg-white rounded-[2.5rem] p-8 shadow-card border border-gray-100 flex items-center gap-6 active:scale-95 transition-transform">
              <div className="bg-blue-50 p-5 rounded-2xl"><MessageCircle size={32} className="text-[#001a33]" /></div><span className="font-black italic uppercase text-xl text-[#001a33]">Chat Operativa</span>
            </button>
            <button onClick={() => setSubPage('monitoraggio')} className="bg-white rounded-[2.5rem] p-8 shadow-card border border-gray-100 flex items-center gap-6 active:scale-95 transition-transform">
              <div className="bg-blue-50 p-5 rounded-2xl"><Activity size={32} className="text-[#001a33]" /></div><span className="font-black italic uppercase text-xl text-[#001a33]">Invia Report</span>
            </button>
          </div>
        </div>
      );

      case 'admin_version_control': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
            <HeaderSub title="Gestione Rilasci" onBack={() => setSubPage('settings_view')} />
            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-6 font-sans text-pcgl-text-dark">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                    <p className="text-xs text-blue-800 leading-relaxed">
                        <strong>Gestione Distribuzione:</strong> Qui puoi modificare i dettagli dell'ultimo aggiornamento rilasciato. 
                        Se hai commesso un errore (es. link sbagliato), correggi i dati e salva. 
                        Se vuoi annullare completamente il rilascio, usa il tasto "Elimina".
                    </p>
                </div>

                <h3 className="font-bold text-xl text-pcgl-blue mb-4">Configurazione Aggiornamento OTA</h3>
                
                <div>
                    <label className="text-xs font-bold uppercase text-gray-400 ml-2">Versione App (es. v1.1.1)</label>
                    <input type="text" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all" value={versionForm.androidVersion} onChange={(e) => setVersionForm({...versionForm, androidVersion: e.target.value})} />
                </div>

                <div>
                    <label className="text-xs font-bold uppercase text-gray-400 ml-2">URL Download (APK/Store)</label>
                    <input type="text" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all" value={versionForm.downloadUrl} onChange={(e) => setVersionForm({...versionForm, downloadUrl: e.target.value})} />
                </div>

                <div>
                    <label className="text-xs font-bold uppercase text-gray-400 ml-2">Note di Rilascio</label>
                    <textarea className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all resize-none" rows="3" value={versionForm.note} onChange={(e) => setVersionForm({...versionForm, note: e.target.value})}></textarea>
                </div>

                <div className="flex items-center space-x-3 p-2 cursor-pointer" onClick={() => setVersionForm({...versionForm, forceUpdate: !versionForm.forceUpdate})}>
                   <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${versionForm.forceUpdate ? 'bg-red-600 border-red-600' : 'border-gray-300'}`}>
                      {versionForm.forceUpdate && <Check size={14} className="text-white" />}
                   </div>
                   <span className={`text-sm font-bold uppercase select-none ${versionForm.forceUpdate ? 'text-red-600' : 'text-gray-600'}`}>Aggiornamento Obbligatorio (Force Update)</span>
                </div>

                <div className="flex items-center space-x-3 p-2 cursor-pointer" onClick={() => setVersionForm({...versionForm, maintenance: !versionForm.maintenance})}>
                   <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${versionForm.maintenance ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                      {versionForm.maintenance && <Check size={14} className="text-white" />}
                   </div>
                   <span className={`text-sm font-bold uppercase select-none ${versionForm.maintenance ? 'text-orange-500' : 'text-gray-600'}`}>Abilita Modalità Manutenzione</span>
                </div>

                <div className="flex gap-3 pt-4">
                    <button onClick={deleteVersionConfig} className="flex-1 py-4 bg-red-50 text-red-600 font-bold text-sm rounded-xl shadow-sm active:scale-95 transition-all hover:bg-red-100 border border-red-100">Elimina Rilascio</button>
                    <button onClick={saveVersionConfig} className="flex-[2] py-4 bg-pcgl-blue text-pcgl-yellow font-bold text-lg rounded-xl shadow-lg active:scale-95 transition-all hover:bg-pcgl-yellow hover:text-pcgl-blue hover:shadow-xl">Salva Modifiche</button>
                </div>

                <div className="border-t border-gray-200 mt-8 pt-6">
                    <h4 className="font-bold text-lg text-pcgl-blue mb-4">Notifiche di Sistema</h4>
                    <button onClick={async () => {
                        if (!window.confirm("Vuoi inviare a tutti gli utenti la notifica push di lancio del nuovo modulo SOGL?")) return;
                        try {
                            await addDoc(collection(db, 'news'), {
                                titolo: 'LANCIO NUOVO MODULO S.O.G.L.',
                                testo: 'È ora disponibile il nuovo modulo Sala Operativa (SOGL). Tutti gli utenti abilitati possono ora gestire emergenze, logistica, campagne AIB e monitorare la flotta mezzi direttamente dall\'app. Accedi alla sezione Sala Op. per scoprire le novità!',
                                testoBreve: 'Nuovo modulo Sala Operativa (SOGL) disponibile. Scopri le nuove funzionalità.',
                                importante: true,
                                visibilita: 'pubblica',
                                dataScadenza: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
                                timestamp: serverTimestamp(),
                                data: new Date().toLocaleDateString('it-IT'),
                                autore: 'Direzione Generale',
                                sede: 'TUTTE',
                                archived: false
                            });
                            showToast("Notifica di lancio inviata con successo!");
                        } catch (e) {
                            console.error(e);
                            showToast("Errore invio notifica.", 'error');
                        }
                    }} className="w-full py-4 bg-green-600 text-white font-bold text-sm rounded-xl shadow-md hover:bg-green-700 transition-all uppercase">
                        Invia Notifica Lancio SOGL a tutti
                    </button>
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-4 mt-6">
                <h3 className="font-bold text-xl text-pcgl-blue mb-2 uppercase flex items-center"><Send className="mr-2" size={24}/> Invia Messaggio Telegram</h3>
                <p className="text-sm text-gray-500 mb-4">Invia un messaggio di testo personalizzato direttamente nel canale Telegram ufficiale tramite il Bot.</p>
                <textarea className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all resize-none" rows="4" placeholder="Testo del messaggio (puoi usare formattazione HTML base come <b>grassetto</b>, <i>corsivo</i>, <a>link</a>)..." value={customTelegramMessage} onChange={(e) => setCustomTelegramMessage(e.target.value)}></textarea>
                
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-2 mb-4 text-left">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Aggiungi Bottone Interattivo (Opzionale)</p>
                    <div className="flex gap-2">
                        <input type="text" placeholder="Es. Apri Modulo" className="flex-[1] p-3 bg-white rounded-lg border text-sm font-medium" value={tgButtonText} onChange={(e) => setTgButtonText(e.target.value)} />
                        <input type="text" placeholder="https://..." className="flex-[2] p-3 bg-white rounded-lg border text-sm font-medium" value={tgButtonUrl} onChange={(e) => setTgButtonUrl(e.target.value)} />
                    </div>
                </div>

                <button onClick={handleSendCustomTelegram} disabled={sendingTelegram} className="w-full py-4 bg-[#0088cc] text-white rounded-xl font-bold uppercase shadow-md flex items-center justify-center disabled:opacity-50 hover:bg-[#0077b3] transition-colors">
                    {sendingTelegram ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span> : <Send className="mr-2" size={20}/>}
                    {sendingTelegram ? 'Invio in corso...' : 'Invia al Canale Telegram'}
                </button>
            </div>
        </div>
      );

      case 'config_manager': return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
            <HeaderSub title="Gestione Configurazioni" onBack={() => setSubPage('settings_view')} />
            
            <div className="space-y-8 font-sans text-pcgl-text-dark">
                {/* GESTIONE SEDI */}
                <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
                    <h3 className="font-bold text-lg text-pcgl-blue mb-4 uppercase flex items-center"><MapIcon className="mr-2"/> Sedi Operative</h3>
                    
                    <div className="flex gap-2 mb-4">
                        <input type="text" placeholder="Nome Sede" className="flex-[2] p-3 bg-gray-50 rounded-xl border text-sm uppercase" value={newConfigSede} onChange={e => setNewConfigSede(e.target.value)} />
                        <input type="text" placeholder="Zona (es. BASI B)" className="flex-1 p-3 bg-gray-50 rounded-xl border text-sm" value={newConfigZone} onChange={e => setNewConfigZone(e.target.value)} />
                        <button onClick={addSedeToConfig} className="p-3 bg-pcgl-blue text-white rounded-xl shadow-md"><Plus size={20}/></button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                        {appConfig.sedi.map((s, i) => (
                            <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <div>
                                    <p className="font-bold text-xs uppercase text-pcgl-blue">{s.s}</p>
                                    <p className="text-[10px] text-gray-500">{s.z}</p>
                                </div>
                                <button onClick={() => removeSedeFromConfig(s.s)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={16}/></button>
                            </div>
                        ))}
                        {appConfig.sedi.length === 0 && (
                            <div className="text-center py-4">
                                <p className="text-sm text-gray-400 mb-2">Nessuna sede configurata.</p>
                                <button onClick={restoreDefaultSedi} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold uppercase hover:bg-gray-200">Ripristina Default</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* GESTIONE SPECIALIZZAZIONI */}
                <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
                    <h3 className="font-bold text-lg text-pcgl-blue mb-4 uppercase flex items-center"><Briefcase className="mr-2"/> Specializzazioni</h3>
                    
                    <div className="flex gap-2 mb-4">
                        <input type="text" placeholder="Nuova Specializzazione" className="flex-1 p-3 bg-gray-50 rounded-xl border text-sm" value={newConfigSpec} onChange={e => setNewConfigSpec(e.target.value)} />
                        <button onClick={addSpecToConfig} className="p-3 bg-pcgl-blue text-white rounded-xl shadow-md"><Plus size={20}/></button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {appConfig.specs.map((s, i) => (
                            <span key={i} className="px-3 py-2 bg-blue-50 text-pcgl-blue rounded-lg text-xs font-bold uppercase border border-blue-100 flex items-center gap-2">
                                {s}
                                <button onClick={() => removeSpecFromConfig(s)} className="text-red-400 hover:text-red-600"><X size={12}/></button>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      );

      case 'settings_view': 
        const notifPerm = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
        return (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
          <HeaderSub title="Impostazioni" onBack={() => setSubPage(null)} />
          <div className="space-y-6 font-sans text-pcgl-text-dark">
            
            {userData?.originalRuolo === 'superadmin' && (
              <div className="bg-white p-8 rounded-3xl shadow-card border-2 border-purple-200 space-y-4">
                <h3 className="font-bold text-xl text-purple-700 mb-2 uppercase flex items-center"><Eye className="mr-2"/> Modalità Sviluppatore</h3>
                <p className="text-sm text-gray-500 mb-4">Simula l'app dal punto di vista di un altro ruolo per testare le funzionalità. Tutte le interfacce e i permessi locali si adatteranno al ruolo scelto.</p>
                <div className="flex gap-2">
                    <select 
                        className="w-full p-4 bg-purple-50 text-purple-800 rounded-xl border border-purple-200 font-bold uppercase text-sm outline-none focus:ring-2 focus:ring-purple-400 transition-all"
                        value={userData.ruolo}
                        onChange={(e) => {
                            if (e.target.value === 'superadmin') {
                                localStorage.removeItem('pcgl_simulated_role');
                            } else {
                                localStorage.setItem('pcgl_simulated_role', e.target.value);
                            }
                            window.location.reload();
                        }}
                    >
                        <option value="superadmin">🔴 Superadmin (Reale)</option>
                        <option value="admin">🟠 Admin</option>
                        <option value="coordinamento">🟣 Coordinamento</option>
                        <option value="presidente">🔵 Presidente</option>
                        <option value="volontario">🟢 Volontario</option>
                    </select>
                </div>
              </div>
            )}

            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-6">
                <h3 className="font-bold text-xl text-pcgl-blue mb-2 uppercase">Sicurezza Account</h3>
                <p className="text-sm text-gray-500 mb-6">Richiedi un'email per modificare la tua password di accesso all'app.</p>
                <button onClick={async () => {
                    if (window.confirm("Vuoi ricevere un'email per reimpostare la tua password?")) {
                        try { await sendPasswordResetEmail(auth, user.email); showToast("Email di reset inviata! Controlla la posta."); }
                        catch (err) { showToast("Errore invio: " + err.message, "error"); }
                    }
                }} className="w-full py-3 bg-white border-2 border-pcgl-blue text-pcgl-blue rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all flex items-center justify-center hover:bg-blue-50">
                    <Lock className="mr-2" size={20}/> Cambia Password
                </button>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-6">
                <h3 className="font-bold text-xl text-pcgl-blue mb-2 uppercase">Permessi App</h3>
                <p className="text-sm text-gray-500 mb-6">Gestisci i permessi per garantire il corretto funzionamento dell'app.</p>
                
                {/* Pulsante Guida Sicura */}
                <button onClick={() => setShowPermissionsGuide(true)} className="w-full py-3 mb-4 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all flex items-center justify-center"><Shield className="mr-2" size={20}/> Guida Configurazione Sicura</button>

                <button onClick={() => window.open('https://www.pcgl.it/privacy.html', '_blank')} className="w-full py-3 mb-4 bg-white border-2 border-gray-200 text-gray-500 rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all flex items-center justify-center hover:border-pcgl-blue hover:text-pcgl-blue"><FileText className="mr-2" size={20}/> Informativa Privacy</button>

                <button onClick={() => { localStorage.removeItem('pwa_install_dismissed'); showToast("Guida installazione ripristinata. Ricarica la pagina."); }} className="w-full py-3 mb-4 bg-white border-2 border-pcgl-blue text-pcgl-blue rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all flex items-center justify-center"><Download className="mr-2" size={20}/> Reset Guida Installazione</button>

                {['admin', 'superadmin'].includes(userData.ruolo) && (
                    <button onClick={() => { setPreviousPage('settings_view'); setSubPage('modules_view'); }} className="w-full py-3 mb-4 bg-white border-2 border-pcgl-blue text-pcgl-blue rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all flex items-center justify-center"><Shield className="mr-2" size={20}/> Gestione Moduli & Squadre</button>
                )}

                {(['admin', 'superadmin', 'coordinamento'].includes(userData.ruolo) || customForms.some(f => f.responsibleId === user.uid)) && (
                    <button onClick={() => setSubPage('form_manager')} className="w-full py-3 mb-4 bg-white border-2 border-pcgl-blue text-pcgl-blue rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all flex items-center justify-center"><ClipboardList className="mr-2" size={20}/> Gestione Moduli Dati</button>
                )}

                {['admin', 'superadmin'].includes(userData.ruolo) && (
                    <button onClick={() => setSubPage('config_manager')} className="w-full py-3 mb-4 bg-white border-2 border-pcgl-blue text-pcgl-blue rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all flex items-center justify-center"><Settings className="mr-2" size={20}/> Gestione Configurazioni (Sedi/Spec)</button>
                )}

                {['presidente', 'coordinamento', 'admin', 'superadmin'].includes(userData.ruolo) && (
                    <button onClick={() => setSubPage('sedi_list')} className="w-full py-3 mb-4 bg-white border-2 border-pcgl-blue text-pcgl-blue rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all flex items-center justify-center"><Building className="mr-2" size={20}/> Anagrafica Sedi</button>
                )}

                {userData.ruolo === 'superadmin' && (
                    <button onClick={() => setSubPage('admin_version_control')} className="w-full py-3 mb-4 bg-gray-800 text-white rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all flex items-center justify-center"><Settings className="mr-2" size={20}/> Gestione Rilasci (OTA)</button>
                )}

                {/* SINCRONIZZAZIONE MOODLE */}
                {userData.ruolo === 'superadmin' && (
                    <button onClick={handleSyncMoodle} disabled={syncingMoodle} className="w-full py-3 mb-4 bg-purple-600 text-white rounded-xl font-bold uppercase shadow-md active:scale-95 transition-all flex items-center justify-center disabled:opacity-50">
                        {syncingMoodle ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span> : <BookOpen className="mr-2" size={20}/>} 
                        {syncingMoodle ? "Sincronizzazione in corso..." : "Sincronizza Utenti su Moodle"}
                    </button>
                )}

                {/* NOTIFICHE */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${notifPerm === 'granted' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                            <Bell size={24} />
                        </div>
                        <div>
                            <p className="font-bold text-sm uppercase text-pcgl-blue">Notifiche Push</p>
                            <p className={`text-xs font-bold uppercase ${notifPerm === 'granted' ? 'text-green-600' : (notifPerm === 'denied' ? 'text-red-500' : 'text-gray-400')}`}>
                              {typeof Notification === 'undefined' 
                                ? 'NON SUPPORTATE DAL BROWSER' 
                                : (notifPerm === 'granted' ? 'Attive' : (notifPerm === 'denied' ? 'Bloccate' : 'Da Attivare'))}
                            </p>
                        </div>
                    </div>
                    <button onClick={requestNotificationPermission} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold uppercase shadow-sm active:scale-95 transition-all">
                        {notifPerm === 'granted' ? 'Test' : (notifPerm === 'denied' ? 'Sblocca' : 'Abilita')}
                    </button>
                </div>

                {/* GPS */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                            <MapPin size={24} />
                        </div>
                        <div>
                            <p className="font-bold text-sm uppercase text-pcgl-blue">Posizione GPS</p>
                            <p className="text-xs text-gray-400">Per monitoraggio</p>
                        </div>
                    </div>
                    <button onClick={getCurrentLocation} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold uppercase shadow-sm active:scale-95 transition-all">
                        Test
                    </button>
                </div>

                {/* FOTOCAMERA */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-100 text-yellow-700 rounded-xl">
                            <Camera size={24} />
                        </div>
                        <div>
                            <p className="font-bold text-sm uppercase text-pcgl-blue">Fotocamera</p>
                            <p className="text-xs text-gray-400">Per QR e Foto</p>
                        </div>
                    </div>
                    <button onClick={requestCameraPermission} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold uppercase shadow-sm active:scale-95 transition-all">
                        Abilita
                    </button>
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-6">
                <h3 className="font-bold text-xl text-pcgl-blue mb-2 uppercase">Preferenze</h3>
                
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl border border-orange-200 cursor-pointer" onClick={async () => {
                    const newVal = !(userData.allerteAIB || false);
                    try {
                        await updateDoc(doc(db, 'users', user.uid), { allerteAIB: newVal });
                        setUserData(prev => ({...prev, allerteAIB: newVal}));
                        showToast(newVal ? "Allerte AIB Attivate" : "Allerte AIB Disattivate");
                    } catch(e) { console.error(e); }
                }}>
                    <div className="flex items-center">
                        <Flame size={20} className="text-orange-500 mr-3" />
                        <div>
                            <span className="font-bold text-sm uppercase text-orange-800">Allerte AIB</span>
                            <p className="text-[10px] text-orange-600">Ricevi notifiche per incendi boschivi</p>
                        </div>
                    </div>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${userData.allerteAIB ? 'bg-orange-500' : 'bg-gray-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${userData.allerteAIB ? 'translate-x-6' : ''}`}></div>
                    </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200 cursor-pointer" onClick={() => updatePref('sound', !prefs.sound)}>
                    <span className="font-bold text-sm uppercase text-pcgl-blue">Suoni Allerta</span>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${prefs.sound ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${prefs.sound ? 'translate-x-6' : ''}`}></div>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200 cursor-pointer" onClick={() => { const newVal = !prefs.vibration; updatePref('vibration', newVal); if(newVal && navigator.vibrate) navigator.vibrate(50); }}>
                    <span className="font-bold text-sm uppercase text-pcgl-blue">Vibrazione</span>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${prefs.vibration ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${prefs.vibration ? 'translate-x-6' : ''}`}></div>
                    </div>
                </div>
            </div>

            {userData.ruolo === 'superadmin' && (
              <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-4">
                <h3 className="font-bold text-xl text-pcgl-blue mb-2 uppercase">Recupero Iscrizioni</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Se delle iscrizioni sono fallite a causa di un crash, usa questo strumento per trovare gli account creati ma non finalizzati.
                </p>
                <button onClick={handleRecovery} disabled={recovering} className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold uppercase shadow-md flex items-center justify-center disabled:opacity-50">
                    {recovering ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div> : <SearchIcon className="mr-2" size={20}/>}
                    {recovering ? 'Ricerca in corso...' : 'Cerca Iscrizioni Incomplete'}
                </button>

                {recoveredAccounts && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-in fade-in">
                        <h4 className="font-bold text-sm uppercase text-gray-600 mb-2">Risultato ({recoveredAccounts.count}):</h4>
                        {recoveredAccounts.count > 0 ? (
                            <div className="space-y-2 text-xs">
                                <p className="text-gray-500 mb-2">Clicca su un utente per completare il suo profilo. Verrà creato un nuovo volontario in stato "pendente" pronto per l'approvazione.</p>
                                {recoveredAccounts.orphans.map(acc => (
                                    <div key={acc.uid} className="p-2 bg-white rounded border cursor-pointer hover:bg-gray-50" onClick={() => {
                                        setEditingOrphan(acc);
                                        setOrphanForm({ nome: '', cognome: '', dataNascita: '', luogoNascita: '', cf: '', sede: 'POTENZA', cfConfermato: false });
                                    }}>
                                        <p><strong>Email:</strong> {acc.email}</p>
                                        <p className="truncate"><strong>UID:</strong> {acc.uid}</p>
                                        {acc.creationTime && <p className="text-[10px] text-gray-400">Creato: {new Date(acc.creationTime).toLocaleDateString()}</p>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">Nessun account da recuperare.</p>
                        )}
                    </div>
                )}

                {editingOrphan && (
                    <div className="fixed inset-0 bg-black/70 z-[400] flex items-center justify-center p-4" onClick={() => setEditingOrphan(null)}>
                        <div className="bg-white p-6 rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-90" onClick={e => e.stopPropagation()}>
                            <h3 className="font-black text-xl text-pcgl-blue mb-4 uppercase">Completa Profilo Orfano</h3>
                            <p className="text-sm text-center bg-gray-50 p-3 rounded-lg mb-4">Email: <strong className="text-pcgl-blue">{editingOrphan.email}</strong></p>
                            <form onSubmit={handleCompleteOrphanProfile} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                <div className="grid grid-cols-2 gap-4">
                                  <input type="text" placeholder="NOME" className="p-4 bg-gray-50 rounded-xl border" value={orphanForm.nome} onChange={e => setOrphanForm({...orphanForm, nome: e.target.value})} required />
                                  <input type="text" placeholder="COGNOME" className="p-4 bg-gray-50 rounded-xl border" value={orphanForm.cognome} onChange={e => setOrphanForm({...orphanForm, cognome: e.target.value})} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div><label className="text-[10px] font-bold uppercase text-gray-400">Data Nascita</label><input type="date" className="w-full p-3 bg-gray-50 rounded-xl border" value={orphanForm.dataNascita} onChange={e => setOrphanForm({...orphanForm, dataNascita: e.target.value})} required /></div>
                                  <div><label className="text-[10px] font-bold uppercase text-gray-400">Luogo Nascita</label><input type="text" placeholder="MILANO" className="w-full p-3 bg-gray-50 rounded-xl border uppercase" value={orphanForm.luogoNascita} onChange={e => setOrphanForm({...orphanForm, luogoNascita: e.target.value})} required /></div>
                                </div>
                                <div className="relative">
                                   <input type="text" placeholder="CODICE FISCALE" maxLength={16} className={`w-full p-4 bg-blue-50 text-pcgl-blue rounded-lg border font-bold text-center uppercase ${orphanForm.cfConfermato ? 'ring-2 ring-green-400' : ''}`} value={orphanForm.cf} onChange={e => setOrphanForm({...orphanForm, cf: e.target.value.toUpperCase(), cfConfermato: false})} required />
                                   {!orphanForm.cfConfermato && orphanForm.cf.length === 16 && (
                                     <button type="button" onClick={() => { if (/^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/i.test(orphanForm.cf)) setOrphanForm({...orphanForm, cfConfermato: true}); else showToast("CF non valido", "error"); }} className="absolute right-2 top-2 bg-green-600 text-white px-2 py-1 rounded-md text-xs font-bold uppercase">Verifica</button>
                                   )}
                                   {orphanForm.cfConfermato && <Verified className="absolute right-4 top-3 text-green-600" size={18}/>}
                                </div>
                                <select className="w-full p-4 bg-gray-50 rounded-lg border uppercase" value={orphanForm.sede} onChange={e => setOrphanForm({...orphanForm, sede: e.target.value})}>
                                  {sediDisponibili.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <button className="w-full py-4 bg-pcgl-blue text-white rounded-xl font-bold uppercase">Salva Profilo</button>
                            </form>
                        </div>
                    </div>
                )}
              </div>
            )}

            <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100 text-center">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Versione App</p>
                <p className="text-lg font-black text-pcgl-blue">{appVersion}</p>
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Sviluppato da</p>
                    <a href="https://www.formazionesicurezza.org/index.html" target="_blank" rel="noopener noreferrer" className="text-sm font-black text-pcgl-blue hover:text-pcgl-yellow transition-colors">
                        formazionesicurezza.org
                    </a>
                </div>
            </div>

          </div>
        </div>
      );

      case 'chat_sede': return (
        participationStatus !== 'accepted' ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
             <Ban size={48} className="text-gray-300 mb-4"/>
             <p className="font-bold text-gray-500">La chat è attiva solo durante un'allerta a cui stai partecipando.</p>
          </div>
        ) : (
        <div className="animate-in slide-in-from-right duration-500 w-full pb-40 h-screen flex flex-col">
          <HeaderSub title={`Chat ${userData.sede}`} onBack={() => setSubPage(null)} />
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-2">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.uid === user.uid ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl ${msg.uid === user.uid ? 'bg-pcgl-blue text-white rounded-br-none' : 'bg-white text-pcgl-text-dark rounded-bl-none shadow-sm'}`}>
                  <p className="text-xs font-bold opacity-70 mb-1">{msg.autore}</p>
                  <p className="text-sm">{msg.testo}</p>
                </div>
                <span className="text-[10px] text-gray-400 mt-1">{new Date(msg.data).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            ))}
          </div>
          <div className="bg-white p-4 rounded-3xl shadow-lg border border-gray-100 flex items-center space-x-2">
            <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Scrivi un messaggio..." className="flex-1 bg-transparent outline-none font-medium" onKeyPress={e => e.key === 'Enter' && sendMessage()} />
            <button onClick={sendMessage} className="p-3 bg-pcgl-yellow text-pcgl-blue rounded-full shadow-md active:scale-90 transition-all"><Send size={20} /></button>
          </div>
        </div>
        )
      );

      default: return null;
    }
  };

  const heroStyle = getHeroStyle(userData?.ruolo);
  
  const areeVisibili = areeTematiche.filter(a => ['admin', 'superadmin', 'coordinamento'].includes(userData?.ruolo) || a.sediAbilitate?.includes(userData?.sede) || a.utentiAbilitati?.includes(userData?.uid));
  const showProgettiBtn = ['admin', 'superadmin', 'coordinamento'].includes(userData?.ruolo) || areeVisibili.length > 0;
  
  // Controllo permessi per Sala Operativa
  const canAccessSalaOperativa = ['admin', 'superadmin', 'coordinamento'].includes(userData?.ruolo) || userData?.moduli?.some(m => m.toUpperCase().includes('SALA OPERATIVA'));

  const isAibSeason = new Date().getMonth() >= 6 && new Date().getMonth() <= 8; // Da Luglio (6) a Settembre (8)

  // --- RENDER MAIN UI ---
  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-pcgl-bg-light">
       <img src={APP_LOGO} className="w-32 h-32 object-contain animate-pulse drop-shadow-2xl mb-4" alt="Caricamento..." />
       <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-pcgl-blue"></div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-pcgl-bg-light flex flex-col items-center justify-center p-8 font-sans text-pcgl-text-dark notranslate" translate="no">
      <div className="w-full max-w-md">
        <div className="text-center mb-12 animate-in fade-in zoom-in duration-1000">
           <img src={APP_LOGO} alt="Logo PCGL" className="h-32 mx-auto mb-6 drop-shadow-2xl" />
           <h1 className="text-6xl font-black italic tracking-tighter text-pcgl-blue leading-none uppercase">PCGL<span className="text-pcgl-yellow">.IT</span></h1>
           <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mt-4">Sistema Gestionale Volontari</p>
        </div>
        <div className="bg-white p-10 rounded-3xl shadow-card border border-gray-100">
           {showForgotPassword ? (
             <form onSubmit={handlePasswordReset} className="space-y-6 animate-in slide-in-from-bottom duration-500">
               <h3 className="text-xl font-black text-pcgl-blue uppercase text-center mb-4">Recupera Password</h3>
               <div className="relative">
                 <Mail className="absolute left-4 top-4 text-gray-400" size={20}/>
                 <input type="email" placeholder="La tua Email" className="w-full p-4 pl-10 bg-gray-50 rounded-lg font-medium border border-gray-200 outline-none focus:border-pcgl-yellow transition-all text-base" onChange={e => setResetEmail(e.target.value)} required />
               </div>
               {error && <p className="text-red-500 font-black text-xs text-center uppercase tracking-widest bg-red-50 p-3 rounded-xl">{error}</p>}
               <button className="w-full py-4 rounded-xl bg-pcgl-blue text-pcgl-yellow font-bold text-lg shadow-lg active:scale-95 transition-all hover:bg-pcgl-yellow hover:text-pcgl-blue hover:shadow-xl">INVIA EMAIL DI RESET</button>
               <button type="button" onClick={() => { setShowForgotPassword(false); setError(''); }} className="w-full font-medium text-sm uppercase text-gray-500 text-center hover:text-pcgl-blue transition-colors mt-4">Torna al Login</button>
             </form>
           ) : !showRegistration ? (
             <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-4 text-gray-400" size={20}/>
                    <input type="email" placeholder="Email" className="w-full p-4 pl-10 bg-gray-50 rounded-lg font-medium border border-gray-200 outline-none focus:border-pcgl-yellow transition-all text-base" onChange={e => setLoginForm({...loginForm, email: e.target.value})} required />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-4 text-gray-400" size={20}/>
                    <input type={showPassword ? "text" : "password"} placeholder="Password" className="w-full p-4 pl-10 pr-12 bg-gray-50 rounded-lg font-medium border border-gray-200 outline-none focus:border-pcgl-yellow transition-all text-base" onChange={e => setLoginForm({...loginForm, password: e.target.value})} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-400 hover:text-pcgl-blue transition-colors">
                      {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${rememberMe ? 'bg-pcgl-blue border-pcgl-blue' : 'bg-white border-gray-300'}`}>
                      {rememberMe && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="hidden" />
                    <span className="text-xs font-bold text-gray-500 uppercase group-hover:text-pcgl-blue transition-colors">Ricordami</span>
                  </label>
                  <button type="button" onClick={() => { setShowForgotPassword(true); setError(''); }} className="text-xs font-bold text-gray-400 hover:text-pcgl-blue transition-colors uppercase">Password dimenticata?</button>
                </div>
                {error && <p className="text-red-500 font-black text-xs text-center uppercase tracking-widest bg-red-50 p-3 rounded-xl">{error}</p>}
                <button className="w-full py-4 rounded-xl bg-pcgl-blue text-pcgl-yellow font-bold text-lg shadow-lg active:scale-95 transition-all hover:bg-pcgl-yellow hover:text-pcgl-blue hover:shadow-xl">ACCEDI AL PORTALE</button>
                
                <button type="button" onClick={handleGoogleLogin} className="w-full py-4 rounded-xl bg-white border-2 border-gray-200 text-gray-600 font-bold text-lg shadow-sm active:scale-95 transition-all hover:bg-gray-50 flex items-center justify-center mt-4">
                  <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  ACCEDI CON GOOGLE
                </button>

                <button type="button" onClick={() => { setShowRegistration(true); setError(''); }} className="w-full font-medium text-sm uppercase text-gray-500 text-center hover:text-pcgl-blue transition-colors mt-4">Richiedi Iscrizione Socio →</button>
             </form>
           ) : (
             <form onSubmit={handleRegister} className="space-y-5 animate-in slide-in-from-bottom duration-500">
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="NOME" className="p-4 bg-gray-50 rounded-xl border border-gray-200 font-medium text-sm uppercase focus:border-pcgl-yellow transition-all" onChange={e => setRegForm({...regForm, nome: e.target.value})} required />
                  <input type="text" placeholder="COGNOME" className="p-4 bg-gray-50 rounded-xl border border-gray-200 font-medium text-sm uppercase focus:border-pcgl-yellow transition-all" onChange={e => setRegForm({...regForm, cognome: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 ml-3 uppercase">Data di Nascita</label>
                    <input type="date" max={new Date().toISOString().split('T')[0]} className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 font-medium text-sm focus:border-pcgl-yellow transition-all" onChange={e => setRegForm({...regForm, dataNascita: e.target.value})} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 ml-3 uppercase">Luogo di Nascita</label>
                    <input type="text" placeholder="MILANO" className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 font-medium text-sm uppercase focus:border-pcgl-yellow transition-all" onChange={e => setRegForm({...regForm, luogoNascita: e.target.value})} required />
                  </div>
                </div>
                <div className="relative">
                   <input type="text" placeholder="CODICE FISCALE (16 CARATTERI)" maxLength={16} className={`w-full p-4 bg-blue-50 text-pcgl-blue rounded-lg border border-blue-200 font-bold text-center text-base uppercase ${regForm.cfConfermato ? 'ring-2 ring-green-400' : ''} focus:border-pcgl-yellow transition-all`} value={regForm.cf} onChange={e => setRegForm({...regForm, cf: e.target.value.toUpperCase(), cfConfermato: false})} required />
                   {!regForm.cfConfermato && regForm.cf.length === 16 && (
                     <button type="button" onClick={() => {
                        if (/^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/i.test(regForm.cf)) {
                            setRegForm({...regForm, cfConfermato: true});
                            setError('');
                        } else {
                            setError("Formato Codice Fiscale non valido");
                        }
                     }} className="absolute right-2 top-2 bg-green-600 text-white px-2 py-1 rounded-md text-xs font-bold uppercase hover:bg-green-700 transition-colors">Verifica</button>
                   )}
                   {regForm.cfConfermato && <Verified className="absolute right-4 top-3 text-green-600" size={18}/>}
                </div>
                <select className="w-full p-4 bg-gray-50 rounded-lg font-medium text-base border border-gray-200 shadow-inner uppercase focus:border-pcgl-yellow transition-all" onChange={e => setRegForm({...regForm, sede: e.target.value})}>
                  {sediDisponibili.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="email" placeholder="EMAIL" className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all" onChange={e => setRegForm({...regForm, email: e.target.value})} required />
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="SCEGLI PASSWORD" className="w-full p-4 pr-12 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all" onChange={e => setRegForm({...regForm, password: e.target.value})} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-400 hover:text-pcgl-blue transition-colors">
                    {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                  </button>
                </div>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="CONFERMA PASSWORD" className="w-full p-4 pr-12 bg-gray-50 rounded-lg border border-gray-200 font-medium focus:border-pcgl-yellow transition-all" onChange={e => setRegForm({...regForm, confirmPassword: e.target.value})} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-400 hover:text-pcgl-blue transition-colors">
                    {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                  </button>
                </div>
                
                {/* Guide Password */}
                <div className="flex flex-wrap gap-3 px-2">
                  <span className={`text-[10px] font-bold uppercase transition-colors ${regForm.password.length >= 6 ? "text-green-600" : "text-gray-400"}`}>
                    {regForm.password.length >= 6 ? "✓" : "•"} Min. 6 Caratteri
                  </span>
                  <span className={`text-[10px] font-bold uppercase transition-colors ${/[A-Z]/.test(regForm.password) ? "text-green-600" : "text-gray-400"}`}>
                    {/[A-Z]/.test(regForm.password) ? "✓" : "•"} 1 Maiuscola
                  </span>
                  <span className={`text-[10px] font-bold uppercase transition-colors ${/[0-9]/.test(regForm.password) ? "text-green-600" : "text-gray-400"}`}>
                    {/[0-9]/.test(regForm.password) ? "✓" : "•"} 1 Numero
                  </span>
                </div>

                <div className="flex items-start space-x-2 px-2">
                    <input type="checkbox" checked={regForm.privacyAccepted} onChange={(e) => setRegForm({...regForm, privacyAccepted: e.target.checked})} className="mt-1 rounded border-gray-300 text-pcgl-blue focus:ring-pcgl-blue" />
                    <span className="text-xs text-gray-500">
                        Ho letto e accetto l'<a href="https://www.pcgl.it/privacy.html" target="_blank" rel="noopener noreferrer" className="text-pcgl-blue font-bold underline">Informativa Privacy</a> e acconsento al trattamento dei dati.
                    </span>
                </div>

                {error && <p className="text-red-500 font-black text-xs text-center uppercase tracking-widest bg-red-50 p-3 rounded-xl">{error}</p>}

                <button className="w-full py-5 rounded-2xl bg-pcgl-blue text-pcgl-yellow font-bold text-lg shadow-lg mt-4 hover:bg-pcgl-yellow hover:text-pcgl-blue transition-all hover:shadow-xl">INVIA DOMANDA ISCRIZIONE</button>
                
                <button type="button" onClick={handleGoogleLogin} className="w-full py-4 rounded-xl bg-white border-2 border-gray-200 text-gray-600 font-bold text-lg shadow-sm active:scale-95 transition-all hover:bg-gray-50 flex items-center justify-center mt-4">
                  <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  ISCRIVITI CON GOOGLE
                </button>

                <button type="button" onClick={() => setShowRegistration(false)} className="w-full text-sm font-medium text-gray-500 uppercase text-center mt-4 hover:text-pcgl-blue transition-colors">Torna al Login</button>
             </form>
           )}
        </div>
        <FooterLinks className="mt-8" />
      </div>
    </div>
  );

  // --- FLUSSO UTENTE ORFANO ---
  if (isOrphanedUser) {
      return <OrphanUserCompletionScreen user={user} config={appConfig} />;
  }

  // --- PROTEZIONE DATI UTENTE MANCANTI ---
  if (!userData) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-pcgl-bg-light p-8 text-center font-sans">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md border border-gray-100 w-full">
            <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <TriangleAlert size={48} className="text-red-500" />
            </div>
            <h2 className="text-xl font-black text-pcgl-blue uppercase mb-2">Profilo Non Disponibile</h2>
            <p className="text-gray-500 mb-8 text-sm">Impossibile recuperare i dati del profilo. Riprova o contatta il supporto.</p>
            <button onClick={() => window.location.reload()} className="w-full py-3 bg-gray-100 text-pcgl-blue rounded-xl font-bold uppercase mb-3 hover:bg-gray-200">Ricarica</button>
            <button onClick={() => signOut(auth)} className="w-full py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-lg hover:bg-[#002b5c]">Esci</button>
        </div>
    </div>
  );

  // --- MANUTENZIONE ---
  if (maintenanceMode && userData?.ruolo !== 'superadmin') return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-pcgl-bg-light p-8 text-center font-sans">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md border border-gray-100 w-full">
            <div className="bg-yellow-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Briefcase size={48} className="text-yellow-600" />
            </div>
            <h2 className="text-xl font-black text-pcgl-blue uppercase mb-2">Manutenzione in Corso</h2>
            <p className="text-gray-500 mb-8 text-sm">L'applicazione è momentaneamente in manutenzione per aggiornamenti. Riprova più tardi.</p>
            <button onClick={() => window.location.reload()} className="w-full py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-lg">Riprova</button>
        </div>
    </div>
  );

  // --- ACCOUNT SOSPESO ---
  if (userData?.stato === 'sospeso') return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-pcgl-bg-light p-8 text-center font-sans">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md border border-gray-100 w-full">
            <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <Ban size={48} className="text-red-500" />
            </div>
            <h2 className="text-xl font-black text-pcgl-blue uppercase mb-2">Account Sospeso</h2>
            <p className="text-gray-500 mb-8 text-sm">
                Il tuo account è stato sospeso. 
                Per maggiori informazioni, contatta il tuo Presidente di sede o il Coordinamento.
            </p>
            <button onClick={() => signOut(auth)} className="w-full py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-lg hover:bg-[#002b5c]">Esci</button>
        </div>
    </div>
  );

  // --- PENDING PAGE ---
  if (userData?.stato === 'pendente') return (
   <div className="min-h-screen bg-pcgl-bg-light flex flex-col items-center justify-center p-8 font-sans text-pcgl-text-dark notranslate" translate="no">
       <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-lg w-full text-center space-y-6 relative overflow-hidden animate-in zoom-in duration-500">
           {/* Decorative Bar */}
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pcgl-blue via-pcgl-yellow to-pcgl-blue"></div>
           
           <div className="flex justify-center mb-2 pt-4">
               <div className="p-5 bg-blue-50 rounded-full text-pcgl-blue shadow-inner animate-pulse">
                   <Shield size={64} strokeWidth={1.5} />
               </div>
           </div>
           
           <div>
             <h2 className="text-3xl font-black uppercase text-pcgl-blue tracking-tight leading-none mb-2">Richiesta Inviata</h2>
             <div className="inline-block bg-yellow-100 text-yellow-800 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4">In Attesa di Approvazione</div>
             <p className="text-sm font-medium text-gray-500 leading-relaxed px-4">
               La tua domanda è stata inoltrata correttamente.<br/>
               Il <strong>Presidente di Sede</strong> e il <strong>Coordinamento</strong> verificheranno i tuoi dati a breve.
             </p>
           </div>

           {/* Tabs */}
           <div className="flex p-1 bg-gray-100 rounded-xl mx-4">
             <button onClick={() => setPendingTab('info')} className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${pendingTab === 'info' ? 'bg-white text-pcgl-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>I Miei Dati</button>
             <button onClick={() => setPendingTab('game')} className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${pendingTab === 'game' ? 'bg-white text-pcgl-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Sala d'Attesa</button>
           </div>
           
           <div className="min-h-[300px]">
             {pendingTab === 'info' ? (
               <div className="animate-in slide-in-from-left duration-300">
                 {pendingForm && (
                   <form onSubmit={updatePendingProfile} className="space-y-4 text-left px-2">
                       <div className="flex justify-center mb-4">
                           <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-pcgl-yellow overflow-hidden relative group">
                               {pendingForm.fotoProfilo ? <img src={pendingForm.fotoProfilo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Camera size={32}/></div>}
                               <label htmlFor="pending-pic-upload" className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                   {uploading ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div> : <Camera size={20} />}
                               </label>
                           </div>
                           <input type="file" id="pending-pic-upload" className="hidden" accept="image/*" onChange={handleProfilePicUpload} disabled={uploading} />
                       </div>
                       <div>
                           <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Nome</label>
                           <input type="text" value={pendingForm.nome} onChange={e => setPendingForm({...pendingForm, nome: e.target.value.toUpperCase()})} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border border-gray-200 focus:border-pcgl-yellow outline-none transition-all" />
                       </div>
                       <div>
                           <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Cognome</label>
                           <input type="text" value={pendingForm.cognome} onChange={e => setPendingForm({...pendingForm, cognome: e.target.value.toUpperCase()})} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border border-gray-200 focus:border-pcgl-yellow outline-none transition-all" />
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                           <div>
                               <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Data Nascita</label>
                               <input type="date" value={pendingForm.dataNascita} onChange={e => setPendingForm({...pendingForm, dataNascita: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border border-gray-200 focus:border-pcgl-yellow outline-none transition-all" />
                           </div>
                           <div>
                               <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Luogo Nascita</label>
                               <input type="text" value={pendingForm.luogoNascita} onChange={e => setPendingForm({...pendingForm, luogoNascita: e.target.value.toUpperCase()})} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border border-gray-200 focus:border-pcgl-yellow outline-none transition-all" />
                           </div>
                       </div>
                       <div>
                           <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Codice Fiscale</label>
                           <input type="text" value={pendingForm.cf} onChange={e => setPendingForm({...pendingForm, cf: e.target.value.toUpperCase()})} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border border-gray-200 focus:border-pcgl-yellow outline-none transition-all" maxLength={16} />
                       </div>
                       <div>
                           <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Sede Operativa</label>
                           <select value={pendingForm.sede} onChange={e => setPendingForm({...pendingForm, sede: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border border-gray-200 focus:border-pcgl-yellow outline-none transition-all">
                               {sediDisponibili.map(s => <option key={s} value={s}>{s}</option>)}
                           </select>
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                           <div>
                               <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Telefono</label>
                               <input type="tel" value={pendingForm.telefono} onChange={e => setPendingForm({...pendingForm, telefono: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border border-gray-200 focus:border-pcgl-yellow outline-none transition-all" placeholder="Cellulare" />
                           </div>
                           <div>
                               <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Gruppo Sanguigno</label>
                               <select value={pendingForm.gruppoSanguigno} onChange={e => setPendingForm({...pendingForm, gruppoSanguigno: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border border-gray-200 focus:border-pcgl-yellow outline-none transition-all">
                                   <option value="">Seleziona...</option>
                                   {['0-', '0+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map(g => <option key={g} value={g}>{g}</option>)}
                               </select>
                           </div>
                       </div>
                       <div>
                           <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Indirizzo Residenza</label>
                           <input type="text" value={pendingForm.indirizzo} onChange={e => setPendingForm({...pendingForm, indirizzo: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border border-gray-200 focus:border-pcgl-yellow outline-none transition-all" placeholder="Via, Civico" />
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                           <div>
                               <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Città</label>
                               <input type="text" value={pendingForm.citta} onChange={e => setPendingForm({...pendingForm, citta: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border border-gray-200 focus:border-pcgl-yellow outline-none transition-all" />
                           </div>
                           <div>
                               <label className="text-[10px] font-black uppercase text-gray-400 ml-2">CAP</label>
                               <input type="text" value={pendingForm.cap} onChange={e => setPendingForm({...pendingForm, cap: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm border border-gray-200 focus:border-pcgl-yellow outline-none transition-all" />
                           </div>
                       </div>
                       <button className="w-full py-4 bg-pcgl-blue text-pcgl-yellow rounded-xl font-black uppercase shadow-lg active:scale-95 transition-all hover:bg-pcgl-yellow hover:text-pcgl-blue">Aggiorna Dati</button>
                   </form>
                 )}
               </div>
             ) : (
               <div className="animate-in slide-in-from-right duration-300 h-full flex flex-col justify-center">
                 {!quizState.finished ? (
                   <div className="space-y-6 text-left px-2">
                     <div className="flex justify-between items-center">
                       <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Domanda {quizState.q + 1}/{QUIZ_PC.length}</span>
                       <span className="text-xs font-bold text-pcgl-blue uppercase tracking-widest">Punti: {quizState.score}</span>
                     </div>
                     <h4 className="text-lg font-bold text-pcgl-blue leading-tight min-h-[3rem]">{QUIZ_PC[quizState.q].q}</h4>
                     <div className="space-y-3">
                       {QUIZ_PC[quizState.q].options.map((opt, i) => (
                         <button key={i} onClick={() => handleQuizAnswer(i)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-pcgl-blue hover:text-white hover:border-pcgl-blue transition-all active:scale-95 text-left shadow-sm">
                           {String.fromCharCode(65+i)}. {opt}
                         </button>
                       ))}
                     </div>
                   </div>
                 ) : (
                   <div className="text-center space-y-6 py-8">
                     <div className="inline-block p-6 bg-yellow-50 rounded-full">
                        <Award size={64} className="text-pcgl-yellow" />
                     </div>
                     <div>
                        <h3 className="text-2xl font-black text-pcgl-blue uppercase">Quiz Completato!</h3>
                        <p className="text-4xl font-black text-pcgl-blue mt-2">{quizState.score}/{QUIZ_PC.length}</p>
                     </div>
                     <p className="text-sm font-medium text-gray-500 px-4">
                       {quizState.score === QUIZ_PC.length ? "Eccellente! Sei pronto per operare." : "Buon tentativo! Ripassa le procedure mentre attendi."}
                     </p>
                     <button onClick={() => setQuizState({ q: 0, score: 0, finished: false })} className="px-8 py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-lg hover:bg-pcgl-yellow hover:text-pcgl-blue transition-all">Riprova</button>
                   </div>
                 )}
               </div>
             )}
           </div>

           <button onClick={() => signOut(auth)} className="text-xs font-bold text-red-400 uppercase mt-6 hover:underline">Disconnetti</button>
       </div>
   </div>
  );

  return (
    <div className="min-h-screen bg-pcgl-bg-light flex flex-col items-center overflow-x-hidden print:overflow-visible font-sans text-pcgl-text-dark notranslate" translate="no">
      
      {/* OVERLAY NOTIFICA (MODIFICATO PER PARTECIPAZIONE) */}
      {attivazioniAttive.length > 0 && participationStatus === 'pending' && userData?.ruolo !== 'presidente' && (Array.isArray(attivazioniAttive[0].zone) ? attivazioniAttive[0].zone.includes(userData.sede) : attivazioniAttive[0].zona === userData.sede) && dismissedAlertId !== attivazioniAttive[0].id && (
        <div className="fixed inset-0 z-[200] bg-red-600 overflow-y-auto animate-in zoom-in duration-300">
           <div className="min-h-full flex flex-col items-center justify-center p-8 text-white">
               <TriangleAlert size={80} className="animate-pulse mb-6 text-white"/>
               <h1 className="text-3xl md:text-4xl font-black uppercase text-center mb-2 leading-tight">{attivazioniAttive[0].titolo}</h1>
               <p className="text-lg font-bold uppercase tracking-widest opacity-80 mb-6">Richiesta Disponibilità</p>
               
               {/* INFO ALLERTA */}
               <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-md border border-white/20 mb-8 w-full max-w-md shadow-lg">
                   <p className="text-xs font-bold uppercase opacity-70 mb-1">Dettagli Operativi</p>
                   <p className="text-sm font-medium italic mb-3 leading-relaxed">{attivazioniAttive[0].dettagli || "Nessun dettaglio specificato."}</p>
                   <div className="flex justify-between items-center text-xs font-bold opacity-80 border-t border-white/20 pt-3">
                       <span>Data: {new Date(attivazioniAttive[0].dataAttivazione).toLocaleDateString()}</span>
                       <span>Ora: {new Date(attivazioniAttive[0].dataAttivazione).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                   </div>
               </div>

               <div className="w-full max-w-sm space-y-3">
                  <button onClick={() => handleParticipation(attivazioniAttive[0].id, 'accepted')} className="w-full py-4 bg-white text-red-600 rounded-xl font-black text-lg shadow-xl active:scale-95 transition-all">PARTECIPO ORA</button>
                  <button onClick={() => setDismissedAlertId(attivazioniAttive[0].id)} className="w-full py-4 bg-red-800/50 text-white border-2 border-white/30 rounded-xl font-bold text-sm uppercase shadow-lg active:scale-95 transition-all hover:bg-red-800">Disponibilità Successiva</button>
                  <button onClick={() => handleParticipation(attivazioniAttive[0].id, 'declined')} className="w-full py-2 text-xs font-bold text-white/60 uppercase hover:text-white mt-2">Non Disponibile</button>
               </div>
           </div>
        </div>
      )}
      
      {/* HEADER PCGL PRO */}
      <header className="w-full max-w-6xl px-6 py-4 sticky top-0 z-[150] flex justify-between items-center bg-white/70 backdrop-blur-md border-b border-gray-100 shadow-sm print:hidden">
        <div className="flex items-center space-x-4">
          <img src={APP_LOGO} alt="Logo" className="w-14 h-14 rounded-lg shadow-md shadow-pcgl-blue/20" />
          <div>
            <span className="font-black text-3xl italic tracking-tighter text-pcgl-blue block leading-none">PCGL.IT</span>
            <span className="text-xs font-bold uppercase text-gray-400 tracking-widest mt-0.5 flex items-center ml-0.5">
                Sistema Operativo
                {userData?.originalRuolo === 'superadmin' && userData?.ruolo !== 'superadmin' && (
                    <span className="ml-2 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[9px] font-black animate-pulse">Simulazione: {userData.ruolo} (TEST)</span>
                )}
            </span>
          </div>
        </div>
        {isOffline && <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase animate-pulse">OFFLINE</div>}
        <button onClick={() => signOut(auth)} className="p-3 bg-red-50 text-red-500 rounded-lg active:scale-90 shadow-md transition-all hover:bg-red-100"><LogOut size={20}/></button>
      </header>

      <main className="w-full max-w-4xl px-6 py-8 pb-32 flex flex-col items-center relative print:p-0 print:m-0">
        {subPage ? renderSubPage() : (
          <div className="w-full space-y-6 animate-in fade-in duration-1000">
            {activeTab === 'home' && (
              <div className="w-full space-y-6">
                {/* Header / Hero Card */}
                <div className={`${heroStyle.cardBg} rounded-[4rem] p-10 shadow-[0_35px_60px_-15px_rgba(0,26,51,0.3)] relative overflow-hidden animate-in zoom-in duration-500`}>
                  <div className={`absolute -top-20 -right-20 w-64 h-64 ${heroStyle.blobColor} opacity-10 rounded-full blur-3xl`}></div>
                  <p className={`${heroStyle.accentColor} font-black italic uppercase tracking-widest text-sm mb-2`}>Operativo</p>
                  <h1 className={`${heroStyle.textColor} font-black italic leading-none mb-4 truncate w-full ${Math.max(userData?.nome?.length || 0, userData?.cognome?.length || 0) > 12 ? "text-xl md:text-3xl" : "text-2xl md:text-4xl"}`}>{userData?.nome}<br/>{userData?.cognome}</h1>
                  <div className="flex items-center gap-4 mt-6">
                    <div className={`${heroStyle.iconBg} p-3 rounded-2xl relative`}>
                        <Shield size={24} className={heroStyle.iconColor} />
                        {hasNewDocs && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
                    </div>
                    <div><p className={`${heroStyle.subTextColor} text-xs uppercase font-bold tracking-tight`}>Ruolo / Sede</p><p className={`${heroStyle.textColor} font-bold italic`}>{userData?.ruolo} / {userData?.sede}</p></div>
                  </div>
                </div>

                {/* Widget Stato Allerte (Bollettino + GL) */}
                <div className="grid grid-cols-2 gap-4 w-full">
                    {/* Widget Bollettino Regionale */}
                    <div onClick={() => setSubPage('allerta_view')} className={`p-5 rounded-[2rem] shadow-lg border-b-4 cursor-pointer transition-all active:scale-95 flex flex-col justify-between relative overflow-hidden ${getColorClass(meteoData.oggi)}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">{getWeatherIcon(meteoData.oggi)}</div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Bollettino</p>
                            <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">{meteoData.oggi}</h3>
                            <p className="text-[9px] font-bold mt-1 opacity-70 truncate">{meteoData.zona}</p>
                        </div>
                    </div>

                    {/* Widget Allerta GL (Interna) */}
                    <div onClick={() => setSubPage('allerta_view')} className={`p-5 rounded-[2rem] shadow-lg border-b-4 cursor-pointer transition-all active:scale-95 flex flex-col justify-between relative overflow-hidden ${attivazioniAttive.length > 0 ? getColorClass(attivazioniAttive[0].colore) : 'bg-white border-gray-100'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div className={`p-3 rounded-2xl backdrop-blur-sm ${attivazioniAttive.length > 0 ? 'bg-white/20' : 'bg-gray-100'}`}>
                                {attivazioniAttive.length > 0 ? <Megaphone size={32} className="text-white"/> : <Shield size={32} className="text-gray-300"/>}
                            </div>
                        </div>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${attivazioniAttive.length > 0 ? 'opacity-80 text-white' : 'text-gray-400'}`}>Allerta GL</p>
                            <h3 className={`text-xl font-black uppercase italic tracking-tighter leading-none ${attivazioniAttive.length > 0 ? 'text-white' : 'text-gray-300'}`}>
                                {attivazioniAttive.length > 0 ? attivazioniAttive[0].colore : 'NESSUNA'}
                            </h3>
                            {attivazioniAttive.length > 0 && <p className="text-[9px] font-bold mt-1 opacity-70 truncate text-white">{attivazioniAttive[0].titolo}</p>}
                        </div>
                    </div>
                </div>

                {/* SEZIONE NEWS (Nuova) */}
                <div className="mt-8 w-full">
                  <div className="flex justify-between items-center px-1 mb-4">
                    <h4 className="text-[#001a33] font-black text-xl italic uppercase tracking-tight">News</h4>
                    <button onClick={() => { setSelectedNews(null); setSubPage('news_view'); }} className="text-[#001a33]/50 text-[10px] font-black uppercase tracking-widest">Vedi Tutte</button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {newsFeed.length > 0 ? newsFeed.slice(0, 5).map((news) => (
                      <div key={news.id} onClick={() => { setSelectedNews(news); setSubPage('news_view'); }} className="snap-start shrink-0 w-[85%] aspect-[16/10] rounded-[2.5rem] bg-cover bg-center relative overflow-hidden shadow-lg bg-white cursor-pointer active:scale-95 transition-transform" style={{ backgroundImage: `url('${getDriveImgUrl(news.imgAnteprima) || APP_LOGO}')` }}>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#001a33]/90"></div>
                        <div className="absolute bottom-0 left-0 p-5 w-full">
                          <span className={`${news.importante ? 'bg-red-600 text-white' : 'bg-[#FFCC00] text-[#001a33]'} text-[9px] font-black px-2 py-0.5 rounded-full uppercase mb-2 inline-block`}>{news.importante ? 'Importante' : 'Avviso'}</span>
                          <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 uppercase">{news.titolo}</h3>
                        </div>
                      </div>
                    )) : (
                       <div className="snap-start shrink-0 w-[85%] aspect-[16/10] rounded-[2.5rem] bg-gray-100 flex items-center justify-center shadow-inner">
                          <p className="text-gray-400 font-bold text-sm">Nessuna news recente</p>
                       </div>
                    )}
                  </div>
                </div>

                {/* Grid Funzioni Operative */}
                <div className="grid grid-cols-2 gap-6 mt-4">
                  <button onClick={() => setSubPage('allerta_view')} className={`${attivazioniAttive.length > 0 ? getColorClass(attivazioniAttive[0].colore).replace('text-white', '') : 'bg-white'} rounded-[3.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center gap-4 transition-transform active:scale-95 relative overflow-hidden group`}>
                    <div className={`absolute inset-0 ${attivazioniAttive.length > 0 ? 'bg-white/10' : 'bg-red-500'} transition-opacity ${attivazioniAttive.length > 0 ? 'opacity-20 animate-pulse' : 'opacity-0 group-active:opacity-10'}`}></div>
                    <div className={`${attivazioniAttive.length > 0 ? 'bg-white/20' : 'bg-red-50'} p-5 rounded-[2rem]`}>{attivazioniAttive.length > 0 ? getWeatherIcon(attivazioniAttive[0].colore) : <Shield size={32} className="text-red-600" />}</div>
                    <span className={`font-black italic uppercase text-sm md:text-lg ${attivazioniAttive.length > 0 ? 'text-white' : 'text-red-600'}`}>Allerta</span>
                  </button>
                  <button onClick={() => setSubPage('campagna_aib')} className={`${isAibSeason ? 'bg-orange-600' : 'bg-white'} rounded-[3.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center gap-4 transition-transform active:scale-95 border border-orange-100`}>
                    <div className={`${isAibSeason ? 'bg-white/20' : 'bg-orange-50'} p-5 rounded-[2rem]`}><Flame size={32} className={`${isAibSeason ? 'text-white' : 'text-orange-600'}`} /></div>
                    <span className={`font-black italic uppercase text-sm md:text-lg text-center leading-tight ${isAibSeason ? 'text-white' : 'text-orange-600'}`}>Campagna<br/>AIB</span>
                  </button>
                  <button onClick={() => setSubPage('live_diretta')} className="bg-white rounded-[3.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center gap-4 transition-transform active:scale-95 border border-red-100">
                    <div className="bg-red-50 p-5 rounded-[2rem]"><Video size={32} className="text-red-600" /></div><span className="font-black italic uppercase text-sm md:text-lg text-red-600">Diretta</span>
                  </button>
                  <button onClick={() => setSubPage('sede_hub')} className="bg-white rounded-[3.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center gap-4 transition-transform active:scale-95">
                    <div className="bg-blue-50 p-5 rounded-[2rem]"><Home size={32} className="text-[#001a33]" /></div><span className="font-black italic uppercase text-sm md:text-lg">Sede</span>
                  </button>
                  <button onClick={() => setSubPage('modules_view')} className="bg-white rounded-[3.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center gap-4 transition-transform active:scale-95">
                    <div className="bg-blue-50 p-5 rounded-[2rem]"><Shield size={32} className="text-[#001a33]" /></div><span className="font-black italic uppercase text-sm md:text-lg">Moduli</span>
                  </button>
                  {showProgettiBtn && (
                    <button onClick={() => setSubPage('progetti_view')} className="bg-white rounded-[3.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center gap-4 transition-transform active:scale-95">
                      <div className="bg-blue-50 p-5 rounded-[2rem]"><FolderKanban size={32} className="text-[#001a33]" /></div><span className="font-black italic uppercase text-sm md:text-lg">Progetti</span>
                    </button>
                  )}
                  {canAccessSalaOperativa && (
                    <button onClick={() => setSubPage('sala_operativa')} className="bg-white rounded-[3.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center gap-4 transition-transform active:scale-95">
                      <div className="bg-red-50 p-5 rounded-[2rem]"><Radio size={32} className="text-red-600" /></div><span className="font-black italic uppercase text-sm md:text-lg">Sala Op.</span>
                    </button>
                  )}
                  <button onClick={() => setSubPage('disponibilita_view')} className="bg-white rounded-[3.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center gap-4 transition-transform active:scale-95">
                    <div className="bg-blue-50 p-5 rounded-[2rem]"><CalendarIcon size={32} className="text-[#001a33]" /></div><span className="font-black italic uppercase text-sm md:text-lg">Turni</span>
                  </button>
                  <button onClick={() => setSubPage('corsi_view')} className="bg-white rounded-[3.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center gap-4 transition-transform active:scale-95">
                    <div className="bg-blue-50 p-5 rounded-[2rem]"><BookOpen size={32} className="text-[#001a33]" /></div><span className="font-black italic uppercase text-sm md:text-lg">Corsi</span>
                  </button>
                  <button onClick={() => setSubPage('settings_view')} className="bg-white rounded-[3.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center gap-4 transition-transform active:scale-95">
                    <div className="bg-blue-50 p-5 rounded-[2rem]"><Settings size={32} className="text-[#001a33]" /></div><span className="font-black italic uppercase text-sm md:text-lg">Impostazioni</span>
                  </button>
                  {userData?.ruolo === 'superadmin' && (
                    <button onClick={() => setSubPage('logs_view')} className="bg-white rounded-[3.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center gap-4 transition-transform active:scale-95">
                      <div className="bg-blue-50 p-5 rounded-[2rem]"><ClipboardList size={32} className="text-[#001a33]" /></div><span className="font-black italic uppercase text-sm md:text-lg">Log</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tessera' && (
              <div className="w-full animate-in zoom-in duration-500 font-sans text-pcgl-text-dark">
                <div id="tesserino-card" className={`w-full bg-white rounded-2xl shadow-xl overflow-hidden border-t-4 ${getRoleBorderColor(userData?.ruolo)} print:shadow-none print:border-none`}>
                   <div className="p-8 flex flex-col items-center text-center bg-gray-50/80 border-b border-gray-100">
                      {(userData.fotoProfilo || cachedProfilePic) && <img src={cachedProfilePic || userData.fotoProfilo} className="w-28 h-28 rounded-2xl border-4 border-pcgl-yellow shadow-md object-cover mb-4" />}
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Socio Certificato</p>
                      <h2 className="text-3xl font-black uppercase leading-tight text-pcgl-blue mb-2 tracking-tighter break-words w-full px-4">{userData?.nome} {userData?.cognome}</h2>
                      <p className="text-lg font-bold text-gray-500 uppercase tracking-wide">{userData?.sede}</p>
                   </div> 
                   <div className="p-8 flex flex-col items-center">
                      <div className="p-6 bg-white rounded-2xl shadow-md border-2 border-dashed border-gray-200 mb-6 flex items-center justify-center">
                         <img src={getQrCodeUrl(userData)} alt="QR Code" className="w-40 h-40 object-contain mix-blend-multiply" />
                      </div>
                      <p className="font-mono font-black text-2xl text-pcgl-blue tracking-widest mb-6 leading-none uppercase text-center">{userData?.numeroTessera}</p>
                      <div className={`px-6 py-3 rounded-full font-bold text-white text-sm shadow-lg tracking-wide ${userData?.stato === 'attivo' ? 'bg-green-600' : 'bg-orange-500 animate-pulse'}`}>{userData?.stato === 'attivo' ? 'OPERATIVO' : 'PENDENTE'}</div>
                       <div className="flex gap-4 mt-8 print:hidden">
                           <button onClick={printTesserino} className="flex items-center text-pcgl-blue font-bold uppercase text-xs tracking-widest hover:text-pcgl-yellow transition-colors"><Download size={16} className="mr-2"/> PDF</button>
                           <button onClick={shareTesserino} className="flex items-center text-pcgl-blue font-bold uppercase text-xs tracking-widest hover:text-pcgl-yellow transition-colors"><Share2 size={16} className="mr-2"/> Condividi</button>
                       </div>
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'gestione' && userData?.ruolo !== 'volontario' && (
              <div className="w-full space-y-8 animate-in slide-in-from-bottom duration-700 pb-32 text-center font-sans text-pcgl-text-dark">
                <h2 className="text-4xl font-black italic text-pcgl-blue leading-none tracking-tighter uppercase">Comando</h2>
                {pendingVolunteers.length > 0 && (
                  <div className="bg-pcgl-blue p-6 rounded-2xl shadow-xl text-white">
                    <h3 className="font-bold text-xl text-pcgl-yellow mb-4 tracking-wide uppercase">Iscrizioni ({pendingVolunteers.length})</h3>
                    <div className="space-y-3">
                      {pendingVolunteers.map(v => ( 
                        <div key={v.id} className="flex justify-between items-center bg-white/10 p-4 rounded-lg border border-white/5 shadow-inner hover:bg-white/20 transition-colors">
                            <div className="text-left cursor-pointer" onClick={() => { setSelectedVolunteer(v); setPreviousPage(null); setSubPage('volunteer_detail'); }}><p className="font-bold text-lg uppercase leading-tight mb-0.5">{v.nome} {v.cognome}</p><p className="text-xs font-medium text-white/60 tracking-wide uppercase">{v.cf}</p></div>
                            <div className="flex space-x-2">
                               {userData.ruolo === 'superadmin' ? (
                                 <div className="flex flex-col space-y-1">
                                   <button onClick={() => approveVolunteer(v.id, 'volontario')} className="bg-green-500 text-white px-2 py-1 rounded text-[10px] font-bold uppercase">Volontario</button>
                                   <button onClick={() => approveVolunteer(v.id, 'presidente')} className="bg-blue-500 text-white px-2 py-1 rounded text-[10px] font-bold uppercase">Presidente</button>
                                   <button onClick={() => approveVolunteer(v.id, 'coordinamento')} className="bg-purple-500 text-white px-2 py-1 rounded text-[10px] font-bold uppercase">Coord.</button>
                                   <button onClick={() => approveVolunteer(v.id, 'admin')} className="bg-orange-500 text-white px-2 py-1 rounded text-[10px] font-bold uppercase">Admin</button>
                                   <button onClick={() => openRejectionModal(v.id)} className="bg-red-500 text-white px-2 py-1 rounded text-[10px] font-bold uppercase">Rifiuta</button>
                                 </div>
                               ) : userData.ruolo === 'admin' ? (
                                 <div className="flex flex-col space-y-1">
                                    <button onClick={() => approveVolunteer(v.id, 'volontario')} className="bg-green-500 text-white px-2 py-1 rounded text-[10px] font-bold uppercase">Volontario</button>
                                    <button onClick={() => approveVolunteer(v.id, 'presidente')} className="bg-blue-500 text-white px-2 py-1 rounded text-[10px] font-bold uppercase">Presidente</button>
                                    <button onClick={() => approveVolunteer(v.id, 'coordinamento')} className="bg-purple-500 text-white px-2 py-1 rounded text-[10px] font-bold uppercase">Coord.</button>
                                    <button onClick={() => openRejectionModal(v.id)} className="bg-red-500 text-white px-2 py-1 rounded text-[10px] font-bold uppercase">Rifiuta</button>
                                 </div>
                               ) : userData.ruolo === 'presidente' ? (
                                 <button onClick={() => approveVolunteer(v.id)} className="bg-pcgl-yellow text-pcgl-blue p-2 rounded-lg shadow-md active:scale-90 transition-all hover:bg-pcgl-blue hover:text-pcgl-yellow"><Check size={20} strokeWidth={3} /></button>
                               ) : null}
                               {userData.ruolo === 'presidente' && <button onClick={() => openRejectionModal(v.id)} className="bg-red-500 text-white p-2 rounded-lg shadow-md active:scale-90 transition-all hover:bg-red-600"><Ban size={20} strokeWidth={3} /></button>}
                            </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                   {canAccessSalaOperativa && (
                     <button onClick={() => setSubPage('sala_operativa')} className="p-6 bg-red-50 text-red-600 border border-red-100 rounded-xl shadow-card flex flex-col items-center active:scale-95 transition-all hover:scale-[1.02] col-span-2">
                         <Radio size={64} />
                         <span className="text-xl font-bold mt-2 tracking-wide uppercase">Sala Operativa</span>
                     </button>
                   )}
                   <button onClick={() => setSubPage('news_gest')} className="p-6 bg-white rounded-xl shadow-card border border-gray-100 flex flex-col items-center active:scale-95 transition-all hover:scale-[1.02] hover:bg-pcgl-bg-light"><Megaphone size={48} color="pcgl-blue"/><span className="text-sm font-bold mt-2 text-gray-500 tracking-wide uppercase">News</span></button>
                   <button onClick={() => setSubPage('gestione_mezzi')} className="p-6 bg-white rounded-xl shadow-card border border-gray-100 flex flex-col items-center active:scale-95 transition-all hover:scale-[1.02] hover:bg-pcgl-bg-light"><Truck size={48} color="pcgl-blue"/><span className="text-sm font-bold mt-2 text-gray-500 tracking-wide uppercase">Mezzi</span></button>
                   <button onClick={() => setSubPage('allerta_gest')} className="p-6 bg-red-600 text-white rounded-xl shadow-xl flex flex-col items-center active:scale-95 transition-all col-span-2 shadow-red-900/40 hover:scale-[1.02] hover:bg-red-700"><TriangleAlert size={64}/><span className="text-xl font-bold mt-2 tracking-wide uppercase">Allerta GL</span></button>
                   {['coordinamento', 'admin', 'superadmin'].includes(userData.ruolo) && (
                     <>
                       <button onClick={() => setSubPage('gestione_corsi_admin')} className="p-6 bg-pcgl-blue text-pcgl-yellow rounded-xl shadow-xl flex flex-col items-center active:scale-95 transition-all col-span-2 border-b-2 border-pcgl-yellow/20 hover:scale-[1.02] hover:bg-blue-900/90"><UserCheck size={64}/><span className="text-xl font-bold mt-2 tracking-wide uppercase">Conferma Presenze</span></button>
                       <button onClick={() => setSubPage('documenti_gest')} className="p-6 bg-white border-2 border-pcgl-blue rounded-xl shadow-xl flex flex-col items-center active:scale-95 transition-all hover:scale-[1.02] hover:bg-pcgl-bg-light"><File size={48} color="pcgl-blue"/><span className="text-sm font-bold mt-2 text-gray-500 tracking-wide uppercase">Documenti</span></button>
                     </>
                   )}
                   {['presidente', 'coordinamento', 'admin', 'superadmin'].includes(userData.ruolo) && (
                    <button onClick={() => setSubPage('admin_search')} className="p-6 bg-white border-2 border-pcgl-blue rounded-xl shadow-xl flex flex-col items-center active:scale-95 transition-all hover:scale-[1.02] hover:bg-pcgl-bg-light"><Users size={64} color="pcgl-blue"/><span className="text-lg font-bold mt-2 tracking-wide uppercase text-pcgl-blue">Anagrafica</span></button>
                   )}
                   {['presidente', 'coordinamento', 'admin', 'superadmin'].includes(userData.ruolo) && (
                    <button onClick={() => setSubPage('verifica_volontario')} className="p-6 bg-white border-2 border-pcgl-blue rounded-xl shadow-xl flex flex-col items-center active:scale-95 transition-all hover:scale-[1.02] hover:bg-pcgl-bg-light"><ScanLine size={64} color="pcgl-blue"/><span className="text-lg font-bold mt-2 tracking-wide uppercase text-pcgl-blue">Verifica Socio</span></button>
                   )}
                   {['presidente', 'coordinamento', 'admin', 'superadmin'].includes(userData.ruolo) && (
                    <button onClick={() => setSubPage('stats_view')} className="p-6 bg-white border-2 border-pcgl-blue rounded-xl shadow-xl flex flex-col items-center active:scale-95 transition-all hover:scale-[1.02] hover:bg-pcgl-bg-light"><BarChart3 size={64} color="pcgl-blue"/><span className="text-lg font-bold mt-2 tracking-wide uppercase text-pcgl-blue">Statistiche</span></button>
                   )}
                   {['presidente', 'coordinamento', 'admin', 'superadmin'].includes(userData.ruolo) && (
                    <button onClick={() => setSubPage('sedi_list')} className="p-6 bg-white border-2 border-pcgl-blue rounded-xl shadow-xl flex flex-col items-center active:scale-95 transition-all hover:scale-[1.02] hover:bg-pcgl-bg-light"><Building size={64} color="pcgl-blue"/><span className="text-lg font-bold mt-2 tracking-wide uppercase text-pcgl-blue">Anagrafica Sedi</span></button>
                   )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      
      {/* Footer fisso sempre visibile (sotto la navbar) */}
      <FooterLinks fixed={true} className="pb-1 print:hidden" />

      {/* TOAST NOTIFICATION COMPONENT */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl z-[300] font-bold text-sm animate-in slide-in-from-top duration-300 flex items-center gap-3 border-2 ${toast.type === 'error' ? 'bg-red-600 text-white border-red-700' : 'bg-green-600 text-white border-green-700'}`}>
          {toast.type === 'error' ? <TriangleAlert size={24}/> : <CheckCircle size={24}/>}
          <span className="uppercase tracking-wide">{toast.message}</span>
        </div>
      )}

      {/* PERMISSIONS GUIDE OVERLAY */}
      {showPermissionsGuide && <PermissionsGuide onClose={() => {
        localStorage.setItem(`pcgl_setup_${appVersion}`, 'true');
        setShowPermissionsGuide(false);
        if ("Notification" in window && Notification.permission === 'granted') {
            initializeNotifications();
        }
        // Controlla changelog subito dopo il setup
        const changelogSeen = localStorage.getItem(`pcgl_changelog_${appVersion}`);
        if (!changelogSeen) setShowChangelog(true);
      }} />}

      {/* CHANGELOG OVERLAY */}
      {showChangelog && <ChangelogModal version={appVersion} onClose={() => {
        localStorage.setItem(`pcgl_changelog_${appVersion}`, 'true');
        setShowChangelog(false);
      }} />}

      {/* UPDATE MODAL */}
      {updateAvailable && <UpdateModal updateData={updateAvailable} onClose={() => setUpdateAvailable(null)} />}

      {/* MODALE REMINDER NOTIFICHE */}
      {showNotifReminder && (
        <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm text-center">
                <Bell size={48} className="text-pcgl-blue mx-auto mb-4 animate-bounce"/>
                <h3 className="text-xl font-black text-pcgl-blue uppercase mb-2">Attiva le Notifiche!</h3>
                <p className="text-sm text-gray-500 mb-6">Per ricevere le allerte in tempo reale è fondamentale abilitare le notifiche push.</p>
                <button onClick={() => { requestNotificationPermission(); setShowNotifReminder(false); }} className="w-full py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-lg mb-3">Attiva Ora</button>
                <button onClick={() => setShowNotifReminder(false)} className="text-xs text-gray-400 font-bold uppercase">Ricordamelo dopo</button>
            </div>
        </div>
      )}

      {/* MODALE PROMO MODULI */}
      {showModulesPromo && (
        <div className="fixed inset-0 z-[2100] bg-black/80 flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm text-center relative">
                <button onClick={() => handleClosePromo(false)} className="absolute top-4 right-4 text-gray-400"><X size={24}/></button>
                <Shield size={48} className="text-pcgl-blue mx-auto mb-4 animate-bounce"/>
                <h3 className="text-xl font-black text-pcgl-blue uppercase mb-2">Unisciti ai Moduli!</h3>
                <p className="text-sm text-gray-500 mb-6">I Moduli sono il pilastro operativo fondamentale del Gruppo Lucano! Candidati per dare il tuo contributo professionale.</p>
                
                <button onClick={() => handleClosePromo(true)} className="w-full py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-lg mb-4">Candidati Ora</button>
                
                <label className="flex items-center justify-center space-x-2 cursor-pointer text-xs text-gray-400 font-bold uppercase">
                    <input type="checkbox" checked={promoDontShowAgain} onChange={(e) => setPromoDontShowAgain(e.target.value)} className="rounded border-gray-300 text-pcgl-blue focus:ring-pcgl-blue"/>
                    <span>Non mostrare più</span>
                </label>
            </div>
        </div>
      )}

      {/* MODALE PRIVACY (EXISTING USERS) */}
      {showPrivacyBanner && (
        <div className="fixed inset-0 z-[2200] bg-black/80 flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md text-center relative">
                <button onClick={handlePrivacyConsent} className="absolute top-4 right-4 text-gray-400"><X size={24}/></button>
                <Shield size={48} className="text-pcgl-blue mx-auto mb-4"/>
                <h3 className="text-xl font-black text-pcgl-blue uppercase mb-2">Informativa Privacy</h3>
                <p className="text-sm text-gray-500 mb-6">
                    Abbiamo aggiornato la nostra informativa sulla privacy. Per continuare a utilizzare l'app, ti preghiamo di prenderne visione.
                    Chiudendo questa finestra acconsenti al trattamento dei dati.
                </p>
                <a href="https://www.pcgl.it/privacy.html" target="_blank" rel="noopener noreferrer" className="block w-full py-3 bg-gray-100 text-pcgl-blue rounded-xl font-bold uppercase mb-3 hover:bg-gray-200">Leggi Informativa</a>
                <button onClick={handlePrivacyConsent} className="w-full py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-lg">Ho Letto e Acconsento</button>
            </div>
        </div>
      )}

      {/* MODALE GUIDA PRESIDENTI */}
      {showPresidentGuide && (
        <div className="fixed inset-0 z-[2100] bg-black/80 flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md text-center relative">
                <button onClick={() => setShowPresidentGuide(false)} className="absolute top-4 right-4 text-gray-400"><X size={24}/></button>
                <Building size={48} className="text-pcgl-blue mx-auto mb-4 animate-bounce"/>
                <h3 className="text-xl font-black text-pcgl-blue uppercase mb-2">Benvenuto Presidente!</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Abbiamo introdotto la nuova sezione <strong>Anagrafica Sede</strong>.
                </p>
                <div className="bg-blue-50 p-4 rounded-xl text-left mb-6 border border-blue-100">
                    <p className="text-xs font-bold text-blue-800 uppercase mb-2">Cosa fare:</p>
                    <ul className="text-xs text-blue-900 space-y-1 list-disc pl-4">
                        <li>Carica il <strong>Logo</strong> della tua associazione.</li>
                        <li>Inserisci <strong>Codice Fiscale</strong>, <strong>Indirizzo</strong> e <strong>Contatti</strong>.</li>
                        <li>Aggiorna i dati logistici (Mezzi, Risorse).</li>
                    </ul>
                </div>
                
                <button onClick={handleDismissPresidentGuide} className="w-full py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-lg mb-2">Compila Ora</button>
                <button onClick={() => { localStorage.setItem('pcgl_president_guide_dismissed', 'true'); setShowPresidentGuide(false); }} className="text-xs text-gray-400 font-bold uppercase">Ricordamelo dopo</button>
            </div>
        </div>
      )}

      {/* MODALE COMPLETAMENTO PROFILO */}
      {showProfileWarning && (
        <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm text-center relative">
                <button onClick={() => { setShowProfileWarning(false); sessionStorage.setItem('pcgl_profile_warning_dismissed', 'true'); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24}/></button>
                <UserCheck size={48} className="text-orange-500 mx-auto mb-4"/>
                <h3 className="text-xl font-black text-pcgl-blue uppercase mb-2">Profilo Incompleto</h3>
                <p className="text-sm text-gray-500 mb-6">Per generare il tesserino digitale completo, inserisci i dati mancanti (Foto, Telefono, Indirizzo, Gruppo Sanguigno).</p>
                <button onClick={() => { setSubPage('fascicolo_edit'); setShowProfileWarning(false); }} className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold uppercase shadow-lg mb-3">Completa Profilo</button>
                <button onClick={() => { setShowProfileWarning(false); sessionStorage.setItem('pcgl_profile_warning_dismissed', 'true'); }} className="w-full font-bold uppercase text-xs text-gray-400 hover:text-pcgl-blue transition-colors">Ricordamelo dopo</button>
            </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black/50 z-[400] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowRejectionModal(false)}>
          <div className="bg-white p-6 rounded-3xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-xl text-red-600 mb-4 uppercase border-b pb-2">Rifiuta Iscrizione</h3>
            <p className="text-sm text-gray-500 mb-4">Inserisci una motivazione per il rifiuto. Verrà inviata via email al richiedente.</p>
            <textarea className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 mb-4 h-32 resize-none" placeholder="Motivazione..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}></textarea>
            <div className="flex gap-2">
              <button onClick={() => setShowRejectionModal(false)} className="flex-1 py-3 bg-gray-200 rounded-xl font-bold uppercase">Annulla</button>
              <button onClick={confirmRejection} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold uppercase shadow-lg">Conferma Rifiuto</button>
            </div>
          </div>
        </div>
      )}

      {/* CAMERA PERMISSION MODAL */}
      {showCameraPermissionModal && (
        <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm text-center relative">
                <button onClick={() => setShowCameraPermissionModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24}/></button>
                <Camera size={48} className="text-red-500 mx-auto mb-4 animate-bounce"/>
                <h3 className="text-xl font-black text-pcgl-blue uppercase mb-2">Fotocamera Bloccata</h3>
                <p className="text-sm text-gray-500 mb-6">
                    L'app non ha i permessi per utilizzare la fotocamera, necessari per scansionare i QR Code. 
                    Devi autorizzare l'accesso cliccando "Consenti" oppure modificando le impostazioni del browser (icona del lucchetto 🔒 nella barra in alto).
                </p>
                <button onClick={() => {
                    setShowCameraPermissionModal(false);
                    handleOpenScanner(scannerMode);
                }} className="w-full py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-lg mb-3">Riprova Accesso</button>
                <button onClick={() => setShowCameraPermissionModal(false)} className="text-xs text-gray-400 font-bold uppercase">Chiudi</button>
            </div>
        </div>
      )}

      {/* QR SCANNER OVERLAY */}
      {showScanner && <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} continuous={scannerMode === 'session_checkin'} />}

      {/* FOOTER NAV ULTRA-MODERNA */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md h-24 bg-white/70 backdrop-blur-2xl border border-white/20 rounded-[3rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] flex items-center justify-around px-4 z-50 print:hidden">
        <button onClick={() => { setActiveTab('home'); setSubPage(null); }} className={`p-4 transition-colors ${activeTab === 'home' ? 'text-[#001a33]' : 'text-[#001a33]/40 hover:text-[#001a33]'}`}><Home size={28} /></button>
        <button onClick={() => { setActiveTab('tessera'); setSubPage(null); }} className="bg-[#001a33] p-6 rounded-full -translate-y-8 shadow-[0_15px_30px_rgba(0,26,51,0.4)] border-8 border-[#f8fafc] text-[#FFCC00] transition-transform active:scale-90"><QrCode size={36} /></button>
        <button onClick={() => setSubPage('fascicolo_edit')} className="p-4 text-[#001a33]/40 hover:text-[#001a33] transition-colors relative">
            <User size={28} />
            {hasNewDocs && <span className="absolute top-4 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
        </button>
        {userData?.ruolo !== 'volontario' && (
           <button onClick={() => { setActiveTab('gestione'); setSubPage(null); }} className={`p-4 transition-colors relative ${activeTab === 'gestione' ? 'text-[#001a33]' : 'text-[#001a33]/40 hover:text-[#001a33]'}`}>
             <Settings size={28} />
             {pendingVolunteers.length > 0 && (
               <span className="absolute top-4 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
             )}
           </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  // CHECK ROTTA PUBBLICA PRESENZE
  const params = new URLSearchParams(window.location.search);
  const presenzaId = params.get('presenza');

  if (presenzaId) {
      return <PublicAttendance sessionId={presenzaId} />;
  }

  return (
    <ErrorBoundary>
      <InstallPWA />
      <AppContent />
    </ErrorBoundary>
  );
}