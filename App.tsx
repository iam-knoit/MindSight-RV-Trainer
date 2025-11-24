
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, LogIn, LogOut, User as UserIcon, AlertTriangle, XCircle, RefreshCw, Globe, CheckCircle2, Eraser, Brain, Sparkles, Image as ImageIcon, CheckCircle, Save, ArrowLeft, ArrowRight, Compass } from 'lucide-react';
import { SessionState, SessionData, TargetImage, CoachReport, IntuitionStats, SessionType } from './types';
import { analyzeSession, generateTargetImage, generateCoachReport, recalculateScore, analyzeOpenSession, generateVisualReconstruction } from './services/geminiService';
import { auth, logOut, saveSessionToCloud, subscribeToHistory, subscribeToIntuitionStats, updateSessionData, deleteSession } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import SketchPad from './components/SketchPad';
import CoachChat from './components/CoachChat';
import AnalyticsModal from './components/AnalyticsModal';
import IntuitionDojo from './components/IntuitionDojo';
import { useLanguage } from './contexts/LanguageContext';
import { calculateLevel, getRankStyle } from './utils/leveling';

// --- MODULAR COMPONENTS ---
import AuthModal from './components/modals/AuthModal';
import ConfirmationModal from './components/modals/ConfirmationModal';
import ModeSelectionModal from './components/modals/ModeSelectionModal';
import SessionLogModal from './components/modals/SessionLogModal';
import Step1Focus from './components/session/Step1Focus';
import Step2Impressions from './components/session/Step2Impressions';
import Step4Review from './components/session/Step4Review';
import DashboardView from './components/views/DashboardView';
import FeedbackView from './components/views/FeedbackView';

const generateCoordinate = () => {
  const p1 = Math.floor(1000 + Math.random() * 9000);
  const p2 = Math.floor(1000 + Math.random() * 9000);
  return `${p1}-${p2}`;
};

function App() {
  const { t, language, setLanguage } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [state, setState] = useState<SessionState>(SessionState.IDLE);
  const [sessionType, setSessionType] = useState<SessionType>('TRAINING');
  const [step, setStep] = useState(1);
  const [sessionNumber, setSessionNumber] = useState(1);
  
  const [coordinate, setCoordinate] = useState<string>('');
  const [target, setTarget] = useState<TargetImage | null>(null);
  const [targetIntent, setTargetIntent] = useState<string>('');
  const [userNotes, setUserNotes] = useState('');
  const [userSketch, setUserSketch] = useState<string | null>(null);
  
  const [history, setHistory] = useState<SessionData[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(t('initializing'));
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false); 
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false); 
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [showSessionLog, setShowSessionLog] = useState(false);

  const [coachReport, setCoachReport] = useState<CoachReport | null>(null);
  const [analyzingHistory, setAnalyzingHistory] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [intuitionStats, setIntuitionStats] = useState<IntuitionStats | null>(null);
  const [isDojoLocked, setIsDojoLocked] = useState(false);

  // Remarks State
  const [isSavingRemarks, setIsSavingRemarks] = useState(false);
  const [remarksSaved, setRemarksSaved] = useState(false);
  
  // Open Analysis State
  const [isOpenAnalyzing, setIsOpenAnalyzing] = useState(false);

  // Reset State Animation
  const [isResetting, setIsResetting] = useState(false);

  const sessionRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);

  const currentRank = calculateLevel(history);
  const rankStyle = getRankStyle(currentRank.level);
  const RankIcon = rankStyle.icon;

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
        setHistory([]); 
        setCoachReport(null);
        setIntuitionStats(null);
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // Database Sync Observers
  useEffect(() => {
    if (user) {
      const unsubHistory = subscribeToHistory(user.uid, (sessions) => setHistory(sessions));
      const unsubDojo = subscribeToIntuitionStats(user.uid, (stats) => setIntuitionStats(stats));
      return () => { unsubHistory(); unsubDojo(); };
    }
  }, [user]);

  const handleDeleteSession = async (sessionId: string) => {
    if (!user) return;
    try {
        await deleteSession(user.uid, sessionId);
    } catch (e) {
        console.error("Delete failed", e);
        alert("Failed to delete session");
    }
  };

  const runCoachAnalysis = async () => {
    if (history.length < 3) {
      alert(t('aiCoachUnlock'));
      return;
    }
    setAnalyzingHistory(true);
    try {
      const trainingSessions = history.filter(s => s.sessionType !== 'OPEN');
      const report = await generateCoachReport(trainingSessions, language);
      setCoachReport(report);
    } catch (e) {
      console.error(e);
      alert("Failed to generate coaching report.");
    } finally {
      setAnalyzingHistory(false);
    }
  };

  const handleOpenAnalysis = async (session: SessionData) => {
      if (!user) return;
      setIsOpenAnalyzing(true);
      try {
          const result = await analyzeOpenSession(session.userSketchBase64, session.userNotes, language);
          
          const updatedData: Partial<SessionData> = {
              aiGuessedSubject: result.subject,
              aiFeedback: result.analysis // reusing aiFeedback for the detailed analysis
          };

          await updateSessionData(user.uid, session.id, updatedData);
          setCurrentSession(prev => prev ? { ...prev, ...updatedData } : null);
      } catch (e) {
          console.error("Open analysis failed", e);
          alert(t('analysisFailed'));
      } finally {
          setIsOpenAnalyzing(false);
      }
  };

  const handleGenerateImage = async (session: SessionData) => {
      if (!user) return;
      try {
          const imageUrl = await generateVisualReconstruction(
              session.targetIntent, 
              session.aiGuessedSubject, 
              session.userNotes
          );
          
          await updateSessionData(user.uid, session.id, { generatedImageUrl: imageUrl });
          setCurrentSession(prev => prev ? { ...prev, generatedImageUrl: imageUrl } : null);
      } catch (e) {
          console.error("Image generation failed", e);
          alert("Failed to generate visualization. Try again later.");
      }
  };

  const triggerResetAndStart = () => {
      setState(SessionState.RESET);
      setIsResetting(false);
  };

  const handleStartSession = (mode: SessionType, intent: string = '') => {
    setShowModeSelection(false);
    setSessionType(mode);
    setTargetIntent(intent);
    
    if (mode === 'TRAINING') {
      initializeTrainingSession();
    } else {
      initializeOpenSession();
    }
  };

  const initializeTrainingSession = async () => {
    setSessionNumber(history.length + 1);
    setIsLoading(true);
    setLoadingMessage(t('startSessionLoading'));
    sessionRef.current = true; 
    startTimeRef.current = Date.now(); 
    resetSessionState();

    try {
      setCoordinate(generateCoordinate());
      const targetData = await generateTargetImage();
      setTarget(targetData);
      
      if (sessionRef.current) setState(SessionState.VIEWING);
    } catch (e) {
      alert("Failed to initialize session. Check connection.");
      sessionRef.current = false;
    } finally {
      setIsLoading(false);
      setLoadingMessage(t('startSession'));
    }
  };

  const initializeOpenSession = () => {
    setSessionNumber(history.length + 1);
    sessionRef.current = true;
    startTimeRef.current = Date.now();
    resetSessionState();
    setTarget(null);
    setCoordinate(generateCoordinate());
    setState(SessionState.VIEWING);
  };

  const resetSessionState = () => {
    setRemarksSaved(false);
    setUserNotes('');
    setUserSketch(null);
    setStep(1);
    setIsOpenAnalyzing(false);
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
    if (!user) return;
    setAnalysisError(null);

    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const baseSessionData: SessionData = {
        id: Date.now().toString(),
        sessionType: sessionType,
        coordinate,
        timestamp: Date.now(),
        userSketchBase64: userSketch,
        userNotes,
        durationSeconds: durationSeconds,
        targetIntent: targetIntent
    };

    if (sessionType === 'OPEN') {
      setState(SessionState.ANALYZING);
      setLoadingMessage(t('savingDesc'));
      try {
        setCurrentSession(baseSessionData);
        await saveSessionToCloud(user.uid, baseSessionData);
        if (sessionRef.current) setState(SessionState.FEEDBACK);
      } catch (e) {
        console.error("Open session save failed", e);
        setAnalysisError(t('analysisFailed'));
      }
      return;
    }

    if (!target) return;
    setState(SessionState.ANALYZING);
    try {
      const result = await analyzeSession(target.base64, userSketch, userNotes, language);
      if (!sessionRef.current) return;
      
      const newSession: SessionData = {
        ...baseSessionData,
        targetImageUrl: target.url,
        targetImageBase64: target.base64,
        aiScore: result.score,
        aiFeedback: result.feedback,
      };
      
      setCurrentSession(newSession);
      await saveSessionToCloud(user.uid, newSession);
      if (sessionRef.current) setState(SessionState.FEEDBACK);
    } catch (e) {
      console.error("Session submission failed:", e);
      if (sessionRef.current) setAnalysisError(t('analysisFailed'));
    }
  };

  const handleSaveRemarks = async (remarksInput: string) => {
    if (!user || !currentSession || !remarksInput.trim()) return;
    setIsSavingRemarks(true);
    try {
        let updatedData: Partial<SessionData> = { postSessionRemarks: remarksInput };

        if (currentSession.sessionType === 'TRAINING' && currentSession.targetImageBase64) {
             const recalculated = await recalculateScore(currentSession, remarksInput, language);
             updatedData.aiScore = recalculated.score;
             updatedData.aiFeedback = recalculated.feedback;
        }

        await updateSessionData(user.uid, currentSession.id, updatedData);
        setCurrentSession(prev => prev ? { ...prev, ...updatedData } : null);
        setRemarksSaved(true);
    } catch (e) {
        console.error("Failed to save remarks", e);
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

  // --- RENDER HELPERS ---

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
          {state !== SessionState.IDLE && state !== SessionState.DOJO && state !== SessionState.RESET && (
             <div className="hidden md:flex items-center gap-4">
               {sessionType === 'OPEN' && (
                 <div className="bg-purple-900/30 px-3 py-2 rounded-lg border border-purple-500/30 font-mono text-xs font-bold text-purple-300 flex items-center gap-2">
                    <Compass size={14} /> OPEN MODE
                 </div>
               )}
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
          
          {state !== SessionState.IDLE && state !== SessionState.RESET && !isDojoLocked && (
            <button type="button" onClick={goHome} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-colors" title={t('exitSession')}>
              <XCircle size={20} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'si' : 'en')}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full transition-colors"
          >
            <Globe size={14} className="text-slate-400"/>
            <span className="text-xs font-semibold text-slate-200">{language === 'en' ? '🇺🇸 EN' : '🇱🇰 SI'}</span>
          </button>

          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
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
            <button type="button" onClick={() => setShowAuthModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-600 transition-all">
              <LogIn size={16} />
              <span className="text-sm font-semibold">{t('login')}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );

  const renderReset = () => {
     const handleResetAction = () => {
         setIsResetting(true);
         setTimeout(() => {
             if (sessionType === 'TRAINING') initializeTrainingSession();
             else initializeOpenSession();
         }, 3000);
     };

     return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] w-full animate-in fade-in duration-700">
           {!isResetting ? (
               <div className="text-center space-y-8 p-4">
                   <div className="relative mx-auto w-32 h-32">
                       <div className="absolute inset-0 bg-slate-800 rounded-full overflow-hidden border-2 border-slate-700 flex items-center justify-center">
                            <div className="w-full h-full opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] animate-pulse"></div>
                            <Eraser className="relative z-10 text-slate-400" size={32} />
                       </div>
                   </div>
                   <div>
                       <h2 className="text-2xl font-bold text-white mb-2">{t('resetTitle')}</h2>
                       <p className="text-slate-400 max-w-md mx-auto">{t('resetInstruction')}</p>
                   </div>
                   <button onClick={handleResetAction} className="px-8 py-4 bg-slate-100 text-slate-900 hover:bg-white rounded-full font-bold transition-all shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] hover:scale-105">
                       {t('resetAction')}
                   </button>
                   <button onClick={() => sessionType === 'TRAINING' ? initializeTrainingSession() : initializeOpenSession()} className="text-slate-600 text-sm hover:text-slate-400 block mx-auto mt-4">
                       Skip
                   </button>
               </div>
           ) : (
               <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <div className="w-96 h-96 rounded-full bg-white animate-[ping_3s_ease-out_forwards] absolute opacity-10"></div>
                    <div className="w-64 h-64 rounded-full border border-white/50 animate-[ping_2s_ease-out_infinite] absolute"></div>
                    <div className="z-10 text-center space-y-4">
                        <CheckCircle2 className="mx-auto text-green-400 w-16 h-16 animate-in zoom-in duration-500 delay-1000" />
                        <h2 className="text-3xl font-bold text-white tracking-widest animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                            {t('resetComplete')}
                        </h2>
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
             <div key={s.id} className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${step === s.id ? 'bg-blue-600 text-white shadow-lg' : step > s.id ? 'text-blue-400' : 'text-slate-600'}`}>
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
         {step === 4 && (
            <Step4Review notes={userNotes} sketch={userSketch} onSubmit={submitSession} onBack={prevStep} sessionType={sessionType} />
         )}
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
                    <button onClick={() => { setAnalysisError(null); setState(SessionState.VIEWING); }} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors border border-slate-700">
                        {t('returnToReview')}
                    </button>
                    <button onClick={submitSession} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20">
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
          {sessionType === 'OPEN' ? (
              <Save className="w-16 h-16 text-purple-400 animate-bounce relative z-10" />
          ) : (
              <RefreshCw className="w-16 h-16 text-blue-400 animate-spin relative z-10" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{sessionType === 'OPEN' ? 'Saving Session...' : t('analyzingTitle')}</h2>
        <p className="text-slate-400">{sessionType === 'OPEN' ? t('savingDesc') : t('analyzingDesc')}</p>
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
      <ModeSelectionModal isOpen={showModeSelection} onClose={() => setShowModeSelection(false)} onSelectTraining={() => handleStartSession('TRAINING')} onSelectOpen={(intent) => handleStartSession('OPEN', intent)} />
      <ConfirmationModal isOpen={showExitConfirm} title="Exit Session?" message={t('confirmExit')} onConfirm={confirmExitSession} onCancel={() => setShowExitConfirm(false)} />
      <AnalyticsModal isOpen={showAnalyticsModal} onClose={() => setShowAnalyticsModal(false)} history={history} coachReport={coachReport} />
      <SessionLogModal isOpen={showSessionLog} onClose={() => setShowSessionLog(false)} history={history} onDeleteSession={handleDeleteSession} />
      
      {user && <CoachChat isOpen={showChat} onClose={() => setShowChat(false)} history={history} />}

      {renderHeader()}
      
      <main className="relative z-0 flex-grow flex flex-col">
        {state === SessionState.IDLE && (
          <DashboardView 
            user={user} history={history} coachReport={coachReport} isLoading={isLoading} loadingMessage={loadingMessage} analyzingHistory={analyzingHistory}
            onShowAuth={() => setShowAuthModal(true)} onShowModeSelection={() => setShowModeSelection(true)} onShowAnalytics={() => setShowAnalyticsModal(true)}
            onShowChat={() => setShowChat(true)} onRunCoachAnalysis={runCoachAnalysis} onEnterDojo={() => { setIsDojoLocked(false); setState(SessionState.DOJO); }}
            onShowSessionLog={() => setShowSessionLog(true)}
          />
        )}
        {state === SessionState.DOJO && (
          <IntuitionDojo onClose={() => { setIsDojoLocked(false); setState(SessionState.IDLE); }} initialStats={intuitionStats} lockedMode={isDojoLocked} />
        )}
        {state === SessionState.RESET && renderReset()}
        {state === SessionState.VIEWING && renderViewing()}
        {state === SessionState.ANALYZING && renderAnalyzing()}
        {state === SessionState.FEEDBACK && (
           <FeedbackView 
             currentSession={currentSession} history={history} isSavingRemarks={isSavingRemarks} remarksSaved={remarksSaved}
             onNextSession={() => { sessionRef.current = false; triggerResetAndStart(); }}
             onCalibrationRequired={() => { sessionRef.current = false; setIsDojoLocked(true); setState(SessionState.DOJO); }}
             onSaveRemarks={handleSaveRemarks}
             onOpenAnalysis={handleOpenAnalysis}
             onGenerateImage={handleGenerateImage}
             isOpenAnalyzing={isOpenAnalyzing}
           />
        )}
      </main>
    </div>
  );
}

export default App;
