
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser, Pen, Trash2, Undo, Maximize2, Minimize2, Tag, Grid3X3, Image as ImageIcon, Lightbulb, X, Loader2 } from 'lucide-react';
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
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [lineWidth, setLineWidth] = useState(2);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  
  // Tips State
  const [showTips, setShowTips] = useState(true);

  // Undo History State
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

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
  }, []);

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

  return (
    <div className={`flex flex-col gap-2 transition-all duration-300 ${isExpanded ? 'fixed inset-0 z-50 bg-slate-950 p-4' : 'w-full'}`}>
      
      {/* Coach Tips Banner */}
      {showTips && (drawingTips.length > 0 || isLoadingTips) && (
        <div className="bg-gradient-to-r from-blue-900/40 to-slate-900 border border-blue-500/30 rounded-lg p-3 mb-1 animate-in slide-in-from-top-2 relative">
           <button 
             onClick={() => setShowTips(false)}
             className="absolute top-2 right-2 text-slate-500 hover:text-white"
           >
             <X size={14} />
           </button>
           <div className="flex items-start gap-3">
             <div className="bg-blue-900/50 p-1.5 rounded-full shrink-0 mt-0.5">
               {isLoadingTips ? <Loader2 size={16} className="text-blue-400 animate-spin" /> : <Lightbulb size={16} className="text-yellow-400" />}
             </div>
             <div>
               <h4 className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-1">{isLoadingTips ? "ANALYZING PAST SESSIONS..." : "COACH'S THINKING GUIDANCE"}</h4>
               {isLoadingTips ? (
                 <div className="h-2 w-24 bg-slate-700 rounded animate-pulse"></div>
               ) : (
                 <div className="flex flex-wrap gap-x-4 gap-y-1">
                   {drawingTips.map((tip, i) => (
                      <span key={i} className="text-xs text-slate-300 flex items-center gap-1.5">
                         <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                         {tip}
                      </span>
                   ))}
                 </div>
               )}
             </div>
           </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex justify-between items-center bg-slate-800 p-2 rounded-t-lg border border-slate-700 shadow-lg shrink-0 overflow-x-auto custom-scrollbar">
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded-md transition-colors ${tool === 'pen' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            title="Pen"
          >
            <Pen size={18} />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-md transition-colors ${tool === 'eraser' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            title="Eraser"
          >
            <Eraser size={18} />
          </button>
          
          <div className="h-6 w-px bg-slate-600 mx-1"></div>
          
          <button
            onClick={undo}
            disabled={historyStep <= 0}
            className={`p-2 rounded-md transition-colors ${historyStep <= 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            title="Undo"
          >
            <Undo size={18} />
          </button>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-md transition-colors ${showGrid ? 'bg-blue-900/40 text-blue-300 border border-blue-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
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

          {!showTips && drawingTips.length > 0 && (
             <button
               onClick={() => setShowTips(true)}
               className="ml-2 p-2 rounded-md bg-yellow-900/20 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-900/40 transition-colors animate-pulse"
               title="Show Tips"
             >
               <Lightbulb size={18} />
             </button>
          )}
        </div>
        <div className="flex gap-2 pl-4">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`p-2 rounded-md transition-colors ${isExpanded ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                title={isExpanded ? t('shrinkCanvas') : t('expandCanvas')}
            >
                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
            onClick={clearCanvas}
            className="p-2 text-red-400 hover:bg-red-900/30 hover:text-red-300 rounded-md transition-colors"
            title={t('clearCanvas')}
            >
            <Trash2 size={18} />
            </button>
        </div>
      </div>
      
      {/* Guidance Tags */}
      {guidanceTags.length > 0 && (
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
        className={`relative bg-slate-900 rounded-b-lg border border-slate-700 overflow-hidden touch-none mx-auto ${isExpanded ? 'flex-grow w-full flex items-center justify-center' : 'w-full aspect-square'}`}
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
          className={`bg-transparent cursor-crosshair object-contain relative z-20 ${isExpanded ? 'max-w-full max-h-full aspect-square' : 'w-full h-full'}`}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      {!isExpanded && (
        <div className="text-xs text-slate-500 text-center flex justify-between items-center px-2">
            <span>{t('sketchInstruction')}</span>
            <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">800x800px</span>
        </div>
      )}
    </div>
  );
};

export default SketchPad;
