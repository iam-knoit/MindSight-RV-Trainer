
import React, { useState } from 'react';
import { X, Trash2, Calendar, Clock, Target, Compass, Brain, Filter, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SessionData } from '../../types';

interface SessionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SessionData[];
  onDeleteSession: (sessionId: string) => Promise<void>;
}

const SessionLogModal: React.FC<SessionLogModalProps> = ({ isOpen, onClose, history, onDeleteSession }) => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<'ALL' | 'TRAINING' | 'OPEN'>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Sort by newest first
  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);
  
  const filteredHistory = sortedHistory.filter(s => {
    if (filter === 'ALL') return true;
    return s.sessionType === filter;
  });

  const handleDelete = async (id: string) => {
    if (window.confirm(t('confirmDelete'))) {
      setDeletingId(id);
      await onDeleteSession(id);
      setDeletingId(null);
    }
  };

  const formatTime = (seconds?: number) => {
      if (!seconds) return '--';
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}m ${s}s`;
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
                    <div key={session.id} className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center hover:bg-slate-800/60 transition-colors group">
                        
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
                            onClick={() => handleDelete(session.id)}
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

      </div>
    </div>
  );
};

export default SessionLogModal;
