
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser, Pen, Trash2, Undo, Maximize2, Minimize2, Tag, Grid3X3, Image as ImageIcon, Lightbulb, X, Loader2, Flower, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface SketchPadProps {
  onExport: (base64: string) => void;
  disabled?: boolean;
  guidanceTags?: string[];
  traceImage?: string | null; // Optional SVG/Image data to trace over
  drawingTips?: string[]; // New: Coach Tips
  isLoadingTips?: boolean;
}

const SketchPad: React.FC<SketchPadProps> = ({ onExport, disabled = false, guidanceTags = [], traceImage = null, drawingTips = [], isLoadingTips = false }) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [lineWidth, setLineWidth] = useState(2);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [isBannerCollapsed, setIsBannerCollapsed] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false); // Zen Mode State

  // Undo History State
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Audio Context Refs for Zen Mode
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Set white background initially
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Setup lines
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Save initial blank state
    saveState();

    // Cleanup audio on unmount
    return () => {
      stopZenAudio();
    };
  }, []);

  // Handle Zen Mode Toggles
  useEffect(() => {
    if (isZenMode) {
      // Auto expand when entering Zen Mode
      setIsExpanded(true);
      startZenAudio();
    } else {
      stopZenAudio();
      // Only collapse if we were forced expanded by Zen, but user might want to keep it expanded
      // For now, let's keep it expanded if it was already, or collapse. 
      // User can minimize manually.
    }
  }, [isZenMode]);

  const startZenAudio = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioCtxRef.current;
      
      // Create Brown Noise (Soothing, low rumble like distant waterfall)
      const bufferSize = ctx.sampleRate * 2; // 2 seconds buffer loop
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + (0.02 * white)) / 1.02;
        data[i] = lastOut * 3.5; // Compensate for gain loss
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const gain = ctx.createGain();
      gain.gain.value = 0.05; // Keep it quiet

      // Add a lowpass filter to make it warmer
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      
      // Fade in
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 3);

      noiseNodeRef.current = noise;
      gainNodeRef.current = gain;

    } catch (e) {
      console.error("Audio error", e);
    }
  };

  const stopZenAudio = () => {
    if (gainNodeRef.current && audioCtxRef.current) {
      // Fade out
      gainNodeRef.current.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 1);
      setTimeout(() => {
        if (noiseNodeRef.current) {
          try { noiseNodeRef.current.stop(); } catch(e) {}
          noiseNodeRef.current = null;
        }
      }, 1000);
    }
  };

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // If we are in the middle of history and draw, truncate future
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(imageData);
    
    // Limit history size to 20 steps to save memory
    if (newHistory.length > 20) {
        newHistory.shift();
    } else {
        setHistoryStep(newHistory.length - 1);
    }
    setHistory(newHistory);
    
    // Trigger export
    onExport(canvas.toDataURL('image/png'));
  };

  const undo = () => {
      if (historyStep <= 0) return; // Keep at least the initial blank state
      const newStep = historyStep - 1;
      setHistoryStep(newStep);
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.putImageData(history[newStep], 0, 0);
      onExport(canvas.toDataURL('image/png'));
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e, canvas);
    
    ctx.lineWidth = tool === 'eraser' ? 20 : lineWidth;
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : '#000000';
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveState(); // Save to history on mouse up
  };

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, 
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Calculate scale to map CSS pixels to Canvas bitmap pixels
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
  };

  const toggleZenMode = () => {
    setIsZenMode(!isZenMode);
  };

  return (
    <div className={`flex flex-col gap-2 transition-all duration-700 ease-in-out 
        ${isZenMode ? 'fixed inset-0 z-[100] bg-slate-950 p-0 flex items-center justify-center' : ''}
        ${!isZenMode && isExpanded ? 'fixed inset-0 z-50 bg-slate-950 p-4' : ''}
        ${!isZenMode && !isExpanded ? 'w-full' : ''}
    `}>
      
      {/* Zen Mode Background Animation */}
      {isZenMode && (
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 opacity-90"></div>
             <div className="absolute w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[100px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse duration-[5000ms]"></div>
          </div>
      )}

      {/* Collapsible Coach Tips Banner */}
      {!isZenMode && (drawingTips.length > 0 || isLoadingTips) && (
        <div className={`
            bg-slate-900 border border-blue-500/30 rounded-lg overflow-hidden transition-all duration-300 relative shadow-lg
            ${isBannerCollapsed ? 'mb-1' : 'mb-2 p-0'}
        `}>
           {/* Header / Toggle */}
           <div 
             onClick={() => setIsBannerCollapsed(!isBannerCollapsed)}
             className={`
                flex items-center justify-between p-3 cursor-pointer hover:bg-slate-800/50 transition-colors
                ${isLoadingTips ? 'bg-blue-900/10' : ''}
             `}
           >
              <div className="flex items-center gap-2 text-blue-400">
                 {isLoadingTips ? (
                    <Loader2 size={16} className="animate-spin" />
                 ) : (
                    <Lightbulb size={16} className="text-yellow-400" />
                 )}
                 <span className="text-xs font-bold uppercase tracking-widest">
                    {isLoadingTips ? "ANALYZING RECENT SESSIONS..." : "AI COACH TIPS"}
                 </span>
              </div>
              <button className="text-slate-500 hover:text-white transition-colors">
                 <ChevronDown size={16} className={`transition-transform duration-300 ${isBannerCollapsed ? 'rotate-180' : ''}`} />
              </button>
           </div>

           {/* Content */}
           <div className={`
               overflow-hidden transition-all duration-300 ease-in-out
               ${isBannerCollapsed ? 'max-h-0 opacity-0' : 'max-h-40 opacity-100'}
           `}>
               <div className="p-3 pt-0 pb-3 flex flex-wrap gap-2">
                   {isLoadingTips ? (
                       <div className="w-full flex flex-col gap-2">
                           <div className="h-2 w-3/4 bg-slate-800 rounded animate-pulse"></div>
                           <div className="h-2 w-1/2 bg-slate-800 rounded animate-pulse delay-75"></div>
                       </div>
                   ) : (
                       drawingTips.map((tip, i) => (
                          <div key={i} className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/50">
                             <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                             <span className="text-xs text-slate-300 font-medium">{tip}</span>
                          </div>
                       ))
                   )}
               </div>
           </div>
           
           {/* Loading Pulse Border Effect */}
           {isLoadingTips && (
               <div className="absolute inset-0 border border-blue-500/50 rounded-lg animate-pulse pointer-events-none"></div>
           )}
        </div>
      )}

      {/* Toolbar - Auto-hide in Zen Mode */}
      <div className={`
          flex justify-between items-center bg-slate-800 p-2 rounded-t-lg border border-slate-700 shadow-lg shrink-0 overflow-x-auto custom-scrollbar relative z-20 transition-all duration-500
          ${isZenMode ? 'opacity-0 hover:opacity-100 absolute top-4 left-1/2 -translate-x-1/2 max-w-[90vw] rounded-lg' : ''}
      `}>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded-md transition-all active:scale-90 ${tool === 'pen' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            title="Pen"
          >
            <Pen size={18} />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-md transition-all active:scale-90 ${tool === 'eraser' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            title="Eraser"
          >
            <Eraser size={18} />
          </button>
          
          <div className="h-6 w-px bg-slate-600 mx-1"></div>
          
          <button
            onClick={undo}
            disabled={historyStep <= 0}
            className={`p-2 rounded-md transition-all active:scale-90 ${historyStep <= 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            title="Undo"
          >
            <Undo size={18} />
          </button>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-md transition-all active:scale-90 ${showGrid ? 'bg-blue-900/40 text-blue-300 border border-blue-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            title="Toggle Grid"
          >
            <Grid3X3 size={18} />
          </button>

          <input 
            type="range" 
            min="1" 
            max="10" 
            value={lineWidth} 
            onChange={(e) => setLineWidth(parseInt(e.target.value))}
            className="w-16 mx-2 accent-blue-500 hidden sm:block"
            title="Brush Size"
          />

          {/* Zen Mode Toggle */}
          <button
             onClick={toggleZenMode}
             className={`ml-2 p-2 rounded-md transition-all active:scale-90 ${isZenMode ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'text-slate-400 hover:text-emerald-300 hover:bg-emerald-900/20'}`}
             title={t('zenMode')}
          >
             <Flower size={18} className={isZenMode ? "animate-spin-slow" : ""} />
          </button>
        </div>
        <div className="flex gap-2 pl-4">
            <button
                onClick={() => {
                   if(isZenMode) setIsZenMode(false);
                   setIsExpanded(!isExpanded);
                }}
                className={`p-2 rounded-md transition-all active:scale-90 ${isExpanded ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                title={isExpanded ? t('shrinkCanvas') : t('expandCanvas')}
            >
                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
            onClick={clearCanvas}
            className="p-2 text-red-400 hover:bg-red-900/30 hover:text-red-300 rounded-md transition-all active:scale-90"
            title={t('clearCanvas')}
            >
            <Trash2 size={18} />
            </button>
        </div>
      </div>
      
      {/* Guidance Tags */}
      {!isZenMode && guidanceTags.length > 0 && (
        <div className="w-full overflow-x-auto flex items-center gap-2 py-1 px-1 custom-scrollbar shrink-0 min-h-[40px]">
           <div className="flex items-center gap-1 text-slate-500 mr-1 shrink-0">
             <Tag size={12} />
           </div>
           {guidanceTags.map((tag, i) => (
             <span key={i} className="flex-shrink-0 px-2.5 py-1 bg-blue-900/40 text-blue-200 border border-blue-500/30 rounded-md text-xs font-medium whitespace-nowrap shadow-sm select-none">
               {tag}
             </span>
           ))}
        </div>
      )}

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className={`relative bg-slate-900 rounded-b-lg border border-slate-700 overflow-hidden touch-none mx-auto transition-all duration-700
             ${isZenMode ? 'w-[95vmin] h-[95vmin] border-slate-800 shadow-2xl rounded-2xl z-10' : ''}
             ${!isZenMode && isExpanded ? 'flex-grow w-full flex items-center justify-center' : ''}
             ${!isZenMode && !isExpanded ? 'w-full aspect-square' : ''}
        `}
      >
        {/* Optional Tracing Underlay */}
        {traceImage && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-8 opacity-30 select-none">
                  {/* We render this as an SVG via img tag. The opacity makes it faint. */}
                  {traceImage.startsWith('<svg') || traceImage.startsWith('data:image/svg') ? (
                     <img src={`data:image/svg+xml;utf8,${encodeURIComponent(traceImage)}`} className="w-full h-full object-contain" alt="Trace Target" />
                  ) : (
                     // If it's a raw path string (from GESTALTS constant), we wrap it in basic SVG
                     <svg viewBox="0 0 300 300" className="w-full h-full stroke-black stroke-[4px] fill-none" preserveAspectRatio="xMidYMid meet">
                        <path d={traceImage} />
                     </svg>
                  )}
             </div>
        )}

        {/* Grid Overlay (Pointer events none so we can draw through it) */}
        {showGrid && (
            <div 
                className="absolute inset-0 pointer-events-none z-10 opacity-20"
                style={{
                    backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }}
            />
        )}

        <canvas
          ref={canvasRef}
          width={800}
          height={800}
          className={`bg-transparent cursor-crosshair object-contain relative z-20 ${isExpanded || isZenMode ? 'max-w-full max-h-full aspect-square' : 'w-full h-full'}`}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      
      {/* Zen Mode Indicator / Instruction */}
      {isZenMode && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-500 text-xs tracking-[0.3em] font-light opacity-50 pointer-events-none">
             {t('zenModeActive')}
          </div>
      )}

      {!isExpanded && !isZenMode && (
        <div className="text-xs text-slate-500 text-center flex justify-between items-center px-2">
            <span>{t('sketchInstruction')}</span>
            <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">800x800px</span>
        </div>
      )}
    </div>
  );
};

export default SketchPad;
