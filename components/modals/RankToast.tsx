import React, { useEffect, useState } from 'react';
import { X, Trophy, Sparkles, Star, Crown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getRankStyle } from '../../utils/leveling';

interface RankToastProps {
  level: number;
  title: string;
  division: string | null;
  onClose: () => void;
  isCalibrationComplete: boolean;
}

const RankToast: React.FC<RankToastProps> = ({ level, title, division, onClose, isCalibrationComplete }) => {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const rankStyle = getRankStyle(level);
  const RankIcon = rankStyle.icon;

  useEffect(() => {
    // Small delay to allow animation in
    const timer = setTimeout(() => setVisible(true), 100);
    // Auto dismiss after 6 seconds
    const dismiss = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 500); // Wait for exit animation
    }, 6000);
    return () => { clearTimeout(timer); clearTimeout(dismiss); };
  }, [onClose]);

  const handleClose = () => {
      setVisible(false);
      setTimeout(onClose, 500);
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-end justify-center sm:items-center pointer-events-none p-4 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* Backdrop for fireworks effect (optional, kept subtle) */}
      {visible && (
         <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-1000"></div>
      )}

      <div className={`
        pointer-events-auto relative w-full max-w-sm bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl overflow-hidden
        transform transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1)
        ${visible ? 'translate-y-0 scale-100' : 'translate-y-20 scale-90'}
        ${rankStyle.shadow}
      `}>
        {/* Glow Background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${rankStyle.gradient} opacity-20`}></div>
        
        {/* Close Button */}
        <button 
            onClick={handleClose}
            className="absolute top-2 right-2 p-2 text-slate-500 hover:text-white transition-colors z-20"
        >
            <X size={20} />
        </button>

        <div className="relative z-10 p-6 flex flex-col items-center text-center">
            
            {/* Animated Icon */}
            <div className="relative mb-4">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
                <div className={`relative w-20 h-20 rounded-full ${rankStyle.bg} border-2 ${rankStyle.border} flex items-center justify-center shadow-lg`}>
                    <RankIcon size={40} className={rankStyle.color} />
                </div>
                {/* Confetti Icons */}
                <Sparkles className="absolute -top-2 -right-4 text-yellow-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
                <Star className="absolute -bottom-1 -left-4 text-blue-400 animate-pulse" style={{ animationDelay: '0.3s' }} size={16} />
            </div>

            {/* Title */}
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
                {isCalibrationComplete ? t('calibrationComplete') : t('rankPromoted')}
            </h3>
            
            <div className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
                <span className={rankStyle.color}>{t(title)}</span>
                {division && <span className="text-xl text-slate-500">{division}</span>}
            </div>

            <div className="h-0.5 w-12 bg-slate-700 my-3 rounded-full"></div>

            <p className="text-sm text-slate-300 leading-relaxed">
               {t(`cap_${title}`)}
            </p>

            <button 
                onClick={handleClose}
                className={`mt-6 w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${rankStyle.bg.replace('/10', '/80')} hover:brightness-110`}
            >
                {t('continue')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default RankToast;