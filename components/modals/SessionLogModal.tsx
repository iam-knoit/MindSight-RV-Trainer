
import React, { useState } from 'react';
import { X, Trash2, Calendar, Clock, Target, Compass, Brain, Filter, AlertCircle, ArrowLeft, ImagePlus, Wand2, Loader2, Save } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SessionData } from '../../types';
import { generateVisualReconstruction } from '../../services/geminiService';

interface SessionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SessionData[];
  onDeleteSession: (sessionId: string) => Promise<void>;
  onUpdateSession: (sessionId: string, data: Partial<SessionData>) => Promise<void>;
}

const SessionLogModal: React.FC<SessionLogModalProps> = ({ isOpen, onClose, history, onDeleteSession, onUpdateSession }) => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<'ALL' | 'TRAINING' | 'OPEN'>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  
  // States for Open Mode Generation
  const [reconstructionDetails, setReconstructionDetails] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  // Sort by newest first
  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);
  
  const filteredHistory = sortedHistory.filter(s => {
    if (filter === 'ALL') return true;
    return s.sessionType === filter;
  });

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

  const formatTime = (seconds?: number) => {
      if (!seconds) return '--';
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}m ${s}s`;
  };

  const renderListView = () => (
    <>
        {/* Filters */}
        <div className="p-4 bg-slate-800/50 flex gap-2 border-b border-slate-800">
            <Filter size={16} className="text-slate-500 my-auto ml-2" />
            <button 
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
                ALL
            </button>
            <button 
                onClick={() => setFilter('TRAINING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'TRAINING' ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
                TRAINING
            </button>
            <button 
                onClick={() => setFilter('OPEN')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'OPEN' ? 'bg-purple-900/30 text-purple-400 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
                OPEN EXPLORER
            </button>
        </div>

        {/* List */}
        <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {filteredHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    <p>No sessions found.</p>
                </div>
            ) : (
                filteredHistory.map((session) => (
                    <div 
                        key={session.id} 
                        onClick={() => { setSelectedSession(session); setReconstructionDetails(''); }}
                        className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center hover:bg-slate-800/80 hover:border-blue-500/30 transition-all cursor-pointer group active:scale-[0.99]"
                    >
                        {/* Type Icon */}
                        <div className={`p-3 rounded-full shrink-0 ${session.sessionType === 'TRAINING' ? 'bg-blue-900/20 text-blue-400' : 'bg-purple-900/20 text-purple-400'}`}>
                            {session.sessionType === 'TRAINING' ? <Brain size={20} /> : <Compass size={20} />}
                        </div>

                        {/* Details */}
                        <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-slate-300 font-bold">{session.coordinate}</span>
                                <span className="text-xs text-slate-500">• {new Date(session.timestamp).toLocaleDateString()}</span>
                                {session.sessionType === 'OPEN' && session.targetIntent && (
                                    <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20 truncate max-w-[150px]">
                                        {session.targetIntent}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                                {session.aiScore !== undefined ? (
                                    <span className={`font-bold ${session.aiScore >= 70 ? 'text-green-400' : session.aiScore < 50 ? 'text-red-400' : 'text-yellow-400'}`}>
                                        Score: {session.aiScore}%
                                    </span>
                                ) : (
                                    <span>No Score</span>
                                )}
                                <span className="flex items-center gap-1"><Clock size={12}/> {formatTime(session.durationSeconds)}</span>
                            </div>
                        </div>

                        {/* Thumbnails */}
                        <div className="flex gap-2 shrink-0">
                            {session.targetImageUrl ? (
                                <img src={session.targetImageUrl} alt="Target" className="w-12 h-12 rounded object-cover border border-slate-600 bg-slate-900" />
                            ) : (
                                <div className="w-12 h-12 rounded border border-slate-700 bg-slate-900 flex items-center justify-center text-slate-600">
                                    <Target size={16} />
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
    const isTraining = selectedSession.sessionType === 'TRAINING';
    const isOpen = selectedSession.sessionType === 'OPEN';

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
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${isTraining ? 'bg-blue-900/50 text-blue-400 border border-blue-500/30' : 'bg-purple-900/50 text-purple-400 border border-purple-500/30'}`}>
                            {isTraining ? 'TRAINING' : 'OPEN EXPLORER'}
                        </span>
                    </div>
                    <div className="text-slate-400 text-sm flex gap-4">
                        <span>{new Date(selectedSession.timestamp).toLocaleString()}</span>
                        <span>Duration: {formatTime(selectedSession.durationSeconds)}</span>
                    </div>
                </div>
                {isTraining && (
                    <div className="text-right">
                         <div className="text-xs text-slate-500 uppercase font-bold">Score</div>
                         <div className={`text-3xl font-bold ${selectedSession.aiScore! >= 70 ? 'text-green-400' : 'text-slate-200'}`}>
                             {selectedSession.aiScore}%
                         </div>
                    </div>
                )}
            </div>

            {/* Images Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Target / Generated Image */}
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        {isTraining ? <Target size={14} /> : <Wand2 size={14} />}
                        {isTraining ? 'Blind Target' : 'Visual Reconstruction'}
                    </h4>
                    <div className="aspect-[4/3] bg-black rounded-xl overflow-hidden border border-slate-700 relative group">
                        {isTraining && selectedSession.targetImageUrl ? (
                            <img src={selectedSession.targetImageUrl} alt="Target" className="w-full h-full object-cover" />
                        ) : isOpen && selectedSession.generatedImageUrl ? (
                            <img src={selectedSession.generatedImageUrl} alt="Generated" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600 flex-col gap-2 p-6 text-center">
                                {isOpen ? <Wand2 size={32} /> : <Target size={32} />}
                                <span className="text-sm">{isOpen ? 'No visualization generated yet.' : 'Image not available'}</span>
                            </div>
                        )}
                    </div>
                    {/* Open Mode Generation UI */}
                    {isOpen && (
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
                    )}
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
                {selectedSession.aiFeedback && (
                    <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                         <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">AI Analysis</h4>
                         <p className="text-slate-300 text-sm whitespace-pre-wrap">{selectedSession.aiFeedback}</p>
                    </div>
                )}
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
            <Calendar className="text-blue-400" />
            {t('logTitle')}
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
