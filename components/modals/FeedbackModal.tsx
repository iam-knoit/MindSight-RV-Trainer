
import React, { useState } from 'react';
import { X, MessageSquarePlus, Send, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { submitFeedback } from '../../services/firebase';
import { User } from 'firebase/auth';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  initialText?: string;
  initialType?: 'feature_request' | 'bug' | 'general';
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, user, initialText = '', initialType = 'general' }) => {
  const { t } = useLanguage();
  const [text, setText] = useState(initialText);
  const [type, setType] = useState<'feature_request' | 'bug' | 'general'>(initialType);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Reset state when opening/changing props
  React.useEffect(() => {
    if (isOpen) {
        setText(initialText);
        setType(initialType);
        setStatus('idle');
    }
  }, [isOpen, initialText, initialType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim()) return;

    setIsSubmitting(true);
    try {
      await submitFeedback(user.uid, text, type);
      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('idle');
        setText('');
      }, 2000);
    } catch (error) {
      console.error(error);
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-800/50 p-6 border-b border-slate-700 flex justify-between items-center">
             <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <MessageSquarePlus className="text-blue-400" />
                 {t('feedbackTitle')}
             </h3>
             <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                 <X size={20} />
             </button>
        </div>

        {/* Content */}
        <div className="p-6">
            {status === 'success' ? (
                <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 size={32} className="text-green-500" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">{t('feedbackThanks')}</h4>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-slate-400 text-sm mb-4">{t('feedbackDesc')}</p>
                    
                    {/* Type Selector */}
                    <div className="flex gap-2 p-1 bg-slate-800 rounded-lg">
                        {(['feature_request', 'bug', 'general'] as const).map((tType) => (
                             <button
                                key={tType}
                                type="button"
                                onClick={() => setType(tType)}
                                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${type === tType ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                             >
                                {tType === 'feature_request' ? t('feedbackTypeFeature') : tType === 'bug' ? t('feedbackTypeBug') : t('feedbackTypeGeneral')}
                             </button>
                        ))}
                    </div>

                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={t('feedbackPlaceholder')}
                        className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />

                    {status === 'error' && (
                        <div className="bg-red-900/20 text-red-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle size={16} /> {t('feedbackError')}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={isSubmitting || !text.trim()}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                        {t('submitFeedback')}
                    </button>
                </form>
            )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;