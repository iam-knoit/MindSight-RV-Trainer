import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, RefreshCw, Play, CheckCircle, Brain, Image as ImageIcon, Sparkles, ArrowRight, ArrowLeft, ShieldCheck, Trash2, History, LogIn, LogOut, User as UserIcon, AlertTriangle, X, Copy, Server, Mail, Lock, TrendingUp, Lightbulb, Check, XCircle, Globe, Wind, Home } from 'lucide-react';
import { SessionState, SessionData, TargetImage, CoachReport } from './types';
import { analyzeSession, generateTargetImage, generateCoachReport } from './services/geminiService';
import { auth, loginWithEmail, registerWithEmail, logOut, saveSessionToCloud, subscribeToHistory } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import SketchPad from './components/SketchPad';
import HistoryChart from './components/HistoryChart';
import { useLanguage } from './contexts/LanguageContext';

const generateCoordinate = () => {
  const p1 = Math.floor(1000 + Math.random() * 9000);
  const p2 = Math.floor(1000 + Math.random() * 9000);
  return `${p1}-${p2}`;
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
    return () => { step = -1; }; // Cleanup logic not strictly needed with timeouts but good practice
  }, [isFocusing, t]);

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
          
          <div className="max-w-lg bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <p className="text-lg text-slate-300 leading-relaxed mb-4">
              {t('focusDesc')}
            </p>
            <div className="flex items-start gap-3 bg-blue-900/20 p-4 rounded-lg border border-blue-500/30 text-left">
              <Wind className="text-blue-400 shrink-0 mt-1" size={20} />
              <p className="text-sm text-blue-200">{t('focusTip')}</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <button 
              onClick={() => setIsFocusing(true)} 
              className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-full font-semibold transition-all flex items-center justify-center gap-2 border border-slate-600"
            >
              <Wind size={18} /> {t('startFocusSeq')}
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

          <button 
            onClick={onNext}
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
  const { t } = useLanguage();
  return (
    <div className="max-w-2xl mx-auto w-full space-y-6 animate-in slide-in-from-right-8 duration-300">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">{t('stage1Title')}</h2>
        <p className="text-slate-400">{t('stage1Desc')}</p>
      </div>

      <div className="bg-slate-800/50 p-1 rounded-2xl border border-slate-700 focus-within:border-blue-500/50 transition-colors">
        <textarea
          className="w-full h-64 bg-slate-900 rounded-xl p-6 text-lg text-slate-200 placeholder:text-slate-600 focus:outline-none resize-none"
          placeholder={t('placeholderNotes')}
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-300 flex items-center gap-2 px-4 py-2">
          <ArrowLeft size={18} /> {t('btnBack')}
        </button>
        <button onClick={onNext} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20">
          {t('btnNextVisuals')} <ArrowRight size={18} />
        </button>
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
  const [showExitConfirm, setShowExitConfirm] = useState(false); // Confirmation modal state
  const [coachReport, setCoachReport] = useState<CoachReport | null>(null);
  const [analyzingHistory, setAnalyzingHistory] = useState(false);

  // Ref to track if the session is currently active/valid.
  // This prevents race conditions where user exits (goes to IDLE) but async analysis finishes and forces FEEDBACK state.
  const sessionRef = useRef<boolean>(false);

  const STEPS = [
    { id: 1, title: t('stepFocus'), icon: Brain },
    { id: 2, title: t('stepImpressions'), icon: Sparkles },
    { id: 3, title: t('stepSketch'), icon: ImageIcon },
    { id: 4, title: t('stepReview'), icon: CheckCircle },
  ];

  // Auth State Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setHistory([]); // Clear history on logout
        setCoachReport(null);
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // Database Sync Observer
  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToHistory(user.uid, (sessions) => {
        setHistory(sessions);
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

  // Start a new session
  const startSession = async () => {
    if (!user) {
      setShowAuthModal(true);
      return; 
    }
    
    setSessionNumber(history.length + 1);
    setIsLoading(true);
    setLoadingMessage(t('startSessionLoading'));
    sessionRef.current = true; // Mark session as active

    try {
      const newCoord = generateCoordinate();
      setCoordinate(newCoord);
      
      setUserNotes('');
      setUserSketch(null);
      setStep(1);

      const targetData = await generateTargetImage();
      setTarget(targetData);
      
      // Check if user cancelled during loading
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
      // Use custom modal instead of window.confirm
      setShowExitConfirm(true);
    } else {
      // In Feedback state, just go home immediately
      sessionRef.current = false;
      setState(SessionState.IDLE);
    }
  };

  const confirmExitSession = () => {
    sessionRef.current = false;
    setState(SessionState.IDLE);
    setShowExitConfirm(false);
  };

  // Submit session for analysis
  const submitSession = async () => {
    if (!target || !user) return;
    setState(SessionState.ANALYZING);
    
    try {
      const result = await analyzeSession(target.base64, userSketch, userNotes, language);
      
      // Check if user cancelled during analysis (e.g. clicked Home)
      if (!sessionRef.current) return;

      const newSession: SessionData = {
        id: Date.now().toString(),
        coordinate,
        timestamp: Date.now(),
        targetImageUrl: target.url,
        targetImageBase64: target.base64,
        userSketchBase64: userSketch,
        userNotes,
        aiScore: result.score,
        aiFeedback: result.feedback
      };

      setCurrentSession(newSession);
      await saveSessionToCloud(user.uid, newSession);
      
      if (sessionRef.current) {
        setState(SessionState.FEEDBACK);
      }
    } catch (e) {
      console.error(e);
      alert("Analysis failed.");
      if (sessionRef.current) {
        setState(SessionState.VIEWING); 
      }
    }
  };

  const handleSketchExport = useCallback((base64: string) => {
    setUserSketch(base64);
  }, []);

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const renderHeader = () => (
    // Z-Index increased to z-40 to ensure it stays above content animations like breathing circle (z-10)
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
          {state !== SessionState.IDLE && (
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
          
          {/* Explicit Exit Button for Mobile/Desktop when in ANY active session state */}
          {state !== SessionState.IDLE && (
            <button
              type="button"
              onClick={goHome}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-colors"
              title={t('exitSession')}
            >
              <XCircle size={20} />
            </button>
          )}

          {/* Language Switcher */}
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
                 <span className="text-xs text-slate-400">{t('operator')}</span>
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

  const renderIdle = () => (
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
          {user 
            ? t('introAuth')
            : t('introGuest')}
        </p>
        
        {user ? (
          <button
            type="button"
            onClick={startSession}
            disabled={isLoading}
            className="mx-auto group relative px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.6)] flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="mx-auto px-8 py-4 bg-white text-slate-900 hover:bg-slate-200 font-bold rounded-xl transition-all flex items-center gap-3"
          >
             <UserIcon size={20} />
             {t('signInRegister')}
          </button>
        )}
      </div>

      {/* Past History Section */}
      {user && history.length > 0 && (
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-1000 delay-200">
          
          {/* Left Col: Chart */}
          <div className="lg:col-span-2 bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
                <History size={18} /> {t('historyTitle')}
              </h3>
              {history.length >= 3 && !coachReport && (
                 <button 
                   onClick={runCoachAnalysis} 
                   disabled={analyzingHistory}
                   className="text-xs bg-blue-900/30 hover:bg-blue-800/50 text-blue-300 px-3 py-1.5 rounded-full border border-blue-800/50 transition-all flex items-center gap-2"
                 >
                   {analyzingHistory ? <RefreshCw className="animate-spin" size={12} /> : <Sparkles size={12} />}
                   {t('aiCoachBtn')}
                 </button>
              )}
            </div>
            <HistoryChart sessions={history} />
          </div>

          {/* Right Col: Coach Report or Placeholder */}
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 flex flex-col">
            {coachReport ? (
              <div className="space-y-4 animate-in slide-in-from-right duration-500">
                <div className="flex items-center gap-2 text-amber-400 font-bold uppercase text-xs tracking-widest mb-2">
                   <Brain size={14} /> {t('coachReport')}
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
      )}
    </div>
  );

  const renderViewing = () => (
    <div className="max-w-6xl mx-auto p-4 w-full min-h-[70vh] flex flex-col">
      {/* Progress Bar */}
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

      {/* Step Content Container */}
      <div className="flex-grow relative flex flex-col">
         {step === 1 && <Step1Focus coordinate={coordinate} onNext={nextStep} />}
         {step === 2 && <Step2Impressions notes={userNotes} onChange={setUserNotes} onNext={nextStep} onBack={prevStep} />}
         
         {/* Special handling for SketchPad to preserve state: Keep mounted but hide */}
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

  const renderAnalyzing = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-blue-500/30 blur-xl rounded-full animate-pulse"></div>
        <RefreshCw className="w-16 h-16 text-blue-400 animate-spin relative z-10" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">{t('analyzingTitle')}</h2>
      <p className="text-slate-400">{t('analyzingDesc')}</p>
    </div>
  );

  const renderFeedback = () => {
    if (!currentSession) return null;

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
             <button
               onClick={() => {
                 sessionRef.current = false;
                 setState(SessionState.IDLE);
               }}
               className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
             >
               {t('nextSession')}
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Target Reveal */}
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

          {/* User Sketch Review */}
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

        {/* Analysis Text */}
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
      
      {renderHeader()}
      
      <main className="relative z-0 flex-grow flex flex-col">
        {state === SessionState.IDLE && renderIdle()}
        {state === SessionState.VIEWING && renderViewing()}
        {state === SessionState.ANALYZING && renderAnalyzing()}
        {state === SessionState.FEEDBACK && renderFeedback()}
      </main>
    </div>
  );
}

export default App;