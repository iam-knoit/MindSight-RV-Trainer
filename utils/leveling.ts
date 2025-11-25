
import { SessionData } from '../types';
import { Sprout, Feather, BookOpen, Eye, Activity, Radio, ShieldCheck, Zap, Crown, User as UserIcon } from 'lucide-react';

export const calculateLevel = (sessions: SessionData[]) => {
  // Filter for COMPLETED TRAINING sessions only
  // This ensures Open sessions or incomplete data don't affect the Rank/Stats
  const validSessions = sessions.filter(s => 
    s.aiScore !== undefined && 
    s.sessionType === 'TRAINING'
  );
  
  if (validSessions.length === 0) {
    return { level: 1, title: 'lvl1', division: null, progress: 0, nextThreshold: 20, avgScore: 0 };
  }
  
  const avgScore = Math.round(validSessions.reduce((acc, s) => acc + (s.aiScore || 0), 0) / validSessions.length);

  let level = 1;
  let title = 'lvl1';
  let division: 'I' | 'II' | 'III' | null = null;
  let minScore = 0;
  let maxScore = 100;

  if (avgScore < 20) {
     level = 1; title = 'lvl1'; division = null; minScore = 0; maxScore = 20;
  } else if (avgScore >= 90) {
     level = 9; title = 'lvl9'; division = null; minScore = 90; maxScore = 100;
  } else {
     // Levels 2-8
     level = Math.floor((avgScore - 20) / 10) + 2;
     
     // Correctly define title based on calculated level
     title = `lvl${level}`;
     
     const baseLevelScore = 20 + (level - 2) * 10;
     const relativeScore = avgScore - baseLevelScore;
     
     if (relativeScore <= 3) division = 'I';
     else if (relativeScore <= 6) division = 'II';
     else division = 'III';

     minScore = baseLevelScore;
     maxScore = baseLevelScore + 10;
  }

  const totalRange = maxScore - minScore;
  const currentProgress = avgScore - minScore;
  const progressPercent = Math.min(100, Math.max(0, (currentProgress / totalRange) * 100));

  return { level, title, division, progress: progressPercent, nextThreshold: maxScore, avgScore };
};

export const getRankStyle = (level: number) => {
  switch(level) {
    case 1: return { icon: Sprout, color: 'text-slate-400', text: 'text-slate-200', border: 'border-slate-500/30', bg: 'bg-slate-500/10', gradient: 'from-slate-800 to-slate-900', shadow: 'shadow-slate-900/50' };
    case 2: return { icon: Feather, color: 'text-zinc-400', text: 'text-zinc-200', border: 'border-zinc-500/30', bg: 'bg-zinc-500/10', gradient: 'from-zinc-800 to-zinc-900', shadow: 'shadow-zinc-900/50' };
    case 3: return { icon: BookOpen, color: 'text-sky-400', text: 'text-sky-200', border: 'border-sky-500/30', bg: 'bg-sky-500/10', gradient: 'from-sky-900 to-slate-900', shadow: 'shadow-sky-900/50' };
    case 4: return { icon: Eye, color: 'text-cyan-400', text: 'text-cyan-200', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', gradient: 'from-cyan-900 to-slate-900', shadow: 'shadow-cyan-900/50' };
    case 5: return { icon: Activity, color: 'text-teal-400', text: 'text-teal-200', border: 'border-teal-500/30', bg: 'bg-teal-500/10', gradient: 'from-teal-900 to-slate-900', shadow: 'shadow-teal-900/50' };
    case 6: return { icon: Radio, color: 'text-green-400', text: 'text-green-200', border: 'border-green-500/30', bg: 'bg-green-500/10', gradient: 'from-green-900 to-slate-900', shadow: 'shadow-green-900/50' };
    case 7: return { icon: ShieldCheck, color: 'text-amber-400', text: 'text-amber-200', border: 'border-amber-500/30', bg: 'bg-amber-500/10', gradient: 'from-amber-900 to-slate-900', shadow: 'shadow-amber-900/50' };
    case 8: return { icon: Zap, color: 'text-orange-400', text: 'text-orange-200', border: 'border-orange-500/30', bg: 'bg-orange-500/10', gradient: 'from-orange-900 to-red-900', shadow: 'shadow-orange-900/50' };
    case 9: return { icon: Crown, color: 'text-purple-400', text: 'text-purple-200', border: 'border-purple-500/50', bg: 'bg-purple-500/10', gradient: 'from-purple-900 to-fuchsia-900', shadow: 'shadow-purple-900/50' };
    default: return { icon: UserIcon, color: 'text-slate-400', text: 'text-slate-200', border: 'border-slate-700', bg: 'bg-slate-800', gradient: 'from-slate-800 to-slate-900', shadow: 'shadow-slate-900' };
  }
};
