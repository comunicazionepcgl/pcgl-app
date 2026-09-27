import React, { useState, useEffect } from 'react';
import { Flame, MapPin, AlertCircle, CheckCircle, FileSignature, X, Users, Truck, Navigation, Plus, Info, Camera, Map as MapIcon, Image as ImageIcon, Minimize2 } from 'lucide-react';
import { collection, onSnapshot, addDoc, query, orderBy, updateDoc, doc, where, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const CampagnaAIBSOGL = ({ currentUser }) => {
    const isStaff = ['coordinamento', 'admin', 'superadmin'].includes(currentUser.ruolo);
    const isPresidente = currentUser.ruolo === 'presidente';
    
    const [interventi, setInterventi] = useState([]);
    const [volontariSede, setVolontariSede] = useState([]);
    const [mezziSede, setMezziSede] = useState([]);
    
    // NUOVI STATI PER STAFF
    const [sediDisponibili, setSediDisponibili] = useState([]);
    const [allVolontari, setAllVolontari] = useState([]);
    const [allMezzi, setAllMezzi] = useState([]);
    
    const [nuovoAib, setNewAib] = useState({ comune: '', localita: '', descrizione: '', mezzo: '', mezzoId: '', squadra: [], condividiGps: false, sedeRichiedente: '', fonteSegnalazione: '' });
    const [moduloResoconto, setModuloResoconto] = useState(null);
    const [resocontoDati, setResocontoDati] = useState({ ettariBruciati: '', tipoVegetazione: '', altreComponenti: '', noteFinali: '' });
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [uploadingAib, setUploadingAib] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
    const [minimizeActive, setMinimizeActive] = useState(false);

    useEffect(() => {
        if (isStaff || isPresidente) {
            getDoc(doc(db, 'settings', 'app_config')).then(snap => {
                if(snap.exists()) {
                    let sedi = (snap.data().sedi || []).map(s => s.s);
                    if (currentUser.ruolo !== 'superadmin' && currentUser.originalRuolo !== 'superadmin') {
                        sedi = sedi.filter(s => s !== 'SEDE TEST FITTIZIA');
                    }
                    setSediDisponibili(sedi.sort());
                }
            });
        }
        if (isStaff) {
            const unsubVol = onSnapshot(query(collection(db, 'users'), where('stato', 'in', ['attivo', 'sospeso'])), s => setAllVolontari(s.docs.map(d => ({ id: d.id, nome: `${d.data().nome} ${d.data().cognome}`, sede: d.data().sede }))));
            const unsubMezzi = onSnapshot(collection(db, 'mezzi'), s => setAllMezzi(s.docs.map(d => ({ id: d.id, targa: d.data().targa, tipologia: d.data().tipologia, sede: d.data().sede }))));
            return () => { unsubVol(); unsubMezzi(); };
        }
    }, [isStaff, isPresidente]);

    useEffect(() => {
        const hasSeenGuide = localStorage.getItem('pcgl_aib_guide_seen_v2');
        if (!hasSeenGuide) {
            setShowInfoModal(true);
        }
    }, []);

    // Fetch volontari e mezzi della sede (solo per il presidente)
    useEffect(() => {
        if (isPresidente) {
            const unsubVol = onSnapshot(query(collection(db, 'users'), where('sede', '==', currentUser.sede), where('stato', 'in', ['attivo', 'sospeso'])), s => setVolontariSede(s.docs.map(d => ({ id: d.id, nome: `${d.data().nome} ${d.data().cognome}` }))));
            const unsubMezzi = onSnapshot(query(collection(db, 'mezzi'), where('sede', '==', currentUser.sede)), s => setMezziSede(s.docs.map(d => ({ id: d.id, targa: d.data().targa, tipologia: d.data().tipologia }))));
            return () => { unsubVol(); unsubMezzi(); };
        }
    }, [isPresidente, currentUser.sede]);

    useEffect(() => {
        if (isStaff) {
            const qAib = query(collection(db, 'aib_interventi'), orderBy('timestamp', 'desc'));
            const unsub = onSnapshot(qAib, s => setInterventi(s.docs.map(d => ({id: d.id, ...d.data()}))));
            return () => unsub();
        } else {
            let data1 = [];
            let data2 = [];

            const updateInterventi = () => {
                const map = new Map();
                data1.forEach(d => map.set(d.id, d));
                data2.forEach(d => map.set(d.id, d));
                const combined = Array.from(map.values());
                combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setInterventi(combined);
            };

            const unsub1 = onSnapshot(query(collection(db, 'aib_interventi'), where('sedeRichiedente', '==', currentUser.sede)), s => { data1 = s.docs.map(d => ({id: d.id, ...d.data()})); updateInterventi(); });
            const unsub2 = onSnapshot(query(collection(db, 'aib_interventi'), where('sediSupporto', 'array-contains', currentUser.sede)), s => { data2 = s.docs.map(d => ({id: d.id, ...d.data()})); updateInterventi(); });

            return () => { unsub1(); unsub2(); };
        }
    }, [isStaff, currentUser.sede]);

    const activeAibIds = interventi
        .filter(a => a.squadra?.some(v => v.id === currentUser.uid) && a.condividiGps && !['concluso', 'rientro_sede', 'chiuso_resocontato'].includes(a.stato))
        .map(a => a.id)
        .join(',');

    useEffect(() => {
        let watchId;
        if (activeAibIds && "geolocation" in navigator) {
            watchId = navigator.geolocation.watchPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    const timestamp = new Date().toISOString();
                    const ids = activeAibIds.split(',');
                    for (const id of ids) {
                        try {
                            const fieldPath = `squadraGps.${currentUser.uid}`;
                            await updateDoc(doc(db, 'aib_interventi', id), { 
                                [fieldPath]: { lat: latitude, lng: longitude, nome: `${currentUser.nome} ${currentUser.cognome}`, timestamp: timestamp }
                            });
                        } catch (e) { console.error("AIB GPS Error", e); }
                    }
                },
                (err) => console.error("AIB GPS Watch Error", err),
                { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
            );
        }
        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [activeAibIds, currentUser]);

    const formVolontari = isPresidente ? volontariSede : allVolontari.filter(v => v.sede === nuovoAib.sedeRichiedente);
    const formMezzi = isPresidente ? mezziSede : allMezzi.filter(m => m.sede === nuovoAib.sedeRichiedente);

    const handleSegnalaAib = async () => {
        if(!nuovoAib.comune || !nuovoAib.localita) return;
        if(!nuovoAib.fonteSegnalazione) {
            alert("Seleziona la fonte della segnalazione (Da chi è arrivata la chiamata?)");
            return;
        }
        if(isStaff && !nuovoAib.sedeRichiedente) {
            alert("Seleziona la Sede Operativa");
            return;
        }
        const timestamp = new Date().toISOString();
        await addDoc(collection(db, 'aib_interventi'), {
            ...nuovoAib,
            mezzoId: nuovoAib.mezzoId || null,
            stato: 'segnalato',
            sediSupporto: [],
            disponibili: [], // Nuova logica disponibilità volontari
            sedeRichiedente: isStaff ? nuovoAib.sedeRichiedente : currentUser.sede,
            fonteSegnalazione: nuovoAib.fonteSegnalazione,
            autore: `${currentUser.nome} ${currentUser.cognome}`,
            timestamp: timestamp,
            storicoStati: [{
                stato: 'segnalato',
                timestamp: timestamp,
                autore: `${currentUser.nome} ${currentUser.cognome}`
            }]
        });
        setNewAib({ comune: '', localita: '', descrizione: '', mezzo: '', mezzoId: '', squadra: [], condividiGps: false, sedeRichiedente: '', fonteSegnalazione: '' });
    };

    const handleCambiaStato = async (aib, nuovoStato) => {
        const timestamp = new Date().toISOString();
        const updateData = {
            stato: nuovoStato,
            storicoStati: arrayUnion({
                stato: nuovoStato,
                timestamp: timestamp,
                autore: `${currentUser.nome} ${currentUser.cognome}`
            })
        };

        if (nuovoStato === 'in_corso' || nuovoStato === 'partenza') updateData.oraInizio = timestamp;
        if (nuovoStato === 'arrivo_posto') updateData.oraArrivo = timestamp;
        if (nuovoStato === 'in_bonifica') updateData.oraBonifica = timestamp;
        if (nuovoStato === 'concluso') updateData.oraFine = timestamp;
        if (nuovoStato === 'rientro_sede') updateData.oraRientro = timestamp;

        // GENERAZIONE FOGLIO MARCIA AUTOMATICO SE SI ATTIVA IL MEZZO
        if ((nuovoStato === 'in_corso' || nuovoStato === 'partenza') && aib.mezzoId && !aib.oraInizio) {
            try {
                const mezzoSnap = await getDoc(doc(db, 'mezzi', aib.mezzoId));
                let kmPartenza = 0;
                if(mezzoSnap.exists()) kmPartenza = mezzoSnap.data().kmAttuali || 0;

                await addDoc(collection(db, 'movimenti_mezzi'), {
                    mezzoId: aib.mezzoId,
                    targa: aib.mezzo.split('(')[1].replace(')', ''),
                    volontarioId: currentUser.uid,
                    nomeVolontario: `${currentUser.nome} ${currentUser.cognome}`,
                    sede: aib.sedeRichiedente,
                    kmPartenza: kmPartenza,
                    motivazione: `Intervento AIB: ${aib.comune} - ${aib.localita}`,
                    noteUscita: 'Attivazione automatica AIB SO',
                    dataUscita: timestamp,
                    stato: 'aperto',
                    spese: []
                });
            } catch(e) { console.error("Errore generazione foglio marcia:", e); }
        }
        await updateDoc(doc(db, 'aib_interventi', aib.id), updateData);
    };

    const daiDisponibilita = async (aibId) => {
        await updateDoc(doc(db, 'aib_interventi', aibId), {
            disponibili: arrayUnion({ id: currentUser.uid, nome: `${currentUser.nome} ${currentUser.cognome}` })
        });
    };

    const rimuoviDisponibilita = async (aibId) => {
        const aib = interventi.find(i => i.id === aibId);
        const vol = aib.disponibili.find(v => v.id === currentUser.uid);
        if (vol) await updateDoc(doc(db, 'aib_interventi', aibId), { disponibili: arrayRemove(vol) });
    };

    const aggiungiInSquadra = async (aib, vol) => {
        const nuovaSquadra = [...(aib.squadra || []), vol];
        const nuoviDisponibili = (aib.disponibili || []).filter(v => v.id !== vol.id);
        await updateDoc(doc(db, 'aib_interventi', aib.id), { squadra: nuovaSquadra, disponibili: nuoviDisponibili });
    };

    const rimuoviDaSquadra = async (aib, vol) => {
        const nuovaSquadra = (aib.squadra || []).filter(v => v.id !== vol.id);
        const nuoviDisponibili = [...(aib.disponibili || []), vol];
        await updateDoc(doc(db, 'aib_interventi', aib.id), { squadra: nuovaSquadra, disponibili: nuoviDisponibili });
    };

    const aggiungiSedeSupporto = async (aibId, sede) => {
        await updateDoc(doc(db, 'aib_interventi', aibId), {
            sediSupporto: arrayUnion(sede)
        });
    };

    const rimuoviSedeSupporto = async (aib, sede) => {
        if (!window.confirm(`Rimuovere la sede ${sede} dal supporto?`)) return;
        await updateDoc(doc(db, 'aib_interventi', aib.id), {
            sediSupporto: arrayRemove(sede)
        });
    };

    const handleSalvaResoconto = async () => {
        if(!moduloResoconto) return;
        await updateDoc(doc(db, 'aib_interventi', moduloResoconto.id), { resoconto: resocontoDati, stato: 'chiuso_resocontato' });
        setModuloResoconto(null);
        setResocontoDati({ ettariBruciati: '', tipoVegetazione: '', altreComponenti: '', noteFinali: '' });
    };

    const toggleVolontario = (vol) => {
        const isSelected = nuovoAib.squadra.some(v => v.id === vol.id);
        if (isSelected) {
            setNewAib({ ...nuovoAib, squadra: nuovoAib.squadra.filter(v => v.id !== vol.id) });
        } else {
            setNewAib({ ...nuovoAib, squadra: [...nuovoAib.squadra, vol] });
        }
    };

    const formatStato = (stato) => {
        switch(stato) {
            case 'segnalato': return 'Segnalato';
            case 'partenza': return 'Partenza Squadra';
            case 'arrivo_posto': return 'Arrivo sul Posto';
            case 'in_bonifica': return 'In Bonifica';
            case 'concluso': return 'Evento Concluso';
            case 'rientro_sede': return 'Rientrato in Sede';
            case 'chiuso_resocontato': return 'Chiuso (Resoconto)';
            case 'in_corso': return 'In Corso'; 
            default: return stato ? stato.replace('_', ' ') : '';
        }
    };

    const handleUploadFoto = async (e, aibId) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { alert("File troppo grande (Max 10MB)"); return; }
        
        setUploadingAib(aibId);
        try {
            const storageRef = ref(storage, `aib_fotos/${aibId}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            
            await updateDoc(doc(db, 'aib_interventi', aibId), {
                foto: arrayUnion({ url: url, autore: `${currentUser.nome} ${currentUser.cognome}`, timestamp: new Date().toISOString() })
            });
            alert("Foto caricata con successo!");
        } catch (err) {
            console.error(err);
            alert("Errore caricamento foto.");
        } finally {
            setUploadingAib(null);
        }
    };

    // Rilevamento dell'intervento attivo in cui l'utente fa parte della squadra (App Bloccata)
    const mioInterventoAttivo = interventi.find(aib => 
        aib.squadra?.some(v => v.id === currentUser.uid) && 
        ['segnalato', 'partenza', 'arrivo_posto', 'in_bonifica', 'concluso'].includes(aib.stato)
    );

    // MODALITA' APP BLOCCATA (FULL SCREEN OPERATIVO)
    if (mioInterventoAttivo && !minimizeActive) {
        const aib = mioInterventoAttivo;
        return (
            <div className="fixed inset-0 z-[500] bg-orange-600 overflow-y-auto animate-in zoom-in duration-300 flex flex-col items-center justify-start p-6 text-white pb-32">
                <button onClick={() => setMinimizeActive(true)} className="absolute top-6 right-6 p-3 bg-white/20 rounded-full hover:bg-white/30 backdrop-blur-md transition-all">
                    <Minimize2 size={24} />
                </button>
                
                <Flame size={64} className="animate-pulse mb-4 text-white mt-8" />
                <h1 className="text-3xl md:text-5xl font-black uppercase text-center mb-2 leading-tight">{aib.comune}</h1>
                <p className="text-xl font-bold uppercase tracking-widest opacity-90 mb-6">{aib.localita}</p>
                
                <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/20 mb-8 w-full max-w-lg shadow-2xl">
                    <p className="text-xs font-bold uppercase opacity-70 mb-1">Dettagli Segnalazione</p>
                    <p className="text-lg font-black mb-1 flex items-center"><AlertCircle size={18} className="mr-2"/> {formatStato(aib.stato)}</p>
                    <p className="text-sm font-medium mb-3 opacity-90">Fonte: {aib.fonteSegnalazione}</p>
                    <div className="flex justify-between items-center text-xs font-bold opacity-80 border-t border-white/20 pt-3">
                        <span>Ora: {new Date(aib.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        <span>Mezzo: {aib.mezzo || 'N/D'}</span>
                    </div>
                </div>

                <div className="w-full max-w-lg space-y-4">
                    <h3 className="text-center font-bold text-sm uppercase tracking-widest opacity-80 mb-2">Comandi Operativi</h3>
                    
                    <button 
                        onClick={() => handleCambiaStato(aib, 'partenza')} 
                        disabled={aib.stato !== 'segnalato'}
                        className={`w-full py-5 rounded-2xl font-black text-xl uppercase shadow-xl transition-all ${aib.stato === 'segnalato' ? 'bg-white text-orange-600 active:scale-95' : 'bg-white/20 text-white/50 cursor-not-allowed'}`}>
                        1. Conferma Partenza
                    </button>
                    
                    <button 
                        onClick={() => handleCambiaStato(aib, 'arrivo_posto')} 
                        disabled={aib.stato !== 'partenza'}
                        className={`w-full py-5 rounded-2xl font-black text-xl uppercase shadow-xl transition-all ${aib.stato === 'partenza' ? 'bg-yellow-400 text-yellow-900 active:scale-95' : 'bg-white/20 text-white/50 cursor-not-allowed'}`}>
                        2. Arrivo sul Posto
                    </button>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => handleCambiaStato(aib, 'in_bonifica')} 
                            disabled={aib.stato !== 'arrivo_posto'}
                            className={`py-5 rounded-2xl font-black text-lg uppercase shadow-xl transition-all ${aib.stato === 'arrivo_posto' ? 'bg-orange-400 text-white active:scale-95' : 'bg-white/20 text-white/50 cursor-not-allowed'}`}>
                            3. Bonifica
                        </button>
                        <button 
                            onClick={() => handleCambiaStato(aib, 'concluso')} 
                            disabled={!['arrivo_posto', 'in_bonifica'].includes(aib.stato)}
                            className={`py-5 rounded-2xl font-black text-lg uppercase shadow-xl transition-all ${['arrivo_posto', 'in_bonifica'].includes(aib.stato) ? 'bg-green-500 text-white active:scale-95' : 'bg-white/20 text-white/50 cursor-not-allowed'}`}>
                            4. Chiuso
                        </button>
                    </div>
                    
                    <button 
                        onClick={() => handleCambiaStato(aib, 'rientro_sede')} 
                        disabled={aib.stato !== 'concluso'}
                        className={`w-full py-5 rounded-2xl font-black text-xl uppercase shadow-xl transition-all ${aib.stato === 'concluso' ? 'bg-blue-600 text-white active:scale-95' : 'bg-white/20 text-white/50 cursor-not-allowed'}`}>
                        5. Rientro in Sede
                    </button>
                </div>

                <div className="mt-8 w-full max-w-lg">
                    <label className="cursor-pointer bg-white/20 border-2 border-white/30 text-white w-full py-4 rounded-2xl font-bold uppercase hover:bg-white/30 transition-colors flex items-center justify-center shadow-lg">
                        {uploadingAib === aib.id ? 'Caricamento...' : <><Camera size={20} className="mr-2"/> Allega Foto Rapida</>}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadFoto(e, aib.id)} disabled={uploadingAib === aib.id} />
                    </label>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full animate-in fade-in duration-500 space-y-6">
            {minimizeActive && mioInterventoAttivo && (
                <button onClick={() => setMinimizeActive(false)} className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-lg uppercase shadow-xl animate-bounce flex items-center justify-center">
                    <Flame className="mr-2" size={24}/> Ritorna a Intervento Attivo
                </button>
            )}

            <div className="bg-orange-50 border border-orange-200 p-6 rounded-3xl flex flex-col lg:flex-row items-start justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h3 className="font-black text-2xl text-orange-700 flex items-center uppercase tracking-tighter"><Flame className="mr-2" size={32}/> Campagna AIB</h3>
                        <button onClick={() => setShowInfoModal(true)} className="p-2 bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 transition-colors"><Info size={16}/></button>
                    </div>
                    <p className="text-sm font-medium text-orange-800">Segnalazione incendi boschivi, attivazione SO e resoconto interventi.</p>
                </div>
                
                {(isPresidente || isStaff) && (
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-100 w-full lg:w-[450px]">
                        <p className="text-sm font-black text-pcgl-blue uppercase mb-3 border-b pb-2">Segnala e Componi Squadra</p>
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <input type="text" placeholder="Comune" className="w-1/2 p-2 bg-gray-50 border rounded-lg text-sm outline-none focus:border-orange-400" value={nuovoAib.comune} onChange={e => setNewAib({...nuovoAib, comune: e.target.value})} />
                                <input type="text" placeholder="Località" className="w-1/2 p-2 bg-gray-50 border rounded-lg text-sm outline-none focus:border-orange-400" value={nuovoAib.localita} onChange={e => setNewAib({...nuovoAib, localita: e.target.value})} />
                            </div>
                            {isStaff && (
                                <select className="w-full p-2 bg-gray-50 border rounded-lg text-sm outline-none focus:border-orange-400" value={nuovoAib.sedeRichiedente} onChange={e => setNewAib({...nuovoAib, sedeRichiedente: e.target.value, squadra: [], mezzo: '', mezzoId: ''})}>
                                    <option value="">-- Seleziona Sede Operativa --</option>
                                    {sediDisponibili.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            )}
                            <select className="w-full p-2 bg-gray-50 border rounded-lg text-sm outline-none focus:border-orange-400" value={nuovoAib.fonteSegnalazione} onChange={e => setNewAib({...nuovoAib, fonteSegnalazione: e.target.value})}>
                                <option value="">-- Fonte della Segnalazione --</option>
                                <option value="S.O.U.P.">S.O.U.P. Regionale</option>
                                <option value="Sindaco / Polizia Locale">Sindaco / Polizia Locale</option>
                                <option value="Vigili del Fuoco">Vigili del Fuoco</option>
                                <option value="Avvistamento Diretto">Avvistamento Diretto</option>
                                <option value="Cittadino">Cittadino Privato</option>
                                <option value="Altro">Altro</option>
                            </select>
                            {(isPresidente || (isStaff && nuovoAib.sedeRichiedente)) && (
                                <>
                                    <select className="w-full p-2 bg-gray-50 border rounded-lg text-sm outline-none focus:border-orange-400" value={nuovoAib.mezzoId || ''} onChange={e => {
                                        const m = formMezzi.find(x => x.id === e.target.value);
                                        setNewAib({...nuovoAib, mezzoId: m?.id, mezzo: m ? `${m.tipologia} (${m.targa})` : ''});
                                    }}>
                                        <option value="">-- Seleziona Mezzo Impiegato --</option>
                                        {formMezzi.map(m => <option key={m.id} value={m.id}>{m.tipologia} - {m.targa}</option>)}
                                    </select>
                                    <div className="bg-gray-50 border rounded-lg p-2 max-h-32 overflow-y-auto">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Seleziona Volontari Squadra ({nuovoAib.squadra.length})</p>
                                        {formVolontari.map(vol => (
                                            <label key={vol.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                                                <input type="checkbox" checked={nuovoAib.squadra.some(v => v.id === vol.id)} onChange={() => toggleVolontario(vol)} className="rounded text-orange-500 focus:ring-orange-500" />
                                                <span className="text-xs font-medium text-gray-700 uppercase">{vol.nome}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <label className="flex items-center space-x-2 cursor-pointer p-2 bg-blue-50 rounded-lg border border-blue-100">
                                        <input type="checkbox" checked={nuovoAib.condividiGps} onChange={e => setNewAib({...nuovoAib, condividiGps: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-600" />
                                        <span className="text-xs font-bold text-blue-800 flex items-center"><Navigation size={14} className="mr-1"/> Condividi Posizione GPS a SO</span>
                                    </label>
                                </>
                            )}
                            <button onClick={handleSegnalaAib} className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold uppercase text-sm hover:bg-orange-700 transition-colors shadow-md">Invia Segnalazione a S.O.</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center mb-4 mt-8">
                <h3 className="font-black text-xl text-pcgl-blue uppercase">Interventi AIB ({interventi.length})</h3>
                <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                    <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${viewMode === 'list' ? 'bg-pcgl-blue text-white shadow-sm' : 'text-gray-500'}`}>Lista</button>
                    <button onClick={() => setViewMode('map')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all flex items-center ${viewMode === 'map' ? 'bg-pcgl-blue text-white shadow-sm' : 'text-gray-500'}`}><MapIcon size={14} className="mr-1"/> Mappa GPS</button>
                </div>
            </div>

            {viewMode === 'list' ? (
                <div className="space-y-4">
                {interventi.map(aib => {
                    const sonoDisponibile = aib.disponibili?.some(v => v.id === currentUser.uid);
                    const sonoInSquadra = aib.squadra?.some(v => v.id === currentUser.uid);
                    const canEditStatus = isStaff || sonoInSquadra;
                    return (
                    <div key={aib.id} className={`bg-white p-6 rounded-2xl shadow-card border border-gray-100 flex flex-col md:flex-row justify-between gap-6 ${sonoDisponibile ? 'border-orange-400 ring-2 ring-orange-100' : ''}`}>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2"><span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border ${aib.stato === 'segnalato' ? 'bg-red-100 text-red-700 border-red-200 animate-pulse' : ['partenza', 'arrivo_posto', 'in_bonifica', 'in_corso'].includes(aib.stato) ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-green-100 text-green-700 border-green-200'}`}>{formatStato(aib.stato)}</span><span className="text-xs font-bold text-gray-400">{new Date(aib.timestamp).toLocaleString()}</span></div>
                            <h4 className="text-lg font-black text-pcgl-blue uppercase">{aib.comune} - {aib.localita}</h4>
                            <p className="text-sm text-gray-600 flex items-center mt-1"><MapPin size={14} className="mr-1"/> Segnalato da: {aib.sedeRichiedente} tramite {aib.fonteSegnalazione}</p>
                            {aib.sediSupporto && aib.sediSupporto.length > 0 && (
                                <p className="text-sm text-gray-600 flex items-center mt-1"><Users size={14} className="mr-1"/> Supporto: {aib.sediSupporto.join(', ')}</p>
                            )}
                            
                            <div className="flex flex-wrap gap-3 mt-3">
                                {aib.squadra && aib.squadra.length > 0 && <span className="bg-gray-100 text-gray-600 border px-2 py-1 rounded-md text-[10px] font-bold uppercase flex items-center"><Users size={12} className="mr-1"/> {aib.squadra.length} Op.</span>}
                                {aib.mezzo && <span className="bg-gray-100 text-gray-600 border px-2 py-1 rounded-md text-[10px] font-bold uppercase flex items-center"><Truck size={12} className="mr-1"/> {aib.mezzo}</span>}
                                {aib.condividiGps && <span className="bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded-md text-[10px] font-bold uppercase flex items-center animate-pulse"><Navigation size={12} className="mr-1"/> GPS Attivo</span>}
                            </div>

                            {/* Timeline Stati */}
                            {aib.storicoStati && aib.storicoStati.length > 0 && (
                                <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Timeline Evento</p>
                                    <div className="space-y-1.5">
                                        {aib.storicoStati.map((s, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs">
                                                <span className="font-bold text-pcgl-blue uppercase flex items-center">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-pcgl-yellow mr-2"></div>
                                                    {formatStato(s.stato)}
                                                </span>
                                                <span className="text-gray-500 font-medium">{new Date(s.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {s.autore}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Azioni Volontario */}
                            {currentUser.ruolo === 'volontario' && !sonoInSquadra && aib.stato !== 'chiuso_resocontato' && (
                                <div className="mt-4">
                                    {sonoDisponibile ? (
                                        <button onClick={() => rimuoviDisponibilita(aib.id)} className="w-full py-2 bg-orange-100 text-orange-700 rounded-lg font-bold text-xs uppercase shadow-sm">Ritira Disponibilità</button>
                                    ) : (
                                        <button onClick={() => daiDisponibilita(aib.id)} className="w-full py-2 bg-orange-500 text-white rounded-lg font-bold text-xs uppercase shadow-md active:scale-95 transition-all animate-pulse">Comunica Disponibilità a Presidente</button>
                                    )}
                                </div>
                            )}

                            {currentUser.ruolo === 'volontario' && sonoInSquadra && aib.stato !== 'chiuso_resocontato' && (
                                <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs font-bold uppercase flex items-center justify-center">
                                    <CheckCircle size={16} className="mr-2"/> Sei in Squadra
                                </div>
                            )}

                            {/* Gestione Squadra Presidente / SO */}
                            {(isPresidente || isStaff) && aib.stato !== 'chiuso_resocontato' && (
                                <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                    
                                    {/* NUOVO: Gestione Sedi Supporto */}
                                    {(isStaff || (isPresidente && aib.sedeRichiedente === currentUser.sede)) && (
                                        <div className="mb-3 pb-3 border-b border-gray-200">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Sedi in Supporto</p>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {aib.sediSupporto?.map(s => (
                                                    <span key={s} className="px-2 py-1 bg-white border border-gray-200 text-gray-700 rounded-md text-[10px] font-bold uppercase flex items-center">
                                                        {s}
                                                        <button onClick={() => rimuoviSedeSupporto(aib, s)} className="ml-1 text-red-500 hover:text-red-700"><X size={12}/></button>
                                                    </span>
                                                ))}
                                                {(!aib.sediSupporto || aib.sediSupporto.length === 0) && <span className="text-[10px] text-gray-400 italic">Nessuna sede in supporto</span>}
                                            </div>
                                            <select className="text-xs p-2 bg-white border border-gray-300 rounded-md outline-none w-full" onChange={(e) => {
                                                if(e.target.value) { aggiungiSedeSupporto(aib.id, e.target.value); e.target.value = ""; }
                                            }}>
                                                <option value="">+ Aggiungi Sede in Supporto</option>
                                                {sediDisponibili.filter(s => s !== aib.sedeRichiedente && !(aib.sediSupporto || []).includes(s)).map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="flex-1">
                                            <p className="text-[10px] font-bold text-orange-600 uppercase mb-2">Disponibili ({aib.disponibili?.length || 0})</p>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {aib.disponibili?.map(v => <button key={v.id} onClick={() => aggiungiInSquadra(aib, v)} className="px-2 py-1 bg-white border border-orange-300 text-orange-700 rounded-md text-[10px] font-bold uppercase hover:bg-orange-50 transition-colors flex items-center">{v.nome} <Plus size={12} className="ml-1"/></button>)}
                                                {(!aib.disponibili || aib.disponibili.length === 0) && <span className="text-[10px] text-gray-400 italic">Nessun volontario in attesa</span>}
                                            </div>
                                            <select className="mt-2 text-xs p-2 bg-white border border-gray-300 rounded-md outline-none w-full" onChange={(e) => {
                                                if(e.target.value) {
                                                    const v = (isPresidente ? volontariSede : allVolontari).find(x => x.id === e.target.value);
                                                    if(v && !aib.squadra?.some(s => s.id === v.id)) aggiungiInSquadra(aib, v);
                                                    e.target.value = "";
                                                }
                                            }}>
                                                <option value="">+ Aggiungi Volontario Manualmente</option>
                                                {(isPresidente ? volontariSede : allVolontari.filter(x => x.sede === aib.sedeRichiedente || (aib.sediSupporto && aib.sediSupporto.includes(x.sede)))).filter(v => !aib.squadra?.some(s => s.id === v.id)).map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex-1 border-t md:border-t-0 md:border-l border-gray-200 pt-3 md:pt-0 md:pl-3">
                                            <p className="text-[10px] font-bold text-green-600 uppercase mb-2">In Squadra ({aib.squadra?.length || 0})</p>
                                            <div className="flex flex-wrap gap-2">
                                                {aib.squadra?.map(v => <button key={v.id} onClick={() => rimuoviDaSquadra(aib, v)} className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md text-[10px] font-bold uppercase hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors flex items-center">{v.nome} <X size={12} className="ml-1"/></button>)}
                                                {(!aib.squadra || aib.squadra.length === 0) && <span className="text-[10px] text-gray-400 italic">Nessuno in squadra</span>}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {(isPresidente || isStaff) && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <select className="text-xs p-2 bg-white border border-gray-300 rounded-md outline-none w-full" value={aib.mezzoId || ''} onChange={(e) => { const m = (isPresidente ? mezziSede : allMezzi).find(x => x.id === e.target.value); updateDoc(doc(db, 'aib_interventi', aib.id), { mezzoId: m?.id || null, mezzo: m ? `${m.tipologia} (${m.targa})` : '' }); }}>
                                           <option value="">-- Assegna Mezzo --</option>
                                           {(isPresidente ? mezziSede : allMezzi.filter(x => x.sede === aib.sedeRichiedente || (aib.sediSupporto && aib.sediSupporto.includes(x.sede)))).map(m => <option key={m.id} value={m.id}>{m.tipologia} - {m.targa}</option>)}
                                        </select>
                                    </div>
                                    )}
                                </div>
                            )}

                            {aib.resoconto && (<div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl text-sm text-green-800 shadow-inner"><p className="font-black mb-2 uppercase text-xs border-b border-green-200 pb-1">Resoconto Ufficiale S.O.</p><div className="grid grid-cols-2 gap-2 mt-2"><p>Ettari: <strong>{aib.resoconto.ettariBruciati} Ha</strong></p><p>Vegetazione: <strong>{aib.resoconto.tipoVegetazione}</strong></p><p className="col-span-2">Altre Forze: <strong>{aib.resoconto.altreComponenti || 'Nessuna'}</strong></p></div><p className="italic text-xs mt-2 bg-white/50 p-2 rounded border border-green-200">"{aib.resoconto.noteFinali}"</p></div>)}

                            {/* Foto AIB */}
                            <div className="mt-4 border-t border-gray-100 pt-4">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center"><ImageIcon size={14} className="mr-1"/> Foto Intervento ({aib.foto?.length || 0})</p>
                                    {canEditStatus && (
                                        <label className="cursor-pointer bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold uppercase hover:bg-blue-100 transition-colors flex items-center">
                                            {uploadingAib === aib.id ? 'Caricamento...' : <><Camera size={14} className="mr-1"/> Allega Foto</>}
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadFoto(e, aib.id)} disabled={uploadingAib === aib.id} />
                                        </label>
                                    )}
                                </div>
                                {aib.foto && aib.foto.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto pb-2" style={{scrollbarWidth: 'thin'}}>
                                        {aib.foto.map((f, idx) => (
                                            <a key={idx} href={f.url} target="_blank" rel="noopener noreferrer" className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-gray-200 block group">
                                                <img src={f.url} className="w-full h-full object-cover" alt="AIB" />
                                                <div className="absolute bottom-0 left-0 w-full bg-black/50 text-white text-[8px] p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">{f.autore}</div>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 justify-center min-w-[200px]">
                            {isStaff && aib.stato === 'segnalato' && <button onClick={() => handleCambiaStato(aib, 'partenza')} className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold uppercase text-sm flex items-center justify-center hover:bg-orange-600 shadow-md transition-transform active:scale-95"><AlertCircle size={16} className="mr-2"/> Partenza Squadra</button>}
                            {canEditStatus && (aib.stato === 'partenza' || aib.stato === 'in_corso') && <button onClick={() => handleCambiaStato(aib, 'arrivo_posto')} className="w-full py-3 bg-yellow-500 text-white rounded-xl font-bold uppercase text-sm flex items-center justify-center hover:bg-yellow-600 shadow-md transition-transform active:scale-95"><MapPin size={16} className="mr-2"/> Arrivo sul Posto</button>}
                            {canEditStatus && aib.stato === 'arrivo_posto' && <button onClick={() => handleCambiaStato(aib, 'in_bonifica')} className="w-full py-3 bg-orange-400 text-white rounded-xl font-bold uppercase text-sm flex items-center justify-center hover:bg-orange-500 shadow-md transition-transform active:scale-95"><Flame size={16} className="mr-2"/> Inizio Bonifica</button>}
                            {canEditStatus && aib.stato === 'in_bonifica' && <button onClick={() => handleCambiaStato(aib, 'concluso')} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold uppercase text-sm flex items-center justify-center hover:bg-green-700 shadow-md transition-transform active:scale-95"><CheckCircle size={16} className="mr-2"/> Dichiara Concluso</button>}
                            {canEditStatus && aib.stato === 'concluso' && <button onClick={() => handleCambiaStato(aib, 'rientro_sede')} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-sm flex items-center justify-center hover:bg-blue-700 shadow-md transition-transform active:scale-95"><Truck size={16} className="mr-2"/> Rientro in Sede</button>}
                            {(isPresidente || isStaff) && ['in_corso', 'partenza', 'arrivo_posto', 'in_bonifica', 'concluso', 'rientro_sede'].includes(aib.stato) && !aib.resoconto && <button onClick={() => setModuloResoconto(aib)} className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold uppercase text-sm flex items-center justify-center hover:bg-black shadow-md transition-transform active:scale-95"><FileSignature size={16} className="mr-2"/> Compila Resoconto</button>}
                        </div>
                    </div>
                )})}
                {interventi.length === 0 && <p className="text-center text-gray-500 font-medium py-10">Nessun intervento AIB registrato.</p>}
                </div>
            ) : (
                <AibMap interventi={interventi} />
            )}

            {moduloResoconto && (
                <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl max-w-xl w-full relative my-8">
                        <button onClick={() => setModuloResoconto(null)} className="absolute top-4 right-4 text-gray-400 hover:text-pcgl-blue bg-gray-100 p-2 rounded-full"><X size={20}/></button>
                        <h3 className="font-black text-xl text-pcgl-blue uppercase mb-2">Resoconto AIB Definitivo</h3>
                        <p className="text-sm font-bold text-gray-500 mb-4">{moduloResoconto.comune} - {moduloResoconto.localita}</p>
                        
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 text-xs text-blue-900 grid grid-cols-2 gap-2">
                            <p><strong>Inizio:</strong> {moduloResoconto.oraInizio ? new Date(moduloResoconto.oraInizio).toLocaleString() : 'N/D'}</p>
                            <p><strong>Fine:</strong> {moduloResoconto.oraFine ? new Date(moduloResoconto.oraFine).toLocaleString() : 'In Corso...'}</p>
                            <p><strong>Segnalante:</strong> {moduloResoconto.sedeRichiedente}</p>
                            <p><strong>Mezzo Sede:</strong> {moduloResoconto.mezzo || 'N/D'}</p>
                            <p className="col-span-2"><strong>Squadra ({moduloResoconto.squadra?.length || 0}):</strong> {moduloResoconto.squadra?.map(v => v.nome).join(', ') || 'Nessuna assegnata'}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">Ettari Bruciati (Stima)</label><input type="number" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 mt-1 font-mono text-lg text-pcgl-blue outline-none focus:border-green-500" value={resocontoDati.ettariBruciati} onChange={e => setResocontoDati({...resocontoDati, ettariBruciati: e.target.value})} /></div>
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">Tipo Vegetazione</label><select className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 mt-1 text-sm font-bold outline-none focus:border-green-500" value={resocontoDati.tipoVegetazione} onChange={e => setResocontoDati({...resocontoDati, tipoVegetazione: e.target.value})}><option value="">Seleziona...</option><option value="Bosco Ceduo">Bosco Ceduo</option><option value="Macchia Mediterranea">Macchia Mediterranea</option><option value="Pascolo / Sterpaglia">Pascolo / Sterpaglia</option><option value="Pineta">Pineta</option><option value="Misto">Misto</option></select></div>
                            </div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Altre Componenti Intervenute</label><input type="text" placeholder="Es. VVF, DOS, CC Forestali" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 mt-1 text-sm font-medium outline-none focus:border-green-500" value={resocontoDati.altreComponenti} onChange={e => setResocontoDati({...resocontoDati, altreComponenti: e.target.value})} /></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Note / Dettagli Operazioni</label><textarea className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 mt-1 resize-none text-sm outline-none focus:border-green-500" rows="3" value={resocontoDati.noteFinali} onChange={e => setResocontoDati({...resocontoDati, noteFinali: e.target.value})}></textarea></div>
                            <button onClick={handleSalvaResoconto} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold uppercase shadow-lg hover:bg-green-700 transition-all mt-2">Salva e Invia Report a S.O.</button>
                        </div>
                    </div>
                </div>
            )}

            {showInfoModal && (
                <div className="fixed inset-0 bg-black/80 z-[3000] flex items-center justify-center p-4 animate-in fade-in" onClick={() => {localStorage.setItem('pcgl_aib_guide_seen_v2', 'true'); setShowInfoModal(false);}}>
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl max-w-md w-full relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => {localStorage.setItem('pcgl_aib_guide_seen_v2', 'true'); setShowInfoModal(false);}} className="absolute top-4 right-4 text-gray-400 hover:text-pcgl-blue bg-gray-100 p-2 rounded-full"><X size={20}/></button>
                        <Flame size={48} className="text-orange-500 mx-auto mb-4 animate-bounce"/>
                        <h3 className="font-black text-xl text-pcgl-blue uppercase mb-4 text-center">Novità Campagna AIB</h3>
                        
                        {!isStaff ? (
                            <div className="text-sm text-gray-600 space-y-3 mb-6">
                                <p><strong>Nuove funzionalità per Volontari e Presidenti:</strong></p>
                                <ul className="list-disc pl-4 space-y-2">
                                    <li>Puoi dare la <strong>Disponibilità</strong> per un intervento richiesto, senza essere automaticamente in squadra.</li>
                                    <li>Il Presidente può comporre la squadra scegliendo i volontari e assegnando il mezzo (con generazione automatica del Foglio di Marcia).</li>
                                    <li>La squadra sul posto o la Sala Operativa possono ora aggiornare lo stato in tempo reale (Partenza, Arrivo, Bonifica, Chiusura, Rientro).</li>
                                    <li>Puoi condividere la tua posizione GPS in tempo reale con la Sala Operativa.</li>
                                </ul>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-600 space-y-3 mb-6">
                                <p><strong>Nuove funzionalità per la Sala Operativa:</strong></p>
                                <ul className="list-disc pl-4 space-y-2">
                                    <li>I Presidenti e Volontari gestiscono le disponibilità in autonomia dalla sede.</li>
                                    <li>Quando attivi un intervento, viene generato <strong>automaticamente il foglio di marcia</strong> per il mezzo assegnato.</li>
                                    <li>Tieni traccia in modo dettagliato di tutte le fasi dell'intervento (Partenza, Arrivo, Bonifica, Rientro) grazie ai nuovi aggiornamenti di stato.</li>
                                </ul>
                            </div>
                        )}
                        <button onClick={() => {localStorage.setItem('pcgl_aib_guide_seen_v2', 'true'); setShowInfoModal(false);}} className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold uppercase shadow-lg hover:bg-orange-700 transition-all">Ho Capito</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const AibMap = ({ interventi }) => {
    const mapRef = React.useRef(null);
    const mapInstance = React.useRef(null);
    const markers = React.useRef({});

    React.useEffect(() => {
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

    React.useEffect(() => {
        const initMap = () => {
            if (!mapRef.current || mapInstance.current || !window.L) return;
            const map = window.L.map(mapRef.current).setView([40.6, 15.8], 9);
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
            mapInstance.current = map;
            setTimeout(() => map.invalidateSize(), 100);
        };
        if (window.L) initMap();
        else window.addEventListener('leaflet-loaded', initMap);
        return () => { window.removeEventListener('leaflet-loaded', initMap); };
    }, []);

    React.useEffect(() => {
        if (!mapInstance.current || !window.L) return;
        const map = mapInstance.current;
        Object.values(markers.current).forEach(m => map.removeLayer(m));
        markers.current = {};
        interventi.forEach(aib => {
            if (aib.squadraGps) {
                Object.entries(aib.squadraGps).forEach(([uid, pos]) => {
                    const isFresh = (new Date() - new Date(pos.timestamp)) < 3600000;
                    if (isFresh) {
                        const markerColor = ['concluso', 'rientro_sede', 'chiuso_resocontato'].includes(aib.stato) ? 'grey' : 'red';
                        const customIcon = window.L.divIcon({ className: 'custom-div-icon', html: `<div style="background-color:${markerColor}; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] });
                        const marker = window.L.marker([pos.lat, pos.lng], { icon: customIcon }).addTo(map).bindPopup(`<b>${pos.nome}</b><br>AIB: ${aib.comune}<br>Ore: ${new Date(pos.timestamp).toLocaleTimeString()}`);
                        markers.current[`${aib.id}_${uid}`] = marker;
                    }
                });
            }
        });
    }, [interventi]);

    return <div ref={mapRef} className="w-full h-[600px] rounded-2xl border border-gray-200 z-0 bg-gray-100 shadow-inner"></div>;
};