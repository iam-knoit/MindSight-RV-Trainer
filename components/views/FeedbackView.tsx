
import React, { useState } from 'react';
import { CheckCircle, Timer, AlertTriangle, Layers, Sliders, Contrast, Lock, FileText, RefreshCw, Check, Save, Sparkles, Wand2, Eye, ImagePlus, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SessionData } from '../../types';
import HistoryChart from '../HistoryChart';

interface FeedbackViewProps {
  currentSession: SessionData | null;
  history: SessionData[];
  onNextSession: () => void;
  onCalibrationRequired: () => void;
  onSaveRemarks: (remarks: string) => Promise<void>;
  onOpenAnalysis?: (session: SessionData) => Promise<void>;
  onGenerateImage?: (session: SessionData) => Promise<void>;
  isSavingRemarks: boolean;
  remarksSaved: boolean;
  isOpenAnalyzing?: boolean;
}

const FeedbackView: React.FC<FeedbackViewProps> = ({ 
  currentSession, history, onNextSession, onCalibrationRequired, onSaveRemarks, onOpenAnalysis, onGenerateImage, isSavingRemarks, remarksSaved, isOpenAnalyzing = false
}) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'split' | 'overlay'>('split');
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [invertSketch, setInvertSketch] = useState(false);
  const [remarksInput, setRemarksInput] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  if (!currentSession) return null;

  const isLowScore = currentSession.aiScore !== undefined && currentSession.aiScore < 50;
  const isOpenSession = currentSession.sessionType === 'OPEN';

  const handleGenerateImage = async () => {
    if (onGenerateImage) {
        setIsGeneratingImage(true);
        try {
            await onGenerateImage(currentSession);
        } finally {
            setIsGeneratingImage(false);
        }
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}${t('min')}`;
    if (m > 0) return `${m}${t('min')} ${s}${t('sec')}`;
    return `${s}${t('sec')}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 animate-in slide-in-from-bottom-8 duration-700">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <CheckCircle className={isOpenSession ? "text-purple-500" : "text-green-500"} />
          {t('feedbackPhase')}
        </h2>
        <div className="flex gap-4">
           {/* Only show score if it exists */}
           {!isOpenSession && currentSession.aiScore !== undefined && (
              <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                  <span className="text-slate-400 text-sm mr-2">{t('accuracyScore')}</span>
                  <span className={`font-bold text-xl ${currentSession.aiScore >= 70 ? 'text-green-400' : currentSession.aiScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {currentSession.aiScore}%
                  </span>
              </div>
           )}
           
           {currentSession.durationSeconds !== undefined && (
             <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-2 text-slate-300">
               <Timer size={16} className="text-blue-400" />
               <span className="text-sm font-mono font-bold">{formatDuration(currentSession.durationSeconds)}</span>
             </div>
           )}
           
           {isLowScore ? (
             <button
               onClick={onCalibrationRequired}
               className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all active:scale-95 font-bold animate-pulse shadow-lg shadow-red-900/40 border border-red-500"
             >
               {t('calibrationRequired')}
             </button>
           ) : (
             <button
               onClick={onNextSession}
               className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all active:scale-95"
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

      {/* Visual Analysis Toolbar (Only for Training) */}
      {!isOpenSession && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
              <Layers size={16} className="text-blue-400" /> {t('visualTools')}
          </div>
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button 
                  onClick={() => setViewMode('split')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all active:scale-90 ${viewMode === 'split' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                  {t('modeSplit')}
              </button>
              <button 
                  onClick={() => setViewMode('overlay')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all active:scale-90 ${viewMode === 'overlay' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all active:scale-90 ${invertSketch ? 'bg-blue-900/30 border-blue-500/50 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                  >
                  <Contrast size={14} /> {t('invertSketch')}
                  </button>
              </div>
          )}
          </div>
      )}
      
      {viewMode === 'split' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-2">
            <div className="bg-slate-800/50 p-2 rounded-t-xl border border-slate-700 text-center text-slate-300 font-semibold flex justify-center items-center gap-2">
               {isOpenSession && currentSession.generatedImageUrl ? (
                   <><Wand2 size={16} className="text-purple-400" /> {t('visualRecon')}</>
               ) : (
                   isOpenSession ? t('targetInaccessible') : t('actualTarget')
               )}
            </div>
            <div className="relative group rounded-b-xl overflow-hidden border-x border-b border-slate-700 aspect-square bg-slate-900 flex items-center justify-center flex-col">
              
              {/* DISPLAY LOGIC: 
                 1. If Training Mode -> Show Target Image
                 2. If Open Mode AND Generated Image -> Show Generated Image
                 3. If Open Mode AND No Image -> Show Placeholder/Generators 
              */}
              
              {!isOpenSession && currentSession.targetImageUrl ? (
                   <img 
                    src={currentSession.targetImageUrl} 
                    alt="Target" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                   />
              ) : isOpenSession && currentSession.generatedImageUrl ? (
                   <div className="relative w-full h-full">
                       <img 
                        src={currentSession.generatedImageUrl} 
                        alt="AI Generated Target" 
                        className="w-full h-full object-cover"
                       />
                       <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm p-2 text-xs text-center text-purple-200">
                           {t('aiVisualDesc')}
                       </div>
                   </div>
              ) : (
                  // PLACEHOLDER FOR OPEN SESSION WITHOUT IMAGE
                  <div className="text-center p-6 w-full h-full overflow-y-auto custom-scrollbar">
                      <Lock size={48} className="text-slate-600 mx-auto mb-4 mt-8" />
                      <p className="text-slate-400 font-bold">{t('targetInaccessible')}</p>
                      <p className="text-slate-500 text-sm mt-2 mb-4">{t('targetInaccessibleDesc')}</p>
                      {currentSession.targetIntent && (
                          <div className="mt-4 bg-purple-900/20 px-4 py-3 rounded-xl border border-purple-500/30 text-purple-200 w-full max-w-md mx-auto">
                              <span className="text-xs uppercase font-bold text-purple-400 block mb-1">{t('targetIntent')}</span>
                              <div className="font-serif italic text-lg">"{currentSession.targetIntent}"</div>
                          </div>
                      )}

                      {/* AI Open Analysis Trigger */}
                      {isOpenSession && onOpenAnalysis && !currentSession.aiGuessedSubject && (
                        <div className="mt-8 border-t border-slate-800 pt-6">
                            <button
                                onClick={() => onOpenAnalysis(currentSession)}
                                disabled={isOpenAnalyzing}
                                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-xl font-bold transition-all active:scale-95 border border-slate-700 hover:border-blue-500/50 flex items-center gap-2 mx-auto disabled:opacity-50"
                            >
                                {isOpenAnalyzing ? <RefreshCw className="animate-spin" size={18} /> : <Wand2 size={18} />}
                                {isOpenAnalyzing ? t('analyzingOpen') : t('btnAnalyzeOpen')}
                            </button>
                            <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">
                                {t('btnAnalyzeOpenDesc')}
                            </p>
                        </div>
                      )}

                      {/* AI Open Analysis Result */}
                      {isOpenSession && currentSession.aiGuessedSubject && (
                        <div className="mt-6 bg-slate-800/80 rounded-xl border border-blue-500/30 p-4 text-left relative overflow-hidden max-w-md mx-auto">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <Eye size={64} />
                            </div>
                            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Wand2 size={12} /> {t('aiPrediction')}
                            </h4>
                            <div className="text-xl font-bold text-white mb-2">
                                "{currentSession.aiGuessedSubject}"
                            </div>
                            <div className="text-sm text-slate-300 leading-relaxed border-t border-slate-700 pt-2 mt-2">
                                <span className="text-xs text-slate-500 uppercase font-bold mr-2">{t('analystReport')}:</span>
                                {currentSession.aiFeedback}
                            </div>

                            {/* GENERATE VISUALIZATION BUTTON */}
                            {!currentSession.generatedImageUrl && onGenerateImage && (
                                <button
                                    onClick={handleGenerateImage}
                                    disabled={isGeneratingImage}
                                    className="w-full mt-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isGeneratingImage ? <Loader2 className="animate-spin" size={14} /> : <ImagePlus size={14} />}
                                    {isGeneratingImage ? t('generatingImage') : t('generateImage')}
                                </button>
                            )}
                        </div>
                      )}

                  </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="bg-slate-800/50 p-2 rounded-t-xl border border-slate-700 text-center text-slate-300 font-semibold">
              {t('yourSketch')}
            </div>
            <div className="relative rounded-b-xl overflow-hidden border-x border-b border-slate-700 aspect-square bg-white">
              {currentSession.userSketchBase64 ? (
                <img src={currentSession.userSketchBase64} alt="Sketch" className="w-full h-full object-contain" />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">{t('noSketch')}</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* OVERLAY MODE (Only for Training) */
        <div className="w-full max-w-3xl mx-auto mb-8 animate-in zoom-in-95 duration-300">
           <div className="relative aspect-square rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
              {currentSession.targetImageUrl && (
                  <img 
                  src={currentSession.targetImageUrl} 
                  alt="Target" 
                  className="absolute inset-0 w-full h-full object-cover"
                  />
              )}
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
                      onClick={() => onSaveRemarks(remarksInput)}
                      disabled={isSavingRemarks || !remarksInput.trim()}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 ${remarksSaved 
                          ? 'bg-green-900/30 text-green-400 border border-green-500/50' 
                          : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                  >
                      {isSavingRemarks ? <RefreshCw className="animate-spin" size={16} /> : remarksSaved ? <Check size={16} /> : <Save size={16} />}
                      {isSavingRemarks ? t('savingReview') : remarksSaved ? t('remarksSaved') : t('saveRemarks')}
                  </button>
              </div>
          </div>
      </div>

      {!isOpenSession && (
        <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 mb-8">
            <h3 className="text-xl font-semibold text-blue-400 mb-4 flex items-center gap-2">
            <Sparkles size={20} /> {t('aiAnalysis')}
            </h3>
            <p className="text-lg text-slate-300 leading-relaxed whitespace-pre-wrap">
            {currentSession.aiFeedback || <span className="italic text-slate-500">{t('noAnalysis')}</span>}
            </p>
        </div>
      )}

      {/* Analytics Chart (Only show if there's history) */}
      {history.length > 0 && (
        <div className="w-full bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
            <h3 className="text-lg font-semibold text-slate-300 mb-4">{t('trendTitle')}</h3>
            <HistoryChart sessions={history} />
        </div>
      )}
    </div>
  );
};

export default FeedbackView;
