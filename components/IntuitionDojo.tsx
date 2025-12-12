
import React, { useState, useEffect } from 'react';
import { Circle, Square, Star, Waves, Plus, Trophy, Target, Zap, RotateCcw, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { IntuitionStats } from '../types';
import { updateIntuitionStats } from '../services/firebase';
import { auth } from '../services/firebase';

interface IntuitionDojoProps {
  onClose: () => void;
  initialStats: IntuitionStats | null;
  lockedMode?: boolean; // If true, user must achieve a target to exit
  isLoading?: boolean;
}

type CardType = 'circle' | 'square' | 'star' | 'waves' | 'cross';

const CARDS: { type: CardType; icon: React.FC<any>; color: string }[] = [
  { type: 'circle', icon: Circle, color: 'text-yellow-400' },
  { type: 'cross', icon: Plus, color: 'text-blue-400' },
  { type: 'waves', icon: Waves, color: 'text-green-400' },
  { type: 'square', icon: Square, color: 'text-red-400' },
  { type: 'star', icon: Star, color: 'text-purple-400' },
];

const TARGET_STREAK_TO_UNLOCK = 3;

const IntuitionDojo: React.FC<IntuitionDojoProps> = ({ onClose, initialStats, lockedMode = false, isLoading = false }) => {
  const { t } = useLanguage();
  
  // Game State
  const [targetCard, setTargetCard] = useState<CardType | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  
  // Stats
  const [stats, setStats] = useState<IntuitionStats>(initialStats || {
    totalGuesses: 0,
    correctGuesses: 0,
    currentStreak: 0,
    bestStreak: 0
  });

  // Sync state if initialStats arrives late (e.g. from network load)
  useEffect(() => {
    if (initialStats) {
      setStats(initialStats);
    }
  }, [initialStats]);

  // Pick a new random target on mount/reset
  useEffect(() => {
    pickNewTarget();
  }, []);

  // Check for unlock condition
  useEffect(() => {
    if (lockedMode && stats.currentStreak >= TARGET_STREAK_TO_UNLOCK) {
      setUnlocked(true);
    }
  }, [stats.currentStreak, lockedMode]);

  const pickNewTarget = () => {
    const random = Math.floor(Math.random() * CARDS.length);
    setTargetCard(CARDS[random].type);
    setSelectedCard(null);
    setIsRevealed(false);
  };

  const handleGuess = (card: CardType) => {
    if (isRevealed || !targetCard || isLoading) return;
    
    setSelectedCard(card);
    setIsRevealed(true);

    const isCorrect = card === targetCard;
    const newStats = { ...stats };

    newStats.totalGuesses += 1;
    if (isCorrect) {
      newStats.correctGuesses += 1;
      newStats.currentStreak += 1;
      if (newStats.currentStreak > newStats.bestStreak) {
        newStats.bestStreak = newStats.currentStreak;
      }
    } else {
      newStats.currentStreak = 0;
    }

    setStats(newStats);

    // Sync to Cloud if logged in
    if (auth.currentUser) {
      updateIntuitionStats(auth.currentUser.uid, newStats);
    }

    // Auto reset after delay
    setTimeout(() => {
      pickNewTarget();
    }, 2000);
  };

  const handleExit = () => {
    // Reset streak to 0 when exiting the Dojo session
    // This ensures that "current streak" represents the active session performance
    const resetStats = { ...stats, currentStreak: 0 };
    setStats(resetStats);
    
    if (auth.currentUser) {
      updateIntuitionStats(auth.currentUser.uid, resetStats);
    }
    
    onClose();
  };

  const accuracy = stats.totalGuesses > 0 
    ? Math.round((stats.correctGuesses / stats.totalGuesses) * 100) 
    : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-4xl mx-auto p-4">
        <Loader2 className="animate-spin w-12 h-12 text-blue-500 mb-4" />
        <p className="text-slate-400 font-medium tracking-wide animate-pulse">SYNCING DOJO DATA...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-4xl mx-auto p-4 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="text-center mb-8 relative">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
          {t('dojoTitle')}
        </h2>
        <p className="text-slate-400">{t('dojoDesc')}</p>
        
        {lockedMode && (
          <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full border ${unlocked ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-red-900/30 border-red-500 text-red-400 animate-pulse'}`}>
            {unlocked ? <CheckCircle2 size={16} /> : <Lock size={16} />}
            <span className="text-sm font-bold">
              {unlocked ? t('dojoUnlockedMsg') : `${t('dojoLockedMsg')} (${stats.currentStreak}/${TARGET_STREAK_TO_UNLOCK})`}
            </span>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap justify-center gap-4 mb-12 w-full">
        <div className="bg-slate-800/50 px-6 py-3 rounded-2xl border border-slate-700 flex items-center gap-3">
          <Zap className="text-yellow-400" size={20} />
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase">{t('streak')}</div>
            <div className="text-xl font-bold text-white">{stats.currentStreak}</div>
          </div>
        </div>
        
        <div className="bg-slate-800/50 px-6 py-3 rounded-2xl border border-slate-700 flex items-center gap-3">
          <Trophy className="text-purple-400" size={20} />
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase">{t('bestStreak')}</div>
            <div className="text-xl font-bold text-white">{stats.bestStreak}</div>
          </div>
        </div>

        <div className="bg-slate-800/50 px-6 py-3 rounded-2xl border border-slate-700 flex items-center gap-3">
          <Target className="text-blue-400" size={20} />
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase">{t('accuracy')}</div>
            <div className={`text-xl font-bold ${accuracy > 25 ? 'text-green-400' : 'text-white'}`}>
              {accuracy}% <span className="text-xs text-slate-500 font-normal">/ {t('chance')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="relative w-full max-w-2xl aspect-[2/1] bg-slate-900/50 rounded-3xl border border-slate-800 flex items-center justify-center mb-8 p-8 shadow-inner">
        
        {/* The Hidden Card (Visual Feedback) */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 transform ${isRevealed ? 'scale-110' : 'scale-90 opacity-50'}`}>
          {isRevealed && targetCard ? (
            <div className={`text-9xl animate-in zoom-in spin-in-180 duration-500 ${CARDS.find(c => c.type === targetCard)?.color}`}>
              {React.createElement(CARDS.find(c => c.type === targetCard)!.icon, { size: 120, strokeWidth: 1.5 })}
            </div>
          ) : (
            <div className="w-32 h-40 bg-slate-800 rounded-xl border-2 border-slate-700 flex items-center justify-center">
              <span className="text-6xl text-slate-700 font-serif">?</span>
            </div>
          )}
        </div>

        {/* Result Message */}
        {isRevealed && (
          <div className="absolute top-4 left-0 w-full text-center animate-in slide-in-from-bottom-4">
             <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest ${selectedCard === targetCard ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
               {selectedCard === targetCard ? 'CORRECT' : 'MISS'}
             </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-5 gap-4 w-full max-w-2xl">
        {CARDS.map((card) => (
          <button
            key={card.type}
            onClick={() => handleGuess(card.type)}
            disabled={isRevealed}
            className={`
              aspect-square rounded-xl flex flex-col items-center justify-center gap-2 border transition-all duration-200
              ${isRevealed && card.type === targetCard ? 'bg-green-500/20 border-green-500 ring-2 ring-green-500' : ''}
              ${isRevealed && selectedCard === card.type && selectedCard !== targetCard ? 'bg-red-500/20 border-red-500' : ''}
              ${!isRevealed ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:scale-105 active:scale-95 cursor-pointer' : 'opacity-50 cursor-default'}
            `}
          >
            <card.icon size={32} className={card.color} />
            <span className="text-[10px] uppercase font-bold text-slate-400 hidden sm:block">{t(`card${card.type.charAt(0).toUpperCase() + card.type.slice(1)}`)}</span>
          </button>
        ))}
      </div>

      <button 
        onClick={handleExit}
        disabled={lockedMode && !unlocked}
        className={`mt-12 flex items-center gap-2 transition-all active:scale-95 ${lockedMode && !unlocked ? 'text-slate-700 cursor-not-allowed' : 'text-slate-500 hover:text-white'}`}
      >
        {lockedMode && !unlocked ? <Lock size={16} /> : <RotateCcw size={16} />}
        {t('exitDojo')}
      </button>

    </div>
  );
};

export default IntuitionDojo;
