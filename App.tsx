
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, RefreshCw, Play, CheckCircle, Brain, Image as ImageIcon, Sparkles, ArrowRight, ArrowLeft, ShieldCheck, Trash2, History, LogIn, LogOut, User as UserIcon, AlertTriangle, X, Copy, Server, Mail, Lock, TrendingUp, Lightbulb, Check, XCircle, Globe, Wind, Home, MessageSquareText, BookOpen, Timer, Clock, BarChart3, Layers, Sliders, Contrast, Zap, FileText, Save, Volume2, VolumeX, Award, Medal, Crown, Sprout, Feather, Radio, Activity } from 'lucide-react';
import { SessionState, SessionData, TargetImage, CoachReport, IntuitionStats } from './types';
import { analyzeSession, generateTargetImage, generateCoachReport, recalculateScore } from './services/geminiService';
import { auth, loginWithEmail, registerWithEmail, logOut, saveSessionToCloud, subscribeToHistory, subscribeToIntuitionStats, updateSessionData } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import SketchPad from './components/SketchPad';
import HistoryChart from './components/HistoryChart';
import CoachChat from './components/CoachChat';
import AnalyticsModal from './components/AnalyticsModal';
import IntuitionDojo from './components/IntuitionDojo';
import { useLanguage } from './contexts/LanguageContext';

const generateCoordinate = () => {
  const p1 = Math.floor(1000 + Math.random() * 9000);
  const p2 = Math.floor(1000 + Math.random() * 9000);
  return `${p1}-${p2}`;
};

// --- HELPER: RANK STYLES ---
export const getRankStyle = (level: number) => {
  switch(level) {
    case 1: return { icon: Sprout, color: 'text-slate-400', text: 'text-slate-200', border: 'border-slate-500/30', bg: 'bg-slate-500/10', gradient: 'from-slate-800 to-slate-900', shadow: 'shadow-slate-900/50' };
    case 2: return { icon: Feather, color: 'text-zinc-400', text: 'text-zinc-200', border: 'border-zinc-500/30', bg: 'bg-zinc-500/10', gradient: 'from-zinc-800 to-zinc-900', shadow: 'shadow-zinc-900/50' };
    case 3: return { icon: BookOpen, color: 'text-sky-400', text: 'text-sky-200', border: 'border-sky-500/30', bg: 'bg-sky-500/10', gradient: 'from-sky-900 to-slate-900', shadow: 'shadow-sky-900/50' };
    case 4: return { icon: Eye, color: 'text-cyan-400', text: 'text-cyan-200', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', gradient: 'from-cyan-900 to-slate-900', shadow: 'shadow-cyan-900/50' };
    case 5: return { icon: Activity, color: 'text-teal-400', text: 'text-teal-200', border: 'border-teal-500/30', bg: 'bg-teal-500/10', gradient: 'from-teal-900 to-slate-900', shadow: 'shadow-teal-900/50' };
    case 6: return { icon: Radio, color: 'text-green-400', text: 'text-green-200', border: 'border-green-500/30', bg: 'bg-green-500/10', gradient: 'from-green-900 to-slate-900', shadow: 'shadow-green-900/50' };
    case 7: return { icon: ShieldCheck, color: 'text-amber-400', text: 'text-amber-200', border: 'border-amber-500/30', bg: 'bg-amber-500/10', gradient: 'from-amber-900 to-slate-900', shadow: 'shadow-amber-900/50' };
    case 8: return { icon: Zap, color: 'text-orange-400', text: 'text-orange-200', border: 'border-orange-500/30', bg: 'bg-orange-500/10', gradient: 'from-orange-900 to-red-900', shadow: 'shadow-orange-900/50' };
    case 9: return { icon: Crown, color: 'text-purple-400', text: 'text-purple-200', border: 'border-purple-500/50', bg: 'bg-purple-500/10', gradient: 'from-purple-900 to-fuchsia-900', shadow: 'shadow-purple-900/50' };
    default: return { icon: UserIcon, color: 'text-slate-400', text: 'text-slate-200', border: 'border-slate-700', bg: 'bg-slate-800', gradient: 'from-slate-800 to-slate-900', shadow: 'shadow-slate-900' };
  }
};

// --- SUB-COMPONENTS ---

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors font-medium"
          >
            Confirm Exit
          </button>
        </div>
      </div>
    </div>
  );
};

interface Step1Props {
  coordinate: string;
  onNext: () => void;
}

const Step1Focus: React.FC<Step1Props> = ({ coordinate, onNext }) => {
  const { t } = useLanguage();
  const [isFocusing, setIsFocusing] = useState(false);
  const [breathState, setBreathState] = useState<'in' | 'hold' | 'out'>('in');
  const [guideText, setGuideText] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Web Audio API Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);

  // Initialize Audio Logic
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const gain = audioCtxRef.current.createGain();
      gain.gain.setValueAtTime(0, audioCtxRef.current.currentTime); // Start silent
      gain.connect(audioCtxRef.current.destination);
      gainNodeRef.current = gain;
    }
  };

  const startAudio = () => {
    if (!audioEnabled) return;
    initAudio();
    if (!audioCtxRef.current || !gainNodeRef.current) return;

    // Create a Theta Beat (4Hz difference)
    // Left Ear: 200Hz
    // Right Ear: 204Hz
    const osc1 = audioCtxRef.current.createOscillator();
    const osc2 = audioCtxRef.current.createOscillator();
    const panner1 = audioCtxRef.current.createStereoPanner();
    const panner2 = audioCtxRef.current.createStereoPanner();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.value = 200;
    osc2.frequency.value = 204;

    panner1.pan.value = -1; // Left
    panner2.pan.value = 1;  // Right

    osc1.connect(panner1).connect(gainNodeRef.current);
    osc2.connect(panner2).connect(gainNodeRef.current);

    osc1.start();
    osc2.start();
    oscillatorsRef.current = [osc1, osc2];

    // Fade in
    gainNodeRef.current.gain.linearRampToValueAtTime(0.15, audioCtxRef.current.currentTime + 2);
  };

  const stopAudio = () => {
    if (gainNodeRef.current && audioCtxRef.current) {
      // Fade out
      gainNodeRef.current.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 1);
      setTimeout(() => {
        oscillatorsRef.current.forEach(osc => {
          try { osc.stop(); } catch (e) {}
        });
        oscillatorsRef.current = [];
      }, 1000);
    }
  };

  const handleStartFocus = () => {
    setIsFocusing(true);
    startAudio();
  };

  const handleStopFocus = () => {
    stopAudio();
    onNext();
  };

  // Breath cycle timer
  useEffect(() => {
    if (!isFocusing) return;

    // Cycle: In (4s) -> Hold (4s) -> Out (6s)
    let step = 0;
    const runCycle = () => {
      if (step === 0) {
        setBreathState('in');
        setGuideText(t('breatheIn'));
        setTimeout(() => { step = 1; runCycle(); }, 4000);
      } else if (step === 1) {
        setBreathState('hold');
        setGuideText(t('breatheHold'));
        setTimeout(() => { step = 2; runCycle(); }, 4000);
      } else {
        setBreathState('out');
        setGuideText(t('breatheOut'));
        setTimeout(() => { step = 0; runCycle(); }, 6000);
      }
    };

    runCycle();
    return () => { step = -1; };
  }, [isFocusing, t]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-in fade-in duration-700">
      
      {!isFocusing ? (
        <>
          <div className="space-y-2">
            <h3 className="text-slate-400 text-sm uppercase tracking-widest">{t('trn')}</h3>
            <div className="text-6xl md:text-7xl font-mono font-bold text-white tracking-wider drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              {coordinate}
            </div>
          </div>
          
          <div className="max-w-lg bg-slate-800/50 p-6 rounded-xl border border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-cyan-400"></div>
            <p className="text-lg text-slate-300 leading-relaxed mb-4">
              {t('focusDesc')}
            </p>
            <div className="flex items-start gap-3 bg-blue-900/20 p-4 rounded-lg border border-blue-500/30 text-left">
              <Wind className="text-blue-400 shrink-0 mt-1" size={20} />
              <p className="text-sm text-blue-200">{t('focusTip')}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`p-3 rounded-full border transition-all ${audioEnabled ? 'bg-blue-900/30 border-blue-500/50 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                title={audioEnabled ? t('audioMute') : t('audioFocus')}
            >
                {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                {audioEnabled ? t('audioFocus') : t('audioMute')}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <button 
              onClick={handleStartFocus} 
              className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-full font-semibold transition-all flex items-center justify-center gap-2 border border-slate-600 group"
            >
              <Wind size={18} className="group-hover:animate-pulse" /> {t('startFocusSeq')}
            </button>
            <button 
              onClick={onNext} 
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)]"
            >
              {t('btnFocused')} <ArrowRight size={18} />
            </button>
          </div>
        </>
      ) : (
        <div className="relative flex flex-col items-center justify-center w-full h-full min-h-[400px]">
          {/* Breathing Circle Animation */}
          <div 
            className={`
              absolute rounded-full border-2 border-blue-500/30 bg-blue-500/5 blur-xl
              transition-all ease-in-out
              ${breathState === 'in' ? 'w-96 h-96 opacity-100 duration-[4000ms]' : ''}
              ${breathState === 'hold' ? 'w-96 h-96 opacity-80 duration-[200ms]' : ''}
              ${breathState === 'out' ? 'w-32 h-32 opacity-30 duration-[6000ms]' : ''}
            `}
          />
          
          {/* Solid Inner Circle */}
          <div 
             className={`
              relative z-10 rounded-full flex items-center justify-center bg-slate-900 border-4 border-slate-800 shadow-2xl
              transition-all ease-in-out
              ${breathState === 'in' ? 'w-64 h-64 border-blue-500/50 duration-[4000ms]' : ''}
              ${breathState === 'hold' ? 'w-64 h-64 border-blue-400 duration-[200ms]' : ''}
              ${breathState === 'out' ? 'w-64 h-64 border-slate-700 duration-[6000ms]' : ''}
             `}
          >
             <div className="text-center space-y-2">
                <div className="text-4xl font-mono font-bold text-white">{coordinate}</div>
                <div className={`text-sm font-bold uppercase tracking-widest transition-colors ${breathState === 'in' ? 'text-blue-400' : breathState === 'out' ? 'text-slate-500' : 'text-white'}`}>
                  {guideText}
                </div>
             </div>
          </div>
          
          {/* Sound Indicator */}
          {audioEnabled && (
             <div className="absolute top-10 flex gap-1 items-end h-4">
               {[...Array(5)].map((_, i) => (
                 <div key={i} className="w-1 bg-blue-500/50 animate-[bounce_1s_infinite] rounded-full" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}></div>
               ))}
             </div>
          )}

          <button 
            onClick={handleStopFocus}
            className="absolute bottom-10 px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-semibold transition-all border border-slate-600 hover:border-blue-500 z-20"
          >
            {t('stopFocusSeq')}
          </button>
        </div>
      )}
    </div>
  );
};

interface Step2Props {
  notes: string;
  onChange: (val: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step2Impressions: React.FC<Step2Props> = ({ notes, onChange, onNext, onBack }) => {
  const { t, language } = useLanguage();
  const [showHelper, setShowHelper] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("Colors");

  // Descriptor data for the helper
  const descriptors: Record<string, Record<string, string[]>> = {
    en: {
      "Colors": ["Red", "Blue", "Green", "Yellow", "Black", "White", "Grey", "Brown", "Bright", "Dark", "Shiny", "Matte"],
      "Textures": ["Rough", "Smooth", "Hard", "Soft", "Wet", "Dry", "Gritty", "Polished", "Fuzzy", "Sharp"],
      "Shapes": ["Round", "Square", "Triangular", "Flat", "Tall", "Wide", "Angular", "Curved", "Jagged", "Symmetrical"],
      "Dimensions": ["Large", "Small", "Heavy", "Light", "Hollow", "Solid", "Dense", "Spacious"],
      "Smell/Taste": ["Sweet", "Sour", "Bitter", "Salty", "Metallic", "Smoky", "Fresh", "Musty", "Chemical"],
      "Dynamics": ["Static", "Moving", "Fast", "Slow", "Rotating", "Flowing", "Vibrating", "Explosive"],
      "Ambience": ["Natural", "Man-made", "Indoors", "Outdoors", "Urban", "Rural", "Crowded", "Empty"]
    },
    si: {
      "වර්ණ": ["රතු", "නිල්", "කොළ", "කහ", "කළු", "සුදු", "අළු", "දුඹුරු", "දීප්තිමත්", "අඳුරු", "දිලිසෙන", "මැට්"],
      "මතුපිට": ["රළු", "සිනිඳු", "තද", "මෘදු", "තෙත්", "වියළි", "බොරළු සහිත", "ඔප දැමූ", "සුමුදු", "තියුණු"],
      "හැඩතල": ["රවුම්", "කොටු", "ත්‍රිකෝණාකාර", "පැතලි", "උස", "පළල්", "කෝණික", "වක්‍ර", "දත් සහිත", "සමමිතික"],
      "මානයන්": ["විශාල", "කුඩා", "බර", "සැහැල්ලු", "කුහර", "ඝන", "ඝනකම", "ඉඩකඩ සහිත"],
      "සුවඳ/රස": ["පැණිරස", "ඇඹුල්", "තිත්ත", "ලුණු", "ලෝහමය", "දුම්", "නැවුම්", "පුස්", "රසායනික"],
      "චලනය": ["නිශ්චල", "චලනය වන", "වේගවත්", "මන්දගාමී", "කරකැවෙන", "ගලා යන", "කම්පන", "පුපුරන සුලු"],
      "පරිසරය": ["ස්වභාවික", "මිනිසා සාදන ලද", "ගෘහස්ථ", "එළිමහන්", "නාගරික", "ග්‍රාමීය", "ජනාකීර්ණ", "හිස්"]
    }
  };

  const currentDescriptors = descriptors[language] || descriptors['en'];
  const categories = Object.keys(currentDescriptors);

  useEffect(() => {
    // Reset active category when language changes to avoid undefined state
    if (!categories.includes(activeCategory)) {
      setActiveCategory(categories[0]);
    }
  }, [language, categories, activeCategory]);

  const addWord = (word: string) => {
    const separator = notes.length > 0 && !notes.endsWith(' ') ? ', ' : '';
    onChange(notes + separator + word);
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-in slide-in-from-right-8 duration-300">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">{t('stage1Title')}</h2>
        <p className="text-slate-400">{t('stage1Desc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-800/50 p-1 rounded-2xl border border-slate-700 focus-within:border-blue-500/50 transition-colors h-full">
            <textarea
              className="w-full h-80 bg-slate-900 rounded-xl p-6 text-lg text-slate-200 placeholder:text-slate-600 focus:outline-none resize-none"
              placeholder={t('placeholderNotes')}
              value={notes}
              onChange={(e) => onChange(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-between">
            <button onClick={onBack} className="text-slate-500 hover:text-slate-300 flex items-center gap-2 px-4 py-2">
              <ArrowLeft size={18} /> {t('btnBack')}
            </button>
            <button onClick={onNext} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20">
              {t('btnNextVisuals')} <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Helper Sidebar / Toggle */}
        <div className="lg:col-span-1">
          {!showHelper ? (
             <button 
               onClick={() => setShowHelper(true)}
               className="w-full h-full min-h-[100px] rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-900/10 transition-all group"
             >
               <BookOpen size={32} className="mb-2 group-hover:scale-110 transition-transform" />
               <span className="font-semibold">{t('helperBtn')}</span>
             </button>
          ) : (
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 h-full max-h-[500px] flex flex-col animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
                 <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen size={14} className="text-blue-400"/> {t('helperBtn')}
                 </h3>
                 <button onClick={() => setShowHelper(false)} className="text-slate-500 hover:text-white">
                   <X size={16} />
                 </button>
              </div>
              
              <p className="text-xs text-slate-500 mb-3">{t('helperTip')}</p>

              {/* Categories Tabs */}
              <div className="flex flex-wrap gap-2 mb-3">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Words Grid */}
              <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar">
                 <div className="grid grid-cols-2 gap-2">
                    {currentDescriptors[activeCategory]?.map(word => (
                      <button
                        key={word}
                        onClick={() => addWord(word)}
                        className="text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-blue-300 text-xs transition-colors border border-slate-700/50"
                      >
                        {word}
                      </button>
                    ))}
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface Step4Props {
  notes: string;
  sketch: string | null;
  onSubmit: () => void;
  onBack: () => void;
}

const Step4Review: React.FC<Step4Props> = ({ notes, sketch, onSubmit, onBack }) => {
  const { t } = useLanguage();
  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-in slide-in-from-right-8 duration-300">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white">{t('reviewTitle')}</h2>
        <p className="text-slate-400">{t('reviewDesc')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles size={14} /> {t('sensoryNotes')}
          </h3>
          <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
            {notes || <span className="text-slate-600 italic">{t('noNotes')}</span>}
          </p>
        </div>
        
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <ImageIcon size={14} /> {t('sketchPreview')}
          </h3>
          <div className="bg-white rounded-lg overflow-hidden aspect-[4/3] border border-slate-600">
            {sketch ? (
              <img src={sketch} alt="User Sketch" className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">{t('noSketch')}</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-8">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-300 flex items-center gap-2 px-4 py-2">
          <ArrowLeft size={18} /> {t('editData')}
        </button>
        <button 
          onClick={onSubmit} 
          className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-[0_0_30px_-5px_rgba(22,163,74,0.4)]"
        >
          <ShieldCheck size={20} /> {t('submitAnalysis')}
        </button>
      </div>
    </div>
  );
};

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        if (!name) throw new Error("Name is required for registration.");
        await registerWithEmail(email, password, name);
      }
      onClose();
    } catch (err: any) {
      let msg = t('authFailed');
      if (err.code === 'auth/invalid-email') msg = "Invalid email address.";
      if (err.code === 'auth/user-not-found') msg = "No account found with this email.";
      if (err.code === 'auth/wrong-password') msg = "Incorrect password.";
      if (err.code === 'auth/email-already-in-use') msg = "Email is already registered.";
      if (err.code === 'auth/weak-password') msg = "Password must be at least 6 characters.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button 
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          {isLogin ? t('welcomeBackAuth') : t('createAccount')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-300 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase">{t('displayName')}</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 text-slate-500" size={18} />
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder={t('yourName')}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase">{t('emailAddress')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase">{t('password')}</label>
             <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-blue-900/20 mt-4 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="animate-spin mx-auto" size={20}/>
            ) : (
              isLogin ? t('btnSignIn') : t('btnSignUp')
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            {isLogin ? t('noAccount') : t('haveAccount')}{" "}
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)} 
              className="text-blue-400 hover:text-blue-300 font-semibold"
            >
              {isLogin ? t('btnSignUp') : t('btnSignIn')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

function App() {
  const { t, language, setLanguage } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [state, setState] = useState<SessionState>(SessionState.IDLE);
  const [step, setStep] = useState(1);
  const [sessionNumber, setSessionNumber] = useState(1);
  
  const [coordinate, setCoordinate] = useState<string>('');
  const [target, setTarget] = useState<TargetImage | null>(null);
  const [userNotes, setUserNotes] = useState('');
  const [userSketch, setUserSketch] = useState<string | null>(null);
  
  const [history, setHistory] = useState<SessionData[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(t('initializing'));
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false); 
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false); 

  const [coachReport, setCoachReport] = useState<CoachReport | null>(null);
  const [analyzingHistory, setAnalyzingHistory] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Intuition Dojo State
  const [intuitionStats, setIntuitionStats] = useState<IntuitionStats | null>(null);
  const [isDojoLocked, setIsDojoLocked] = useState(false);

  // Visual Analysis Tools State
  const [viewMode, setViewMode] = useState<'split' | 'overlay'>('split');
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [invertSketch, setInvertSketch] = useState(false);

  // Post Session Remarks State
  const [remarksInput, setRemarksInput] = useState('');
  const [isSavingRemarks, setIsSavingRemarks] = useState(false);
  const [remarksSaved, setRemarksSaved] = useState(false);

  const sessionRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);

  const STEPS = [
    { id: 1, title: t('stepFocus'), icon: Brain },
    { id: 2, title: t('stepImpressions'), icon: Sparkles },
    { id: 3, title: t('stepSketch'), icon: ImageIcon },
    { id: 4, title: t('stepReview'), icon: CheckCircle },
  ];

  // --- LEVELING SYSTEM LOGIC ---
  const calculateLevel = (sessions: SessionData[]) => {
    if (sessions.length === 0) {
      return { level: 1, title: 'lvl1', division: null, progress: 0, nextThreshold: 20 };
    }
    
    const avgScore = Math.round(sessions.reduce((acc, s) => acc + s.aiScore, 0) / sessions.length);

    let level = 1;
    let title = 'lvl1';
    let division: 'I' | 'II' | 'III' | null = null;
    let minScore = 0;
    let maxScore = 100;

    if (avgScore < 20) {
       level = 1; title = 'lvl1'; division = null; minScore = 0; maxScore = 20;
    } else if (avgScore >= 90) {
       level = 9; title = 'lvl9'; division = null; minScore = 90; maxScore = 100;
    } else {
       // Levels 2-8
       level = Math.floor((avgScore - 20) / 10) + 2;
       const levelKey = `lvl${level}`;
       title = levelKey;
       
       const baseLevelScore = 20 + (level - 2) * 10;
       const relativeScore = avgScore - baseLevelScore;
       
       if (relativeScore <= 3) division = 'I';
       else if (relativeScore <= 6) division = 'II';
       else division = 'III';

       minScore = baseLevelScore;
       maxScore = baseLevelScore + 10;
    }

    const totalRange = maxScore - minScore;
    const currentProgress = avgScore - minScore;
    const progressPercent = Math.min(100, Math.max(0, (currentProgress / totalRange) * 100));

    return { level, title, division, progress: progressPercent, nextThreshold: maxScore, avgScore };
  };

  const currentRank = calculateLevel(history);
  const rankStyle = getRankStyle(currentRank.level);
  const RankIcon = rankStyle.icon;

  // Auth State Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setHistory([]); 
        setCoachReport(null);
        setIntuitionStats(null);
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // Database Sync Observer (History)
  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToHistory(user.uid, (sessions) => {
        setHistory(sessions);
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Database Sync Observer (Intuition Stats)
  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToIntuitionStats(user.uid, (stats) => {
        setIntuitionStats(stats);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const runCoachAnalysis = async () => {
    if (history.length < 3) {
      alert(t('aiCoachUnlock'));
      return;
    }
    setAnalyzingHistory(true);
    try {
      const report = await generateCoachReport(history, language);
      setCoachReport(report);
    } catch (e) {
      console.error(e);
      alert("Failed to generate coaching report.");
    } finally {
      setAnalyzingHistory(false);
    }
  };

  const startSession = async () => {
    if (!user) {
      setShowAuthModal(true);
      return; 
    }
    
    setSessionNumber(history.length + 1);
    setIsLoading(true);
    setLoadingMessage(t('startSessionLoading'));
    sessionRef.current = true; 
    startTimeRef.current = Date.now(); 
    
    setViewMode('split');
    setOverlayOpacity(0.5);
    setInvertSketch(false);
    setRemarksInput('');
    setRemarksSaved(false);

    try {
      const newCoord = generateCoordinate();
      setCoordinate(newCoord);
      
      setUserNotes('');
      setUserSketch(null);
      setStep(1);

      const targetData = await generateTargetImage();
      setTarget(targetData);
      
      if (sessionRef.current) {
        setState(SessionState.VIEWING);
      }
    } catch (e) {
      alert("Failed to initialize session. Check connection.");
      sessionRef.current = false;
    } finally {
      setIsLoading(false);
      setLoadingMessage(t('startSession'));
    }
  };

  const goHome = () => {
    if (state === SessionState.IDLE) return;
    const shouldConfirm = state === SessionState.VIEWING || state === SessionState.ANALYZING;

    if (shouldConfirm) {
      setShowExitConfirm(true);
    } else {
      sessionRef.current = false;
      setState(SessionState.IDLE);
    }
  };

  const confirmExitSession = () => {
    sessionRef.current = false;
    setState(SessionState.IDLE);
    setShowExitConfirm(false);
  };

  const submitSession = async () => {
    if (!target || !user) return;
    setAnalysisError(null);
    setState(SessionState.ANALYZING);
    try {
      const result = await analyzeSession(target.base64, userSketch, userNotes, language);
      if (!sessionRef.current) return;
      const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const newSession: SessionData = {
        id: Date.now().toString(),
        coordinate,
        timestamp: Date.now(),
        targetImageUrl: target.url,
        targetImageBase64: target.base64,
        userSketchBase64: userSketch,
        userNotes,
        aiScore: result.score,
        aiFeedback: result.feedback,
        durationSeconds: durationSeconds
      };
      setCurrentSession(newSession);
      await saveSessionToCloud(user.uid, newSession);
      if (sessionRef.current) {
        setState(SessionState.FEEDBACK);
      }
    } catch (e) {
      console.error("Session submission failed:", e);
      if (sessionRef.current) {
        setAnalysisError(t('analysisFailed'));
      }
    }
  };

  const handleSaveRemarks = async () => {
    if (!user || !currentSession || !remarksInput.trim()) return;
    setIsSavingRemarks(true);
    try {
        // 1. Recalculate score based on remarks
        const recalculated = await recalculateScore(currentSession, remarksInput, language);
        
        // 2. Prepare updated data
        const updatedData: Partial<SessionData> = {
            postSessionRemarks: remarksInput,
            aiScore: recalculated.score,
            aiFeedback: recalculated.feedback
        };

        // 3. Update Cloud
        await updateSessionData(user.uid, currentSession.id, updatedData);
        
        // 4. Update Local State
        setCurrentSession(prev => prev ? { ...prev, ...updatedData } : null);
        
        setRemarksSaved(true);
    } catch (e) {
        console.error("Failed to save remarks and recalculate", e);
        alert("Failed to update session.");
    } finally {
        setIsSavingRemarks(false);
    }
  };

  const handleSketchExport = useCallback((base64: string) => {
    setUserSketch(base64);
  }, []);

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}${t('min')}`;
    if (m > 0) return `${m}${t('min')} ${s}${t('sec')}`;
    return `${s}${t('sec')}`;
  };

  const renderHeader = () => (
    <header className="w-full p-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <button type="button" onClick={goHome} className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left group">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Eye className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              {t('appTitle')}
            </h1>
            <p className="text-xs text-slate-400 font-mono">{t('appSubtitle')}</p>
          </div>
        </button>
        
        <div className="flex items-center gap-6">
          {state !== SessionState.IDLE && state !== SessionState.DOJO && (
             <div className="hidden md:flex items-center gap-4">
               <div className="bg-slate-800 px-3 py-2 rounded-lg border border-slate-700 font-mono text-sm font-bold text-blue-400">
                  {t('session')} #{sessionNumber}
               </div>
               {state === SessionState.VIEWING && (
                 <div className="flex items-center gap-2">
                   {STEPS.map((s) => (
                     <div key={s.id} className={`h-2 w-2 rounded-full ${step >= s.id ? 'bg-blue-500' : 'bg-slate-700'}`} />
                   ))}
                 </div>
               )}
               <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 font-mono text-cyan-400 animate-pulse">
                 {t('trn')}: {coordinate}
               </div>
             </div>
          )}
          
          {state !== SessionState.IDLE && !isDojoLocked && (
            <button
              type="button"
              onClick={goHome}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-colors"
              title={t('exitSession')}
            >
              <XCircle size={20} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'si' : 'en')}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full transition-colors"
            title="Switch Language"
          >
            <Globe size={14} className="text-slate-400"/>
            <span className="text-xs font-semibold text-slate-200">{language === 'en' ? '🇺🇸 EN' : '🇱🇰 SI'}</span>
          </button>

          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                 {/* Current Rank Badge (Small) */}
                 <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-0.5 border ${rankStyle.bg} ${rankStyle.border} ${rankStyle.color}`}>
                    <RankIcon size={10} /> {t(currentRank.title)} {currentRank.division}
                 </div>
                 <span className="text-sm font-semibold text-slate-200">{user.displayName || t('viewer')}</span>
              </div>
              {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-slate-600" />
              ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300">
                      <UserIcon size={16} />
                  </div>
              )}
              <button type="button" onClick={logOut} className="p-2 text-slate-400 hover:text-red-400 transition-colors" title={t('logout')}>
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <button 
              type="button"
              onClick={() => setShowAuthModal(true)} 
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-600 transition-all"
            >
              <LogIn size={16} />
              <span className="text-sm font-semibold">{t('login')}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );

  const renderIdle = () => {
    const totalSeconds = history.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);
    return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 w-full max-w-5xl mx-auto relative">
      <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700 mb-12">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-8 mx-auto border border-slate-700 relative group">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl group-hover:bg-blue-500/30 transition-all"></div>
          <Brain className="text-blue-400 w-12 h-12" />
        </div>
        
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {user ? `${t('welcomeBack')}, ${user.displayName ? user.displayName.split(' ')[0] : t('viewer')}` : t('readyToTrain')}
        </h2>
        <p className="text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
          {user ? t('introAuth') : t('introGuest')}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
            <button
                type="button"
                onClick={startSession}
                disabled={isLoading}
                className="group relative px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.6)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                <Sparkles className="animate-spin" />
                ) : (
                <Play className="fill-white" size={20} />
                )}
                {isLoading ? loadingMessage : t('startSession')}
            </button>
            ) : (
            <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="px-8 py-4 bg-white text-slate-900 hover:bg-slate-200 font-bold rounded-xl transition-all flex items-center justify-center gap-3"
            >
                <UserIcon size={20} />
                {t('signInRegister')}
            </button>
            )}

            {/* Intuition Dojo Button */}
            {user && (
                <button
                    onClick={() => {
                        setIsDojoLocked(false);
                        setState(SessionState.DOJO);
                    }}
                    className="px-8 py-4 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 hover:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3"
                >
                    <Zap size={20} />
                    {t('intuitionDojo')}
                </button>
            )}
        </div>
      </div>

      {user && history.length > 0 && (
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-1000 delay-200">
          <div className="lg:col-span-2 bg-slate-900/50 rounded-2xl border border-slate-800 p-6 relative flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
                <History size={18} /> {t('historyTitle')}
              </h3>
              <div className="flex gap-2">
                 <button 
                    onClick={() => setShowAnalyticsModal(true)}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-full border border-slate-700 transition-all flex items-center gap-2"
                 >
                    <BarChart3 size={12} />
                    {t('viewAnalytics')}
                 </button>
                 <button 
                   onClick={() => setShowChat(true)}
                   className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-full transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
                 >
                   <MessageSquareText size={12} />
                   {t('openChat')}
                 </button>
              </div>
            </div>
            <HistoryChart sessions={history} />
            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                <Clock size={14} />
                <span>{t('totalTime')}:</span>
                <span className="text-blue-400 font-bold">{formatDuration(totalSeconds)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
              {/* RANK CARD */}
              <div className={`bg-gradient-to-br ${rankStyle.gradient} rounded-2xl border ${rankStyle.border} p-6 flex flex-col shadow-xl`}>
                 <div className="flex justify-between items-start mb-4">
                    <div>
                        <h4 className={`text-xs font-bold uppercase tracking-widest mb-1 ${rankStyle.text}`}>{t('currentRank')}</h4>
                        <div className="text-2xl font-bold text-white flex items-center gap-2">
                            <RankIcon className={rankStyle.color} />
                            {t(currentRank.title)} <span className="text-white/60 text-lg">{currentRank.division}</span>
                        </div>
                        <div className={`text-xs mt-1 ${rankStyle.text} opacity-80`}>
                            {t('level')} {currentRank.level} • {t('avgScore')}: {currentRank.avgScore}%
                        </div>
                    </div>
                    <RankIcon size={40} className={`${rankStyle.text} opacity-20`} />
                 </div>
                 
                 {/* Progress Bar */}
                 <div className="mt-2">
                    <div className={`flex justify-between text-[10px] uppercase font-bold mb-1 ${rankStyle.text} opacity-70`}>
                        <span>{t('division')} {currentRank.division || 'I'}</span>
                        <span>{t('nextRank')}</span>
                    </div>
                    <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/10">
                        <div 
                            className={`h-full bg-white transition-all duration-1000 ease-out`}
                            style={{ width: `${currentRank.progress}%` }}
                        />
                    </div>
                 </div>
              </div>

              {/* AI COACH CARD */}
              <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 flex flex-col flex-grow">
                {coachReport ? (
                <div className="space-y-4 animate-in slide-in-from-right duration-500">
                    <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold uppercase text-xs tracking-widest">
                        <Brain size={14} /> {t('coachReport')}
                    </div>
                    <button 
                        onClick={runCoachAnalysis} 
                        disabled={analyzingHistory}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                        title={t('regenerateReport')}
                    >
                        <RefreshCw size={12} className={analyzingHistory ? "animate-spin" : ""} />
                        {analyzingHistory ? t('analyzing') : t('regenerateReport')}
                    </button>
                    </div>
                    <p className="text-sm text-slate-300 italic">"{coachReport.trendSummary}"</p>
                    <div className="space-y-3 mt-4">
                    <div className="bg-green-900/10 border border-green-900/30 rounded-lg p-3">
                        <h4 className="text-green-400 text-xs font-bold mb-2 flex items-center gap-1"><Check size={12}/> {t('strengths')}</h4>
                        <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                            {coachReport.strengths.map((s,i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                    <div className="bg-red-900/10 border border-red-900/30 rounded-lg p-3">
                        <h4 className="text-red-400 text-xs font-bold mb-2 flex items-center gap-1"><XCircle size={12}/> {t('weaknesses')}</h4>
                        <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                            {coachReport.weaknesses.map((s,i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-800">
                    <h4 className="text-blue-400 text-xs font-bold mb-2 flex items-center gap-1"><Lightbulb size={12}/> {t('tip')}</h4>
                    <p className="text-xs text-slate-400">{coachReport.trainingTips[0]}</p>
                    </div>
                </div>
                ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-4 text-slate-500">
                    <TrendingUp size={32} className="opacity-20" />
                    <div>
                        <p className="text-sm font-semibold">{t('aiCoachReady')}</p>
                        <p className="text-xs mt-1 max-w-[200px]">{t('aiCoachUnlock')}</p>
                    </div>
                    {history.length >= 3 && (
                        <button 
                        onClick={runCoachAnalysis}
                        disabled={analyzingHistory} 
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                        {analyzingHistory ? t('analyzing') : t('generateReport')}
                        </button>
                    )}
                </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
    );
  };

  const renderViewing = () => (
    <div className="max-w-6xl mx-auto p-4 w-full min-h-[70vh] flex flex-col">
      <div className="mb-8 flex justify-center">
         <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-full border border-slate-800 backdrop-blur-sm">
           {STEPS.map((s) => (
             <div 
               key={s.id}
               className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${step === s.id ? 'bg-blue-600 text-white shadow-lg' : step > s.id ? 'text-blue-400' : 'text-slate-600'}`}
             >
               <s.icon size={16} />
               <span className={`${step === s.id ? 'block' : 'hidden'} md:block text-sm font-medium`}>{s.title}</span>
             </div>
           ))}
         </div>
      </div>
      <div className="flex-grow relative flex flex-col">
         {step === 1 && <Step1Focus coordinate={coordinate} onNext={nextStep} />}
         {step === 2 && <Step2Impressions notes={userNotes} onChange={setUserNotes} onNext={nextStep} onBack={prevStep} />}
         <div className={`flex flex-col h-full ${step === 3 ? 'flex' : 'hidden'}`}>
           <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-white">{t('stage2Title')}</h2>
              <p className="text-slate-400 text-sm">{t('stage2Desc')}</p>
           </div>
           <div className="flex-grow min-h-[500px] bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
              <SketchPad onExport={handleSketchExport} />
           </div>
           <div className="flex justify-between pt-4">
              <button onClick={prevStep} className="text-slate-500 hover:text-slate-300 flex items-center gap-2 px-4 py-2">
                <ArrowLeft size={18} /> {t('btnBack')}
              </button>
              <button onClick={nextStep} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20">
                {t('sketchReviewBtn')} <ArrowRight size={18} />
              </button>
           </div>
         </div>
         {step === 4 && <Step4Review notes={userNotes} sketch={userSketch} onSubmit={submitSession} onBack={prevStep} />}
      </div>
    </div>
  );

  const renderAnalyzing = () => {
    if (analysisError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500 p-4 text-center">
                <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-6 border border-red-500/50">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{t('analysisFailed')}</h2>
                <p className="text-slate-400 mb-8 max-w-md">{t('analysisErrorDesc')}</p>
                <div className="flex flex-wrap justify-center gap-4">
                    <button 
                        onClick={() => {
                            setAnalysisError(null);
                            setState(SessionState.VIEWING);
                        }}
                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors border border-slate-700"
                    >
                        {t('returnToReview')}
                    </button>
                    <button 
                        onClick={submitSession}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20"
                    >
                        <RefreshCw size={18} /> {t('tryAgain')}
                    </button>
                </div>
            </div>
        );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-500/30 blur-xl rounded-full animate-pulse"></div>
          <RefreshCw className="w-16 h-16 text-blue-400 animate-spin relative z-10" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('analyzingTitle')}</h2>
        <p className="text-slate-400">{t('analyzingDesc')}</p>
      </div>
    );
  };

  const renderFeedback = () => {
    if (!currentSession) return null;
    const isLowScore = currentSession.aiScore < 50;

    return (
      <div className="max-w-6xl mx-auto p-4 animate-in slide-in-from-bottom-8 duration-700">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckCircle className="text-green-500" />
            {t('feedbackPhase')}
          </h2>
          <div className="flex gap-4">
             <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-sm mr-2">{t('accuracyScore')}</span>
                <span className={`font-bold text-xl ${currentSession.aiScore >= 70 ? 'text-green-400' : currentSession.aiScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {currentSession.aiScore}%
                </span>
             </div>
             {currentSession.durationSeconds !== undefined && (
               <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-2 text-slate-300">
                 <Timer size={16} className="text-blue-400" />
                 <span className="text-sm font-mono font-bold">{formatDuration(currentSession.durationSeconds)}</span>
               </div>
             )}
             
             {isLowScore ? (
               <button
                 onClick={() => {
                   sessionRef.current = false;
                   setIsDojoLocked(true);
                   setState(SessionState.DOJO);
                 }}
                 className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors font-bold animate-pulse shadow-lg shadow-red-900/40 border border-red-500"
               >
                 {t('calibrationRequired')}
               </button>
             ) : (
               <button
                 onClick={() => {
                   sessionRef.current = false;
                   setState(SessionState.IDLE);
                 }}
                 className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
               >
                 {t('nextSession')}
               </button>
             )}
          </div>
        </div>

        {/* Low Score Warning Banner */}
        {isLowScore && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 mb-6 flex items-center gap-4 animate-in slide-in-from-top-4">
             <div className="bg-red-900/50 p-3 rounded-full">
               <AlertTriangle className="text-red-400" size={24} />
             </div>
             <div>
               <h3 className="font-bold text-red-400 uppercase tracking-wide text-sm mb-1">{t('lowScoreWarning')}</h3>
               <p className="text-slate-300 text-sm">{t('calibrationDesc')}</p>
             </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-6">
           <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
              <Layers size={16} className="text-blue-400" /> {t('visualTools')}
           </div>
           <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button 
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'split' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {t('modeSplit')}
              </button>
              <button 
                onClick={() => setViewMode('overlay')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'overlay' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {t('modeOverlay')}
              </button>
           </div>
           {viewMode === 'overlay' && (
             <div className="flex items-center gap-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-2">
                   <Sliders size={14} className="text-slate-500" />
                   <span className="text-xs text-slate-400">{t('opacity')}</span>
                   <input 
                     type="range" 
                     min="0" 
                     max="100" 
                     value={overlayOpacity * 100} 
                     onChange={(e) => setOverlayOpacity(parseInt(e.target.value) / 100)}
                     className="w-24 accent-blue-500"
                   />
                </div>
                <button 
                  onClick={() => setInvertSketch(!invertSketch)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${invertSketch ? 'bg-blue-900/30 border-blue-500/50 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                >
                   <Contrast size={14} /> {t('invertSketch')}
                </button>
             </div>
           )}
        </div>
        {viewMode === 'split' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="space-y-2">
              <div className="bg-slate-800/50 p-2 rounded-t-xl border border-slate-700 text-center text-slate-300 font-semibold">
                {t('actualTarget')}
              </div>
              <div className="relative group rounded-b-xl overflow-hidden border-x border-b border-slate-700 aspect-[4/3]">
                <img 
                  src={currentSession.targetImageUrl} 
                  alt="Target" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="bg-slate-800/50 p-2 rounded-t-xl border border-slate-700 text-center text-slate-300 font-semibold">
                {t('yourSketch')}
              </div>
              <div className="relative rounded-b-xl overflow-hidden border-x border-b border-slate-700 aspect-[4/3] bg-white">
                {currentSession.userSketchBase64 ? (
                  <img src={currentSession.userSketchBase64} alt="Sketch" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">{t('noSketch')}</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-3xl mx-auto mb-8 animate-in zoom-in-95 duration-300">
             <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
                <img 
                  src={currentSession.targetImageUrl} 
                  alt="Target" 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {currentSession.userSketchBase64 && (
                  <img 
                    src={currentSession.userSketchBase64} 
                    alt="Sketch Overlay" 
                    className="absolute inset-0 w-full h-full object-contain mix-blend-multiply pointer-events-none transition-all duration-200"
                    style={{ 
                      opacity: overlayOpacity,
                      filter: invertSketch ? 'invert(1)' : 'none',
                      mixBlendMode: invertSketch ? 'screen' : 'multiply'
                    }}
                  />
                )}
             </div>
             <p className="text-center text-slate-500 text-sm mt-2">
               Adjust opacity to compare structural alignment. Use Invert for dark targets.
             </p>
          </div>
        )}
        
        {/* Post Session Remarks Section */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-8">
            <h3 className="text-lg font-semibold text-slate-300 mb-2 flex items-center gap-2">
                <FileText size={18} /> {t('addRemarks')}
            </h3>
            <p className="text-xs text-slate-500 mb-4">{t('addRemarksDesc')}</p>
            <div className="space-y-3">
                <textarea 
                    value={remarksInput}
                    onChange={(e) => setRemarksInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[100px] text-sm"
                    placeholder="Type here..."
                />
                <div className="flex justify-end">
                    <button 
                        onClick={handleSaveRemarks}
                        disabled={isSavingRemarks || !remarksInput.trim()}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${remarksSaved 
                            ? 'bg-green-900/30 text-green-400 border border-green-500/50' 
                            : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                    >
                        {isSavingRemarks ? <RefreshCw className="animate-spin" size={16} /> : remarksSaved ? <Check size={16} /> : <Save size={16} />}
                        {isSavingRemarks ? t('savingReview') : remarksSaved ? t('remarksSaved') : t('saveRemarks')}
                    </button>
                </div>
            </div>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 mb-8">
           <h3 className="text-xl font-semibold text-blue-400 mb-4 flex items-center gap-2">
             <Sparkles size={20} /> {t('aiAnalysis')}
           </h3>
           <p className="text-lg text-slate-300 leading-relaxed whitespace-pre-wrap">
             {currentSession.aiFeedback}
           </p>
        </div>
        <div className="w-full bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-300 mb-4">{t('trendTitle')}</h3>
          <HistoryChart sessions={history} />
        </div>
      </div>
    );
  };

  if (isAuthChecking) {
    return (
       <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          <RefreshCw className="animate-spin mr-2" /> {t('initializing')}
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-200 font-sans selection:bg-blue-500/30">
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <ConfirmationModal 
        isOpen={showExitConfirm}
        title="Exit Session?"
        message={t('confirmExit')}
        onConfirm={confirmExitSession}
        onCancel={() => setShowExitConfirm(false)}
      />
      <AnalyticsModal 
        isOpen={showAnalyticsModal} 
        onClose={() => setShowAnalyticsModal(false)} 
        history={history} 
        coachReport={coachReport} 
      />
      
      {user && (
        <CoachChat 
          isOpen={showChat} 
          onClose={() => setShowChat(false)} 
          history={history}
        />
      )}

      {renderHeader()}
      
      <main className="relative z-0 flex-grow flex flex-col">
        {state === SessionState.IDLE && renderIdle()}
        {state === SessionState.DOJO && (
          <IntuitionDojo 
            onClose={() => {
              setIsDojoLocked(false);
              setState(SessionState.IDLE);
            }} 
            initialStats={intuitionStats}
            lockedMode={isDojoLocked}
          />
        )}
        {state === SessionState.VIEWING && renderViewing()}
        {state === SessionState.ANALYZING && renderAnalyzing()}
        {state === SessionState.FEEDBACK && renderFeedback()}
      </main>
    </div>
  );
}

export default App;
