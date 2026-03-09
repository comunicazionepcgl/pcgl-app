PCGL App - Master Development Instructions
1. Progetto & Obiettivo
L'app è il sistema gestionale operativo mobile della Protezione Civile Gruppo Lucano (PCGL.IT). Deve fungere da ponte tra i volontari sul campo e la centrale operativa su Aruba.

2. Stack Tecnologico
Frontend: React.js con Vite.

Database & Auth: Firebase (Firestore & Authentication).

Icone: Lucide-react.

UI: Tailwind CSS (Approccio Mobile-First, Full-Screen, Premium Glassmorphism).

Colori Sociali: Blu (#001a33) e Giallo (#FFCC00).

3. Gerarchia Utenti & Permessi
Ogni utente ha un campo ruolo e uno stato:

Volontario: Accesso a News, Monitoraggio, Formazione, Fascicolo e Tesserino.

Presidente: Gestisce la propria Sede (Approvazione nuovi soci, gestione mezzi).

Coordinamento: Gestione Regionale (Magazzino, Validazione Corsi).

Admin/SuperAdmin: Accesso totale al database e anagrafica globale.

Stato: Se pendente, l'utente non è operativo. Deve essere approvato dal Presidente.

4. Logica del "Fascicolo del Volontario"
Il fascicolo è il documento d'identità tecnico del socio. Contiene:

Dati Anagrafici: Nome, Cognome, Data/Luogo Nascita, Codice Fiscale (CF).

Competenze: Specializzazioni e Patenti (inserite manualmente dal volontario).

Storico Formazione: Aggiornato automaticamente. Quando un Admin conferma la presenza a un corso (iscrizioni_corsi), il sistema deve spostare il dato nel campo fascicoloCorsi dell'utente e rimuovere la richiesta.

5. Funzionalità Critiche
Sentinel System: Banner di notifica rosso gigante in top-overlay se esiste un documento attivo in attivazioni.

Monitoraggio: Invio dati GPS e report testuali alla collezione reports_monitoraggio (letta dal sito Aruba).

Tesserino: Deve mostrare QR Code, Numero Tessera, Stato e Foto Profilo (se presente).

6. Regole d'Oro per l'Agente AI (VS Code)
NESSUNA OMISSIONE: Non rimuovere mai funzioni esistenti, loop di dati (map) o logiche di Firebase per "brevità". Fornisci sempre il codice integrale.

FULL-SCREEN UI: Mantieni i padding larghi (p-10+), i bordi molto arrotondati (rounded-[4rem]) e pulsanti giganti adatti all'uso con i guanti o in emergenza.

FIREBASE BRIDGE: I nomi delle collezioni devono essere: users, news, attivazioni, corsi, risorse, iscrizioni_corsi, magazzino, reports_monitoraggio.

INTEGRITÀ: Prima di ogni modifica, analizza le dipendenze tra i permessi dei ruoli.