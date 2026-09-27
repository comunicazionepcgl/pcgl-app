import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, MapPin, Plus, FileText } from 'lucide-react';
import { collection, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

export const EmergenzeSOGL = ({ currentUser }) => {
    const [eventi, setEventi] = useState([]);
    const [diario, setDiario] = useState([]);
    const [nuovoEvento, setNewEvento] = useState({ titolo: '', descrizione: '', luogo: '', livello: 'giallo' });
    const [nuovaVoce, setNuovaVoce] = useState({ eventoId: '', testo: '' });

    useEffect(() => {
        const qEventi = query(collection(db, 'salaop_eventi'), orderBy('timestamp', 'desc'));
        const unsubEventi = onSnapshot(qEventi, s => setEventi(s.docs.map(d => ({id: d.id, ...d.data()}))));
        
        const qDiario = query(collection(db, 'salaop_diario'), orderBy('timestamp', 'desc'));
        const unsubDiario = onSnapshot(qDiario, s => setDiario(s.docs.map(d => ({id: d.id, ...d.data()}))));

        return () => { unsubEventi(); unsubDiario(); };
    }, []);

    const handleCreaEvento = async () => {
        if (!nuovoEvento.titolo) return;
        await addDoc(collection(db, 'salaop_eventi'), {
            ...nuovoEvento,
            stato: 'attivo',
            timestamp: new Date().toISOString(),
            autore: `${currentUser.nome} ${currentUser.cognome}`,
            sedeAutore: currentUser.sede
        });
        setNewEvento({ titolo: '', descrizione: '', luogo: '', livello: 'giallo' });
    };

    const handleAggiungiVoce = async (eventoId) => {
        if (!nuovaVoce.testo) return;
        await addDoc(collection(db, 'salaop_diario'), {
            eventoId: eventoId || 'generale',
            testo: nuovaVoce.testo,
            timestamp: new Date().toISOString(),
            autore: `${currentUser.nome} ${currentUser.cognome}`,
            ruolo: currentUser.ruolo
        });
        setNuovaVoce({ eventoId: '', testo: '' });
    };

    return (
        <div className="w-full animate-in fade-in duration-500 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
                <h3 className="font-black text-xl text-pcgl-blue mb-4 flex items-center"><AlertTriangle className="mr-2 text-red-600"/> Gestione Eventi</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <input type="text" placeholder="Titolo Evento" className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm" value={nuovoEvento.titolo} onChange={e => setNewEvento({...nuovoEvento, titolo: e.target.value})} />
                    <input type="text" placeholder="Luogo/Comune" className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm" value={nuovoEvento.luogo} onChange={e => setNewEvento({...nuovoEvento, luogo: e.target.value})} />
                    <select className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm" value={nuovoEvento.livello} onChange={e => setNewEvento({...nuovoEvento, livello: e.target.value})}><option value="giallo">Attenzione (Giallo)</option><option value="arancione">Preallarme (Arancione)</option><option value="rosso">Allarme (Rosso)</option></select>
                    <button onClick={handleCreaEvento} className="bg-red-600 text-white font-bold rounded-xl shadow-md flex items-center justify-center py-3 hover:bg-red-700 transition-all text-sm"><Plus size={18} className="mr-2"/> Apri Evento</button>
                </div>
                <div className="space-y-4">
                    {eventi.map(ev => (<div key={ev.id} className={`p-4 rounded-xl border-l-4 ${ev.livello === 'rosso' ? 'border-red-600 bg-red-50' : ev.livello === 'arancione' ? 'border-orange-500 bg-orange-50' : 'border-yellow-400 bg-yellow-50'} shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4`}><div><h4 className="font-black text-lg uppercase text-pcgl-blue">{ev.titolo}</h4><p className="text-sm font-medium flex items-center text-gray-600"><MapPin size={14} className="mr-1"/> {ev.luogo} <Clock size={14} className="ml-3 mr-1"/> {new Date(ev.timestamp).toLocaleString()}</p></div><div className="flex gap-2"><input type="text" placeholder="Aggiungi voce al diario..." className="p-2 rounded-lg border border-gray-300 text-sm flex-1 min-w-[200px]" value={nuovaVoce.eventoId === ev.id ? nuovaVoce.testo : ''} onChange={e => setNuovaVoce({ eventoId: ev.id, testo: e.target.value })} /><button onClick={() => handleAggiungiVoce(ev.id)} className="px-4 py-2 bg-pcgl-blue text-white rounded-lg text-sm font-bold shadow-md">Invia</button></div></div>))}
                    {eventi.length === 0 && <p className="text-gray-500 italic text-sm">Nessun evento attivo in sala operativa.</p>}
                </div>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
                <h3 className="font-black text-xl text-pcgl-blue mb-4 flex items-center"><FileText className="mr-2"/> Diario Operativo</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">{diario.map(voce => {const ev = eventi.find(e => e.id === voce.eventoId); return (<div key={voce.id} className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex gap-3"><div className="text-xs text-gray-400 font-mono whitespace-nowrap mt-1">{new Date(voce.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div><div><p className="text-sm text-gray-800">{voce.testo}</p><p className="text-[10px] text-gray-500 font-bold uppercase mt-1">{voce.autore} {ev ? `• Rif: ${ev.titolo}` : ''}</p></div></div>);})}{diario.length === 0 && <p className="text-gray-500 italic text-sm">Il diario operativo è vuoto.</p>}</div>
            </div>
        </div>
    );
};