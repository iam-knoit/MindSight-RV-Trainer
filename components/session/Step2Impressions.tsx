
import React, { useState, useEffect } from 'react';
import { BookOpen, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface Step2Props {
  notes: string;
  onChange: (val: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step2Impressions: React.FC<Step2Props> = ({ notes, onChange, onNext, onBack }) => {
  const { t, language } = useLanguage();
  const [showHelper, setShowHelper] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("Colors");

  // Descriptor data for the helper
  const descriptors: Record<string, Record<string, string[]>> = {
    en: {
      "Colors": ["Red", "Blue", "Green", "Yellow", "Black", "White", "Grey", "Brown", "Bright", "Dark", "Shiny", "Matte"],
      "Textures": ["Rough", "Smooth", "Hard", "Soft", "Wet", "Dry", "Gritty", "Polished", "Fuzzy", "Sharp"],
      "Shapes": ["Round", "Square", "Triangular", "Flat", "Tall", "Wide", "Angular", "Curved", "Jagged", "Symmetrical"],
      "Dimensions": ["Large", "Small", "Heavy", "Light", "Hollow", "Solid", "Dense", "Spacious"],
      "Smell/Taste": ["Sweet", "Sour", "Bitter", "Salty", "Metallic", "Smoky", "Fresh", "Musty", "Chemical"],
      "Dynamics": ["Static", "Moving", "Fast", "Slow", "Rotating", "Flowing", "Vibrating", "Explosive"],
      "Ambience": ["Natural", "Man-made", "Indoors", "Outdoors", "Urban", "Rural", "Crowded", "Empty"]
    },
    si: {
      "වර්ණ": ["රතු", "නිල්", "කොළ", "කහ", "කළු", "සුදු", "අළු", "දුඹුරු", "දීප්තිමත්", "අඳුරු", "දිලිසෙන", "මැට්"],
      "මතුපිට": ["රළු", "සිනිඳු", "තද", "මෘදු", "තෙත්", "වියළි", "බොරළු සහිත", "ඔප දැමූ", "සුමුදු", "තියුණු"],
      "හැඩතල": ["රවුම්", "කොටු", "ත්‍රිකෝණාකාර", "පැතලි", "උස", "පළල්", "කෝණික", "වක්‍ර", "දත් සහිත", "සමමිතික"],
      "මානයන්": ["විශාල", "කුඩා", "බර", "සැහැල්ලු", "කුහර", "ඝන", "ඝනකම", "ඉඩකඩ සහිත"],
      "සුවඳ/රස": ["පැණිරස", "ඇඹුල්", "තිත්ත", "ලුණු", "ලෝහමය", "දුම්", "නැවුම්", "පුස්", "රසායනික"],
      "චලනය": ["නිශ්චල", "චලනය වන", "වේගවත්", "මන්දගාමී", "කරකැවෙන", "ගලා යන", "කම්පන", "පුපුරන සුලු"],
      "පරිසරය": ["ස්වභාවික", "මිනිසා සාදන ලද", "ගෘහස්ථ", "එළිමහන්", "නාගරික", "ග්‍රාමීය", "ජනාකීර්ණ", "හිස්"]
    }
  };

  const currentDescriptors = descriptors[language] || descriptors['en'];
  const categories = Object.keys(currentDescriptors);

  useEffect(() => {
    // Reset active category when language changes to avoid undefined state
    if (!categories.includes(activeCategory)) {
      setActiveCategory(categories[0]);
    }
  }, [language, categories, activeCategory]);

  const addWord = (word: string) => {
    const separator = notes.length > 0 && !notes.endsWith(' ') ? ', ' : '';
    onChange(notes + separator + word);
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-in slide-in-from-right-8 duration-300">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">{t('stage1Title')}</h2>
        <p className="text-slate-400">{t('stage1Desc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-800/50 p-1 rounded-2xl border border-slate-700 focus-within:border-blue-500/50 transition-colors h-full">
            <textarea
              className="w-full h-80 bg-slate-900 rounded-xl p-6 text-lg text-slate-200 placeholder:text-slate-600 focus:outline-none resize-none"
              placeholder={t('placeholderNotes')}
              value={notes}
              onChange={(e) => onChange(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-between">
            <button onClick={onBack} className="text-slate-500 hover:text-slate-300 flex items-center gap-2 px-4 py-2 transition-all active:scale-95">
              <ArrowLeft size={18} /> {t('btnBack')}
            </button>
            <button onClick={onNext} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-900/20">
              {t('btnNextVisuals')} <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Helper Sidebar / Toggle */}
        <div className="lg:col-span-1">
          {!showHelper ? (
             <button 
               onClick={() => setShowHelper(true)}
               className="w-full h-full min-h-[100px] rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-900/10 transition-all group active:scale-95"
             >
               <BookOpen size={32} className="mb-2 group-hover:scale-110 transition-transform" />
               <span className="font-semibold">{t('helperBtn')}</span>
             </button>
          ) : (
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 h-full max-h-[500px] flex flex-col animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
                 <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen size={14} className="text-blue-400"/> {t('helperBtn')}
                 </h3>
                 <button onClick={() => setShowHelper(false)} className="text-slate-500 hover:text-white transition-all active:scale-90">
                   <X size={16} />
                 </button>
              </div>
              
              <p className="text-xs text-slate-500 mb-3">{t('helperTip')}</p>

              {/* Categories Tabs */}
              <div className="flex flex-wrap gap-2 mb-3">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-all active:scale-95 ${activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Words Grid */}
              <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar">
                 <div className="grid grid-cols-2 gap-2">
                    {currentDescriptors[activeCategory]?.map(word => (
                      <button
                        key={word}
                        onClick={() => addWord(word)}
                        className="text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-blue-300 text-xs transition-all active:scale-95 border border-slate-700/50"
                      >
                        {word}
                      </button>
                    ))}
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step2Impressions;
