import React, { useState } from 'react';
import { X, Brain, Compass, Play, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SessionType } from '../../types';

interface ModeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTraining: () => void;
  onSelectOpen: (intent: string) => void;
}

const ModeSelectionModal: React.FC<ModeSelectionModalProps> = ({ isOpen, onClose, onSelectTraining, onSelectOpen }) => {
  const { t } = useLanguage();
  const [selectedMode, setSelectedMode] = useState<SessionType>('TRAINING');
  const [intent, setIntent] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
       <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative animate-in slide-in-from-bottom-8 duration-300">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white z-10">
            <X size={24} />
          </button>

          <div className="p-8 pb-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-2">{t('selectMode')}</h2>
            <p className="text-slate-400">Choose your protocol for this session.</p>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Standard Training Card */}
             <button
               onClick={() => setSelectedMode('TRAINING')}
               className={`relative p-6 rounded-2xl border-2 transition-all duration-200 text-left flex flex-col gap-4 group
                 ${selectedMode === 'TRAINING' ? 'bg-blue-900/20 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'}
               `}
             >
               <div className={`p-3 rounded-xl w-fit ${selectedMode === 'TRAINING' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                 <Brain size={24} />
               </div>
               <div>
                 <h3 className={`text-lg font-bold mb-2 ${selectedMode === 'TRAINING' ? 'text-white' : 'text-slate-300'}`}>{t('modeTraining')}</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">{t('modeTrainingDesc')}</p>
               </div>
               {selectedMode === 'TRAINING' && <CheckCircle2 className="absolute top-4 right-4 text-blue-500" />}
             </button>

             {/* Open Exploration Card */}
             <button
               onClick={() => setSelectedMode('OPEN')}
               className={`relative p-6 rounded-2xl border-2 transition-all duration-200 text-left flex flex-col gap-4 group
                 ${selectedMode === 'OPEN' ? 'bg-purple-900/20 border-purple-500 ring-1 ring-purple-500' : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'}
               `}
             >
               <div className={`p-3 rounded-xl w-fit ${selectedMode === 'OPEN' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                 <Compass size={24} />
               </div>
               <div>
                 <h3 className={`text-lg font-bold mb-2 ${selectedMode === 'OPEN' ? 'text-white' : 'text-slate-300'}`}>{t('modeOpen')}</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">{t('modeOpenDesc')}</p>
               </div>
               {selectedMode === 'OPEN' && <CheckCircle2 className="absolute top-4 right-4 text-purple-500" />}
             </button>
          </div>

          {/* Configuration Area */}
          <div className="px-8 pb-8 pt-0">
             {selectedMode === 'OPEN' && (
               <div className="mb-6 animate-in slide-in-from-top-4">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t('enterIntent')}</label>
                 <input 
                   type="text"
                   value={intent}
                   onChange={(e) => setIntent(e.target.value)}
                   placeholder={t('intentPlaceholder')}
                   className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                 />
                 <p className="text-xs text-slate-500 mt-2">{t('intentDesc')}</p>
               </div>
             )}

             <button
               onClick={() => selectedMode === 'TRAINING' ? onSelectTraining() : onSelectOpen(intent)}
               disabled={selectedMode === 'OPEN' && !intent.trim()}
               className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all
                 ${selectedMode === 'TRAINING' 
                   ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20' 
                   : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed'}
               `}
             >
               {selectedMode === 'TRAINING' ? <Play size={20} /> : <Compass size={20} />}
               {selectedMode === 'TRAINING' ? t('startSession') : t('startOpenSession')}
             </button>
          </div>
       </div>
    </div>
  );
};

export default ModeSelectionModal;