import React, { useState, useEffect } from 'react';
import { HeaderSub } from './SharedUI';
import { Radio, AlertTriangle, Users, Truck, Map as MapIcon, CloudLightning, Flame, ArrowRight, Shield, Activity, MessageSquare, Video } from 'lucide-react';
import { LogisticaSOGL } from './LogisticaSOGL.jsx';
import { LiveWallSOGL } from './LiveStreamSOGL.jsx';
import { EmergenzeSOGL } from './EmergenzeSOGL.jsx';
import { CampagnaAIBSOGL } from './CampagnaAIBSOGL.jsx';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';


export const SalaOperativaManager = ({ currentUser, onBack, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ volontari: 0, mezzi: 0, emergenze: 0, aib: 0 });

  useEffect(() => {
      if (activeTab === 'dashboard') {
          const unsubV = onSnapshot(collection(db, 'users'), s => setStats(prev => ({...prev, volontari: s.docs.length})));
          const unsubM = onSnapshot(collection(db, 'mezzi'), s => setStats(prev => ({...prev, mezzi: s.docs.length})));
          const unsubE = onSnapshot(query(collection(db, 'attivazioni'), where('stato', '==', 'attiva')), s => setStats(prev => ({...prev, emergenze: s.docs.length})));
          const unsubA = onSnapshot(query(collection(db, 'aib_interventi'), where('stato', 'in', ['segnalato', 'in_corso'])), s => setStats(prev => ({...prev, aib: s.docs.length})));
          return () => { unsubV(); unsubM(); unsubE(); unsubA(); };
      }
  }, [activeTab]);

  return (
    <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
      <HeaderSub title="Sala Operativa SOGL" onBack={onBack} />
      
      {/* Menu di Navigazione Interno (SOGL) */}
      <div className="flex overflow-x-auto gap-2 mb-6 pb-2 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
         <button onClick={() => setActiveTab('dashboard')} className={`flex items-center whitespace-nowrap px-4 py-3 rounded-xl text-sm font-bold uppercase transition-all ${activeTab === 'dashboard' ? 'bg-red-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><Radio size={18} className="mr-2"/> Dashboard</button>
         <button onClick={() => setActiveTab('emergenze')} className={`flex items-center whitespace-nowrap px-4 py-3 rounded-xl text-sm font-bold uppercase transition-all ${activeTab === 'emergenze' ? 'bg-red-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><AlertTriangle size={18} className="mr-2"/> Emergenze & Diario</button>
         <button onClick={() => setActiveTab('aib')} className={`flex items-center whitespace-nowrap px-4 py-3 rounded-xl text-sm font-bold uppercase transition-all ${activeTab === 'aib' ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-orange-50 hover:text-orange-600'}`}><Flame size={18} className="mr-2"/> Campagna AIB</button>
         <button onClick={() => setActiveTab('risorse')} className={`flex items-center whitespace-nowrap px-4 py-3 rounded-xl text-sm font-bold uppercase transition-all ${activeTab === 'risorse' ? 'bg-red-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><Truck size={18} className="mr-2"/> Logistica & Mezzi</button>
         <button onClick={() => setActiveTab('live')} className={`flex items-center whitespace-nowrap px-4 py-3 rounded-xl text-sm font-bold uppercase transition-all ${activeTab === 'live' ? 'bg-red-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><Video size={18} className="mr-2"/> Live</button>

         <div className="w-px h-8 bg-gray-200 mx-2 self-center shrink-0"></div>
         
         <button onClick={() => onNavigate && onNavigate('admin_search')} className="flex items-center whitespace-nowrap px-4 py-3 rounded-xl text-sm font-bold uppercase transition-all bg-white text-gray-500 hover:bg-gray-50 hover:text-pcgl-blue"><Users size={18} className="mr-2"/> Tesserini AI</button>
         <button onClick={() => onNavigate && onNavigate('allerta_gest')} className="flex items-center whitespace-nowrap px-4 py-3 rounded-xl text-sm font-bold uppercase transition-all bg-white text-gray-500 hover:bg-gray-50 hover:text-pcgl-blue"><MapIcon size={18} className="mr-2"/> Cartografia</button>
         <button onClick={() => onNavigate && onNavigate('allerta_view')} className="flex items-center whitespace-nowrap px-4 py-3 rounded-xl text-sm font-bold uppercase transition-all bg-white text-gray-500 hover:bg-gray-50 hover:text-pcgl-blue"><CloudLightning size={18} className="mr-2"/> Bollettini</button>
      </div>
      
      {activeTab === 'live' ? <LiveWallSOGL currentUser={currentUser} /> :
       activeTab === 'risorse' ? <LogisticaSOGL currentUser={currentUser} /> :
       activeTab === 'emergenze' ? <EmergenzeSOGL currentUser={currentUser} /> :
       activeTab === 'aib' ? <CampagnaAIBSOGL currentUser={currentUser} /> : (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                    <Users size={32} className="text-blue-500 mb-2" />
                    <h4 className="text-3xl font-black text-pcgl-blue">{stats.volontari}</h4>
                    <p className="text-xs font-bold text-gray-400 uppercase">Volontari</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                    <Truck size={32} className="text-green-500 mb-2" />
                    <h4 className="text-3xl font-black text-pcgl-blue">{stats.mezzi}</h4>
                    <p className="text-xs font-bold text-gray-400 uppercase">Mezzi Flotta</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                    <AlertTriangle size={32} className="text-red-500 mb-2" />
                    <h4 className="text-3xl font-black text-pcgl-blue">{stats.emergenze}</h4>
                    <p className="text-xs font-bold text-gray-400 uppercase">Allerte Attive</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                    <Flame size={32} className="text-orange-500 mb-2" />
                    <h4 className="text-3xl font-black text-pcgl-blue">{stats.aib}</h4>
                    <p className="text-xs font-bold text-gray-400 uppercase">Incendi In Corso</p>
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
                <h3 className="font-black text-xl text-pcgl-blue uppercase mb-6 flex items-center"><Shield className="mr-2"/> Strumenti Sala Operativa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={() => onNavigate && onNavigate('admin_search')} className="p-6 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between hover:bg-pcgl-blue hover:text-white transition-all group shadow-sm hover:shadow-md">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-white/20"><Users size={24} className="text-blue-600 group-hover:text-white" /></div>
                            <div className="text-left"><p className="font-bold uppercase text-pcgl-blue group-hover:text-white">Tesserini AI & Anagrafica</p><p className="text-xs text-gray-500 group-hover:text-blue-200">Gestione volontari, approvazioni, QR code</p></div>
                        </div>
                        <ArrowRight className="text-gray-400 group-hover:text-white" />
                    </button>

                    <button onClick={() => onNavigate && onNavigate('allerta_gest')} className="p-6 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between hover:bg-pcgl-blue hover:text-white transition-all group shadow-sm hover:shadow-md">
                        <div className="flex items-center gap-4">
                            <div className="bg-red-100 p-3 rounded-xl group-hover:bg-white/20"><MapIcon size={24} className="text-red-600 group-hover:text-white" /></div>
                            <div className="text-left"><p className="font-bold uppercase text-pcgl-blue group-hover:text-white">Cartografia & Mappe</p><p className="text-xs text-gray-500 group-hover:text-blue-200">Visualizzazione tracker GPS e allerte</p></div>
                        </div>
                        <ArrowRight className="text-gray-400 group-hover:text-white" />
                    </button>

                    <button onClick={() => onNavigate && onNavigate('allerta_view')} className="p-6 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between hover:bg-pcgl-blue hover:text-white transition-all group shadow-sm hover:shadow-md">
                        <div className="flex items-center gap-4">
                            <div className="bg-yellow-100 p-3 rounded-xl group-hover:bg-white/20"><CloudLightning size={24} className="text-yellow-600 group-hover:text-white" /></div>
                            <div className="text-left"><p className="font-bold uppercase text-pcgl-blue group-hover:text-white">Bollettini Meteo</p><p className="text-xs text-gray-500 group-hover:text-blue-200">Consulta criticità meteo regionali</p></div>
                        </div>
                        <ArrowRight className="text-gray-400 group-hover:text-white" />
                    </button>

                    <button onClick={() => onNavigate && onNavigate('telegram_uploads_view')} className="p-6 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between hover:bg-pcgl-blue hover:text-white transition-all group shadow-sm hover:shadow-md">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-white/20"><MessageSquare size={24} className="text-blue-600 group-hover:text-white" /></div>
                            <div className="text-left"><p className="font-bold uppercase text-pcgl-blue group-hover:text-white">Ricezioni Telegram</p><p className="text-xs text-gray-500 group-hover:text-blue-200">Foto e doc dal Bot</p></div>
                        </div>
                        <ArrowRight className="text-gray-400 group-hover:text-white" />
                    </button>

                    <button onClick={() => onNavigate && onNavigate('stats_view')} className="p-6 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between hover:bg-pcgl-blue hover:text-white transition-all group shadow-sm hover:shadow-md">
                        <div className="flex items-center gap-4">
                            <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-white/20"><Activity size={24} className="text-purple-600 group-hover:text-white" /></div>
                            <div className="text-left"><p className="font-bold uppercase text-pcgl-blue group-hover:text-white">Statistiche & Report</p><p className="text-xs text-gray-500 group-hover:text-blue-200">Riepilogo ore, presenze e attività</p></div>
                        </div>
                        <ArrowRight className="text-gray-400 group-hover:text-white" />
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};