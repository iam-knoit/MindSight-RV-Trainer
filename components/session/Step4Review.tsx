
import React from 'react';
import { Sparkles, Image as ImageIcon, CheckCircle, ArrowLeft, ShieldCheck, Save } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SessionType } from '../../types';

interface Step4Props {
  notes: string;
  sketch: string | null;
  onSubmit: () => void;
  onBack: () => void;
  sessionType: SessionType;
}

const Step4Review: React.FC<Step4Props> = ({ notes, sketch, onSubmit, onBack, sessionType }) => {
  const { t } = useLanguage();
  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-in slide-in-from-right-8 duration-300">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white">{t('reviewTitle')}</h2>
        <p className="text-slate-400">{t('reviewDesc')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles size={14} /> {t('sensoryNotes')}
          </h3>
          <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
            {notes || <span className="text-slate-600 italic">{t('noNotes')}</span>}
          </p>
        </div>
        
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <ImageIcon size={14} /> {t('sketchPreview')}
          </h3>
          <div className="bg-white rounded-lg overflow-hidden aspect-square border border-slate-600">
            {sketch ? (
              <img src={sketch} alt="User Sketch" className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">{t('noSketch')}</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-8">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-300 flex items-center gap-2 px-4 py-2 transition-all active:scale-95">
          <ArrowLeft size={18} /> {t('editData')}
        </button>
        <button 
          onClick={onSubmit} 
          className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2 shadow-[0_0_30px_-5px_rgba(22,163,74,0.4)]"
        >
          {sessionType === 'TRAINING' ? <ShieldCheck size={20} /> : <Save size={20} />}
          {sessionType === 'TRAINING' ? t('submitAnalysis') : t('saveLog')}
        </button>
      </div>
    </div>
  );
};

export default Step4Review;
