import React, { useState, useEffect, useRef } from 'react';
import { Wind, Volume2, VolumeX, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface Step1Props {
  coordinate: string;
  onNext: () => void;
}

const Step1Focus: React.FC<Step1Props> = ({ coordinate, onNext }) => {
  const { t } = useLanguage();
  const [isFocusing, setIsFocusing] = useState(false);
  const [breathState, setBreathState] = useState<'in' | 'hold' | 'out'>('in');
  const [guideText, setGuideText] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Web Audio API Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);

  // Initialize Audio Logic
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const gain = audioCtxRef.current.createGain();
      gain.gain.setValueAtTime(0, audioCtxRef.current.currentTime); // Start silent
      gain.connect(audioCtxRef.current.destination);
      gainNodeRef.current = gain;
    }
  };

  const startAudio = () => {
    if (!audioEnabled) return;
    initAudio();
    if (!audioCtxRef.current || !gainNodeRef.current) return;

    // Create a Theta Beat (4Hz difference)
    // Left Ear: 200Hz
    // Right Ear: 204Hz
    const osc1 = audioCtxRef.current.createOscillator();
    const osc2 = audioCtxRef.current.createOscillator();
    const panner1 = audioCtxRef.current.createStereoPanner();
    const panner2 = audioCtxRef.current.createStereoPanner();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.value = 200;
    osc2.frequency.value = 204;

    panner1.pan.value = -1; // Left
    panner2.pan.value = 1;  // Right

    osc1.connect(panner1).connect(gainNodeRef.current);
    osc2.connect(panner2).connect(gainNodeRef.current);

    osc1.start();
    osc2.start();
    oscillatorsRef.current = [osc1, osc2];

    // Fade in
    gainNodeRef.current.gain.linearRampToValueAtTime(0.15, audioCtxRef.current.currentTime + 2);
  };

  const stopAudio = () => {
    if (gainNodeRef.current && audioCtxRef.current) {
      // Fade out
      gainNodeRef.current.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 1);
      setTimeout(() => {
        oscillatorsRef.current.forEach(osc => {
          try { osc.stop(); } catch (e) {}
        });
        oscillatorsRef.current = [];
      }, 1000);
    }
  };

  const handleStartFocus = () => {
    setIsFocusing(true);
    startAudio();
  };

  const handleStopFocus = () => {
    stopAudio();
    onNext();
  };

  // Breath cycle timer
  useEffect(() => {
    if (!isFocusing) return;

    // Cycle: In (4s) -> Hold (4s) -> Out (6s)
    let step = 0;
    const runCycle = () => {
      if (step === 0) {
        setBreathState('in');
        setGuideText(t('breatheIn'));
        setTimeout(() => { step = 1; runCycle(); }, 4000);
      } else if (step === 1) {
        setBreathState('hold');
        setGuideText(t('breatheHold'));
        setTimeout(() => { step = 2; runCycle(); }, 4000);
      } else {
        setBreathState('out');
        setGuideText(t('breatheOut'));
        setTimeout(() => { step = 0; runCycle(); }, 6000);
      }
    };

    runCycle();
    return () => { step = -1; };
  }, [isFocusing, t]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-full text-center space-y-8 animate-in fade-in duration-700 py-8">
      
      {!isFocusing ? (
        <>
          <div className="space-y-2">
            <h3 className="text-slate-400 text-sm uppercase tracking-widest">{t('trn')}</h3>
            <div className="text-6xl md:text-7xl font-mono font-bold text-white tracking-wider drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              {coordinate}
            </div>
          </div>
          
          <div className="max-w-lg bg-slate-800/50 p-6 rounded-xl border border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-cyan-400"></div>
            <p className="text-lg text-slate-300 leading-relaxed mb-4">
              {t('focusDesc')}
            </p>
            <div className="flex items-start gap-3 bg-blue-900/20 p-4 rounded-lg border border-blue-500/30 text-left">
              <Wind className="text-blue-400 shrink-0 mt-1" size={20} />
              <p className="text-sm text-blue-200">{t('focusTip')}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`p-3 rounded-full border transition-all ${audioEnabled ? 'bg-blue-900/30 border-blue-500/50 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                title={audioEnabled ? t('audioMute') : t('audioFocus')}
            >
                {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                {audioEnabled ? t('audioFocus') : t('audioMute')}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <button 
              onClick={handleStartFocus} 
              className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-full font-semibold transition-all flex items-center justify-center gap-2 border border-slate-600 group"
            >
              <Wind size={18} className="group-hover:animate-pulse" /> {t('startFocusSeq')}
            </button>
            <button 
              onClick={onNext} 
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)]"
            >
              {t('btnFocused')} <ArrowRight size={18} />
            </button>
          </div>
        </>
      ) : (
        <div className="relative flex flex-col items-center justify-center w-full h-full min-h-[400px]">
          {/* Breathing Circle Animation */}
          <div 
            className={`
              absolute rounded-full border-2 border-blue-500/30 bg-blue-500/5 blur-xl
              transition-all ease-in-out
              ${breathState === 'in' ? 'w-96 h-96 opacity-100 duration-[4000ms]' : ''}
              ${breathState === 'hold' ? 'w-96 h-96 opacity-80 duration-[200ms]' : ''}
              ${breathState === 'out' ? 'w-32 h-32 opacity-30 duration-[6000ms]' : ''}
            `}
          />
          
          {/* Solid Inner Circle */}
          <div 
             className={`
              relative z-10 rounded-full flex items-center justify-center bg-slate-900 border-4 border-slate-800 shadow-2xl
              transition-all ease-in-out
              ${breathState === 'in' ? 'w-64 h-64 border-blue-500/50 duration-[4000ms]' : ''}
              ${breathState === 'hold' ? 'w-64 h-64 border-blue-400 duration-[200ms]' : ''}
              ${breathState === 'out' ? 'w-64 h-64 border-slate-700 duration-[6000ms]' : ''}
             `}
          >
             <div className="text-center space-y-2">
                <div className="text-4xl font-mono font-bold text-white">{coordinate}</div>
                <div className={`text-sm font-bold uppercase tracking-widest transition-colors ${breathState === 'in' ? 'text-blue-400' : breathState === 'out' ? 'text-slate-500' : 'text-white'}`}>
                  {guideText}
                </div>
             </div>
          </div>
          
          {/* Sound Indicator */}
          {audioEnabled && (
             <div className="absolute top-10 flex gap-1 items-end h-4">
               {[...Array(5)].map((_, i) => (
                 <div key={i} className="w-1 bg-blue-500/50 animate-[bounce_1s_infinite] rounded-full" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}></div>
               ))}
             </div>
          )}

          <button 
            onClick={handleStopFocus}
            className="absolute bottom-10 px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-semibold transition-all border border-slate-600 hover:border-blue-500 z-20"
          >
            {t('stopFocusSeq')}
          </button>
        </div>
      )}
    </div>
  );
};

export default Step1Focus;