import React from 'react';
import { X, TrendingUp, Trophy, Clock, Activity, Target, Map } from 'lucide-react';
import { SessionData, CoachReport } from '../types';
import HistoryChart from './HistoryChart';
import { useLanguage } from '../contexts/LanguageContext';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SessionData[];
  coachReport: CoachReport | null;
}

const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ isOpen, onClose, history, coachReport }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  // Calculate Stats
  const totalSessions = history.length;
  const avgScore = totalSessions > 0 
    ? Math.round(history.reduce((acc, s) => acc + s.aiScore, 0) / totalSessions) 
    : 0;
  const bestScore = totalSessions > 0 
    ? Math.max(...history.map(s => s.aiScore)) 
    : 0;
  const totalSeconds = history.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/90">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="text-blue-400" />
            {t('analyticsTitle')}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col items-center text-center">
               <Target className="text-blue-400 mb-2" size={24} />
               <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">{t('totalSessions')}</span>
               <span className="text-2xl font-bold text-white">{totalSessions}</span>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col items-center text-center">
               <TrendingUp className="text-green-400 mb-2" size={24} />
               <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">{t('avgScore')}</span>
               <span className="text-2xl font-bold text-white">{avgScore}%</span>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col items-center text-center">
               <Trophy className="text-yellow-400 mb-2" size={24} />
               <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">{t('bestScore')}</span>
               <span className="text-2xl font-bold text-white">{bestScore}%</span>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col items-center text-center">
               <Clock className="text-purple-400 mb-2" size={24} />
               <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">{t('totalTime')}</span>
               <span className="text-2xl font-bold text-white">{formatDuration(totalSeconds)}</span>
            </div>
          </div>

          {/* Big Chart */}
          <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-800">
            <HistoryChart sessions={history} />
          </div>

          {/* Future Steps (AI Generated) */}
          {coachReport && coachReport.futureSteps && (
            <div className="space-y-4">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <Map className="text-cyan-400" />
                 {t('futureSteps')}
               </h3>
               <p className="text-slate-400 text-sm">{t('futureStepsDesc')}</p>

               <div className="grid gap-4 md:grid-cols-3">
                  {coachReport.futureSteps.map((step, idx) => (
                    <div key={idx} className="bg-slate-800/30 border border-slate-700 p-5 rounded-xl relative overflow-hidden hover:border-blue-500/50 transition-colors group">
                       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                       <div className="text-4xl font-bold text-slate-700 mb-2 absolute right-4 bottom-2 opacity-20 group-hover:opacity-40 pointer-events-none">
                         {idx + 1}
                       </div>
                       <h4 className="text-blue-200 font-semibold mb-1">Step {idx + 1}</h4>
                       <p className="text-slate-300 text-sm leading-relaxed">{step}</p>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {!coachReport && totalSessions >= 3 && (
             <div className="text-center p-8 border border-dashed border-slate-700 rounded-xl text-slate-500">
                Click "Generate AI Coach Report" on the dashboard to see your Future Training Path.
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsModal;