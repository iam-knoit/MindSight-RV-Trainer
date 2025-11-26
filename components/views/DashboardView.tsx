
import React from 'react';
import { Brain, Play, User as UserIcon, Zap, History, BarChart3, MessageSquareText, Clock, TrendingUp, RefreshCw, Check, XCircle, Lightbulb, FileClock, Target, Lock, PenTool } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SessionData, CoachReport } from '../../types';
import HistoryChart from '../HistoryChart';
import { calculateLevel, getRankStyle } from '../../utils/leveling';
import { User } from 'firebase/auth';

interface DashboardViewProps {
  user: User | null;
  history: SessionData[];
  coachReport: CoachReport | null;
  isLoading: boolean;
  loadingMessage: string;
  analyzingHistory: boolean;
  onShowAuth: () => void;
  onShowModeSelection: () => void;
  onShowAnalytics: () => void;
  onShowChat: () => void;
  onRunCoachAnalysis: () => void;
  onEnterDojo: () => void;
  onEnterDrawingDojo: () => void;
  onShowSessionLog: () => void;
  isHistoryLoaded: boolean;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
  user, history, coachReport, isLoading, loadingMessage, analyzingHistory,
  onShowAuth, onShowModeSelection, onShowAnalytics, onShowChat, onRunCoachAnalysis, onEnterDojo, onEnterDrawingDojo, onShowSessionLog, isHistoryLoaded
}) => {
  const { t } = useLanguage();
  
  // Strict filter for Performance Stats: Only Training sessions
  const trainingHistory = history.filter(s => s.sessionType === 'TRAINING' && s.aiScore !== undefined);
  const totalTrainingSeconds = trainingHistory.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);
  const trainingCount = trainingHistory.length;
  const isUnlocked = trainingCount >= 3;
  
  const currentRank = calculateLevel(history); // calculateLevel now filters for TRAINING internally and sets isRanked
  const rankStyle = getRankStyle(currentRank.level);
  const RankIcon = rankStyle.icon;

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
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 w-full max-w-5xl mx-auto relative">
      <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700 mb-12">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-8 mx-auto border border-slate-700 relative group">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl group-hover:bg-blue-500/30 transition-all"></div>
          <Brain className="text-blue-400 w-12 h-12" />
        </div>
        
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {user ? `${t('welcomeBack')}, ${user.displayName ? user.displayName.split(' ')[0] : t('viewer')}` : t('readyToTrain')}
        </h2>
        <p className="text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
          {user ? t('introAuth') : t('introGuest')}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            {user ? (
            <button
                type="button"
                onClick={onShowModeSelection}
                disabled={isLoading}
                className="group relative px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.6)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                <RefreshCw className="animate-spin" />
                ) : (
                <Play className="fill-white" size={20} />
                )}
                {isLoading ? loadingMessage : t('startSession')}
            </button>
            ) : (
            <button
                type="button"
                onClick={onShowAuth}
                className="px-8 py-4 bg-white text-slate-900 hover:bg-slate-200 font-bold rounded-xl transition-all flex items-center justify-center gap-3"
            >
                <UserIcon size={20} />
                {t('signInRegister')}
            </button>
            )}

            {/* Dojo Buttons */}
            {user && (
                <>
                  <button
                      onClick={onEnterDojo}
                      className="px-6 py-4 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 hover:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3"
                  >
                      <Zap size={20} />
                      {t('intuitionDojo')}
                  </button>
                  
                  <button
                      onClick={onEnterDrawingDojo}
                      className="px-6 py-4 bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-500/30 text-cyan-200 hover:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3"
                  >
                      <PenTool size={20} />
                      {t('drawingDojo')}
                  </button>
                </>
            )}
        </div>
      </div>

      {user && !isHistoryLoaded && (
        <div className="w-full flex flex-col items-center justify-center py-12 animate-in fade-in duration-500">
           <RefreshCw className="animate-spin text-slate-600 mb-3" size={24} />
           <p className="text-xs font-bold text-slate-600 tracking-widest uppercase">Syncing Profile Data...</p>
        </div>
      )}

      {user && isHistoryLoaded && history.length > 0 && (
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-1000 delay-200">
          <div className="lg:col-span-2 bg-slate-900/50 rounded-2xl border border-slate-800 p-6 relative flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h3 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
                <History size={18} /> {t('historyTitle')}
              </h3>
              <div className="flex gap-2 flex-wrap">
                 <button 
                    onClick={onShowSessionLog}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700 transition-all flex items-center gap-2"
                 >
                    <FileClock size={12} />
                    {t('sessionLog')}
                 </button>
                 <button 
                    onClick={isUnlocked ? onShowAnalytics : undefined}
                    disabled={!isUnlocked}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-2
                        ${isUnlocked 
                            ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' 
                            : 'bg-slate-800/50 text-slate-600 border-slate-800 cursor-not-allowed'}
                    `}
                    title={!isUnlocked ? t('aiCoachUnlock') : ''}
                 >
                    <BarChart3 size={12} />
                    {t('viewAnalytics')}
                    {!isUnlocked && <Lock size={10} />}
                 </button>
                 <button 
                   onClick={isUnlocked ? onShowChat : undefined}
                   disabled={!isUnlocked}
                   className={`text-xs px-3 py-1.5 rounded-full transition-all flex items-center gap-2
                      ${isUnlocked
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                          : 'bg-slate-800 text-slate-600 cursor-not-allowed'}
                   `}
                   title={!isUnlocked ? t('aiCoachUnlock') : ''}
                 >
                   <MessageSquareText size={12} />
                   {t('openChat')}
                   {!isUnlocked && <Lock size={10} />}
                 </button>
              </div>
            </div>
            {/* History Chart handles filtering internally now, but we can rely on it to show training only */}
            <HistoryChart sessions={history} />
            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                <Clock size={14} />
                <span>{t('totalTime')}:</span>
                <span className="text-blue-400 font-bold">{formatDuration(totalTrainingSeconds)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
              {/* RANK CARD */}
              {!currentRank.isRanked ? (
                 <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 flex flex-col shadow-xl flex-grow justify-center items-center text-center">
                    <div className="p-4 bg-slate-800/80 rounded-full mb-4 relative">
                        <Target className="text-slate-400" size={32} />
                        <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
                    </div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-2">{t('rankLocked')}</h4>
                    <p className="text-slate-400 text-xs mb-4 max-w-[200px] leading-relaxed">
                        {t('rankLockedDesc')}
                    </p>
                    <div className="w-full max-w-[150px] h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${(trainingCount / 3) * 100}%` }}></div>
                    </div>
                    <p className="text-[10px] text-blue-400 font-mono mt-2 uppercase font-bold">
                        {t('session')} {trainingCount} / 3
                    </p>
                 </div>
              ) : (
                <div className={`bg-gradient-to-br ${rankStyle.gradient} rounded-2xl border ${rankStyle.border} p-6 flex flex-col shadow-xl`}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h4 className={`text-xs font-bold uppercase tracking-widest mb-1 ${rankStyle.text}`}>{t('currentRank')}</h4>
                            <div className="text-2xl font-bold text-white flex items-center gap-2">
                                <RankIcon className={rankStyle.color} />
                                {t(currentRank.title)} <span className="text-white/60 text-lg">{currentRank.division}</span>
                            </div>
                            <div className={`text-xs mt-1 ${rankStyle.text} opacity-80`}>
                                {t('level')} {currentRank.level} • {t('avgScore')}: {currentRank.avgScore}%
                            </div>
                        </div>
                        <RankIcon size={40} className={`${rankStyle.text} opacity-20`} />
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-2">
                        <div className={`flex justify-between text-[10px] uppercase font-bold mb-1 ${rankStyle.text} opacity-70`}>
                            <span>{t('division')} {currentRank.division || 'I'}</span>
                            <span>{t('nextRank')}</span>
                        </div>
                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/10">
                            <div 
                                className={`h-full bg-white transition-all duration-1000 ease-out`}
                                style={{ width: `${currentRank.progress}%` }}
                            />
                        </div>
                    </div>
                </div>
              )}

              {/* AI COACH CARD */}
              <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 flex flex-col flex-grow">
                {coachReport ? (
                <div className="space-y-4 animate-in slide-in-from-right duration-500">
                    <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold uppercase text-xs tracking-widest">
                        <Brain size={14} /> {t('coachReport')}
                    </div>
                    <button 
                        onClick={onRunCoachAnalysis} 
                        disabled={analyzingHistory}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                        title={t('regenerateReport')}
                    >
                        <RefreshCw size={12} className={analyzingHistory ? "animate-spin" : ""} />
                        {analyzingHistory ? t('analyzing') : t('regenerateReport')}
                    </button>
                    </div>
                    <p className="text-sm text-slate-300 italic">"{coachReport.trendSummary}"</p>
                    <div className="space-y-3 mt-4">
                    <div className="bg-green-900/10 border border-green-900/30 rounded-lg p-3">
                        <h4 className="text-green-400 text-xs font-bold mb-2 flex items-center gap-1"><Check size={12}/> {t('strengths')}</h4>
                        <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                            {coachReport.strengths.map((s,i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                    <div className="bg-red-900/10 border border-red-900/30 rounded-lg p-3">
                        <h4 className="text-red-400 text-xs font-bold mb-2 flex items-center gap-1"><XCircle size={12}/> {t('weaknesses')}</h4>
                        <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                            {coachReport.weaknesses.map((s,i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-800">
                    <h4 className="text-blue-400 text-xs font-bold mb-2 flex items-center gap-1"><Lightbulb size={12}/> {t('tip')}</h4>
                    <p className="text-xs text-slate-400">{coachReport.trainingTips[0]}</p>
                    </div>
                </div>
                ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-4 text-slate-500">
                    <TrendingUp size={32} className="opacity-20" />
                    <div>
                        <p className="text-sm font-semibold">{t('aiCoachReady')}</p>
                        <p className="text-xs mt-1 max-w-[200px]">{t('aiCoachUnlock')}</p>
                    </div>
                    {isUnlocked && (
                        <button 
                        onClick={onRunCoachAnalysis}
                        disabled={analyzingHistory} 
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                        {analyzingHistory ? t('analyzing') : t('generateReport')}
                        </button>
                    )}
                </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
