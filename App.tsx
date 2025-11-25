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
import DrawingDojo from './components/DrawingDojo';
import { useLanguage } from './contexts/LanguageContext';
import { calculateLevel, getRankStyle } from './utils/leveling';

// --- MODULAR COMPONENTS ---
import AuthModal from './components/modals/AuthModal';
import ConfirmationModal from './components/modals/ConfirmationModal';
import ModeSelectionModal from './components/modals/ModeSelectionModal';
import SessionLogModal from './components/modals/SessionLogModal';
import RankToast from './components/modals/RankToast';
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

  // Rank Notification State
  const [newRankData, setNewRankData] = useState<{level: number, title: string, division: string | null, isCalibration: boolean} | null>(null);
  const prevRankRef = useRef<{level: number, isRanked: boolean} | null>(null);

  const sessionRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);

  const currentRank = calculateLevel(history);
  const trainingCount = history.filter(s => s.sessionType === 'TRAINING').length;

  // Monitor History for Rank Changes
  useEffect(() => {
    // We only check for rank changes if history is fully loaded
    if (!isHistoryLoaded) return;

    const currentStats = calculateLevel(history);

    if (prevRankRef.current) {
        const prev = prevRankRef.current;
        
        // Scenario 1: Unranked -> Ranked (Calibration Complete)
        if (!prev.isRanked && currentStats.isRanked) {
            setNewRankData({
                level: currentStats.level,
                title: currentStats.title,
                division: currentStats.division,
                isCalibration: true
            });
        }
        // Scenario 2: Ranked Level Up
        else if (prev.isRanked && currentStats.isRanked && currentStats.level > prev.level) {
            setNewRankData({
                level: currentStats.level,
                title: currentStats.title,
                division: currentStats.division,
                isCalibration: false
            });
        }
    }

    // Update the ref to current state
    prevRankRef.current = { 
        level: currentStats.level, 
        isRanked: currentStats.isRanked 
    };

  }, [history, isHistoryLoaded]);

  // Auth State Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setHistory([]); 
        setIsHistoryLoaded(false);
        setCoachReport(null);
        setIntuitionStats(null);
        setIsIntuitionLoaded(false);
        prevRankRef.current = null; // Reset rank tracker
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // Database Sync Observers
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
    // 1. Block exit if locked in Zener Dojo
    if (state === SessionState.DOJO && isDojoLocked) {
      alert(t('completeCalibration'));
      return;
    }

    // 2. Block exit if locked in Drawing Dojo
    if (state === SessionState.DRAWING_DOJO && isDojoLocked) {
      alert(t('completeCalibration'));
      return;
    }

    // 3. Check for Low Scores in Feedback Mode (Training only)
    if (state === SessionState.FEEDBACK && currentSession?.sessionType === 'TRAINING') {
        const score = currentSession.aiScore ?? 100;
        const drawingScore = currentSession.drawingScore ?? 100;

        // Condition A: Total Score < 50 -> Intuition Dojo
        if (score < 50) {
            alert(t('lowScoreRedirect'));
            sessionRef.current = false;
            setIsDojoLocked(true);
            setState(SessionState.DOJO);
            return;
        } 
        
        // Condition B: Total Score >= 50 BUT Drawing Score < 45 -> Drawing Dojo
        // Note: We use 45 as a lenient threshold for "Bad Sketch"
        if (score >= 50 && drawingScore < 45) {
            alert(t('lowDrawingRedirect'));
            sessionRef.current = false;
            setIsDojoLocked(true);
            setState(SessionState.DRAWING_DOJO);
            return;
        }
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
        drawingScore: result.drawingScore, // New
        notesScore: result.notesScore,     // New
        aiFeedback: result.feedback,
      };
      
      setCurrentSession(newSession);
      await saveSessionToCloud(user.uid, newSession);
      if (sessionRef.current) setState(SessionState.FEEDBACK);
    } catch (e) {
      console.error("Session submission failed:", e);
      if (sessionRef.current) {
         setAnalysisError(t('analysisErrorDesc'));
         // Don't change state, stay in Analyzing to show error
      }
    }
  };

  const handleSaveRemarks = async (remarks: string) => {
    if (!user || !currentSession) return;
    setIsSavingRemarks(true);
    
    try {
        await updateSessionData(user.uid, currentSession.id, { postSessionRemarks: remarks });
        
        if (currentSession.sessionType === 'TRAINING') {
            const result = await recalculateScore(currentSession, remarks);
            const updatedData = {
                aiScore: result.score,
                drawingScore: result.drawingScore, // New
                notesScore: result.notesScore,     // New
                aiFeedback: result.feedback,
                postSessionRemarks: remarks
            };
            await updateSessionData(user.uid, currentSession.id, updatedData);
            setCurrentSession(prev => prev ? ({ ...prev, ...updatedData }) : null);
        } else {
            setCurrentSession(prev => prev ? ({ ...prev, postSessionRemarks: remarks }) : null);
        }
        
        setRemarksSaved(true);
        setTimeout(() => setRemarksSaved(false), 3000);
    } catch (e) {
        console.error("Failed to save remarks", e);
        alert("Could not update session.");
    } finally {
        setIsSavingRemarks(false);
    }
  };

  // --- RENDER ---

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 selection:text-blue-200">
      
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.3)]">
               <Eye className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                {t('appTitle')}
              </h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                {t('appSubtitle')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {user && (
               <div className="hidden sm:flex items-center gap-3 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700">
                 {!isHistoryLoaded ? (
                   <div className="w-24 h-5 bg-slate-700 rounded animate-pulse"></div>
                 ) : !currentRank.isRanked ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                      <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></div>
                      <span className="uppercase tracking-wider">{t('calibrating')} ({trainingCount}/3)</span>
                    </div>
                 ) : (
                   <div className={`flex items-center gap-2 text-xs font-bold ${getRankStyle(currentRank.level).color}`}>
                      <div className={`w-2 h-2 rounded-full ${getRankStyle(currentRank.level).bg.replace('/10','')} animate-pulse`}></div>
                      <span className="uppercase tracking-wider">{t(currentRank.title)} {currentRank.division || 'I'}</span>
                   </div>
                 )}
               </div>
             )}
             
             {user ? (
               <button 
                 onClick={logOut} 
                 className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                 title={t('logout')}
               >
                 <LogOut size={20} />
               </button>
             ) : (
               <button 
                 onClick={() => setShowAuthModal(true)} 
                 className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all"
               >
                 <LogIn size={16} /> <span className="hidden sm:inline">{t('login')}</span>
               </button>
             )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        
        {/* DOJO: ZENER (Intuition) */}
        {state === SessionState.DOJO && (
          <IntuitionDojo 
            onClose={() => {
              if (isDojoLocked) {
                 setIsDojoLocked(false);
              }
              setState(SessionState.IDLE);
            }} 
            initialStats={intuitionStats}
            isLoading={!isIntuitionLoaded}
            lockedMode={isDojoLocked}
          />
        )}

        {/* DOJO: VISUAL MOTOR (Drawing) */}
        {state === SessionState.DRAWING_DOJO && (
           <DrawingDojo 
              onClose={() => {
                  if (isDojoLocked) setIsDojoLocked(false);
                  setState(SessionState.IDLE);
              }}
              lockedMode={isDojoLocked}
           />
        )}
        
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

        {/* --- VIEWING PHASE --- */}
        {(state === SessionState.VIEWING || state === SessionState.ANALYZING) && (
          <div className="flex flex-col h-[calc(100vh-64px)]">
             {/* Progress Bar */}
             <div className="h-1 bg-slate-800 w-full">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500 ease-out"
                  style={{ width: `${(step / 4) * 100}%` }}
                ></div>
             </div>
             
             {/* Step Header */}
             <div className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center shadow-lg z-20">
                <div className="flex items-center gap-3">
                   <div className="bg-slate-800 p-2 rounded-lg text-blue-400">
                      {step === 1 && <Brain size={20} />}
                      {step === 2 && <Sparkles size={20} />}
                      {step === 3 && <ImageIcon size={20} />}
                      {step === 4 && <CheckCircle size={20} />}
                   </div>
                   <div>
                      <h2 className="font-bold text-white">{t(`step${step === 1 ? 'Focus' : step === 2 ? 'Impressions' : step === 3 ? 'Sketch' : 'Review'}`)}</h2>
                      <p className="text-xs text-slate-500 font-mono">{t('session')} #{sessionNumber} • {sessionType === 'OPEN' ? 'OPEN' : 'BLIND'}</p>
                   </div>
                </div>
                <button 
                  onClick={goHome} 
                  className="text-slate-400 hover:text-red-400 hover:bg-red-900/10 p-2 rounded-lg transition-colors"
                >
                  <XCircle size={20} />
                </button>
             </div>

             {/* Step Content */}
             <div className="flex-grow overflow-hidden relative bg-slate-950">
                
                {state === SessionState.ANALYZING && (
                  <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-500">
                     <div className="relative">
                        <RefreshCw className="text-blue-500 animate-spin" size={48} />
                        <div className="absolute inset-0 bg-blue-500/20 blur-xl animate-pulse"></div>
                     </div>
                     <h2 className="text-2xl font-bold text-white mt-6 mb-2">{t('analyzingTitle')}</h2>
                     <p className="text-slate-400">{t('analyzingDesc')}</p>
                     
                     {analysisError && (
                        <div className="mt-8 bg-red-900/20 border border-red-500/50 p-6 rounded-xl max-w-md text-center animate-in zoom-in duration-300">
                           <AlertTriangle className="text-red-500 mx-auto mb-3" size={32} />
                           <h3 className="text-red-400 font-bold mb-2">{t('analysisFailed')}</h3>
                           <p className="text-slate-300 text-sm mb-4">{analysisError}</p>
                           <button 
                             onClick={submitSession}
                             className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold"
                           >
                             {t('tryAgain')}
                           </button>
                           <button 
                             onClick={() => setState(SessionState.VIEWING)}
                             className="block mx-auto mt-4 text-slate-500 hover:text-white text-sm"
                           >
                             {t('returnToReview')}
                           </button>
                        </div>
                     )}
                  </div>
                )}

                <div className="h-full w-full overflow-y-auto p-4 custom-scrollbar">
                   {step === 1 && (
                      <Step1Focus 
                        coordinate={coordinate} 
                        onNext={() => setStep(2)} 
                      />
                   )}
                   {step === 2 && (
                      <Step2Impressions 
                        notes={userNotes} 
                        onChange={setUserNotes}
                        onNext={() => setStep(3)}
                        onBack={() => setStep(1)}
                      />
                   )}
                   {step === 3 && (
                      <div className="h-full flex flex-col items-center animate-in slide-in-from-right-8 duration-300">
                         <div className="w-full max-w-4xl flex-grow bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-700">
                            <SketchPad onExport={(img) => setUserSketch(img)} />
                         </div>
                         <div className="w-full max-w-4xl flex justify-between mt-4">
                            <button onClick={() => setStep(2)} className="text-slate-500 hover:text-slate-300 flex items-center gap-2 px-4 py-2">
                               <ArrowLeft size={18} /> {t('btnBack')}
                            </button>
                            <button 
                              onClick={() => {
                                if (!userSketch) {
                                  alert("Please draw something before continuing."); 
                                  return;
                                }
                                setStep(4);
                              }} 
                              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
                            >
                               {t('sketchReviewBtn')} <ArrowRight size={18} />
                            </button>
                         </div>
                      </div>
                   )}
                   {step === 4 && (
                      <Step4Review 
                        notes={userNotes}
                        sketch={userSketch}
                        onSubmit={submitSession}
                        onBack={() => setStep(3)}
                        sessionType={sessionType}
                      />
                   )}
                </div>
             </div>
          </div>
        )}

        {/* --- FEEDBACK PHASE --- */}
        {state === SessionState.FEEDBACK && (
           <FeedbackView 
              currentSession={currentSession}
              history={history}
              onNextSession={goHome}
              onCalibrationRequired={goHome}
              onSaveRemarks={handleSaveRemarks}
              onOpenAnalysis={handleOpenAnalysis}
              onGenerateImage={handleGenerateImage}
              isSavingRemarks={isSavingRemarks}
              remarksSaved={remarksSaved}
              isOpenAnalyzing={isOpenAnalyzing}
           />
        )}
        
        {/* --- RESET PHASE --- */}
        {state === SessionState.RESET && (
           <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center animate-in fade-in duration-1000">
              <div className="relative">
                 <div className="w-64 h-64 rounded-full border-4 border-slate-800 bg-slate-900 flex items-center justify-center animate-pulse">
                     <span className="text-slate-700 font-mono text-xs">{t('resetDesc')}</span>
                 </div>
                 <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin duration-[3000ms]"></div>
              </div>
              <h2 className="text-2xl font-bold text-white mt-8 tracking-widest uppercase">{t('resetTitle')}</h2>
              <p className="text-slate-400 mt-2 max-w-md text-center">{t('resetInstruction')}</p>
              
              <button 
                onClick={() => handleStartSession(sessionType, targetIntent)} // Restart with same settings
                className="mt-8 px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
              >
                {t('resetAction')}
              </button>
           </div>
        )}

      </main>

      {/* --- MODALS --- */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <ConfirmationModal 
        isOpen={showExitConfirm} 
        title={t('confirmExit')}
        message={t('exitSession')} 
        onConfirm={confirmExitSession}
        onCancel={() => setShowExitConfirm(false)}
      />
      <CoachChat 
        isOpen={showChat} 
        onClose={() => setShowChat(false)} 
        history={history}
      />
      <AnalyticsModal 
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        history={history}
        coachReport={coachReport}
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
      
      {/* RANK PROMOTION TOAST */}
      {newRankData && (
        <RankToast 
            level={newRankData.level}
            title={newRankData.title}
            division={newRankData.division}
            isCalibrationComplete={newRankData.isCalibration}
            onClose={() => setNewRankData(null)}
        />
      )}

    </div>
  );
}

export default App;