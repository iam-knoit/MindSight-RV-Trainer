
import React from 'react';
import { X, TrendingUp, Trophy, Clock, Activity, Target, Zap, ArrowRightCircle, Award, Lightbulb, Map, Lock, Check, Circle } from 'lucide-react';
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

  // Re-calculate Level for display (Logic copied to be self-contained in modal)
  const calculateLevel = (score: number) => {
    if (score < 20) return 1;
    if (score >= 90) return 9;
    return Math.floor((score - 20) / 10) + 2;
  };

  const currentLevel = calculateLevel(avgScore);
  const capabilityKey = `cap_lvl${currentLevel}`;

  // Helper for Level Ranges display
  const getLevelRange = (lvl: number) => {
    if (lvl === 1) return "0% - 19%";
    if (lvl === 9) return "90% - 100%";
    const base = 20 + (lvl - 2) * 10;
    return `${base}% - ${base + 9}%`;
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

          {/* Current Capabilities */}
          <div className="space-y-4">
             <h3 className="text-xl font-bold text-white flex items-center gap-2">
               <Award className="text-yellow-500" />
               {t('currentCapabilities')}
             </h3>
             <p className="text-slate-400 text-sm">{t('currentCapabilitiesDesc')}</p>

             <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8 rounded-2xl relative overflow-hidden group shadow-lg">
                 <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Lightbulb size={120} />
                 </div>
                 
                 <div className="relative z-10 flex flex-col md:flex-row items-start gap-6">
                    <div className="bg-yellow-500/20 rounded-full p-4 border border-yellow-500/30">
                        <Award size={32} className="text-yellow-500" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-yellow-500 mb-2 uppercase tracking-wide">
                          {t(`lvl${currentLevel}`)}
                        </h4>
                        <p className="text-lg text-slate-200 leading-relaxed">
                          "{t(capabilityKey)}"
                        </p>
                    </div>
                 </div>
             </div>
          </div>

          {/* Level Roadmap */}
          <div className="space-y-4">
             <h3 className="text-xl font-bold text-white flex items-center gap-2 mt-8 mb-4">
               <Map className="text-blue-400" />
               {t('rankRoadmap')}
             </h3>
             
             <div className="relative border-l-2 border-slate-800 ml-4 pl-8 space-y-8">
               {Array.from({ length: 9 }).map((_, i) => {
                 const level = i + 1;
                 const isPassed = level < currentLevel;
                 const isCurrent = level === currentLevel;
                 const isFuture = level > currentLevel;

                 return (
                   <div key={level} className={`relative transition-all duration-300 ${isCurrent ? 'scale-105' : 'opacity-80'}`}>
                     {/* Node Indicator */}
                     <div className={`absolute -left-[41px] top-1 w-6 h-6 rounded-full border-4 flex items-center justify-center
                       ${isPassed ? 'bg-green-500 border-green-500 text-slate-900' : ''}
                       ${isCurrent ? 'bg-slate-900 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : ''}
                       ${isFuture ? 'bg-slate-900 border-slate-700' : ''}
                     `}>
                       {isPassed && <Check size={12} strokeWidth={4} />}
                       {isCurrent && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                       {isFuture && <Lock size={10} className="text-slate-600" />}
                     </div>

                     {/* Content */}
                     <div className={`p-4 rounded-xl border transition-colors 
                       ${isCurrent ? 'bg-blue-900/10 border-blue-500/50' : 'bg-slate-800/30 border-slate-800'}
                       ${isFuture ? 'opacity-50' : 'opacity-100'}
                     `}>
                       <div className="flex justify-between items-center mb-1">
                         <h4 className={`text-sm font-bold uppercase tracking-wide 
                           ${isPassed ? 'text-green-500' : isCurrent ? 'text-blue-400' : 'text-slate-500'}
                         `}>
                           {t('level')} {level}: {t(`lvl${level}`)}
                         </h4>
                         <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded">
                           {getLevelRange(level)}
                         </span>
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AnalyticsModal;
