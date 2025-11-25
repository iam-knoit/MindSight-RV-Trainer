
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, subscribeToHistory, saveSessionToCloud, updateSessionRemarks, updateIntuitionStats, subscribeToIntuitionStats, deleteSession, updateSessionData, logOut } from './services/firebase';
import { analyzeSession, generateTargetImage, generateCoachReport, recalculateScore, analyzeOpenSession, generateVisualReconstruction } from './services/geminiService';
import { SessionState, SessionData, CoachReport, IntuitionStats, SessionType } from './types';
import { useLanguage } from './contexts/LanguageContext';
import { Brain, Sparkles, Image as ImageIcon, CheckCircle, XCircle, ArrowLeft, ArrowRight, Loader2, Eye, LogIn, LogOut } from 'lucide-react';

import DashboardView from './components/views/DashboardView';
import FeedbackView from './components/views/FeedbackView';
import Step1Focus from './components/session/Step1Focus';
import Step2Impressions from './components/session/Step2Impressions';
import Step4Review from './components/session/Step4Review';
import SketchPad from './components/SketchPad';
import IntuitionDojo from './components/IntuitionDojo';
import DrawingDojo from './components/DrawingDojo';

import AuthModal from './components/modals/AuthModal';
import AnalyticsModal from './components/AnalyticsModal';
import CoachChat from './components/CoachChat';
import RankToast from './components/modals/RankToast';
import SessionLogModal from './components/modals/SessionLogModal';
import ModeSelectionModal from './components/modals/ModeSelectionModal';
import ConfirmationModal from './components/modals/ConfirmationModal';

import { calculateLevel, getRankStyle } from './utils/leveling';

const App: React.FC = () => {
  const { t } = useLanguage();

  // Core State
  const [user, setUser] = useState<User | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>(SessionState.IDLE);
  const [step, setStep] = useState(1);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Data State
  const [history, setHistory] = useState<SessionData[]>([]);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [coachReport, setCoachReport] = useState<CoachReport | null>(null);
  const [intuitionStats, setIntuitionStats] = useState<IntuitionStats | null>(null);

  // Modals & UI
  const [showAuth, setShowAuth] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  
  const [rankToast, setRankToast] = useState<{level: number, title: string, division: string | null} | null>(null);
  const [showCalibrationToast, setShowCalibrationToast] = useState(false);
  const [isDojoLocked, setIsDojoLocked] = useState(false);

  const [isSavingRemarks, setIsSavingRemarks] = useState(false);
  const [remarksSaved, setRemarksSaved] = useState(false);
  const [analyzingHistory, setAnalyzingHistory] = useState(false);
  const [isOpenAnalyzing, setIsOpenAnalyzing] = useState(false);

  // Auth & Data Subscription
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsHistoryLoaded(false);
        const unsubscribeHistory = subscribeToHistory(currentUser.uid, (data) => {
          setHistory(data);
          setIsHistoryLoaded(true);
        });
        const unsubscribeStats = subscribeToIntuitionStats(currentUser.uid, (stats) => {
          setIntuitionStats(stats);
        });
        return () => {
          unsubscribeHistory();
          unsubscribeStats();
        };
      } else {
        setHistory([]);
        setIsHistoryLoaded(true);
        setCoachReport(null);
        setIntuitionStats(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Calculate Current Rank
  const currentRank = calculateLevel(history);

  // Check for Rank Up
  useEffect(() => {
    if (!history.length) return;
    const prevRank = calculateLevel(history.slice(0, -1));
    const currRank = calculateLevel(history);
    
    // Only show toast if level changed AND we are in feedback mode (just finished a session)
    if (sessionState === SessionState.FEEDBACK && currRank.level > prevRank.level) {
       setRankToast({
         level: currRank.level,
         title: currRank.title,
         division: currRank.division
       });
    }
  }, [history, sessionState]);

  // Session Management
  const generateCoordinate = () => {
    const p1 = Math.floor(1000 + Math.random() * 9000);
    const p2 = Math.floor(1000 + Math.random() * 9000);
    return `${p1}-${p2}`;
  };

  const startSession = async (type: SessionType, intent?: string) => {
    setShowModeSelect(false);
    setStep(1);
    
    const newSession: SessionData = {
      id: Date.now().toString(),
      sessionType: type,
      coordinate: generateCoordinate(),
      timestamp: Date.now(),
      userNotes: '',
      userSketchBase64: null,
      targetIntent: intent
    };

    if (type === 'TRAINING') {
      setIsLoading(true);
      setLoadingMessage(t('startSessionLoading'));
      try {
        const target = await generateTargetImage();
        newSession.targetImageUrl = target.url;
        newSession.targetImageBase64 = target.base64;
      } catch (e) {
        console.error("Failed to start session", e);
        // Fallback or alert? For now, proceed (though analysis might fail if no target)
      } finally {
        setIsLoading(false);
      }
    }

    setCurrentSession(newSession);
    setSessionState(SessionState.VIEWING);
  };

  const goHome = () => {
    // 1. Block exit if locked in Zener Dojo
    if (sessionState === SessionState.DOJO && isDojoLocked) {
      alert(t('completeCalibration'));
      return;
    }

    // 2. Block exit if locked in Drawing Dojo
    if (sessionState === SessionState.DRAWING_DOJO && isDojoLocked) {
      alert(t('completeCalibration'));
      return;
    }

    // 3. Check for Low Scores in Feedback Mode (Training only)
    if (sessionState === SessionState.FEEDBACK && currentSession?.sessionType === 'TRAINING') {
        const score = currentSession.aiScore ?? 100;
        const drawingScore = currentSession.drawingScore ?? 100;

        // Condition A: Total Score < 50 -> Intuition Dojo
        if (score < 50) {
            alert(t('lowScoreRedirect'));
            setIsDojoLocked(true);
            setSessionState(SessionState.DOJO);
            return;
        } 
        
        // Condition B: Total Score >= 50 BUT Drawing Score < 45 -> Drawing Dojo
        if (score >= 50 && drawingScore < 45) {
            alert(t('lowDrawingRedirect'));
            setIsDojoLocked(true);
            setSessionState(SessionState.DRAWING_DOJO);
            return;
        }
    }

    if (sessionState === SessionState.VIEWING) {
      setShowConfirmExit(true);
    } else {
      setSessionState(SessionState.IDLE);
      setCurrentSession(null);
      setRemarksSaved(false);
    }
  };

  const confirmExit = () => {
    setSessionState(SessionState.IDLE);
    setCurrentSession(null);
    setShowConfirmExit(false);
  };

  // Step Navigation
  const handleStepNext = () => setStep(prev => prev + 1);
  const handleStepBack = () => setStep(prev => prev - 1);

  // Data Updates during session
  const updateNotes = (notes: string) => {
    if (currentSession) setCurrentSession({ ...currentSession, userNotes: notes });
  };
  const updateSketch = (base64: string) => {
    if (currentSession) setCurrentSession({ ...currentSession, userSketchBase64: base64 });
  };

  // Submission & Analysis
  const submitSession = async () => {
    if (!currentSession) return;
    
    setSessionState(SessionState.ANALYZING);
    setLoadingMessage(currentSession.sessionType === 'TRAINING' ? t('analyzingDesc') : t('savingDesc'));

    try {
      let resultSession = { ...currentSession };

      if (currentSession.sessionType === 'TRAINING') {
          // AI Analysis for Training
          const analysis = await analyzeSession(
             currentSession.targetImageBase64!, 
             currentSession.userSketchBase64, 
             currentSession.userNotes
          );
          
          resultSession.aiScore = analysis.score;
          resultSession.drawingScore = analysis.drawingScore;
          resultSession.notesScore = analysis.notesScore;
          resultSession.aiFeedback = analysis.feedback;
      } else {
          // Open Session - Just save, optional analysis later
          resultSession.aiFeedback = "Open session recorded. Use 'Ask AI Analyst' to interpret data.";
      }

      // Save to History (Local or Cloud)
      if (user) {
        await saveSessionToCloud(user.uid, resultSession);
      } else {
        // Guest mode - local state only (already updated via history prop if we were using it, but here we just set currentSession)
      }

      setCurrentSession(resultSession);
      setSessionState(SessionState.FEEDBACK);

    } catch (error) {
      console.error("Analysis Error", error);
      setSessionState(SessionState.VIEWING); // Return to view to retry
      setStep(4);
      alert(t('analysisErrorDesc'));
    }
  };

  const handleSaveRemarks = async (remarks: string) => {
     if (!currentSession || !user) return;
     setIsSavingRemarks(true);
     try {
        // 1. Update Remarks
        await updateSessionRemarks(user.uid, currentSession.id, remarks);
        
        // 2. If Training, Recalculate Score
        if (currentSession.sessionType === 'TRAINING') {
            const newScore = await recalculateScore(currentSession, remarks);
            const updatedData = {
                aiScore: newScore.score,
                drawingScore: newScore.drawingScore,
                notesScore: newScore.notesScore,
                aiFeedback: newScore.feedback,
                postSessionRemarks: remarks
            };
            await updateSessionData(user.uid, currentSession.id, updatedData);
            setCurrentSession(prev => prev ? { ...prev, ...updatedData } : null);
        }

        setRemarksSaved(true);
     } catch (e) {
        console.error(e);
     } finally {
        setIsSavingRemarks(false);
     }
  };

  const handleOpenAnalysis = async (session: SessionData) => {
      if (!user) return;
      setIsOpenAnalyzing(true);
      try {
         const result = await analyzeOpenSession(session.userSketchBase64, session.userNotes, session.targetIntent);
         const update = { aiGuessedSubject: result.subject, aiFeedback: result.analysis };
         await updateSessionData(user.uid, session.id, update);
         setCurrentSession(prev => prev ? { ...prev, ...update } : null);
      } catch (e) {
         console.error(e);
      } finally {
         setIsOpenAnalyzing(false);
      }
  };
  
  const handleGenerateImage = async (session: SessionData) => {
      if (!user) return;
      try {
         const url = await generateVisualReconstruction(session.targetIntent, session.aiGuessedSubject, session.userNotes);
         await updateSessionData(user.uid, session.id, { generatedImageUrl: url });
         setCurrentSession(prev => prev ? { ...prev, generatedImageUrl: url } : null);
      } catch (e) {
          console.error(e);
      }
  };

  const handleRunCoach = async () => {
    if (!user || history.length < 3) return;
    setAnalyzingHistory(true);
    try {
        const report = await generateCoachReport(history);
        setCoachReport(report);
    } catch(e) {
        console.error(e);
    } finally {
        setAnalyzingHistory(false);
    }
  };

  const handleEnterDojo = () => {
      setIsDojoLocked(false);
      setSessionState(SessionState.DOJO);
  };

  const handleCalibrationRequired = () => {
    setIsDojoLocked(true);
    setSessionState(SessionState.DOJO);
  };

  const handleDojoComplete = () => {
      if (isDojoLocked) {
          setShowCalibrationToast(true);
          setIsDojoLocked(false);
      }
      setSessionState(SessionState.IDLE);
      setCurrentSession(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
        <ModeSelectionModal isOpen={showModeSelect} onClose={() => setShowModeSelect(false)} onSelectTraining={() => startSession('TRAINING')} onSelectOpen={(i) => startSession('OPEN', i)} />
        <AnalyticsModal isOpen={showAnalytics} onClose={() => setShowAnalytics(false)} history={history} coachReport={coachReport} />
        <CoachChat isOpen={showChat} onClose={() => setShowChat(false)} history={history} />
        <SessionLogModal 
            isOpen={showLog} 
            onClose={() => setShowLog(false)} 
            history={history} 
            onDeleteSession={async (id) => user && await deleteSession(user.uid, id)}
            onUpdateSession={async (id, data) => user && await updateSessionData(user.uid, id, data)}
        />
        <ConfirmationModal isOpen={showConfirmExit} title={t('exitSession')} message={t('confirmExit')} onConfirm={confirmExit} onCancel={() => setShowConfirmExit(false)} />
        
        {rankToast && <RankToast {...rankToast} onClose={() => setRankToast(null)} isCalibrationComplete={false} />}
        {showCalibrationToast && <RankToast level={0} title="calibrationComplete" division={null} onClose={() => setShowCalibrationToast(false)} isCalibrationComplete={true} />}

        {/* --- APP HEADER --- */}
        {sessionState === SessionState.IDLE && (
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
                    {/* Rank Badge or Loading State */}
                    {!isHistoryLoaded ? (
                      <div className="w-24 h-5 bg-slate-700 rounded animate-pulse"></div>
                    ) : currentRank.isRanked ? (
                      <div className={`flex items-center gap-2 text-xs font-bold ${getRankStyle(currentRank.level).color}`}>
                          <div className={`w-2 h-2 rounded-full ${getRankStyle(currentRank.level).bg.replace('/10','')} animate-pulse`}></div>
                          <span className="uppercase tracking-wider">{t(currentRank.title)} {currentRank.division || 'I'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                          <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></div>
                          <span className="uppercase tracking-wider">{t('calibrating')}</span>
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
                    onClick={() => setShowAuth(true)} 
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all"
                  >
                    <LogIn size={16} /> <span className="hidden sm:inline">{t('login')}</span>
                  </button>
                )}
              </div>
            </div>
          </header>
        )}

        {/* --- MAIN VIEWS --- */}

        {sessionState === SessionState.IDLE && (
            <DashboardView 
                user={user}
                history={history}
                coachReport={coachReport}
                isLoading={isLoading}
                loadingMessage={loadingMessage}
                analyzingHistory={analyzingHistory}
                onShowAuth={() => setShowAuth(true)}
                onShowModeSelection={() => setShowModeSelect(true)}
                onShowAnalytics={() => setShowAnalytics(true)}
                onShowChat={() => setShowChat(true)}
                onRunCoachAnalysis={handleRunCoach}
                onEnterDojo={handleEnterDojo}
                onShowSessionLog={() => setShowLog(true)}
                isHistoryLoaded={isHistoryLoaded}
            />
        )}

        {sessionState === SessionState.VIEWING && currentSession && (
            <div className="flex flex-col h-screen">
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
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                            <p className="text-xs text-slate-500 font-mono">{t('session')} #{history.filter(s => s.sessionType === currentSession.sessionType).length + 1} • {currentSession.sessionType === 'OPEN' ? 'OPEN' : 'BLIND'}</p>
                            <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 shadow-sm" title={t('trn')}>
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            <span className="text-xs font-mono font-bold text-blue-200 tracking-wider">{currentSession.coordinate}</span>
                            </div>
                        </div>
                    </div>
                    </div>
                    <button 
                    onClick={goHome} 
                    className="text-slate-400 hover:text-red-400 hover:bg-red-900/10 p-2 rounded-lg transition-colors"
                    >
                        <XCircle size={20} />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    {step === 1 && <Step1Focus coordinate={currentSession.coordinate} onNext={handleStepNext} />}
                    {step === 2 && <Step2Impressions notes={currentSession.userNotes} onChange={updateNotes} onNext={handleStepNext} onBack={handleStepBack} />}
                    {step === 3 && (
                        <div className="max-w-4xl mx-auto h-full flex flex-col animate-in slide-in-from-right-8 duration-300">
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-bold text-white mb-2">{t('stage2Title')}</h2>
                                <p className="text-slate-400">{t('stage2Desc')}</p>
                            </div>
                            <div className="flex-grow bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl relative min-h-[400px]">
                                <SketchPad onExport={updateSketch} />
                            </div>
                            <div className="flex justify-between mt-6">
                                <button onClick={handleStepBack} className="text-slate-500 hover:text-slate-300 flex items-center gap-2 px-4 py-2">
                                    <ArrowLeft size={18} /> {t('btnBack')}
                                </button>
                                <button onClick={handleStepNext} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20">
                                    {t('sketchReviewBtn')} <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                    {step === 4 && <Step4Review notes={currentSession.userNotes} sketch={currentSession.userSketchBase64} onSubmit={submitSession} onBack={handleStepBack} sessionType={currentSession.sessionType} />}
                </div>
            </div>
        )}

        {sessionState === SessionState.ANALYZING && (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
                <h2 className="text-2xl font-bold text-white mb-2">{t('analyzingTitle')}</h2>
                <p className="text-slate-400">{loadingMessage}</p>
            </div>
        )}

        {sessionState === SessionState.FEEDBACK && currentSession && (
            <div className="flex flex-col h-screen">
                 <div className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center shadow-lg z-20">
                    <button onClick={goHome} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} /> <span className="font-bold">{t('exitSession')}</span>
                    </button>
                    <div className="font-mono text-slate-500 font-bold">{currentSession.coordinate}</div>
                 </div>
                 <div className="flex-grow overflow-y-auto">
                    <FeedbackView 
                        currentSession={currentSession}
                        history={history}
                        onNextSession={goHome}
                        onCalibrationRequired={handleCalibrationRequired}
                        onSaveRemarks={handleSaveRemarks}
                        onOpenAnalysis={handleOpenAnalysis}
                        onGenerateImage={handleGenerateImage}
                        isSavingRemarks={isSavingRemarks}
                        remarksSaved={remarksSaved}
                        isOpenAnalyzing={isOpenAnalyzing}
                    />
                 </div>
            </div>
        )}

        {sessionState === SessionState.DOJO && (
            <IntuitionDojo 
                onClose={handleDojoComplete} 
                initialStats={intuitionStats} 
                lockedMode={isDojoLocked}
            />
        )}
        
        {sessionState === SessionState.DRAWING_DOJO && (
             <DrawingDojo onClose={handleDojoComplete} lockedMode={isDojoLocked} />
        )}
    </div>
  );
};

export default App;
