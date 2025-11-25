import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, LogIn, LogOut, User as UserIcon, AlertTriangle, XCircle, RefreshCw, CheckCircle2, Eraser, Brain, Sparkles, Image as ImageIcon, CheckCircle, Save, ArrowLeft, ArrowRight, Compass } from 'lucide-react';
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
  const { t } = useLanguage();
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
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false); 
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
  const [isIntuitionLoaded, setIsIntuitionLoaded] = useState(false);
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
  // Unused RankIcon here, used in DashboardView but imported rank logic
  // const rankStyle = getRankStyle(currentRank.level); 

  const STEPS = [
    { id: 1, title: t('stepFocus'), icon: Brain },
    { id: 2, title: t('stepImpressions'), icon: Sparkles },
    { id: 3, title: t('stepSketch'), icon: ImageIcon },
    { id: 4, title: t('stepReview'), icon: CheckCircle },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setHistory([]); 
        setIsHistoryLoaded(false);
        setCoachReport(null);
        setIntuitionStats(null);
        setIsIntuitionLoaded(false);
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubHistory = subscribeToHistory(user.uid, (sessions) => {
        setHistory(sessions);
        setIsHistoryLoaded(true);
      });
      const unsubDojo = subscribeToIntuitionStats(user.uid, (stats) => {
        setIntuitionStats(stats);
        setIsIntuitionLoaded(true);
      });
      return () => { unsubHistory(); unsubDojo(); };
    } else {
      setIsHistoryLoaded(false);
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
  
  const handleUpdateSession = async (sessionId: string, data: Partial<SessionData>) => {
    if (!user) return;
    try {
      await updateSessionData(user.uid, sessionId, data);
    } catch (e) {
      console.error("Update failed", e);
      alert("Failed to update session data");
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
      const report = await generateCoachReport(trainingSessions);
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
          const result = await analyzeOpenSession(session.userSketchBase64, session.userNotes, session.targetIntent);
          
          const updatedData: Partial<SessionData> = {
              aiGuessedSubject: result.subject,
              aiFeedback: result.analysis 
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
    const trainingCount = history.filter(s => s.sessionType === 'TRAINING').length;
    setSessionNumber(trainingCount + 1);
    
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
    const openCount = history.filter(s => s.sessionType === 'OPEN').length;
    setSessionNumber(openCount + 1);

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
    if (state === SessionState.DOJO && isDojoLocked) {
      alert(t('completeCalibration'));
      return;
    }

    if (state === SessionState.FEEDBACK && currentSession?.sessionType === 'TRAINING' && (currentSession.aiScore ?? 100) < 50) {
      alert(t('lowScoreRedirect'));
      sessionRef.current = false;
      setIsDojoLocked(true);
      setState(SessionState.DOJO);
      return;
    }

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
      const result = await analyzeSession(target.base64, userSketch, userNotes);
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
      if (sessionRef.current) {
        setAnalysisError(t('analysisFailed'));
        setState(SessionState.VIEWING);
        setStep(4);
        alert(t('analysisFailed') + ": " + e);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
       <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
       <ConfirmationModal 
          isOpen={showExitConfirm} 
          title={t('exitSession')} 
          message={t('confirmExit')}
          onConfirm={confirmExitSession} 
          onCancel={() => setShowExitConfirm(false)} 
       />
       <ModeSelectionModal 
          isOpen={showModeSelection} 
          onClose={() => setShowModeSelection(false)} 
          onSelectTraining={() => handleStartSession('TRAINING')}
          onSelectOpen={(intent) => handleStartSession('OPEN', intent)}
       />
       <SessionLogModal
          isOpen={showSessionLog}
          onClose={() => setShowSessionLog(false)}
          history={history}
          onDeleteSession={handleDeleteSession}
          onUpdateSession={handleUpdateSession}
       />
       <AnalyticsModal
          isOpen={showAnalyticsModal}
          onClose={() => setShowAnalyticsModal(false)}
          history={history}
          coachReport={coachReport}
       />
       <CoachChat 
          isOpen={showChat} 
          onClose={() => setShowChat(false)} 
          history={history}
       />

       <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-40 flex items-center justify-between px-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={goHome}>
             <Brain className="text-blue-500" />
             <h1 className="font-bold text-lg tracking-tight hidden sm:block">{t('appTitle')} <span className="text-slate-500 font-normal text-xs ml-1">{t('appSubtitle')}</span></h1>
          </div>

          <div className="flex items-center gap-4">
            {state !== SessionState.IDLE && state !== SessionState.DOJO && state !== SessionState.RESET && (
               <div className="hidden md:flex items-center gap-4 text-sm font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                     {coordinate}
                  </div>
                  <div>{t('session')} #{sessionNumber}</div>
               </div>
            )}
            
            {user ? (
               <button onClick={() => { logOut(); setUser(null); }} className="p-2 text-slate-400 hover:text-white" title={t('logout')}>
                  <LogOut size={20} />
               </button>
            ) : (
               <button onClick={() => setShowAuthModal(true)} className="p-2 text-blue-400 hover:text-blue-300" title={t('login')}>
                  <LogIn size={20} />
               </button>
            )}
          </div>
       </header>

       <main className="pt-20 px-4 pb-8 min-h-screen flex flex-col relative">
          
          {state === SessionState.IDLE && (
             <DashboardView 
                user={user}
                history={history}
                coachReport={coachReport}
                isLoading={isLoading}
                loadingMessage={loadingMessage}
                analyzingHistory={analyzingHistory}
                onShowAuth={() => setShowAuthModal(true)}
                onShowModeSelection={() => setShowModeSelection(true)}
                onShowAnalytics={() => setShowAnalyticsModal(true)}
                onShowChat={() => setShowChat(true)}
                onRunCoachAnalysis={runCoachAnalysis}
                onEnterDojo={() => setState(SessionState.DOJO)}
                onShowSessionLog={() => setShowSessionLog(true)}
                isHistoryLoaded={isHistoryLoaded}
             />
          )}

          {state === SessionState.DOJO && (
             <IntuitionDojo 
               onClose={() => {
                 if (isDojoLocked && (!intuitionStats || intuitionStats.currentStreak < 3)) {
                   alert(t('completeCalibration'));
                   return;
                 }
                 setIsDojoLocked(false);
                 setState(SessionState.IDLE);
               }}
               initialStats={intuitionStats}
               lockedMode={isDojoLocked}
               isLoading={!isIntuitionLoaded}
             />
          )}

          {state === SessionState.RESET && (
             <div className="flex flex-col items-center justify-center h-[80vh] animate-in fade-in duration-1000">
                <div className="w-32 h-32 rounded-full border-4 border-slate-800 flex items-center justify-center mb-8 relative">
                   <div className="absolute inset-0 bg-slate-800 rounded-full animate-ping opacity-20"></div>
                   <Eraser size={48} className="text-slate-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{t('resetTitle')}</h2>
                <p className="text-slate-400 mb-8">{t('resetDesc')}</p>
                <button 
                  onClick={() => {
                    setIsResetting(false);
                    setState(SessionState.IDLE);
                  }}
                  className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-bold transition-all"
                >
                  {t('resetComplete')}
                </button>
             </div>
          )}

          {(state === SessionState.VIEWING || state === SessionState.ANALYZING || state === SessionState.FEEDBACK) && (
             <div className="w-full h-full flex flex-col flex-grow">
                {state === SessionState.VIEWING && (
                  <div className="flex justify-center mb-8">
                     <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-full border border-slate-800">
                        {STEPS.map((s) => {
                           const isActive = step === s.id;
                           const isPassed = step > s.id;
                           return (
                             <div key={s.id} className="flex items-center">
                                <div 
                                  className={`
                                    flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300
                                    ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : isPassed ? 'text-blue-400' : 'text-slate-600'}
                                  `}
                                >
                                   <s.icon size={16} />
                                   <span className={`text-xs font-bold uppercase ${isActive ? 'block' : 'hidden md:block'}`}>{s.title}</span>
                                </div>
                                {s.id < 4 && <div className={`w-4 h-0.5 mx-1 ${isPassed ? 'bg-blue-900' : 'bg-slate-800'}`} />}
                             </div>
                           );
                        })}
                     </div>
                  </div>
                )}

                <div className="flex-grow flex flex-col relative">
                   {state === SessionState.ANALYZING && (
                      <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-500">
                          <RefreshCw className="animate-spin text-blue-500 mb-4" size={48} />
                          <h3 className="text-xl font-bold text-white mb-2">{t('analyzingTitle')}</h3>
                          <p className="text-slate-400">{t('analyzingDesc')}</p>
                      </div>
                   )}
                   
                   {state === SessionState.VIEWING && step === 1 && (
                      <Step1Focus coordinate={coordinate} onNext={() => setStep(2)} />
                   )}

                   {state === SessionState.VIEWING && step === 2 && (
                      <Step2Impressions 
                        notes={userNotes} 
                        onChange={setUserNotes} 
                        onNext={() => setStep(3)} 
                        onBack={() => setStep(1)}
                      />
                   )}

                   {state === SessionState.VIEWING && step === 3 && (
                      <div className="flex flex-col h-full animate-in slide-in-from-right-8 duration-300">
                         <div className="text-center mb-4">
                            <h2 className="text-2xl font-bold text-white mb-1">{t('stage2Title')}</h2>
                            <p className="text-slate-400">{t('stage2Desc')}</p>
                         </div>
                         <div className="flex-grow bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-2xl relative">
                            <SketchPad onExport={setUserSketch} />
                         </div>
                         <div className="flex justify-between mt-4">
                            <button onClick={() => setStep(2)} className="text-slate-500 hover:text-slate-300 flex items-center gap-2 px-4 py-2">
                               <ArrowLeft size={18} /> {t('btnBack')}
                            </button>
                            <button onClick={() => setStep(4)} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20">
                               {t('sketchReviewBtn')} <ArrowRight size={18} />
                            </button>
                         </div>
                      </div>
                   )}

                   {state === SessionState.VIEWING && step === 4 && (
                      <Step4Review 
                        notes={userNotes} 
                        sketch={userSketch} 
                        onSubmit={submitSession} 
                        onBack={() => setStep(3)} 
                        sessionType={sessionType}
                      />
                   )}

                   {state === SessionState.FEEDBACK && (
                      <FeedbackView 
                        currentSession={currentSession}
                        history={history}
                        onNextSession={triggerResetAndStart}
                        onCalibrationRequired={() => {
                           setIsDojoLocked(true);
                           setState(SessionState.DOJO);
                        }}
                        onSaveRemarks={async (remarks) => {
                            if (!currentSession || !user) return;
                            setIsSavingRemarks(true);
                            try {
                                const newResult = await recalculateScore(currentSession, remarks);
                                await handleUpdateSession(currentSession.id, { 
                                    postSessionRemarks: remarks,
                                    aiScore: newResult.score,
                                    aiFeedback: newResult.feedback
                                });
                                setCurrentSession(prev => prev ? { ...prev, postSessionRemarks: remarks, aiScore: newResult.score, aiFeedback: newResult.feedback } : null);
                                setRemarksSaved(true);
                            } catch (e) {
                                console.error(e);
                                alert("Failed to save remarks");
                            } finally {
                                setIsSavingRemarks(false);
                            }
                        }}
                        onOpenAnalysis={sessionType === 'OPEN' ? handleOpenAnalysis : undefined}
                        onGenerateImage={sessionType === 'OPEN' ? handleGenerateImage : undefined}
                        isSavingRemarks={isSavingRemarks}
                        remarksSaved={remarksSaved}
                        isOpenAnalyzing={isOpenAnalyzing}
                      />
                   )}
                </div>
             </div>
          )}
       </main>
    </div>
  );
}

export default App;