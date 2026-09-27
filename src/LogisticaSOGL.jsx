import React, { useState, useEffect } from 'react';
import { Truck, Package, Building, QrCode, Trash2, Video, X, MapPin } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const QrScannerLogistica = ({ onScan, onClose }) => {
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
    const startScanner = async () => {
      if (!window.Html5Qrcode) return;
      try {
          html5QrCode = new window.Html5Qrcode("reader-logistica");
          await html5QrCode.start(
              { facingMode: "environment" }, 
              { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
              (decodedText) => {
                  if (html5QrCode && html5QrCode.isScanning) {
                      html5QrCode.stop().then(() => {
                          html5QrCode.clear();
                          onScan(decodedText);
                      }).catch((err) => {
                          onScan(decodedText);
                      });
                  } else {
                      onScan(decodedText);
                  }
              },
              (errorMessage) => { /* ignora errori non critici di scan continuo */ }
          );
      } catch (e) {
          console.error("Scanner init error", e);
      }
    };

    const timer = setTimeout(() => {
        if (window.Html5Qrcode) { startScanner(); } 
        else { window.addEventListener('html5-qrcode-loaded', startScanner); }
    }, 500);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('html5-qrcode-loaded', startScanner);
      if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().then(() => html5QrCode.clear()).catch(e => console.error(e));
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 z-[2000] flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white p-4 rounded-3xl w-full max-w-sm relative">
         <button onClick={onClose} className="absolute top-2 right-2 p-2 bg-gray-100 rounded-full text-gray-600 z-10 hover:bg-gray-200"><X size={20}/></button>
         <h3 className="text-center font-bold text-pcgl-blue mb-4 uppercase pt-2">Inquadra QR Materiale</h3>
         <div id="reader-logistica" className="w-full overflow-hidden rounded-xl bg-black min-h-[250px]"></div>
         <p className="text-xs text-center text-gray-400 mt-4">Inquadra il QR code per muovere il materiale.</p>
      </div>
    </div>
  );
};

export const LogisticaSOGL = ({ currentUser }) => {
    const [subTab, setSubTab] = useState('magazzini');
    
    const [magazzini, setMagazzini] = useState([]);
    const [materiali, setMateriali] = useState([]);
    const [mezzi, setMezzi] = useState([]); // Array integrato dalla main app
    
    const [showMagazzinoForm, setShowMagazzinoForm] = useState(false);
    const [magForm, setMagForm] = useState({ name: '', address: '', city: '' });

    const [showMaterialeForm, setShowMaterialeForm] = useState(false);
    const [matForm, setMatForm] = useState({ name: '', description: '', category: 'DPI' });

    const [selectedMagazzino, setSelectedMagazzino] = useState('');
    const [showScanner, setShowScanner] = useState(false);

    // Sincronizzazione Real-time Firebase Firestore
    useEffect(() => {
        const unsubMag = onSnapshot(collection(db, 'salaop_magazzini'), s => setMagazzini(s.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubMat = onSnapshot(collection(db, 'salaop_materiali'), s => setMateriali(s.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubMezzi = onSnapshot(collection(db, 'mezzi'), s => setMezzi(s.docs.map(d => ({id: d.id, ...d.data()}))));
        return () => { unsubMag(); unsubMat(); unsubMezzi(); };
    }, []);

    const handleAddMagazzino = async () => {
        if(!magForm.name) return;
        await addDoc(collection(db, 'salaop_magazzini'), magForm);
        setMagForm({ name: '', address: '', city: '' });
        setShowMagazzinoForm(false);
    };

    const handleAddMateriale = async () => {
        if(!matForm.name) return;
        await addDoc(collection(db, 'salaop_materiali'), matForm);
        setMatForm({ name: '', description: '', category: 'DPI' });
        setShowMaterialeForm(false);
    };

    const handlePrintQR = (materiale) => {
        const qrData = `pcgl-mat:${materiale.id}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head><title>QR Code - ${materiale.name}</title></head>
                <body style="text-align: center; font-family: sans-serif; padding-top: 50px;">
                    <h2>${materiale.name}</h2>
                    <p>${materiale.description}</p>
                    <p><strong>${materiale.category}</strong></p>
                    <img src="${qrUrl}" alt="QR Code" style="width: 250px; height: 250px; margin-top: 20px;" />
                    <script>window.onload = function() { window.print(); }</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleScan = async (decodedText) => {
        setShowScanner(false);
        if (decodedText.startsWith('pcgl-mat:')) {
            const matId = decodedText.split(':')[1];
            const mat = materiali.find(m => m.id === matId);
            if (mat) {
                const magName = magazzini.find(m => m.id === selectedMagazzino)?.name || 'Sconosciuto';
                if (window.confirm(`Spostare "${mat.name}" nel magazzino: ${magName}?`)) {
                    try {
                        await updateDoc(doc(db, 'salaop_materiali', mat.id), {
                            magazzinoAttuale: selectedMagazzino,
                            magazzinoNome: magName,
                            ultimoMovimento: new Date().toISOString()
                        });
                        await addDoc(collection(db, 'salaop_movimenti'), {
                            materialeId: mat.id,
                            materialeNome: mat.name,
                            magazzinoId: selectedMagazzino,
                            magazzinoNome: magName,
                            timestamp: new Date().toISOString(),
                            autore: `${currentUser.nome} ${currentUser.cognome}`
                        });
                        alert("Materiale spostato con successo!");
                    } catch (e) {
                        console.error(e);
                        alert("Errore durante lo spostamento.");
                    }
                }
            } else {
                alert("Materiale non trovato nel database.");
            }
        } else {
            alert("QR Code non valido per la logistica PCGL.");
        }
    };

    return (
        <div className="w-full animate-in fade-in duration-500">
            {/* Sotto-Navigazione Logistica */}
            <div className="flex flex-wrap justify-center gap-2 mb-6 bg-gray-100 p-2 rounded-2xl w-full">
                <button onClick={() => setSubTab('magazzini')} className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all ${subTab === 'magazzini' ? 'bg-white text-pcgl-blue shadow-sm' : 'text-gray-500 hover:text-pcgl-blue'}`}>Magazzini</button>
                <button onClick={() => setSubTab('materiali')} className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all ${subTab === 'materiali' ? 'bg-white text-pcgl-blue shadow-sm' : 'text-gray-500 hover:text-pcgl-blue'}`}>Materiali</button>
                <button onClick={() => setSubTab('mezzi')} className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all ${subTab === 'mezzi' ? 'bg-white text-pcgl-blue shadow-sm' : 'text-gray-500 hover:text-pcgl-blue'}`}>Mezzi App</button>
                <button onClick={() => setSubTab('movimentazione')} className={`flex-1 min-w-[150px] px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center ${subTab === 'movimentazione' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:text-pcgl-blue'}`}><QrCode size={16} className="mr-2"/>Movimenti</button>
            </div>

            {subTab === 'magazzini' && (
                <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-xl text-pcgl-blue flex items-center"><Building className="mr-2"/> Anagrafica Magazzini</h3>
                        <button onClick={() => setShowMagazzinoForm(!showMagazzinoForm)} className="px-4 py-2 bg-pcgl-blue text-white rounded-xl font-bold text-sm shadow-md hover:bg-pcgl-yellow hover:text-pcgl-blue transition-all">{showMagazzinoForm ? 'Annulla' : '+ Nuovo Magazzino'}</button>
                    </div>
                    {showMagazzinoForm && (
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-end animate-in slide-in-from-top-4">
                            <div className="w-full flex-1"><label className="text-[10px] font-bold uppercase text-gray-500">Nome Magazzino</label><input type="text" className="w-full p-3 rounded-xl border border-gray-200" value={magForm.name} onChange={e=>setMagForm({...magForm, name: e.target.value})}/></div>
                            <div className="w-full flex-1"><label className="text-[10px] font-bold uppercase text-gray-500">Indirizzo</label><input type="text" className="w-full p-3 rounded-xl border border-gray-200" value={magForm.address} onChange={e=>setMagForm({...magForm, address: e.target.value})}/></div>
                            <div className="w-full flex-1"><label className="text-[10px] font-bold uppercase text-gray-500">Città</label><input type="text" className="w-full p-3 rounded-xl border border-gray-200" value={magForm.city} onChange={e=>setMagForm({...magForm, city: e.target.value})}/></div>
                            <button onClick={handleAddMagazzino} className="w-full md:w-auto py-3 px-6 bg-green-600 text-white rounded-xl font-bold shadow-md">Salva</button>
                        </div>
                    )}
                    <div className="space-y-3">{magazzini.map(m => (<div key={m.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100"><div><p className="font-bold text-lg text-pcgl-blue">{m.name}</p><p className="text-xs text-gray-500">{m.address}, {m.city}</p></div><button onClick={() => deleteDoc(doc(db, 'salaop_magazzini', m.id))} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={20}/></button></div>))} {magazzini.length === 0 && <p className="text-gray-500 italic text-center py-4">Nessun magazzino configurato.</p>}</div>
                </div>
            )}

            {subTab === 'materiali' && (
                <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-xl text-pcgl-blue flex items-center"><Package className="mr-2"/> Attrezzature & Materiali</h3>
                        <button onClick={() => setShowMaterialeForm(!showMaterialeForm)} className="px-4 py-2 bg-pcgl-blue text-white rounded-xl font-bold text-sm shadow-md hover:bg-pcgl-yellow hover:text-pcgl-blue transition-all">{showMaterialeForm ? 'Annulla' : '+ Aggiungi'}</button>
                    </div>
                    {showMaterialeForm && (
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-end animate-in slide-in-from-top-4">
                            <div className="w-full flex-1"><label className="text-[10px] font-bold uppercase text-gray-500">Nome</label><input type="text" className="w-full p-3 rounded-xl border border-gray-200" value={matForm.name} onChange={e=>setMatForm({...matForm, name: e.target.value})}/></div>
                            <div className="w-full flex-1"><label className="text-[10px] font-bold uppercase text-gray-500">Descrizione</label><input type="text" className="w-full p-3 rounded-xl border border-gray-200" value={matForm.description} onChange={e=>setMatForm({...matForm, description: e.target.value})}/></div>
                            <div className="w-full flex-1"><label className="text-[10px] font-bold uppercase text-gray-500">Categoria</label><select className="w-full p-3 rounded-xl border border-gray-200 bg-white" value={matForm.category} onChange={e=>setMatForm({...matForm, category: e.target.value})}><option value="DPI">DPI</option><option value="Elettroutensile">Elettroutensile</option><option value="Idraulico">Idraulico</option><option value="Vestiario">Vestiario</option></select></div>
                            <button onClick={handleAddMateriale} className="w-full md:w-auto py-3 px-6 bg-green-600 text-white rounded-xl font-bold shadow-md">Salva</button>
                        </div>
                    )}
                    <div className="space-y-3">{materiali.map(m => (<div key={m.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100"><div className="flex items-center gap-4"><div className="bg-blue-100 text-blue-700 font-black text-[10px] uppercase px-3 py-1 rounded-lg">{m.category}</div><div><p className="font-bold text-lg text-pcgl-blue">{m.name}</p><p className="text-xs text-gray-500">{m.description}</p>{m.magazzinoNome && <p className="text-[10px] font-bold text-gray-400 mt-1 flex items-center"><MapPin size={10} className="mr-1"/> {m.magazzinoNome}</p>}</div></div><div className="flex items-center gap-2"><button onClick={() => handlePrintQR(m)} className="px-3 py-1.5 bg-pcgl-yellow text-pcgl-blue font-bold text-[10px] uppercase rounded-lg shadow-sm hover:scale-105"><QrCode size={14} className="inline mr-1"/> Stampa QR</button><button onClick={() => deleteDoc(doc(db, 'salaop_materiali', m.id))} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={20}/></button></div></div>))} {materiali.length === 0 && <p className="text-gray-500 italic text-center py-4">Nessun materiale anagrafato.</p>}</div>
                </div>
            )}

            {subTab === 'mezzi' && (
                <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
                    <div className="flex justify-between items-center mb-6"><h3 className="font-black text-xl text-pcgl-blue flex items-center"><Truck className="mr-2"/> Flotta Integrata App Base</h3><p className="text-xs font-bold text-green-600 uppercase bg-green-50 px-3 py-1 rounded-full border border-green-200">Sincronizzato</p></div>
                    <p className="text-sm text-gray-500 mb-6">Questi sono i mezzi censiti nell'applicazione principale. Da qui potrai assegnare i mezzi ai singoli magazzini logistici creati in SOGL.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{mezzi.map(m => (<div key={m.id} className="border border-gray-200 bg-gray-50 p-4 rounded-2xl flex items-center justify-between shadow-sm"><div><p className="font-bold text-lg text-pcgl-blue uppercase">{m.targa}</p><p className="text-xs text-gray-500 font-bold uppercase">{m.tipologia} - {m.sede}</p></div><button className="px-3 py-1.5 bg-pcgl-yellow text-pcgl-blue font-bold text-[10px] uppercase rounded-lg shadow-sm hover:scale-105 transition-transform">Assegna</button></div>))}</div>
                </div>
            )}

            {subTab === 'movimentazione' && (
                <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 text-center">
                    <div className="w-24 h-24 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><QrCode size={48}/></div>
                    <h3 className="font-black text-2xl text-pcgl-blue uppercase mb-2">Scanner Movimentazione</h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">Seleziona il magazzino logistico e inquadra il QR Code (materiale/attrezzatura) per registrare il movimento.</p>
                    <select value={selectedMagazzino} onChange={e => setSelectedMagazzino(e.target.value)} className="p-4 bg-gray-50 rounded-xl font-bold uppercase border border-gray-200 text-pcgl-blue w-full max-w-sm mb-6 outline-none cursor-pointer"><option value="">-- Seleziona Magazzino Base --</option>{magazzini.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                    <button onClick={() => {
                        if (!selectedMagazzino) { alert("Seleziona prima un magazzino."); return; }
                        setShowScanner(true);
                    }} className="w-full max-w-sm py-4 bg-red-600 text-white rounded-xl font-black uppercase text-lg shadow-lg hover:bg-red-700 transition-all flex items-center justify-center mx-auto"><Video className="mr-3" size={24}/> Avvia Fotocamera</button>
                </div>
            )}

            {showScanner && <QrScannerLogistica onScan={handleScan} onClose={() => setShowScanner(false)} />}
        </div>
    );
};