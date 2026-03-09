import { initializeApp } from 'firebase/app';
import { getFirestore, doc, runTransaction } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// INCOLLA QUI LA TUA CONFIGURAZIONE che hai copiato prima
const firebaseConfig = {
  apiKey: "AIzaSyCTy06UxO-WIscvmkexn18W0Pbu1ge15Co",
  authDomain: "pcgl-volontari.firebaseapp.com",
  projectId: "pcgl-volontari",
  storageBucket: "pcgl-volontari.firebasestorage.app",
  messagingSenderId: "1016276758253",
  appId: "1:1016276758253:web:4da6e91c29cff7e66e66e4"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Inizializza servizi
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Patch per evitare crash su Android/WebView con Notification API
if (typeof window !== 'undefined' && 'Notification' in window) {
  try {
    const _Notification = window.Notification;
    window.Notification = function (title, options) {
      try {
        return new _Notification(title, options);
      } catch (e) {
        console.warn('Notification error suppressed:', e);
        return { close: () => {} };
      }
    };
    Object.assign(window.Notification, _Notification);
    window.Notification.prototype = _Notification.prototype;
    if (_Notification.requestPermission) window.Notification.requestPermission = _Notification.requestPermission;
    Object.defineProperty(window.Notification, 'permission', { get: () => _Notification.permission });
  } catch (e) { console.error('Notification patch failed', e); }
}

// Funzione atomica per generare matricola univoca PCGL-YYYY-XXXX
export const generateTesserinoId = async () => {
  const settingsRef = doc(db, "settings", "tesserini");
  try {
    return await runTransaction(db, async (transaction) => {
      const settingsDoc = await transaction.get(settingsRef);
      let newNumber = 1;
      
      if (!settingsDoc.exists()) {
        // Se non esiste, lo inizializziamo a 1
        transaction.set(settingsRef, { last_number: newNumber });
      } else {
        const lastNumber = settingsDoc.data().last_number || 0;
        newNumber = lastNumber + 1;
        transaction.update(settingsRef, { last_number: newNumber });
      }
      const year = new Date().getFullYear();
      return `PCGL-${year}-${String(newNumber).padStart(4, '0')}`;
    });
  } catch (e) {
    console.error("Errore generazione matricola:", e);
    throw e;
  }
};

export default app;