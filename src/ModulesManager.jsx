import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, QrCode, LogOut, User, MapPin, Home, Megaphone, CheckCircle, Users, 
  Activity, ChevronLeft, TriangleAlert, Truck, Trash2, BookOpen,
  Search, Send, Plus, X, Bell, Info,
  Settings, Check, Camera, Award, Briefcase, UserCheck, Verified, CloudRain, UserMinus,
  FileText, Lock, File, ClipboardList, Ban, MessageCircle, Download, Mail, Printer, Clock, Map as MapIcon, BarChart3, Search as SearchIcon,
  Sun, CloudLightning, CloudOff, Eye, EyeOff, ScanLine, Calendar as CalendarIcon, Paperclip, MessageSquare, ClipboardCheck, PieChart, Phone, Building,
  FileSpreadsheet, AlertTriangle, Fuel, Pencil, Share2, Link as LinkIcon, GripVertical, Upload, Pause, Play, FolderKanban, Pin, UserPlus
} from 'lucide-react';
import { auth, db, storage } from './firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, query, onSnapshot, where, orderBy, limit, getDoc, doc, updateDoc, arrayUnion, arrayRemove, addDoc, deleteDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { HeaderSub } from './SharedUI';

export const ModulesManager = ({ currentUser, onBack, allUsers, onViewVolunteer, customForms = [], onFillForm }) => {
  const [modules, setModules] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [appUploading, setAppUploading] = useState(false);
  const [internalFormUploading, setInternalFormUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Admin States
  const [editingAdminModule, setEditingAdminModule] = useState(null);
  const [viewingRequests, setViewingRequests] = useState(null);
  const [moduleRequests, setModuleRequests] = useState([]);
  const [allPendingRequests, setAllPendingRequests] = useState([]); // Stato per tutte le richieste pendenti
  const [extraUsers, setExtraUsers] = useState({}); // Cache locale per utenti non in allUsers

  // Admin Search States (Per assegnazione responsabile)
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [adminSearchResults, setAdminSearchResults] = useState([]);

  // Docs States
  const [viewingDocsModuleId, setViewingDocsModuleId] = useState(null);
  const [moduleDocFile, setModuleDocFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [commentingDoc, setCommentingDoc] = useState(null); // Doc url per commenti
  const [docComments, setDocComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  // Forms States
  const [activeForms, setActiveForms] = useState([]);
  const [viewingForm, setViewingForm] = useState(null); // Form object per rispondere/vedere
  const [formAnswers, setFormAnswers] = useState({});
  const [formResponses, setFormResponses] = useState([]); // Per admin
  const [pollResults, setPollResults] = useState(null);
  const [pollResponses, setPollResponses] = useState([]);
  const pollUnsub = useRef(null);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [showPollPreview, setShowPollPreview] = useState(false);
  const [notifMode, setNotifMode] = useState('message'); // 'message' | 'form' | 'link_form'
  const [moduleMessages, setModuleMessages] = useState([]);
  const [formBuilder, setFormBuilder] = useState({ title: '', questions: [], expirationDate: '' });
  const [tempQuestion, setTempQuestion] = useState({ text: '', type: 'text', opzioni: [] });
  const [pollOptInput, setPollOptInput] = useState('');
  
  // Advanced Link Form States
  const [selectedLinkedFormId, setSelectedLinkedFormId] = useState('');
  const [requireForNew, setRequireForNew] = useState(false);
  
  // Editor States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [moduleForm, setModuleForm] = useState({ nome: '', descrizione: '', requisiti: [], domande: [], allowMemberUploads: false });
  const [reqInput, setReqInput] = useState('');
  const [qForm, setQForm] = useState({ testo: '', tipo: 'booleano', opzioni: [], requisitoAssociato: '' });
  const [optInput, setOptionInput] = useState('');

  // Application States
  const [applyingModule, setApplyingModule] = useState(null);
  const [applicationAnswers, setApplicationAnswers] = useState({});

  const [notifModal, setNotifModal] = useState(null);
  const [notifText, setNotifText] = useState('');
  const [printingModule, setPrintingModule] = useState(null);
  const [showMyModulesOnly, setShowMyModulesOnly] = useState(false);
  const [selectedMemberContact, setSelectedMemberContact] = useState(null);

  const activeModuleDocs = modules.find(m => m.id === viewingDocsModuleId);

  const applyingLinkedForm = applyingModule ? (applyingModule.fetchedLinkedForm || (applyingModule.linkedFormId ? customForms.find(f => f.id === applyingModule.linkedFormId) : null)) : null;
  const applyingAllQuestions = applyingModule ? [
      ...(applyingModule.domande || []),
      ...(applyingLinkedForm?.questions || []).map(q => ({
          id: q.id,
          testo: q.text,
          tipo: q.type === 'boolean' ? 'booleano' : q.type === 'text' ? 'testo' : q.type === 'choice' ? 'scelta' : q.type,
          opzioni: q.options,
          minDate: q.minDate,
          maxDate: q.maxDate
      }))
  ] : [];

  useEffect(() => {
    const q = query(collection(db, 'moduli'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setModules(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => console.error("Modules sync error:", error));
    return () => unsubscribe();
  }, []);

  // SYNC RICHIESTE PENDENTI (Per Badge Notifica)
  useEffect(() => {
    // Ascolta tutte le richieste in attesa per mostrare i badge sui moduli
    if (['admin', 'superadmin', 'coordinamento'].includes(currentUser.ruolo)) {
        const q = query(collection(db, 'richieste_modulo'), where('stato', '==', 'in_attesa'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          setAllPendingRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => console.warn("Error syncing requests (Badge):", error));
        return () => unsubscribe();
    }
  }, [currentUser.ruolo]);

  // SYNC COMMENTI DOCUMENTO
  useEffect(() => {
    if (commentingDoc && commentingDoc.url) {
        // Usa un ID sicuro basato sull'URL del documento
        const docId = btoa(commentingDoc.url).substring(0, 20); 
        const q = query(collection(db, 'module_doc_comments'), where('docUrl', '==', commentingDoc.url), orderBy('date', 'asc'));
        const unsub = onSnapshot(q, (s) => {
            setDocComments(s.docs.map(d => d.data()));
        }, (error) => console.error("Comments sync error:", error));
        return () => unsub();
    }
  }, [commentingDoc]);

  useEffect(() => {
      if (viewingRequests) { 
          const qReq = query(collection(db, 'richieste_modulo'), where('moduloId', '==', viewingRequests), where('stato', '==', 'in_attesa'));
          const unsubReq = onSnapshot(qReq, (s) => setModuleRequests(s.docs.map(d => ({ id: d.id, ...d.data() }))));
          
          const qForms = query(collection(db, 'module_forms'), where('moduleId', '==', viewingRequests));
          const unsubForms = onSnapshot(qForms, (s) => setActiveForms(s.docs.map(d => ({ id: d.id, ...d.data() }))));
          
          const qMsg = query(collection(db, 'moduli', viewingRequests, 'chat'), orderBy('date', 'desc'), limit(50));
          const unsubMsg = onSnapshot(qMsg, (s) => setModuleMessages(s.docs.map(d => ({ id: d.id, ...d.data() }))));

          return () => { unsubReq(); unsubForms(); unsubMsg(); };
      }
  }, [viewingRequests]);

  const fetchMyRequests = async () => {
      if (!currentUser?.uid) return;
      try {
          const token = await auth.currentUser.getIdToken();
          const response = await fetch('https://europe-west1-pcgl-volontari.cloudfunctions.net/getUserModuleRequests', {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
              const data = await response.json();
              setMyRequests(data);
          }
      } catch (e) { console.error("Errore fetch richieste:", e); }
  };

  useEffect(() => {
      fetchMyRequests();
  }, [currentUser]);

  // Cleanup listener al dismount
  useEffect(() => {
    return () => { if (pollUnsub.current) pollUnsub.current(); };
  }, []);

  // Recupera dati utenti mancanti (per admin modulo che non vedono allUsers)
  useEffect(() => {
    const fetchMissingUsers = async () => {
        const uidsToFetch = new Set();
        
        // 1. Fetch Admins of all modules (to show "Responsabile: ...")
        modules.forEach(m => { if(m.adminId) uidsToFetch.add(m.adminId); });

        // 2. Fetch Members of the currently viewed module (dashboard)
        if (viewingRequests) {
            const m = modules.find(mod => mod.id === viewingRequests);
            if (m && m.membri) m.membri.forEach(uid => uidsToFetch.add(uid));
        }
        
        const missing = [...uidsToFetch].filter(uid => uid && !allUsers.find(u => u.id === uid) && !extraUsers[uid]);

        for (const uid of missing) {
            try {
                const snap = await getDoc(doc(db, 'users_public', uid)); // solo dati pubblici (nome, sede...)
                if (snap.exists()) setExtraUsers(prev => ({...prev, [uid]: {id: uid, ...snap.data()}}));
            } catch (e) { console.error("Error fetching user", uid, e); }
        }
    };
    fetchMissingUsers();
  }, [modules, currentUser.uid, allUsers, viewingRequests]);

  const handleApply = async (module) => {
      let currentModule = { ...module };
      
      // Fetch linked form se non è in cache
      if (currentModule.linkedFormId && !customForms.find(f => f.id === currentModule.linkedFormId)) {
          try {
              const snap = await getDoc(doc(db, 'custom_forms', currentModule.linkedFormId));
              if (snap.exists()) {
                  currentModule.fetchedLinkedForm = { id: snap.id, ...snap.data() };
              }
          } catch (e) {
              console.error("Error fetching linked form", e);
          }
      }

      // Se ci sono domande native OPPURE un form collegato, apri il modale
      if ((currentModule.domande && currentModule.domande.length > 0) || currentModule.linkedFormId) {
          setApplyingModule(currentModule);
          return;
      }
      // Altrimenti invia richiesta diretta
      await sendApplication(currentModule, []);
  };

  const handleInternalFormFileUpload = async (e, qIndex) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { alert("File troppo grande (Max 10MB)"); return; }
      
      setInternalFormUploading(true);
      try {
          const storageRef = ref(storage, `module_form_attachments/${viewingForm.id}/${currentUser.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          
          setFormAnswers(prev => ({ ...prev, [qIndex]: { name: file.name, url: url, type: 'file' } }));
          alert("File caricato!");
      } catch (err) {
          console.error(err);
          alert("Errore caricamento file.");
      } finally { setInternalFormUploading(false); }
  };

  const handleAppFileUpload = async (e, qId) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { alert("File troppo grande (Max 10MB)"); return; }
      
      setAppUploading(true);
      try {
          const storageRef = ref(storage, `application_attachments/${applyingModule.id}/${currentUser.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          
          setApplicationAnswers(prev => ({ ...prev, [qId]: { name: file.name, url: url, type: 'file' } }));
          alert("File caricato!");
      } catch (err) {
          console.error(err);
          alert("Errore caricamento file.");
      } finally { setAppUploading(false); }
  };

  const sendApplication = async (module, answers) => {
      try {
          const token = await auth.currentUser.getIdToken();
          const response = await fetch('https://europe-west1-pcgl-volontari.cloudfunctions.net/createModuleRequest', {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  moduloId: module.id,
                  nomeModulo: module.nome,
                  risposte: answers
              })
          });
          if (!response.ok) throw new Error("Errore server durante l'invio della richiesta.");

          alert("Richiesta inviata!");
          setApplyingModule(null);
          setApplicationAnswers({});
          fetchMyRequests(); // Aggiorna la lista
      } catch (e) { console.error(e); alert("Errore invio richiesta: " + e.message); }
  };

  const submitApplication = (e) => {
    e.preventDefault();
    if (!applyingModule) return;
    
    const linkedForm = applyingModule.fetchedLinkedForm || (applyingModule.linkedFormId ? customForms.find(f => f.id === applyingModule.linkedFormId) : null);

    const baseAnswers = applyingModule.domande ? applyingModule.domande.map(q => ({
        domanda: q.testo,
        risposta: applicationAnswers[q.id] === undefined ? ((q.tipo === 'booleano' || q.type === 'boolean') ? false : '') : applicationAnswers[q.id],
        requisitoAssociato: q.requisitoAssociato || null
    })) : [];

    const linkedAnswers = linkedForm?.questions ? linkedForm.questions.map(q => ({
        domanda: q.text,
        risposta: applicationAnswers[q.id] === undefined ? ((q.type === 'boolean' || q.tipo === 'booleano') ? false : '') : applicationAnswers[q.id],
        requisitoAssociato: null
    })) : [];

    const formattedAnswers = [...baseAnswers, ...linkedAnswers];
    sendApplication(applyingModule, formattedAnswers);
  };

  const handleBachecaClick = (message, module) => {
    if (message.tipo === 'link_form') {
        const formId = message.linkedFormId || module.linkedFormId;
        if (formId) {
            onFillForm(formId);
        } else {
            alert("ID del modulo collegato non trovato.");
        }
    } else if (message.tipo === 'form') {
        if (message.formId) {
            const formToOpen = activeForms.find(f => f.id === message.formId);
            if (formToOpen) {
                if (formToOpen.expirationDate && new Date() > new Date(formToOpen.expirationDate)) {
                    if (!canManage(module)) {
                        alert("Questo sondaggio è scaduto e non può più essere compilato.");
                        return;
                    }
                    alert("Sondaggio scaduto (Accesso Gestore)");
                }
                setViewingForm(formToOpen);
            } else {
                getDoc(doc(db, 'module_forms', message.formId)).then(snap => {
                    if (snap.exists()) setViewingForm({ id: snap.id, ...snap.data() });
                    else alert("Sondaggio non trovato o eliminato.");
                }).catch(e => alert("Errore nel recuperare il sondaggio."));
            }
        }
    }
  };

  const openPollResults = (formId) => {
    const form = activeForms.find(f => f.id === formId);
    if (!form) return alert("Sondaggio non trovato.");
    
    setPollResults(form);
    if (pollUnsub.current) pollUnsub.current();

    // Sincronizzazione Real-Time delle risposte
    const q = query(collection(db, 'module_form_responses'), where('formId', '==', formId));
    pollUnsub.current = onSnapshot(q, (snapshot) => {
        setPollResponses(snapshot.docs.map(d => d.data()));
    }, (err) => console.error("Poll results sync error:", err));
  };

  const addQuestionToPoll = () => {
      if (!tempQuestion.text) return;
      setFormBuilder(prev => ({
          ...prev,
          questions: [...prev.questions, { ...tempQuestion, id: Date.now().toString() }]
      }));
      setTempQuestion({ text: '', type: 'text', opzioni: [] });
      setPollOptInput('');
  };

  const handleSaveInternalForm = async (module) => {
      if (!formBuilder.title || formBuilder.questions.length === 0) return alert("Titolo e almeno una domanda sono obbligatori.");
      try {
          await addDoc(collection(db, 'module_forms'), {
              moduleId: module.id,
              moduleName: module.nome,
              title: formBuilder.title.toUpperCase(),
              questions: formBuilder.questions,
              expirationDate: formBuilder.expirationDate || null,
              createdAt: new Date().toISOString(),
              createdBy: currentUser.uid,
              targetMembers: module.membri
          });
          setFormBuilder({ title: '', questions: [], expirationDate: '' });
          setShowFormBuilder(false);
          setShowPollPreview(false);
          alert("Sondaggio creato con successo!");
      } catch (e) { console.error(e); alert("Errore durante il salvataggio."); }
  };

  const handleAdminAction = async (reqId, action) => {
      try {
          await updateDoc(doc(db, 'richieste_modulo', reqId), {
              stato: action === 'approve' ? 'approvata' : 'rifiutata',
              dataValutazione: new Date().toISOString(),
              valutatoDa: currentUser.uid
          });
      } catch (e) { console.error(e); }
  };

  const handleLeave = async (moduleId) => {
    if (!moduleId) return;
    if (window.confirm("Sei sicuro di voler lasciare questo modulo?")) {
      try {
        await updateDoc(doc(db, 'moduli', moduleId), { membri: arrayRemove(currentUser.uid) });
      } catch (error) { console.error("Errore uscita:", error); }
    }
  };

  const handleRemoveMember = async (moduleId, userId) => {
    if (!moduleId || !userId) return;
    if (window.confirm("Rimuovere questo volontario dal modulo?")) {
      try {
        await updateDoc(doc(db, 'moduli', moduleId), { membri: arrayRemove(userId) });
      } catch (error) { console.error("Errore rimozione:", error); }
    }
  };

  const handleSendMessage = async (module) => {
    if (!notifText.trim() && notifMode === 'message') return;

    const payload = {
        text: notifText,
        author: `${currentUser.nome} ${currentUser.cognome}`,
        date: new Date().toISOString(),
        tipo: notifMode
    };

    if (notifMode === 'link_form') {
        if (!selectedLinkedFormId) return alert("Seleziona un modulo HQ");
        payload.linkedFormId = selectedLinkedFormId;
    } else if (notifMode === 'form') {
        if (!selectedLinkedFormId) return alert("Seleziona un sondaggio");
        payload.formId = selectedLinkedFormId;
    }

    try {
        await addDoc(collection(db, 'moduli', module.id, 'chat'), payload);
        
        const token = await auth.currentUser.getIdToken();
        await fetch('https://europe-west1-pcgl-volontari.cloudfunctions.net/sendModuleNotification', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ moduleId: module.id, title: `Avviso: ${module.nome}`, body: notifText || "Nuovo modulo disponibile in bacheca" })
        });
        
        setNotifText('');
        setSelectedLinkedFormId('');
        setNotifMode('message');
        alert("Messaggio e notifica inviati!");
    } catch (e) { console.error(e); alert("Errore invio messaggio."); }
  };

  const handleUploadModuleDoc = async () => {
      if (!activeModuleDocs || !moduleDocFile) { alert("Seleziona un file."); return; }
      if (moduleDocFile.size > 10 * 1024 * 1024) { alert("File troppo grande (Max 10MB)."); return; }
      setUploadingDoc(true);
      
      try {
          const storageRef = ref(storage, `module_docs/${activeModuleDocs.id}/${Date.now()}_${moduleDocFile.name}`);
          await uploadBytes(storageRef, moduleDocFile);
          const url = await getDownloadURL(storageRef);
          
          await updateDoc(doc(db, 'moduli', activeModuleDocs.id), {
              documenti: arrayUnion({
                  nome: moduleDocFile.name,
                  url: url,
                  data: new Date().toISOString(),
                  autore: `${currentUser.nome} ${currentUser.cognome}`,
                  uid: currentUser.uid
              })
          });
          
          setModuleDocFile(null);
          alert("Documento caricato!");
      } catch (e) {
          console.error(e);
          alert("Errore caricamento documento");
      } finally {
          setUploadingDoc(false);
      }
  };

  const handleDeleteModuleDoc = async (docData) => {
      if (!activeModuleDocs || !activeModuleDocs.id) return;
      // Permessi: Autore del doc, Admin globale, o Admin del modulo
      const isAuthor = docData.uid === currentUser.uid;
      const isGlobalAdmin = ['admin', 'superadmin'].includes(currentUser.ruolo);
      const isModuleAdmin = activeModuleDocs.adminId === currentUser.uid;

      if (!isAuthor && !isGlobalAdmin && !isModuleAdmin) {
          alert("Non hai i permessi per eliminare questo documento.");
          return;
      }

      if (confirm("Eliminare questo documento?")) {
          try {
              await updateDoc(doc(db, 'moduli', activeModuleDocs.id), {
                  documenti: arrayRemove(docData)
              });
          } catch (e) { console.error(e); alert("Errore rimozione."); }
      }
  };

  const handleAddComment = async () => {
      if (!newComment.trim() || !commentingDoc) return;
      await addDoc(collection(db, 'module_doc_comments'), {
          docUrl: commentingDoc.url, moduleId: activeModuleDocs.id, text: newComment, author: `${currentUser.nome} ${currentUser.cognome}`, uid: currentUser.uid, date: new Date().toISOString()
      });
      setNewComment('');
  };

  const searchAdminUser = async () => {
      if (!adminSearchTerm || adminSearchTerm.length < 3) return;
      const q = query(collection(db, 'users'), where('cognome', '>=', adminSearchTerm.toUpperCase()), where('cognome', '<=', adminSearchTerm.toUpperCase() + '\uf8ff'), limit(5));
      const snap = await getDocs(q);
      setAdminSearchResults(snap.docs.map(d => ({id: d.id, ...d.data()})));
  };

  // --- EDITOR LOGIC ---
  const openEditor = (module = null) => {
      if (module) {
          setEditingModuleId(module.id);
          setModuleForm({
              nome: module.nome,
              descrizione: module.descrizione,
              requisiti: module.requisiti || [],
              domande: module.domande || [],
              allowMemberUploads: module.allowMemberUploads || false
          });
      } else {
          setEditingModuleId(null);
          setModuleForm({ nome: '', descrizione: '', requisiti: [], domande: [], allowMemberUploads: false });
      }
      setIsEditorOpen(true);
  };

  const saveModule = async () => {
      if (!moduleForm.nome) return alert("Inserisci il nome del modulo");
      const payload = { ...moduleForm, nome: moduleForm.nome.toUpperCase() };
      try {
          if (editingModuleId) {
              await updateDoc(doc(db, 'moduli', editingModuleId), payload);
          } else {
              await addDoc(collection(db, 'moduli'), { ...payload, adminId: currentUser.uid, membri: [currentUser.uid] });
          }
          setIsEditorOpen(false);
      } catch (e) { console.error(e); alert("Errore salvataggio modulo"); }
  };

  const handleDelete = async (id) => {
      if (!id) return;
      if (window.confirm("Eliminare definitivamente questo modulo?")) {
          await deleteDoc(doc(db, 'moduli', id));
      }
  };

  const isMember = (module) => module.membri?.includes(currentUser.uid);
  const isModuleAdmin = (module) => module.adminId === currentUser.uid;
  const isGlobalAdmin = ['admin', 'superadmin', 'coordinamento'].includes(currentUser.ruolo);
  const hasPendingRequest = (module) => allPendingRequests.some(r => r.moduloId === module.id && r.volontarioId === currentUser.uid);
  const hasBeenEvaluated = (module) => myRequests.some(r => r.moduloId === module.id && r.stato !== 'in_attesa');
  const canManage = (module) => isGlobalAdmin || isModuleAdmin(module);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-pcgl-blue"></div></div>;
  }

  if (viewingRequests) {
    const module = modules.find(m => m.id === viewingRequests);
    if (!module) return <p>Caricamento modulo...</p>;
    
    const members = (module.membri || []).map(uid => allUsers.find(u => u.id === uid) || extraUsers[uid]).filter(Boolean);

    return (
      <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
        <HeaderSub title={module.nome} onBack={() => setViewingRequests(null)} />
        <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
          <div className="flex justify-between items-center mb-4">
              <h4 className="font-black text-lg text-pcgl-blue uppercase">Bacheca & Notifiche</h4>
              {canManage(module) && (
              <button 
                onClick={() => setShowFormBuilder(true)}
                className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-bold uppercase border border-orange-100 hover:bg-orange-600 hover:text-white transition-all"
              >
                + Crea Sondaggio Interno
              </button>
              )}
          </div>
          {canManage(module) && (
            <div className="space-y-4 mb-6">
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                <button onClick={() => setNotifMode('message')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${notifMode === 'message' ? 'bg-white text-pcgl-blue shadow-sm' : 'text-gray-500'}`}>Messaggio</button>
                <button onClick={() => setNotifMode('form')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${notifMode === 'form' ? 'bg-white text-pcgl-blue shadow-sm' : 'text-gray-500'}`}>Sondaggio</button>
                <button onClick={() => setNotifMode('link_form')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${notifMode === 'link_form' ? 'bg-white text-pcgl-blue shadow-sm' : 'text-gray-500'}`}>Modulo HQ</button>
            </div>

            {notifMode === 'link_form' && (
                <select 
                    className="w-full p-3 bg-gray-50 rounded-xl border text-sm animate-in slide-in-from-top-2" 
                    value={selectedLinkedFormId} 
                    onChange={e => setSelectedLinkedFormId(e.target.value)}
                >
                    <option value="">-- Seleziona Modulo HQ --</option>
                    {customForms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                </select>
            )}

            {notifMode === 'form' && (
                <select 
                    className="w-full p-3 bg-gray-50 rounded-xl border text-sm animate-in slide-in-from-top-2" 
                    value={selectedLinkedFormId} 
                    onChange={e => setSelectedLinkedFormId(e.target.value)}
                >
                    <option value="">-- Seleziona Sondaggio Interno --</option>
                    {activeForms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                </select>
            )}

            <textarea value={notifText} onChange={e => setNotifText(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border" placeholder="Scrivi un messaggio per i membri..."></textarea>
            <button onClick={() => handleSendMessage(module)} className="w-full py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-md">Invia Messaggio/Notifica</button>
          </div>
          )}
          <div className="mt-6 space-y-3 max-h-60 overflow-y-auto pr-2">
            {moduleMessages.map(msg => (
              <div key={msg.id} className={`bg-gray-50 p-3 rounded-lg border ${msg.tipo !== 'message' && msg.tipo ? 'border-l-4 border-l-pcgl-blue' : ''}`}>
                <p className="text-xs font-bold text-gray-500">{msg.author} il {msg.date ? (msg.date.toDate ? msg.date.toDate().toLocaleString() : new Date(msg.date).toLocaleString()) : ''}</p>
                {msg.text && <p className="text-sm mt-1">{msg.text}</p>}
                {(msg.tipo === 'form' || msg.tipo === 'link_form') && (
                    <button 
                        onClick={() => handleBachecaClick(msg, module)}
                        className="mt-2 w-full py-2 bg-pcgl-blue/10 text-pcgl-blue rounded-lg text-[10px] font-bold uppercase hover:bg-pcgl-blue hover:text-white transition-all flex items-center justify-center"
                    >
                        <ClipboardCheck size={14} className="mr-2"/> Apri Modulo / Sondaggio
                    </button>
                )}
                {msg.tipo === 'form' && canManage(module) && (
                    <button 
                        onClick={() => openPollResults(msg.formId)}
                        className="mt-1 w-full py-2 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-bold uppercase hover:bg-orange-600 hover:text-white transition-all flex items-center justify-center border border-orange-100"
                    >
                        <PieChart size={14} className="mr-2"/> Vedi Risultati Real-Time
                    </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* MODALE COSTRUTTORE SONDAGGI (POLL BUILDER) */}
        {showFormBuilder && (
            <div className="fixed inset-0 bg-black/80 z-[1600] flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto relative">
                    <button onClick={() => setShowFormBuilder(false)} className="absolute top-4 right-4 text-gray-400 hover:text-pcgl-blue"><X size={24}/></button>
                    <h3 className="font-black text-xl text-pcgl-blue uppercase mb-2 text-center">Nuovo Sondaggio</h3>
                    <p className="text-xs text-center text-gray-400 uppercase font-bold mb-6">Per i membri del modulo {module.nome}</p>
                    
                    <div className="space-y-4">
                        <input type="text" placeholder="Titolo del Sondaggio" className="w-full p-3 bg-gray-50 rounded-xl border font-bold uppercase text-sm" value={formBuilder.title} onChange={e => setFormBuilder({...formBuilder, title: e.target.value})} />
                        
                        <div>
                            <label className="text-[10px] font-black text-gray-400 ml-2 uppercase">Data di Scadenza (Opzionale)</label>
                            <input type="date" className="w-full p-3 bg-gray-50 rounded-xl border text-sm" value={formBuilder.expirationDate} onChange={e => setFormBuilder({...formBuilder, expirationDate: e.target.value})} min={new Date().toISOString().split('T')[0]} />
                        </div>
                        
                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                            <p className="text-[10px] font-black text-blue-600 uppercase mb-2">Aggiungi Domanda</p>
                            <input type="text" placeholder="Testo domanda..." className="w-full p-2 bg-white rounded-lg border text-xs mb-2" value={tempQuestion.text} onChange={e => setTempQuestion({...tempQuestion, text: e.target.value})} />
                            <div className="flex gap-2 mb-2">
                                <select className="flex-1 p-2 bg-white rounded-lg border text-[10px] font-bold uppercase" value={tempQuestion.type} onChange={e => setTempQuestion({...tempQuestion, type: e.target.value})}>
                                    <option value="text">Testo Libero</option>
                                    <option value="boolean">Sì / No</option>
                                    <option value="choice">Scelta Singola</option>
                                </select>
                                <button onClick={addQuestionToPoll} className="px-4 bg-pcgl-blue text-white rounded-lg font-bold text-xs uppercase shadow-sm">Aggiungi</button>
                            </div>
                            {tempQuestion.type === 'choice' && (
                                <div className="flex gap-2">
                                    <input type="text" placeholder="Opzione..." className="flex-1 p-2 bg-white rounded-lg border text-xs" value={pollOptInput} onChange={e => setPollOptInput(e.target.value)} />
                                    <button onClick={() => { if(pollOptInput) { setTempQuestion({...tempQuestion, opzioni: [...tempQuestion.opzioni, pollOptInput]}); setPollOptInput(''); } }} className="p-2 bg-white text-pcgl-blue rounded-lg border border-pcgl-blue shadow-sm"><Plus size={14}/></button>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                                {tempQuestion.opzioni?.map((o, idx) => <span key={idx} className="bg-white px-2 py-0.5 rounded border text-[9px] font-bold uppercase">{o}</span>)}
                            </div>
                        </div>

                        <div className="space-y-2">
                            {formBuilder.questions.map((q, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                                    <div>
                                        <p className="font-bold text-xs text-pcgl-blue uppercase">{q.text}</p>
                                        <p className="text-[9px] text-gray-400 uppercase">{q.type} {q.opzioni?.length > 0 && `(${q.opzioni.length} opz.)`}</p>
                                    </div>
                                    <button onClick={() => setFormBuilder(prev => ({...prev, questions: prev.questions.filter((_, i) => i !== idx)}))} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex gap-2 pt-4">
                            <button onClick={() => setShowFormBuilder(false)} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold uppercase text-xs">Annulla</button>
                            <button onClick={() => setShowPollPreview(true)} className="flex-1 py-3 bg-white border border-pcgl-blue text-pcgl-blue rounded-xl font-bold uppercase text-xs">Anteprima</button>
                            <button onClick={() => handleSaveInternalForm(module)} className="flex-1 py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase text-xs shadow-md">Salva</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* MODALE ANTEPRIMA SONDAGGIO INTERNO */}
        {showPollPreview && (
            <div className="fixed inset-0 bg-black/90 z-[1700] flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto relative">
                    <button onClick={() => setShowPollPreview(false)} className="absolute top-4 right-4 text-gray-400 hover:text-pcgl-blue"><X size={24}/></button>
                    <div className="text-center mb-6">
                        <h3 className="font-black text-xl text-pcgl-blue uppercase">{formBuilder.title || "Senza Titolo"}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Anteprima del Sondaggio</p>
                        {formBuilder.expirationDate && <p className="text-[10px] font-bold text-red-500 uppercase mt-1">Scadenza: {new Date(formBuilder.expirationDate).toLocaleDateString()}</p>}
                    </div>

                    <div className="space-y-4">
                        {formBuilder.questions.map((q, idx) => (
                            <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="font-bold text-sm text-gray-700 mb-2">{idx + 1}. {q.text}</p>
                                {q.type === 'boolean' && (
                                    <div className="flex gap-2">
                                        <button className="flex-1 py-2 bg-white border rounded-lg text-xs font-bold uppercase text-gray-400">SÌ</button>
                                        <button className="flex-1 py-2 bg-white border rounded-lg text-xs font-bold uppercase text-gray-400">NO</button>
                                    </div>
                                )}
                                {q.type === 'text' && <div className="w-full p-2 bg-white border rounded-lg text-xs text-gray-300 italic">Risposta di testo...</div>}
                                {q.type === 'choice' && (
                                    <div className="space-y-1">
                                        {q.opzioni?.map((o, i) => (
                                            <div key={i} className="p-2 bg-white border rounded-lg text-[10px] uppercase font-medium text-gray-400">{o}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {formBuilder.questions.length === 0 && <p className="text-center text-gray-400 italic text-sm">Nessuna domanda aggiunta.</p>}
                    </div>

                    <div className="flex gap-2 pt-8">
                        <button onClick={() => setShowPollPreview(false)} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold uppercase text-xs">Torna all'Editor</button>
                        <button onClick={() => handleSaveInternalForm(module)} className="flex-1 py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase text-xs shadow-md">Salva Sondaggio</button>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100 mt-6">
          <h4 className="font-black text-lg text-pcgl-blue uppercase mb-4">Richieste di Accesso ({moduleRequests.length})</h4>
          <div className="space-y-3">
            {moduleRequests.map(req => (
              <div key={req.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <p className="font-bold">{req.volontarioNome}</p>
                <div className="flex gap-2">
                  <button onClick={() => handleAdminAction(req.id, 'approve')} className="p-2 bg-green-100 text-green-600 rounded-lg"><Check/></button>
                  <button onClick={() => handleAdminAction(req.id, 'reject')} className="p-2 bg-red-100 text-red-600 rounded-lg"><X/></button>
                </div>
              </div>
            ))}
            {moduleRequests.length === 0 && <p className="text-sm text-gray-400 italic">Nessuna richiesta in attesa.</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100 mt-6">
          <h4 className="font-black text-lg text-pcgl-blue uppercase mb-4">Membri ({members.length})</h4>
          <div className="space-y-2">
            {members.map(mem => (
              <div key={mem.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                <p className="font-medium text-sm">{mem.nome} {mem.cognome}</p>
                {currentUser.uid !== mem.id && <button onClick={() => handleRemoveMember(module.id, mem.id)} className="text-red-400"><UserMinus size={16}/></button>}
              </div>
            ))}
          </div>
        </div>
        
        {canManage(module) && (
          <>
            <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100 mt-6">
              <h4 className="font-black text-lg text-pcgl-blue uppercase mb-4">Richieste di Accesso ({moduleRequests.length})</h4>
              {/* ... content ... */}
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100 mt-6">
              <h4 className="font-black text-lg text-pcgl-blue uppercase mb-4">Membri ({members.length})</h4>
              {/* ... content ... */}
            </div>
          </>
        )}

        {/* MODALI SPOSTATI QUI PER FUNZIONARE IN DASHBOARD */}
        {viewingForm && (
            <div className="fixed inset-0 bg-black/80 z-[1600] flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto relative">
                    <button onClick={() => { setViewingForm(null); setFormAnswers({}); }} className="absolute top-4 right-4 text-gray-400"><X size={24}/></button>
                    <h3 className="font-black text-xl text-pcgl-blue uppercase mb-2">{viewingForm.title}</h3>
                    <div className="space-y-4">
                        {viewingForm.questions?.map((q, qIdx) => (
                            <div key={qIdx} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="font-bold text-sm text-gray-700 mb-3">{q.text}</p>
                                {q.type === 'boolean' ? (
                                    <div className="flex gap-2">
                                        <button onClick={() => setFormAnswers({...formAnswers, [q.id || qIdx]: true})} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border transition-all ${formAnswers[q.id || qIdx] === true ? 'bg-green-600 text-white' : 'bg-white text-gray-400'}`}>SÌ</button>
                                        <button onClick={() => setFormAnswers({...formAnswers, [q.id || qIdx]: false})} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border transition-all ${formAnswers[q.id || qIdx] === false ? 'bg-red-600 text-white' : 'bg-white text-gray-400'}`}>NO</button>
                                    </div>
                                ) : (
                                    <input type="text" className="w-full p-2 border rounded-lg" onChange={e => setFormAnswers({...formAnswers, [q.id || qIdx]: e.target.value})} />
                                )}
                            </div>
                        ))}
                        <button onClick={async () => {
                             await addDoc(collection(db, 'module_form_responses'), { formId: viewingForm.id, moduleId: module.id, uid: currentUser.uid, userName: `${currentUser.nome} ${currentUser.cognome}`, answers: formAnswers, timestamp: new Date().toISOString() });
                             alert("Risposta inviata!"); setViewingForm(null); setFormAnswers({});
                        }} className="w-full py-4 bg-pcgl-blue text-white rounded-xl font-bold uppercase">Invia Risposta</button>
                    </div>
                </div>
            </div>
        )}

        {pollResults && (
            <div className="fixed inset-0 bg-black/80 z-[1600] flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                    <button onClick={() => { setPollResults(null); if(pollUnsub.current) pollUnsub.current(); }} className="absolute top-4 right-4 text-gray-400"><X size={24}/></button>
                    <h3 className="font-black text-xl text-pcgl-blue uppercase mb-2">Risultati: {pollResults.title}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-6">{pollResponses.length} Risposte Ricevute</p>

                    <div className="space-y-8">
                        {pollResults.questions?.map((q, qIdx) => {
                            const key = q.id || qIdx;
                            const answers = pollResponses.map(r => r.answers?.[key]).filter(a => a !== undefined);
                            
                            return (
                                <div key={qIdx} className="space-y-3">
                                    <p className="font-bold text-sm text-gray-700 border-l-4 border-pcgl-blue pl-3 uppercase">{q.text}</p>
                                    {(q.type === 'boolean' || q.tipo === 'booleano') ? (
                                        <div className="flex gap-4">
                                            <div className="flex-1 bg-green-50 p-3 rounded-xl text-center border border-green-100">
                                                <p className="text-[10px] font-bold text-green-600 uppercase">SÌ / VERO</p>
                                                <p className="text-2xl font-black text-green-700">{answers.filter(a => a === true || String(a).toLowerCase() === 'si').length}</p>
                                            </div>
                                            <div className="flex-1 bg-red-50 p-3 rounded-xl text-center border border-red-100">
                                                <p className="text-[10px] font-bold text-red-600 uppercase">NO / FALSO</p>
                                                <p className="text-2xl font-black text-red-700">{answers.filter(a => a === false || String(a).toLowerCase() === 'no').length}</p>
                                            </div>
                                        </div>
                                    ) : (q.type === 'choice' || q.tipo === 'scelta') ? (
                                        <div className="space-y-2">
                                            {q.opzioni?.map(opt => {
                                                const count = answers.filter(a => a === opt).length;
                                                const percent = answers.length > 0 ? Math.round((count / answers.length) * 100) : 0;
                                                return (
                                                    <div key={opt} className="relative h-8 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                                        <div className="absolute inset-0 bg-pcgl-blue/10 transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                                                        <div className="absolute inset-0 flex justify-between items-center px-3 text-[10px] font-black uppercase">
                                                            <span className="text-pcgl-blue truncate pr-4">{opt}</span>
                                                            <span className="text-gray-500">{count} ({percent}%)</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 p-3 rounded-xl space-y-2 max-h-40 overflow-y-auto border border-gray-200">
                                            {answers.map((a, i) => <div key={i} className="text-[11px] font-medium text-gray-600 border-b border-gray-200 last:border-0 pb-1">{a}</div>)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <button onClick={() => { setPollResults(null); if(pollUnsub.current) pollUnsub.current(); }} className="w-full py-4 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-md mt-8 active:scale-95 transition-all">Chiudi Risultati</button>
                </div>
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
      <HeaderSub title="Moduli & Squadre" onBack={onBack} />

      {applyingModule && (
        <div className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl text-pcgl-blue uppercase">Candidatura per {applyingModule.nome}</h3>
              <button onClick={() => { setApplyingModule(null); setApplicationAnswers({}); }} className="p-2 text-gray-400 hover:text-gray-600"><X/></button>
            </div>
            <form onSubmit={submitApplication} className="flex-1 overflow-y-auto pr-2 space-y-4">
              {applyingAllQuestions.map((q, index) => (
                <div key={q.id || index} className="bg-gray-50 p-4 rounded-xl border">
                  <label className="font-bold text-sm text-gray-700 block mb-2">{q.testo}</label>
                  {q.tipo === 'booleano' || q.type === 'boolean' ? (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setApplicationAnswers(prev => ({...prev, [q.id]: true}))} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border ${applicationAnswers[q.id] === true ? 'bg-green-600 text-white' : 'bg-white'}`}>Sì</button>
                      <button type="button" onClick={() => setApplicationAnswers(prev => ({...prev, [q.id]: false}))} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border ${applicationAnswers[q.id] === false ? 'bg-red-600 text-white' : 'bg-white'}`}>No</button>
                    </div>
                  ) : q.tipo === 'scelta' || q.type === 'choice' ? (
                    <select className="w-full p-2 border rounded-lg" onChange={e => setApplicationAnswers(prev => ({...prev, [q.id]: e.target.value}))} required>
                      <option value="">Seleziona...</option>
                      {q.opzioni.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : q.tipo === 'file' || q.type === 'file' ? (
                    <div>
                      {applicationAnswers[q.id] ? (
                         <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                           <a href={applicationAnswers[q.id].url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 truncate">{applicationAnswers[q.id].name}</a>
                           <button type="button" onClick={() => setApplicationAnswers(prev => { const next = {...prev}; delete next[q.id]; return next; })} className="text-red-500"><X size={16}/></button>
                         </div>
                      ) : (
                        <label className="w-full flex items-center justify-center px-4 py-2 bg-white text-blue-500 rounded-lg shadow-sm tracking-wide uppercase border border-blue-200 cursor-pointer hover:bg-blue-500 hover:text-white">
                          <Upload size={16} className="mr-2"/>
                          <span className="text-xs font-semibold">{appUploading ? 'Caricamento...' : 'Carica File'}</span>
                          <input type='file' className="hidden" onChange={e => handleAppFileUpload(e, q.id)} disabled={appUploading} />
                        </label>
                      )}
                    </div>
                  ) : (
                    <input type="text" className="w-full p-2 border rounded-lg" onChange={e => setApplicationAnswers(prev => ({...prev, [q.id]: e.target.value}))} required />
                  )}
                </div>
              ))}
              <button type="submit" className="w-full py-3 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-lg mt-4" disabled={appUploading}>Invia Candidatura</button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE COMPILAZIONE SONDAGGIO INTERNO */}
      {viewingForm && (
          <div className="fixed inset-0 bg-black/80 z-[1600] flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto relative">
                  <button onClick={() => { setViewingForm(null); setFormAnswers({}); }} className="absolute top-4 right-4 text-gray-400 hover:text-pcgl-blue"><X size={24}/></button>
                  <h3 className="font-black text-xl text-pcgl-blue uppercase mb-2">{viewingForm.title}</h3>
                  <p className="text-xs text-gray-400 uppercase font-bold mb-6">Sondaggio per i membri del modulo</p>

                  <div className="space-y-4">
                      {viewingForm.questions?.map((q, qIdx) => {
                          const key = q.id || qIdx;
                          return (
                              <div key={qIdx} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                  <p className="font-bold text-sm text-gray-700 mb-3">{q.text}</p>
                                  {q.type === 'boolean' ? (
                                      <div className="flex gap-2">
                                          <button onClick={() => setFormAnswers({...formAnswers, [key]: true})} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border transition-all ${formAnswers[key] === true ? 'bg-green-600 text-white border-green-600 shadow-sm' : 'bg-white text-gray-400 border-gray-200'}`}>SÌ</button>
                                          <button onClick={() => setFormAnswers({...formAnswers, [key]: false})} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border transition-all ${formAnswers[key] === false ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-white text-gray-400 border-gray-200'}`}>NO</button>
                                      </div>
                                  ) : q.type === 'choice' ? (
                                      <select className="w-full p-2 bg-white rounded-lg border text-sm outline-none focus:border-pcgl-blue transition-all" value={formAnswers[key] || ''} onChange={e => setFormAnswers({...formAnswers, [key]: e.target.value})}>
                                          <option value="">Seleziona...</option>
                                          {q.opzioni?.map(o => <option key={o} value={o}>{o}</option>)}
                                      </select>
                                  ) : (
                                      <input type="text" className="w-full p-2 bg-white rounded-lg border text-sm outline-none focus:border-pcgl-blue transition-all" placeholder="La tua risposta..." value={formAnswers[key] || ''} onChange={e => setFormAnswers({...formAnswers, [key]: e.target.value})} />
                                  )}
                              </div>
                          );
                      })}
                  </div>

                  <button 
                    onClick={async () => {
                        await addDoc(collection(db, 'module_form_responses'), {
                            formId: viewingForm.id,
                            moduleId: viewingForm.moduleId || null,
                            uid: currentUser.uid,
                            userName: `${currentUser.nome} ${currentUser.cognome}`,
                            answers: formAnswers,
                            timestamp: new Date().toISOString()
                        });
                        alert("Risposta inviata con successo!");
                        setViewingForm(null);
                        setFormAnswers({});
                    }}
                    className="w-full py-4 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-md mt-8 active:scale-95 transition-all"
                  >
                      Invia Risposta
                  </button>
              </div>
          </div>
      )}

      {isGlobalAdmin && (
        <div className="mb-6">
          <button onClick={() => openEditor()} className="w-full py-4 bg-pcgl-blue text-white rounded-xl font-bold uppercase shadow-md flex items-center justify-center">
            <Plus className="mr-2"/> Crea Modulo
          </button>
        </div>
      )}

      <div className="flex justify-end items-center mb-4">
        <div className="flex items-center space-x-2">
          <input type="checkbox" id="my-modules-toggle" checked={showMyModulesOnly} onChange={e => setShowMyModulesOnly(e.target.checked)} className="h-4 w-4 rounded text-pcgl-blue focus:ring-pcgl-blue"/>
          <label htmlFor="my-modules-toggle" className="text-xs font-bold uppercase text-gray-600">Mostra solo i miei</label>
        </div>
      </div>

      <div className="space-y-6">
        {modules.filter(m => !showMyModulesOnly || isMember(m)).map(m => {
          const pendingCount = allPendingRequests.filter(r => r.moduloId === m.id).length;
          const memberCount = m.membri?.length || 0;
          const adminData = allUsers.find(u => u.id === m.adminId) || extraUsers[m.adminId];

          return (
            <div key={m.id} className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <h3 className="font-black text-xl text-pcgl-blue uppercase">{m.nome}</h3>
                  <p className="text-sm text-gray-500 mt-1">{m.descrizione}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                    <span className="flex items-center gap-1"><Users size={14}/> {memberCount} Membri</span>
                    {adminData && <span className="flex items-center gap-1"><UserCheck size={14}/> Resp: {adminData.cognome}</span>}
                  </div>
                </div>
                {canManage(m) && (
                  <div className="flex gap-1">
                    <button onClick={() => openEditor(m)} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Pencil size={18}/></button>
                    <button onClick={() => handleDelete(m.id)} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={18}/></button>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                {canManage(m) || isMember(m) ? (
                  <button onClick={() => setViewingRequests(m.id)} className={`flex-1 py-3 ${canManage(m) ? 'bg-pcgl-blue text-white' : 'bg-blue-50 text-pcgl-blue'} rounded-xl font-bold uppercase text-sm shadow-md relative`}>
                    {canManage(m) ? 'Gestisci' : 'Bacheca'}
                    {canManage(m) && pendingCount > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{pendingCount}</span>}
                  </button>
                ) : isMember(m) ? (
                  <button onClick={() => handleLeave(m.id)} className="flex-1 py-3 bg-red-100 text-red-600 rounded-xl font-bold uppercase text-sm">Lascia Modulo</button>
                ) : hasPendingRequest(m) ? (
                  <span className="flex-1 py-3 bg-yellow-100 text-yellow-700 text-center rounded-xl font-bold uppercase text-sm">Richiesta Inviata</span>
                ) : hasBeenEvaluated(m) ? (
                  <span className="flex-1 py-3 bg-gray-100 text-gray-500 text-center rounded-xl font-bold uppercase text-sm">Candidatura Valutata</span>
                ) : (
                  <button onClick={() => handleApply(m)} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold uppercase text-sm shadow-md">Candidati</button>
                )}
                <button onClick={() => setViewingDocsModuleId(m.id)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold uppercase text-sm">Documenti</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};