import React, { useState, useEffect, useCallback } from 'react';
import { Eye, RefreshCw, Play, CheckCircle, Brain, Image as ImageIcon, Sparkles, ArrowRight, ArrowLeft, ShieldCheck, Trash2, History, LogIn, LogOut, User as UserIcon, AlertTriangle, X, Copy, Server } from 'lucide-react';
import { SessionState, SessionData, TargetImage } from './types';
import { analyzeSession, generateTargetImage } from './services/geminiService';
import { auth, signInWithGoogle, logOut, saveSessionToCloud, subscribeToHistory } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import SketchPad from './components/SketchPad';
import HistoryChart from './components/HistoryChart';

const generateCoordinate = () => {
  const p1 = Math.floor(1000 + Math.random() * 9000);
  const p2 = Math.floor(1000 + Math.random() * 9000);
  return `${p1}-${p2}`;
};

const STEPS = [
  { id: 1, title: "Focus", icon: Brain },
  { id: 2, title: "Impressions", icon: Sparkles },
  { id: 3, title: "Sketch", icon: ImageIcon },
  { id: 4, title: "Review", icon: CheckCircle },
];

// --- SUB-COMPONENTS ---

interface Step1Props {
  coordinate: string;
  onNext: () => void;
}

const Step1Focus: React.FC<Step1Props> = ({ coordinate, onNext }) => (
  <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-in zoom-in-95 duration-500">
    <div className="space-y-2">
      <h3 className="text-slate-400 text-sm uppercase tracking-widest">Target Reference Number</h3>
      <div className="text-6xl md:text-7xl font-mono font-bold text-white tracking-wider drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">
        {coordinate}
      </div>
    </div>
    
    <div className="max-w-lg bg-slate-800/50 p-6 rounded-xl border border-slate-700">
      <p className="text-lg text-slate-300 leading-relaxed">
        Relax. Clear your mind of expectations. <br/>
        Focus only on the coordinate. <br/>
        Allow information to drift into your awareness gently.
      </p>
    </div>

    <button onClick={onNext} className="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold transition-all flex items-center gap-2">
      I am focused <ArrowRight size={18} />
    </button>
  </div>
);

interface Step2Props {
  notes: string;
  onChange: (val: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step2Impressions: React.FC<Step2Props> = ({ notes, onChange, onNext, onBack }) => (
  <div className="max-w-2xl mx-auto w-full space-y-6 animate-in slide-in-from-right-8 duration-300">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-white mb-2">Stage 1: Sensory Data</h2>
      <p className="text-slate-400">Write down the first sensory impressions (Gestalts). Colors, textures, smells, temperatures.</p>
    </div>

    <div className="bg-slate-800/50 p-1 rounded-2xl border border-slate-700 focus-within:border-blue-500/50 transition-colors">
      <textarea
        className="w-full h-64 bg-slate-900 rounded-xl p-6 text-lg text-slate-200 placeholder:text-slate-600 focus:outline-none resize-none"
        placeholder="e.g., Red, rough texture, metallic smell, sense of motion..."
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
      />
    </div>

    <div className="flex justify-between pt-4">
      <button onClick={onBack} className="text-slate-500 hover:text-slate-300 flex items-center gap-2 px-4 py-2">
        <ArrowLeft size={18} /> Back
      </button>
      <button onClick={onNext} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20">
        Next: Visuals <ArrowRight size={18} />
      </button>
    </div>
  </div>
);

interface Step4Props {
  notes: string;
  sketch: string | null;
  onSubmit: () => void;
  onBack: () => void;
}

const Step4Review: React.FC<Step4Props> = ({ notes, sketch, onSubmit, onBack }) => (
  <div className="max-w-4xl mx-auto w-full space-y-6 animate-in slide-in-from-right-8 duration-300">
     <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-white">Final Review</h2>
      <p className="text-slate-400">Check your data before submitting to the AI Judge.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sparkles size={14} /> Sensory Notes
        </h3>
        <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
          {notes || <span className="text-slate-600 italic">No notes recorded.</span>}
        </p>
      </div>
      
      <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
           <ImageIcon size={14} /> Sketch Preview
        </h3>
        <div className="bg-white rounded-lg overflow-hidden aspect-[4/3] border border-slate-600">
           {sketch ? (
             <img src={sketch} alt="User Sketch" className="w-full h-full object-contain" />
           ) : (
             <div className="w-full h-full flex items-center justify-center text-slate-400">No sketch drawn</div>
           )}
        </div>
      </div>
    </div>

    <div className="flex justify-between pt-8">
      <button onClick={onBack} className="text-slate-500 hover:text-slate-300 flex items-center gap-2 px-4 py-2">
        <ArrowLeft size={18} /> Edit Data
      </button>
      <button 
        onClick={onSubmit} 
        className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-[0_0_30px_-5px_rgba(22,163,74,0.4)]"
      >
        <ShieldCheck size={20} /> SUBMIT FOR ANALYSIS
      </button>
    </div>
  </div>
);


function App() {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<SessionState>(SessionState.IDLE);
  const [step, setStep] = useState(1);
  
  const [coordinate, setCoordinate] = useState<string>('');
  const [target, setTarget] = useState<TargetImage | null>(null);
  const [userNotes, setUserNotes] = useState('');
  const [userSketch, setUserSketch] = useState<string | null>(null);
  
  const [history, setHistory] = useState<SessionData[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("INITIALIZING...");
  
  const [authError, setAuthError] = useState<{title: string, domain: string, isFileProtocol?: boolean} | null>(null);

  // Auth State Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setHistory([]); // Clear history on logout
      }
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

  const handleLogin = async () => {
    setAuthError(null);

    // Check for file protocol which prevents Firebase Auth
    if (window.location.protocol === 'file:') {
      setAuthError({
        title: "Invalid Protocol (File)",
        domain: "You are running this file directly from your computer.",
        isFileProtocol: true
      });
      return;
    }

    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Login failed", error);
      if (error?.code === 'auth/unauthorized-domain') {
        // Robustly detect the domain to display to the user
        let detectedDomain = window.location.hostname;
        
        // If hostname is empty (can happen in some envs), try host or fallback
        if (!detectedDomain) {
            detectedDomain = window.location.host || "localhost";
        }

        setAuthError({
          title: "Unauthorized Domain",
          domain: detectedDomain
        });
      } else if (error?.code === 'auth/popup-closed-by-user') {
        // User closed popup, ignore
      } else {
        setAuthError({
            title: "Login Error",
            domain: error.message || "Unknown error occurred"
        });
      }
    }
  };

  const clearHistory = () => {
    if (window.confirm("Currently, history can only be cleared manually from the database for safety.")) {
      // Placeholder
    }
  };

  // Start a new session
  const startSession = async () => {
    if (!user) {
      await handleLogin();
      return; 
    }
    setIsLoading(true);
    setLoadingMessage("FETCHING ONLINE TARGET...");
    try {
      const newCoord = generateCoordinate();
      setCoordinate(newCoord);
      
      setUserNotes('');
      setUserSketch(null);
      setStep(1);

      const targetData = await generateTargetImage();
      setTarget(targetData);
      
      setState(SessionState.VIEWING);
    } catch (e) {
      alert("Failed to initialize session. Check connection.");
    } finally {
      setIsLoading(false);
      setLoadingMessage("START SESSION");
    }
  };

  // Submit session for analysis
  const submitSession = async () => {
    if (!target || !user) return;
    setState(SessionState.ANALYZING);
    
    try {
      const result = await analyzeSession(target.base64, userSketch, userNotes);
      
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
      
      setState(SessionState.FEEDBACK);
    } catch (e) {
      console.error(e);
      alert("Analysis failed.");
      setState(SessionState.VIEWING); 
    }
  };

  const handleSketchExport = useCallback((base64: string) => {
    setUserSketch(base64);
  }, []);

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const renderHeader = () => (
    <header className="w-full p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Eye className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              MindSight
            </h1>
            <p className="text-xs text-slate-400 font-mono">RV TRAINING PROTOCOL v2.5</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {state !== SessionState.IDLE && (
             <div className="hidden md:flex items-center gap-4">
               <div className="flex items-center gap-2">
                 {STEPS.map((s) => (
                   <div key={s.id} className={`h-2 w-2 rounded-full ${state === SessionState.VIEWING && step >= s.id ? 'bg-blue-500' : 'bg-slate-700'}`} />
                 ))}
               </div>
               <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 font-mono text-cyan-400 animate-pulse">
                 TRN: {coordinate}
               </div>
             </div>
          )}

          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                 <span className="text-xs text-slate-400">Operator</span>
                 <span className="text-sm font-semibold text-slate-200">{user.displayName}</span>
              </div>
              <img src={user.photoURL || ''} alt="User" className="w-8 h-8 rounded-full border border-slate-600" />
              <button onClick={logOut} className="p-2 text-slate-400 hover:text-red-400 transition-colors" title="Sign Out">
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin} 
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-600 transition-all"
            >
              <LogIn size={16} />
              <span className="text-sm font-semibold">Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );

  const renderIdle = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 w-full max-w-5xl mx-auto relative">
      
      {/* Auth Error Banner */}
      {authError && (
        <div className="w-full max-w-xl mb-8 bg-red-900/20 border border-red-500/50 rounded-xl p-6 animate-in slide-in-from-top-4">
          <div className="flex justify-between items-start mb-2">
             <h3 className="text-red-400 font-bold flex items-center gap-2">
               <AlertTriangle size={20} />
               {authError.title}
             </h3>
             <button onClick={() => setAuthError(null)} className="text-red-400 hover:text-red-200">
               <X size={20} />
             </button>
          </div>
          
          {authError.isFileProtocol ? (
             <div className="text-slate-300 text-sm mb-2 space-y-2">
                 <p>Google Login <strong>requires a web server</strong>. It does not work when opening <code className="bg-black/30 px-1 rounded">.html</code> files directly.</p>
                 <p className="flex items-center gap-2"><Server size={14}/> <strong>Fix:</strong> Run a local server (e.g., <code className="text-yellow-400">npm start</code>, <code className="text-yellow-400">vite</code>, or VS Code Live Server).</p>
             </div>
          ) : (
            <>
              <p className="text-slate-300 text-sm mb-4">
                 Firebase Authentication blocked this request. You must add the following domain to your Firebase Console.
              </p>
              <div className="bg-black/40 p-3 rounded-lg flex items-center justify-between group cursor-pointer border border-red-500/20"
                 onClick={() => {
                   navigator.clipboard.writeText(authError.domain);
                   alert("Domain copied to clipboard!");
                 }}>
                <code className="text-red-200 font-mono text-sm break-all">
                    {authError.domain}
                </code>
                <Copy size={16} className="text-slate-500 group-hover:text-white transition-colors flex-shrink-0 ml-2" />
              </div>
              <div className="mt-4 text-xs text-slate-500">
                Go to: Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains
              </div>
            </>
          )}
        </div>
      )}

      <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700 mb-12">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-8 mx-auto border border-slate-700 relative group">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl group-hover:bg-blue-500/30 transition-all"></div>
          <Brain className="text-blue-400 w-12 h-12" />
        </div>
        
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {user ? `Welcome back, ${user.displayName?.split(' ')[0]}` : "Ready to Train?"}
        </h2>
        <p className="text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
          {user 
            ? "Initialize a blind session. Follow the 4-step protocol to record your data before feedback."
            : "Sign in to track your progress across devices and analyze your Remote Viewing sessions with AI."}
        </p>
        
        {user ? (
          <button
            onClick={startSession}
            disabled={isLoading}
            className="mx-auto group relative px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.6)] flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Sparkles className="animate-spin" />
            ) : (
              <Play className="fill-white" size={20} />
            )}
            {isLoading ? loadingMessage : "START NEW SESSION"}
          </button>
        ) : (
          <button
            onClick={handleLogin}
            className="mx-auto px-8 py-4 bg-white text-slate-900 hover:bg-slate-200 font-bold rounded-xl transition-all flex items-center gap-3"
          >
             <UserIcon size={20} />
             SIGN IN WITH GOOGLE
          </button>
        )}
      </div>

      {/* Past History Section */}
      {user && history.length > 0 && (
        <div className="w-full bg-slate-900/50 rounded-2xl border border-slate-800 p-6 animate-in fade-in duration-1000 delay-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
              <History size={18} /> Performance History
            </h3>
          </div>
          <HistoryChart sessions={history} />
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
              <h2 className="text-2xl font-bold text-white">Stage 2: Visual Sketch</h2>
              <p className="text-slate-400 text-sm">Draw the shapes and forms. Do not try to identify the object.</p>
           </div>
           <div className="flex-grow min-h-[500px] bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
              <SketchPad onExport={handleSketchExport} />
           </div>
           <div className="flex justify-between pt-4">
              <button onClick={prevStep} className="text-slate-500 hover:text-slate-300 flex items-center gap-2 px-4 py-2">
                <ArrowLeft size={18} /> Back
              </button>
              <button onClick={nextStep} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20">
                Review Session <ArrowRight size={18} />
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
      <h2 className="text-2xl font-bold text-white mb-2">Analyzing Session...</h2>
      <p className="text-slate-400">Comparing your sketch with the blind target.</p>
    </div>
  );

  const renderFeedback = () => {
    if (!currentSession) return null;

    return (
      <div className="max-w-6xl mx-auto p-4 animate-in slide-in-from-bottom-8 duration-700">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckCircle className="text-green-500" />
            Feedback Phase
          </h2>
          <div className="flex gap-4">
             <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-sm mr-2">ACCURACY SCORE</span>
                <span className={`font-bold text-xl ${currentSession.aiScore >= 70 ? 'text-green-400' : currentSession.aiScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {currentSession.aiScore}%
                </span>
             </div>
             <button
               onClick={() => setState(SessionState.IDLE)}
               className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
             >
               Next Session
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Target Reveal */}
          <div className="space-y-2">
            <div className="bg-slate-800/50 p-2 rounded-t-xl border border-slate-700 text-center text-slate-300 font-semibold">
              ACTUAL TARGET
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
              YOUR SKETCH
            </div>
            <div className="relative rounded-b-xl overflow-hidden border-x border-b border-slate-700 aspect-[4/3] bg-white">
               {currentSession.userSketchBase64 ? (
                 <img src={currentSession.userSketchBase64} alt="Sketch" className="w-full h-full object-contain" />
               ) : (
                 <div className="flex items-center justify-center h-full text-slate-400">No Sketch Provided</div>
               )}
            </div>
          </div>
        </div>

        {/* Analysis Text */}
        <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 mb-8">
           <h3 className="text-xl font-semibold text-blue-400 mb-4 flex items-center gap-2">
             <Sparkles size={20} /> AI Analysis
           </h3>
           <p className="text-lg text-slate-300 leading-relaxed">
             {currentSession.aiFeedback}
           </p>
        </div>
        
        <div className="w-full bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-300 mb-4">Performance Trend</h3>
          <HistoryChart sessions={history} />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-200 font-sans selection:bg-blue-500/30">
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