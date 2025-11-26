
import React, { useState, useEffect } from 'react';
import { RotateCcw, Lock, CheckCircle2, Eye, Timer, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import SketchPad from './SketchPad';

interface DrawingDojoProps {
  onClose: () => void;
  lockedMode?: boolean;
}

// Complex Gestalt Shapes (SVG Paths) - Updated for higher difficulty
const GESTALTS = [
  // Asymmetrical Polygon
  { id: 1, path: "M50,50 L220,80 L280,200 L100,250 L20,150 Z", name: "Irregular Pentagon" },
  // Orthogonal Maze
  { id: 2, path: "M50,50 H250 V150 H150 V250 H50 V150", name: "C-Block Maze" },
  // Sigil
  { id: 3, path: "M150,20 L250,250 L20,100 L280,100 L50,250 Z", name: "Star Glyph" },
  // Abstract Curves
  { id: 4, path: "M50,250 C50,50 150,50 150,150 S 250,250 250,150", name: "Compound Curve" },
  // Compound Geometrics (Disjointed)
  { id: 5, path: "M50,50 L150,50 L150,150 L50,150 Z M180,180 A50,50 0 1,0 280,180 A50,50 0 1,0 180,180", name: "Square & Circle" },
  // Intersecting Axes
  { id: 6, path: "M20,20 L280,280 M280,20 L20,280 M150,20 L150,280", name: "Asterisk" },
  // The "Rune"
  { id: 7, path: "M80,20 L80,280 M80,80 L220,40 M80,220 L220,180", name: "Rune" },
  // Nested Triangle
  { id: 8, path: "M150,20 L280,250 H20 Z M150,80 L220,200 H80 Z", name: "Eye of Providence" }
];

const TARGET_STREAK = 3;

const DrawingDojo: React.FC<DrawingDojoProps> = ({ onClose, lockedMode = false }) => {
  const { t } = useLanguage();
  
  const [step, setStep] = useState<'memorize' | 'draw' | 'check'>('memorize');
  const [currentGestalt, setCurrentGestalt] = useState(GESTALTS[0]);
  const [timer, setTimer] = useState(2);
  const [streak, setStreak] = useState(0);
  const [userSketch, setUserSketch] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  
  // Results
  const [isMatch, setIsMatch] = useState(false);
  const [manualCheckMode, setManualCheckMode] = useState(false);
  
  useEffect(() => {
    pickNewGestalt();
  }, []);

  // Check unlock condition
  useEffect(() => {
    if (lockedMode && streak >= TARGET_STREAK) {
      setUnlocked(true);
    }
  }, [streak, lockedMode]);

  // Countdown for Memorization Phase
  useEffect(() => {
    if (step === 'memorize') {
      if (timer > 0) {
        const interval = setInterval(() => setTimer(t => t - 1), 1000);
        return () => clearInterval(interval);
      } else {
        setStep('draw');
      }
    }
  }, [step, timer]);

  const pickNewGestalt = () => {
    const random = Math.floor(Math.random() * GESTALTS.length);
    setCurrentGestalt(GESTALTS[random]);
    setTimer(2);
    setStep('memorize');
    setUserSketch(null);
    setIsMatch(false);
    setManualCheckMode(false);
  };

  const handleExportSketch = (base64: string) => {
    setUserSketch(base64);
  };

  const handleCheck = () => {
    if (!userSketch) return;
    setManualCheckMode(true);
    setStep('check');
  };

  const handleManualResult = (result: 'match' | 'miss') => {
      if (result === 'match') {
          setIsMatch(true);
          setStreak(s => s + 1);
      } else {
          setIsMatch(false);
          setStreak(0);
      }
      setManualCheckMode(false);
  };

  const handleContinue = () => {
    pickNewGestalt();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-4xl mx-auto p-4 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="text-center mb-6 relative w-full">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-2">
          {t('drawingDojoTitle')}
        </h2>
        <p className="text-slate-400 mb-4">{t('drawingDojoDesc')}</p>
        
        {lockedMode && (
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${unlocked ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-red-900/30 border-red-500 text-red-400 animate-pulse'}`}>
            {unlocked ? <CheckCircle2 size={16} /> : <Lock size={16} />}
            <span className="text-sm font-bold">
              {unlocked ? t('dojoUnlockedMsg') : `${t('dojoLockedMsg')} (${streak}/${TARGET_STREAK})`}
            </span>
          </div>
        )}
      </div>

      {/* Main Area */}
      <div className="w-full max-w-3xl bg-slate-900/50 rounded-3xl border border-slate-800 p-4 md:p-8 shadow-inner flex flex-col items-center relative min-h-[600px] justify-center">
        
        {/* Phase 1: Memorize */}
        {step === 'memorize' && (
          <div className="w-full flex flex-col items-center justify-center animate-in zoom-in duration-300">
             <div className="mb-6 flex flex-col items-center text-center">
               <Eye size={32} className="text-blue-400 mb-2 animate-pulse" />
               <p className="text-lg text-white font-bold">{t('drawingDojoInstruct')}</p>
               <p className="text-sm text-slate-500">Stare at the center. Absorb the whole shape.</p>
             </div>
             
             <div className="w-full max-w-[500px] aspect-square bg-white rounded-xl border-4 border-slate-800 flex items-center justify-center relative shadow-2xl overflow-hidden mx-auto">
                {/* SVG Fills the container exactly like the Canvas will */}
                <svg viewBox="0 0 300 300" className="w-full h-full stroke-black stroke-[6px] fill-none stroke-linecap-round stroke-linejoin-round" preserveAspectRatio="xMidYMid meet">
                    <path d={currentGestalt.path} />
                </svg>

                {/* Timer Overlay */}
                <div className="absolute top-4 right-4 bg-slate-900/90 text-blue-400 px-4 py-2 rounded-full font-mono text-xl font-bold backdrop-blur-sm border border-slate-700 flex items-center gap-2 shadow-lg">
                    <Timer size={18} /> {timer}s
                </div>
             </div>
          </div>
        )}

        {/* Phase 2: Draw */}
        {step === 'draw' && (
           <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
              <h3 className="text-xl text-white font-bold mb-4">{t('drawingDojoDraw')}</h3>
              
              <div className="w-full max-w-[500px] mx-auto">
                 <SketchPad onExport={handleExportSketch} />
              </div>

              <button 
                onClick={handleCheck}
                className="mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-lg transition-all"
              >
                Reveal & Check
              </button>
           </div>
        )}

        {/* Phase 3: Check Result */}
        {step === 'check' && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
             
             {!manualCheckMode && (
                <div className={`mb-4 px-4 py-2 rounded-full border font-bold text-sm uppercase tracking-widest flex items-center gap-2
                    ${isMatch ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-red-900/30 border-red-500 text-red-400'}
                `}>
                    {isMatch ? <CheckCircle2 size={16} /> : <Lock size={16} />}
                    {isMatch ? "TARGET MATCHED" : "MISALIGNMENT DETECTED"}
                </div>
             )}

             {manualCheckMode && (
                 <div className="mb-4 px-4 py-2 rounded-full border border-blue-500/50 bg-blue-900/20 text-blue-400 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                     <AlertCircle size={16} /> COMPARE & VERIFY
                 </div>
             )}

             <div className="relative w-full max-w-[500px] aspect-square bg-white rounded-xl overflow-hidden border-4 border-slate-800 mb-6 shadow-2xl mx-auto">
                 {/* User Sketch Layer */}
                 {userSketch && <img src={userSketch} className="absolute inset-0 w-full h-full object-contain" alt="User Sketch" />}
                 
                 {/* Target Overlay (Red) */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                    <svg viewBox="0 0 300 300" className="w-full h-full stroke-red-600 stroke-[6px] fill-none stroke-linecap-round stroke-linejoin-round" preserveAspectRatio="xMidYMid meet">
                        <path d={currentGestalt.path} />
                    </svg>
                 </div>
             </div>
             
             {manualCheckMode ? (
                 <div className="flex gap-4">
                     <button 
                        onClick={() => handleManualResult('miss')}
                        className="px-6 py-3 bg-red-900/40 hover:bg-red-800 border border-red-500/50 text-red-200 rounded-xl font-bold transition-all flex items-center gap-2"
                     >
                        <ThumbsDown size={18} /> Miss
                     </button>
                     <button 
                        onClick={() => handleManualResult('match')}
                        className="px-6 py-3 bg-green-900/40 hover:bg-green-800 border border-green-500/50 text-green-200 rounded-xl font-bold transition-all flex items-center gap-2"
                     >
                        <ThumbsUp size={18} /> Match
                     </button>
                 </div>
             ) : (
                <button 
                    onClick={handleContinue}
                    className={`px-8 py-3 rounded-xl font-bold shadow-lg transition-all ${isMatch ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                >
                    {isMatch ? "Next Shape" : "Try Again"}
                </button>
             )}
          </div>
        )}

      </div>

      <button 
        onClick={onClose}
        disabled={lockedMode && !unlocked}
        className={`mt-8 flex items-center gap-2 transition-colors ${lockedMode && !unlocked ? 'text-slate-700 cursor-not-allowed' : 'text-slate-500 hover:text-white'}`}
      >
        {lockedMode && !unlocked ? <Lock size={16} /> : <RotateCcw size={16} />}
        {t('exitDojo')}
      </button>

    </div>
  );
};

export default DrawingDojo;
