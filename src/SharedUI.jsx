import React from 'react';
import { ChevronLeft } from 'lucide-react';

export const HeaderSub = ({ title, onBack }) => (
  <div className="flex items-center mb-12 pt-6 w-full animate-in fade-in slide-in-from-left duration-500 font-sans text-pcgl-text-dark">
    <button onClick={onBack} className="mr-4 md:mr-8 p-4 md:p-8 bg-white shadow-lg rounded-2xl text-pcgl-blue active:scale-90 border border-gray-100 transition-all hover:shadow-xl hover:bg-gray-50">
      <ChevronLeft size={32} className="md:w-12 md:h-12" strokeWidth={3} />
    </button>
    <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-pcgl-blue leading-none drop-shadow-md truncate">{title}</h2>
  </div>
);

export const FooterLinks = ({ className = "", fixed = false }) => (
  <div className={`w-full text-center flex flex-col items-center gap-1 z-40 ${fixed ? 'fixed bottom-2 left-0 pointer-events-none' : 'pointer-events-auto'} ${className}`}>
    <a 
      href="https://www.pcgl.it/privacy.html" 
      target="_blank" 
      rel="noopener noreferrer" 
      className="text-[9px] font-bold text-gray-400/50 uppercase tracking-widest pointer-events-auto hover:text-pcgl-blue transition-colors"
    >
      Privacy Policy
    </a>
    <a 
      href="https://www.formazionesicurezza.org/index.html" 
      target="_blank" 
      rel="noopener noreferrer" 
      className="text-[10px] font-bold text-gray-500/80 tracking-wide pointer-events-auto hover:text-pcgl-blue transition-colors"
    >
      Sviluppata da Antonio Mangiamele · formazionesicurezza.org
    </a>
  </div>
);