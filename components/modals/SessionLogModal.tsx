
import React, { useState } from 'react';
import { X, Trash2, Calendar, Clock, Target, Compass, Brain, Filter, AlertCircle, ArrowLeft, ImagePlus, Wand2, Loader2, Save, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SessionData } from '../../types';
import { generateVisualReconstruction, analyzeOpenSession } from '../../services/geminiService';

interface SessionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SessionData[];
  onDeleteSession: (sessionId: string) => Promise<void>;
  onUpdateSession: (sessionId: string, data: Partial<SessionData>) => Promise<void>;
}

const SessionLogModal: React.FC<SessionLogModalProps> = ({ isOpen, onClose, history, onDeleteSession, onUpdateSession }) => {
  const { t } = useLanguage();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  
  // States for Open Mode Generation
  const [reconstructionDetails, setReconstructionDetails] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!isOpen) return null;

  // Sort by newest first
  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);
  
  // Strict Filter: Only show OPEN sessions
  const filteredHistory = sortedHistory.filter(s => s.sessionType === 'OPEN');

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t('confirmDelete'))) {
      setDeletingId(id);
      await onDeleteSession(id);
      if (selectedSession?.id === id) setSelectedSession(null);
      setDeletingId(null);
    }
  };

  const handleGenerateImage = async () => {
    if (!selectedSession) return;
    setIsGenerating(true);
    try {
      const imageUrl = await generateVisualReconstruction(
        selectedSession.targetIntent,
        selectedSession.aiGuessedSubject,
        selectedSession.userNotes,
        reconstructionDetails
      );
      
      await onUpdateSession(selectedSession.id, { generatedImageUrl: imageUrl });
      
      // Update local state to reflect change immediately
      setSelectedSession(prev => prev ? { ...prev, generatedImageUrl: imageUrl } : null);
    } catch (e) {
      console.error("Generation failed", e);
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateAnalysis = async () => {
    if (!selectedSession) return;
    setIsAnalyzing(true);
    try {
        const result = await analyzeOpenSession(
            selectedSession.userSketchBase64,
            selectedSession.userNotes,
            selectedSession.targetIntent
        );

        const updatedData: Partial<SessionData> = {
            aiGuessedSubject: result.subject,
            aiFeedback: result.analysis
        };

        await onUpdateSession(selectedSession.id, updatedData);
        setSelectedSession(prev => prev ? { ...prev, ...updatedData } : null);
    } catch (e) {
        console.error("Analysis regeneration failed", e);
        alert("Failed to regenerate analysis. Please check your connection.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const formatTime = (seconds?: number) => {
      if (!seconds) return '--';
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}m ${s}s`;
  };

  const renderListView = () => (
    <>
        <div className="p-4 bg-slate-800/50 border-b border-slate-800 text-sm text-slate-400 flex items-center gap-2">
            <Compass size={16} className="text-purple-400" />
            Showing only Open Exploration history.
        </div>

        {/* List */}
        <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {filteredHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    <p>No Open Exploration sessions found.</p>
                </div>
            ) : (
                filteredHistory.map((session) => (
                    <div 
                        key={session.id} 
                        onClick={() => { setSelectedSession(session); setReconstructionDetails(''); }}
                        className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center hover:bg-slate-800/80 hover:border-purple-500/30 transition-all cursor-pointer group active:scale-[0.99]"
                    >
                        {/* Type Icon */}
                        <div className="p-3 rounded-full shrink-0 bg-purple-900/20 text-purple-400">
                            <Compass size={20} />
                        </div>

                        {/* Details */}
                        <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-slate-300 font-bold">{session.coordinate}</span>
                                <span className="text-xs text-slate-500">• {new Date(session.timestamp).toLocaleDateString()}</span>
                                {session.targetIntent && (
                                    <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20 truncate max-w-[150px]">
                                        {session.targetIntent}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                                {session.generatedImageUrl ? (
                                    <span className="text-green-400 font-bold flex items-center gap-1"><Wand2 size={10}/> Visual Generated</span>
                                ) : (
                                    <span>No visualization</span>
                                )}
                                <span className="flex items-center gap-1"><Clock size={12}/> {formatTime(session.durationSeconds)}</span>
                            </div>
                        </div>

                        {/* Thumbnails */}
                        <div className="flex gap-2 shrink-0">
                            {session.generatedImageUrl ? (
                                <img src={session.generatedImageUrl} alt="Generated" className="w-12 h-12 rounded object-cover border border-purple-500/30 bg-black" />
                            ) : (
                                <div className="w-12 h-12 rounded border border-slate-700 bg-slate-900 flex items-center justify-center text-slate-600">
                                    <Wand2 size={16} />
                                </div>
                            )}
                            {session.userSketchBase64 ? (
                                <img src={session.userSketchBase64} alt="Sketch" className="w-12 h-12 rounded object-contain border border-slate-600 bg-white" />
                            ) : (
                                <div className="w-12 h-12 rounded border border-slate-700 bg-slate-900 flex items-center justify-center text-slate-600">
                                    <AlertCircle size={16} />
                                </div>
                            )}
                        </div>

                        {/* Action */}
                        <button 
                            onClick={(e) => handleDelete(session.id, e)}
                            disabled={deletingId === session.id}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors ml-auto md:ml-0"
                            title={t('deleteSession')}
                        >
                            {deletingId === session.id ? (
                                <span className="text-xs animate-pulse">...</span>
                            ) : (
                                <Trash2 size={18} />
                            )}
                        </button>
                    </div>
                ))
            )}
        </div>
    </>
  );

  const renderDetailView = () => {
    if (!selectedSession) return null;

    return (
        <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {/* Nav Back */}
            <button 
                onClick={() => setSelectedSession(null)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-2 transition-colors"
            >
                <ArrowLeft size={16} /> {t('backToList')}
            </button>

            {/* Header Info */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-mono font-bold text-white">{selectedSession.coordinate}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-900/50 text-purple-400 border border-purple-500/30">
                            OPEN EXPLORER
                        </span>
                    </div>
                    <div className="text-slate-400 text-sm flex gap-4">
                        <span>{new Date(selectedSession.timestamp).toLocaleString()}</span>
                        <span>Duration: {formatTime(selectedSession.durationSeconds)}</span>
                    </div>
                </div>
            </div>

            {/* Images Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Target / Generated Image */}
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Wand2 size={14} />
                        Visual Reconstruction
                    </h4>
                    <div className="aspect-[4/3] bg-black rounded-xl overflow-hidden border border-slate-700 relative group">
                        {selectedSession.generatedImageUrl ? (
                            <img src={selectedSession.generatedImageUrl} alt="Generated" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600 flex-col gap-2 p-6 text-center">
                                <Wand2 size={32} />
                                <span className="text-sm">No visualization generated yet.</span>
                            </div>
                        )}
                    </div>
                    {/* Open Mode Generation UI */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mt-2 space-y-3">
                        <label className="text-xs font-bold text-slate-400 block">{t('reconstructionDetails')}</label>
                        <input 
                            type="text"
                            value={reconstructionDetails}
                            onChange={(e) => setReconstructionDetails(e.target.value)}
                            placeholder="e.g. 'Red object on a table', 'Dark background'..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                        />
                        <button
                            onClick={handleGenerateImage}
                            disabled={isGenerating}
                            className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <ImagePlus size={16} />}
                            {selectedSession.generatedImageUrl ? 'Regenerate Visual' : 'Generate Visual'}
                        </button>
                    </div>
                </div>

                {/* User Sketch */}
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                         <Brain size={14} /> User Sketch
                    </h4>
                    <div className="aspect-[4/3] bg-white rounded-xl overflow-hidden border border-slate-700">
                        {selectedSession.userSketchBase64 ? (
                            <img src={selectedSession.userSketchBase64} alt="Sketch" className="w-full h-full object-contain" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">No sketch</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Notes & Feedback */}
            <div className="grid grid-cols-1 gap-6">
                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">User Notes</h4>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{selectedSession.userNotes || "No notes."}</p>
                </div>
                
                {/* AI Analysis Block */}
                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                     <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">AI Analysis</h4>
                        <button 
                            onClick={handleRegenerateAnalysis}
                            disabled={isAnalyzing}
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <RefreshCw size={12} className={isAnalyzing ? "animate-spin" : ""} />
                            {isAnalyzing ? t('analyzing') : t('regenerateAnalysis')}
                        </button>
                     </div>
                     {selectedSession.aiGuessedSubject ? (
                         <>
                            <div className="mb-2 text-white font-bold text-lg">"{selectedSession.aiGuessedSubject}"</div>
                            <p className="text-slate-300 text-sm whitespace-pre-wrap">{selectedSession.aiFeedback}</p>
                         </>
                     ) : (
                         <p className="text-slate-500 text-sm italic">Analysis not performed or failed.</p>
                     )}
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/90">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <Compass className="text-purple-400" />
            {t('logTitle')} <span className="text-slate-500 text-sm font-normal ml-2">(Open Explorer)</span>
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Area - Switch between List and Detail */}
        {selectedSession ? renderDetailView() : renderListView()}

      </div>
    </div>
  );
};

export default SessionLogModal;
