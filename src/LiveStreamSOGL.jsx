import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Video, VideoOff, Radio, Eye, X, Maximize2, Camera, RefreshCw, AlertTriangle } from 'lucide-react';
import { collection, doc, setDoc, updateDoc, deleteDoc, addDoc, getDocs, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { HeaderSub } from './SharedUI';

/*
 * Streaming live smartphone -> Sala Operativa (WebRTC peer-to-peer).
 * Firestore fa solo da "segnalatore" per stabilire la connessione; il video NON passa da Firebase.
 *
 *   live_streams/{uidTrasmittente}
 *     viewers/{uidSpettatore}
 *       pubCandidates/{id}   candidati ICE del trasmittente
 *       viewCandidates/{id}  candidati ICE dello spettatore
 *
 * Per le reti mobili con NAT restrittivo serve un relay TURN: definire VITE_TURN_URL,
 * VITE_TURN_USER e VITE_TURN_PASS (senza TURN alcune connessioni 4G/5G non partono).
 */
const ICE_SERVERS = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
if (import.meta.env.VITE_TURN_URL) {
  ICE_SERVERS.push({
    urls: import.meta.env.VITE_TURN_URL,
    username: import.meta.env.VITE_TURN_USER,
    credential: import.meta.env.VITE_TURN_PASS,
  });
}

const HEARTBEAT_MS = 15000;
const STALE_MS = 45000;
const MAX_VIEWERS = 4;
const MAX_BITRATE = 1200000;

const clearCollection = async (colRef) => {
  const snap = await getDocs(colRef);
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
};

const clearViewer = async (viewerRef) => {
  try {
    await clearCollection(collection(viewerRef, 'pubCandidates'));
    await clearCollection(collection(viewerRef, 'viewCandidates'));
    await deleteDoc(viewerRef);
  } catch (e) {
    console.warn('Pulizia spettatore non completata', e);
  }
};

// I candidati ICE possono arrivare prima della descrizione remota: vanno accodati.
const makeIceQueue = (pc) => {
  let ready = false;
  const pending = [];
  const apply = (c) => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
  return {
    add: (c) => { if (ready) apply(c); else pending.push(c); },
    ready: () => { ready = true; pending.splice(0).forEach(apply); },
  };
};

const applyBitrateCap = (pc) => {
  pc.getSenders().forEach(sender => {
    if (!sender.track || sender.track.kind !== 'video') return;
    try {
      const params = sender.getParameters();
      if (!params.encodings || !params.encodings.length) params.encodings = [{}];
      params.encodings[0].maxBitrate = MAX_BITRATE;
      sender.setParameters(params).catch(() => {});
    } catch {
      // setParameters non supportato: si prosegue senza limite
    }
  });
};

const formatElapsed = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/* ===================================================================
 * LATO CAMPO: il volontario trasmette dal proprio smartphone
 * =================================================================== */
export const LivePublisherSOGL = ({ currentUser, onBack }) => {
  const [phase, setPhase] = useState('idle'); // idle | starting | live
  const [titolo, setTitolo] = useState('');
  const [audio, setAudio] = useState(false);
  const [source, setSource] = useState('environment'); // environment | user | screen | device
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const canShareScreen = typeof navigator !== 'undefined'
    && !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)
    && !/Android|iPhone|iPad/i.test(navigator.userAgent);
  const [error, setError] = useState('');
  const [viewers, setViewers] = useState([]);
  const [peerStates, setPeerStates] = useState({});
  const [elapsed, setElapsed] = useState(0);
  const videoRef = useRef(null);
  const c = useRef({ stream: null, streamRef: null, pcs: new Map(), peerUnsubs: new Map(), unsubs: [], hb: null, tick: null, wake: null });

  const closePeer = useCallback((id) => {
    const ctx = c.current;
    const pc = ctx.pcs.get(id);
    if (pc) {
      try { pc.close(); } catch { /* già chiusa */ }
    }
    ctx.pcs.delete(id);
    (ctx.peerUnsubs.get(id) || []).forEach(u => u());
    ctx.peerUnsubs.delete(id);
    setPeerStates(p => {
      const n = { ...p };
      delete n[id];
      return n;
    });
  }, []);

  const openPeer = useCallback(async (viewerRef, id) => {
    const ctx = c.current;
    if (ctx.pcs.has(id) || !ctx.stream) return;
    if (ctx.pcs.size >= MAX_VIEWERS) {
      await updateDoc(viewerRef, { rifiutato: true }).catch(() => {});
      return;
    }
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    ctx.pcs.set(id, pc);
    ctx.stream.getTracks().forEach(t => pc.addTrack(t, ctx.stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) addDoc(collection(viewerRef, 'pubCandidates'), e.candidate.toJSON()).catch(() => {});
    };
    pc.onconnectionstatechange = () => {
      setPeerStates(p => ({ ...p, [id]: pc.connectionState }));
      if (pc.connectionState === 'connected') applyBitrateCap(pc);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') closePeer(id);
    };

    const ice = makeIceQueue(pc);
    const unsubAnswer = onSnapshot(viewerRef, async (snap) => {
      const d = snap.data();
      if (d && d.answer && pc.signalingState === 'have-local-offer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(d.answer));
          ice.ready();
        } catch {
          closePeer(id);
        }
      }
    });
    const unsubCand = onSnapshot(collection(viewerRef, 'viewCandidates'), (snap) => {
      snap.docChanges().forEach(ch => { if (ch.type === 'added') ice.add(ch.doc.data()); });
    });
    ctx.peerUnsubs.set(id, [unsubAnswer, unsubCand]);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await updateDoc(viewerRef, { offer: { type: offer.type, sdp: offer.sdp } });
  }, [closePeer]);

  const stop = useCallback(async () => {
    const ctx = c.current;
    clearInterval(ctx.hb);
    clearInterval(ctx.tick);
    ctx.unsubs.forEach(u => u());
    ctx.unsubs = [];
    Array.from(ctx.pcs.keys()).forEach(closePeer);
    if (ctx.stream) ctx.stream.getTracks().forEach(t => t.stop());
    ctx.stream = null;
    if (ctx.wake) ctx.wake.release().catch(() => {});
    ctx.wake = null;
    const streamRef = ctx.streamRef;
    ctx.streamRef = null;
    setPhase('idle');
    setViewers([]);
    setElapsed(0);
    if (streamRef) {
      try {
        const vs = await getDocs(collection(streamRef, 'viewers'));
        await Promise.all(vs.docs.map(d => clearViewer(d.ref)));
        await updateDoc(streamRef, { stato: 'chiuso', lastSeen: Date.now() });
      } catch (e) {
        console.warn('Chiusura diretta non completata', e);
      }
    }
  }, [closePeer]);

  useEffect(() => () => { stop(); }, [stop]);

  useEffect(() => {
    if (phase === 'live' && videoRef.current && c.current.stream) videoRef.current.srcObject = c.current.stream;
  }, [phase]);

  const searchDevices = async () => {
    setError('');
    try {
      // serve un permesso temporaneo perché il browser mostri i nomi delle camere
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
      tmp.getTracks().forEach(t => t.stop());
      const list = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
      setDevices(list);
      if (list.length) setDeviceId(prev => prev || list[0].deviceId);
      else setError('Nessuna camera o scheda di acquisizione trovata.');
    } catch {
      setError('Non riesco a leggere le camere: controlla i permessi del browser.');
    }
  };

  const start = async () => {
    setError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.RTCPeerConnection) {
      setError('Questo dispositivo o browser non supporta le dirette video.');
      return;
    }
    setPhase('starting');
    const ctx = c.current;
    try {
      let stream;
      if (source === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 24, max: 30 }, width: { max: 1920 }, height: { max: 1080 } },
          audio: false,
        });
      } else {
        const video = source === 'device' && deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } }
          : { facingMode: { ideal: source === 'user' ? 'user' : 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } };
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video, audio });
        } catch (e) {
          if (!audio) throw e;
          // microfono negato o non disponibile: si prosegue solo con il video
          stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
          setAudio(false);
        }
      }
      ctx.stream = stream;
      // se la condivisione viene interrotta dal browser o la camera si scollega, la diretta termina
      stream.getVideoTracks().forEach(t => t.addEventListener('ended', () => { stop(); }));

      const streamRef = doc(db, 'live_streams', currentUser.uid);
      const old = await getDocs(collection(streamRef, 'viewers'));
      await Promise.all(old.docs.map(d => clearViewer(d.ref)));
      const hasAudio = stream.getAudioTracks().length > 0;
      await setDoc(streamRef, {
        uid: currentUser.uid,
        nome: `${currentUser.nome} ${currentUser.cognome}`,
        sede: currentUser.sede || '',
        ruolo: currentUser.ruolo || '',
        titolo: titolo.trim().slice(0, 80),
        audio: hasAudio,
        sorgente: source,
        stato: 'attivo',
        startedAt: serverTimestamp(),
        lastSeen: Date.now(),
        maxViewers: MAX_VIEWERS,
      });
      ctx.streamRef = streamRef;

      ctx.unsubs.push(onSnapshot(collection(streamRef, 'viewers'), (snap) => {
        setViewers(snap.docs.map(d => ({ id: d.id, nome: d.data().viewerNome || 'Sala Operativa', rifiutato: !!d.data().rifiutato })));
        snap.docChanges().forEach(ch => {
          const data = ch.doc.data();
          if (ch.type === 'added' && !data.offer && !data.rifiutato) {
            openPeer(ch.doc.ref, ch.doc.id).catch(() => closePeer(ch.doc.id));
          }
          if (ch.type === 'removed') closePeer(ch.doc.id);
        });
      }));

      ctx.hb = setInterval(() => { updateDoc(streamRef, { lastSeen: Date.now() }).catch(() => {}); }, HEARTBEAT_MS);
      const t0 = Date.now();
      ctx.tick = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
      if (navigator.wakeLock) navigator.wakeLock.request('screen').then(w => { ctx.wake = w; }).catch(() => {});
      setPhase('live');
    } catch (e) {
      console.error('Avvio diretta fallito', e);
      await stop();
      setError(e && e.name === 'NotAllowedError'
        ? (source === 'screen'
          ? 'Condivisione dello schermo annullata o non consentita. Riprova e scegli la finestra da condividere.'
          : 'Permesso alla fotocamera negato. Abilitalo dalle impostazioni del dispositivo e riprova.')
        : 'Impossibile avviare la diretta. Controlla connessione e permessi, poi riprova.');
    }
  };

  const stateLabel = (s) => {
    if (s === 'connected') return { t: 'In visione', c: 'text-green-600' };
    if (s === 'connecting' || s === 'new' || !s) return { t: 'Connessione…', c: 'text-orange-500' };
    if (s === 'disconnected') return { t: 'Segnale debole', c: 'text-orange-500' };
    return { t: 'Non connesso', c: 'text-red-500' };
  };

  return (
    <div className="animate-in slide-in-from-right duration-500 w-full pb-40">
      <HeaderSub title="Diretta Live" onBack={async () => { await stop(); onBack(); }} />

      <div className="px-4 md:px-0 max-w-2xl mx-auto space-y-6">
        {phase !== 'live' && (
          <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 space-y-5">
            <div className="flex items-center gap-3">
              <div className="bg-red-50 p-3 rounded-2xl"><Video size={28} className="text-red-600" /></div>
              <div>
                <h3 className="font-black text-xl text-pcgl-blue uppercase leading-tight">Trasmetti alla Sala Operativa</h3>
                <p className="text-xs text-gray-500">Le immagini della tua camera, in tempo reale, a chi coordina l'intervento.</p>
              </div>
            </div>

            <ul className="text-sm text-gray-600 space-y-2 bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <li>• La diretta è visibile <strong>solo alla Sala Operativa</strong>, mai ad altri volontari.</li>
              <li>• <strong>Non viene registrata né salvata</strong>: appena la termini, sparisce.</li>
              <li>• Vedrai in ogni momento chi ti sta guardando.</li>
              <li>• Tieni l'app aperta e lo schermo acceso; serve una buona connessione dati.</li>
            </ul>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Titolo / luogo (facoltativo)</label>
              <input type="text" maxLength={80} value={titolo} onChange={e => setTitolo(e.target.value)} placeholder="Es. Sopralluogo frana SS7" className="w-full mt-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-pcgl-blue" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setSource('environment')} className={`py-3 rounded-2xl text-xs font-black uppercase border disabled:opacity-40 ${source === 'environment' ? 'bg-pcgl-blue text-white border-pcgl-blue' : 'bg-white text-gray-500 border-gray-200'}`}>Camera posteriore</button>
              <button type="button" onClick={() => setSource('user')} className={`py-3 rounded-2xl text-xs font-black uppercase border disabled:opacity-40 ${source === 'user' ? 'bg-pcgl-blue text-white border-pcgl-blue' : 'bg-white text-gray-500 border-gray-200'}`}>Camera frontale</button>
              <button type="button" disabled={!canShareScreen} onClick={() => setSource('screen')} className={`py-3 rounded-2xl text-xs font-black uppercase border disabled:opacity-40 ${source === 'screen' ? 'bg-pcgl-blue text-white border-pcgl-blue' : 'bg-white text-gray-500 border-gray-200'}`}>Schermo / finestra</button>
              <button type="button" onClick={() => setSource('device')} className={`py-3 rounded-2xl text-xs font-black uppercase border disabled:opacity-40 ${source === 'device' ? 'bg-pcgl-blue text-white border-pcgl-blue' : 'bg-white text-gray-500 border-gray-200'}`}>Scheda acquisizione</button>
            </div>

            {source === 'screen' && (
              <div className="text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-2xl p-4 leading-relaxed">
                <strong>Per mostrare lo schermo del telefono del drone:</strong> collega il telefono al computer e specchialo (Android: <em>scrcpy</em>; iPhone: QuickTime su Mac, oppure un ricevitore AirPlay su PC). Quando il browser lo chiede, scegli la <strong>finestra</strong> dello specchio.
                {!canShareScreen && <span className="block mt-2 text-red-600 font-bold">La condivisione dello schermo funziona solo da computer, non da telefono.</span>}
              </div>
            )}

            {source === 'device' && (
              <div className="space-y-2">
                <button type="button" onClick={searchDevices} className="w-full py-3 rounded-2xl text-xs font-black uppercase border border-gray-200 bg-white text-pcgl-blue">Cerca camere collegate</button>
                {devices.length > 0 && (
                  <select value={deviceId} onChange={e => setDeviceId(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-pcgl-blue">
                    {devices.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}
                  </select>
                )}
                <p className="text-[11px] text-gray-400">Una scheda di acquisizione HDMI-USB collegata al telecomando appare qui come una camera.</p>
              </div>
            )}

            <label className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={audio && source !== 'screen'} disabled={source === 'screen'} onChange={e => setAudio(e.target.checked)} className="w-5 h-5 accent-pcgl-blue" />
              Trasmetti anche l'audio (microfono)
            </label>

            {error && <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl p-4"><AlertTriangle size={18} className="flex-none mt-0.5" /> <span>{error}</span></div>}

            <button type="button" onClick={start} disabled={phase === 'starting' || (source === 'device' && !deviceId)} className="w-full py-6 bg-red-600 text-white rounded-[2rem] font-black uppercase text-lg shadow-xl active:scale-95 transition-all hover:bg-red-700 disabled:opacity-60 flex items-center justify-center">
              <Radio size={26} className="mr-3" /> {phase === 'starting' ? 'Avvio in corso…' : 'Avvia diretta'}
            </button>
          </div>
        )}

        {phase === 'live' && (
          <>
            <div className="relative bg-black rounded-3xl overflow-hidden aspect-video shadow-card">
              <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full ${source === 'environment' || source === 'user' ? 'object-cover' : 'object-contain'}`} />
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-black uppercase">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span> In diretta · {formatElapsed(elapsed)}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center"><Eye size={14} className="mr-2" /> Ti sta guardando ({viewers.filter(v => !v.rifiutato).length}/{MAX_VIEWERS})</h4>
              {viewers.length === 0 && <p className="text-sm text-gray-400 italic">Nessuno ancora: la Sala Operativa vedrà la tua diretta nell'elenco e potrà collegarsi.</p>}
              {viewers.map(v => {
                const st = stateLabel(peerStates[v.id]);
                return (
                  <div key={v.id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                    <span className="font-bold text-pcgl-text-dark">{v.nome}</span>
                    <span className={`text-xs font-bold uppercase ${v.rifiutato ? 'text-red-500' : st.c}`}>{v.rifiutato ? 'Rifiutato (limite)' : st.t}</span>
                  </div>
                );
              })}
            </div>

            <button type="button" onClick={stop} className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black uppercase shadow-xl active:scale-95 transition-all hover:bg-black flex items-center justify-center">
              <VideoOff size={22} className="mr-3" /> Termina diretta
            </button>
          </>
        )}
      </div>
    </div>
  );
};

/* ===================================================================
 * LATO SALA OPERATIVA: un singolo riquadro di visione
 * =================================================================== */
const LiveViewerTile = ({ stream, currentUser, onClose }) => {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('connecting'); // connecting | live | disconnected | failed | ended | refused
  const [muted, setMuted] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let closed = false;
    let pc = null;
    const unsubs = [];
    const streamRef = doc(db, 'live_streams', stream.id);
    const viewerRef = doc(streamRef, 'viewers', currentUser.uid);

    (async () => {
      setStatus('connecting');
      await clearViewer(viewerRef);
      if (closed) return;
      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const ice = makeIceQueue(pc);
      pc.ontrack = (e) => {
        if (videoRef.current) videoRef.current.srcObject = e.streams[0];
        if (!closed) setStatus('live');
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) addDoc(collection(viewerRef, 'viewCandidates'), e.candidate.toJSON()).catch(() => {});
      };
      pc.onconnectionstatechange = () => {
        if (closed) return;
        if (pc.connectionState === 'connected') setStatus('live');
        if (pc.connectionState === 'disconnected') setStatus('disconnected');
        if (pc.connectionState === 'failed') setStatus('failed');
      };

      await setDoc(viewerRef, { viewerNome: `${currentUser.nome} ${currentUser.cognome}`, joinedAt: serverTimestamp() });
      let answered = false;
      unsubs.push(onSnapshot(viewerRef, async (snap) => {
        if (closed) return;
        if (!snap.exists()) { setStatus('ended'); return; }
        const d = snap.data();
        if (d.rifiutato) { setStatus('refused'); return; }
        if (d.offer && !answered) {
          answered = true;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(d.offer));
            ice.ready();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await updateDoc(viewerRef, { answer: { type: answer.type, sdp: answer.sdp } });
          } catch {
            if (!closed) setStatus('failed');
          }
        }
      }));
      unsubs.push(onSnapshot(collection(viewerRef, 'pubCandidates'), (snap) => {
        snap.docChanges().forEach(ch => { if (ch.type === 'added') ice.add(ch.doc.data()); });
      }));
    })().catch(() => { if (!closed) setStatus('failed'); });

    return () => {
      closed = true;
      unsubs.forEach(u => u());
      if (pc) pc.close();
      clearViewer(viewerRef);
    };
  }, [stream.id, currentUser.uid, currentUser.nome, currentUser.cognome, attempt]);

  const takeSnapshot = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const cv = document.createElement('canvas');
    cv.width = v.videoWidth;
    cv.height = v.videoHeight;
    cv.getContext('2d').drawImage(v, 0, 0);
    cv.toBlob((b) => {
      if (!b) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = `live_${stream.nome.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, 'image/jpeg', 0.9);
  };

  const messages = {
    connecting: 'Connessione in corso…',
    disconnected: 'Segnale perso, provo a recuperare…',
    failed: 'Connessione non riuscita. La rete del cellulare potrebbe bloccare i collegamenti diretti: riprova.',
    ended: 'Diretta terminata.',
    refused: 'Questa diretta ha già il massimo di spettatori.',
  };

  return (
    <div className="relative bg-black rounded-3xl overflow-hidden aspect-video shadow-card">
      <video ref={videoRef} autoPlay playsInline muted={muted} className="w-full h-full object-contain" />
      {status !== 'live' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 gap-3 bg-black/60 text-white/90 text-sm">
          <span>{messages[status]}</span>
          {(status === 'failed' || status === 'ended' || status === 'refused') && (
            <button type="button" onClick={() => setAttempt(a => a + 1)} className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2 rounded-full text-xs font-bold uppercase"><RefreshCw size={14} /> Riprova</button>
          )}
        </div>
      )}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-2">
        <div className="bg-black/60 text-white px-3 py-1.5 rounded-xl text-xs">
          <div className="font-black uppercase leading-tight">{stream.nome}</div>
          <div className="text-white/70">{[stream.sede, stream.titolo].filter(Boolean).join(' · ')}</div>
        </div>
        <div className="flex gap-2">
          {stream.audio && <button type="button" onClick={() => setMuted(m => !m)} className="bg-black/60 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase">{muted ? 'Audio off' : 'Audio on'}</button>}
          <button type="button" onClick={takeSnapshot} aria-label="Salva fotogramma" className="bg-black/60 text-white p-2 rounded-xl"><Camera size={16} /></button>
          <button type="button" onClick={() => videoRef.current && videoRef.current.requestFullscreen && videoRef.current.requestFullscreen()} aria-label="Schermo intero" className="bg-black/60 text-white p-2 rounded-xl"><Maximize2 size={16} /></button>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="bg-red-600 text-white p-2 rounded-xl"><X size={16} /></button>
        </div>
      </div>
      {status === 'live' && <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> Live</div>}
    </div>
  );
};

/* ===================================================================
 * LATO SALA OPERATIVA: elenco dirette attive + muro di visione
 * =================================================================== */
export const LiveWallSOGL = ({ currentUser }) => {
  const [streams, setStreams] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const [watching, setWatching] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'live_streams'), where('stato', '==', 'attivo')),
      (s) => { setStreams(s.docs.map(d => ({ id: d.id, ...d.data() }))); setError(''); },
      () => setError('Non hai i permessi per vedere le dirette o la connessione è assente.')
    );
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => { unsub(); clearInterval(t); };
  }, []);

  const online = streams.filter(s => s.lastSeen && now - s.lastSeen < STALE_MS);
  const watch = (id) => setWatching(w => (w.includes(id) || w.length >= 4 ? w : [...w, id]));
  const unwatch = (id) => setWatching(w => w.filter(x => x !== id));

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-xl text-pcgl-blue uppercase flex items-center"><Video className="mr-2 text-red-600" /> Dirette dal campo</h3>
          <span className="text-xs font-bold uppercase bg-red-50 text-red-600 px-3 py-1 rounded-full">{online.length} attive</span>
        </div>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {online.length === 0 && !error && <p className="text-sm text-gray-400 italic">Nessuna diretta attiva. I volontari possono avviarla dalla schermata Home dell'app (tasto «Diretta»).</p>}
        <div className="space-y-3">
          {online.map(s => {
            const started = s.startedAt && s.startedAt.toMillis ? s.startedAt.toMillis() : now;
            const mins = Math.max(0, Math.floor((now - started) / 60000));
            const isWatching = watching.includes(s.id);
            return (
              <div key={s.id} className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="min-w-0">
                  <p className="font-black uppercase text-pcgl-blue truncate">{s.nome}</p>
                  <p className="text-xs text-gray-500 truncate">{[s.sede, s.titolo].filter(Boolean).join(' · ') || 'Senza titolo'} · da {mins} min{s.audio ? ' · audio' : ''}</p>
                </div>
                <button type="button" disabled={isWatching || watching.length >= 4} onClick={() => watch(s.id)} className="flex-none flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40">
                  <Radio size={14} /> {isWatching ? 'In visione' : 'Guarda'}
                </button>
              </div>
            );
          })}
        </div>
        {watching.length >= 4 && <p className="text-xs text-gray-400 mt-3">Massimo 4 dirette contemporanee: chiudine una per aprirne un'altra.</p>}
      </div>

      {watching.length > 0 && (
        <div className={`grid gap-4 ${watching.length > 1 ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
          {watching.map(id => {
            const s = streams.find(x => x.id === id);
            if (!s) return null;
            return <LiveViewerTile key={id} stream={s} currentUser={currentUser} onClose={() => unwatch(id)} />;
          })}
        </div>
      )}
    </div>
  );
};
