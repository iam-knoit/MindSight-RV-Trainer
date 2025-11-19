import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser, Pen, Trash2, Undo } from 'lucide-react';

interface SketchPadProps {
  onExport: (base64: string) => void;
  disabled?: boolean;
}

const SketchPad: React.FC<SketchPadProps> = ({ onExport, disabled = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [lineWidth, setLineWidth] = useState(2);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set white background initially
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Setup lines
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

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
    const canvas = canvasRef.current;
    if (canvas) {
      onExport(canvas.toDataURL('image/png'));
    }
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
    // This fixes the offset issue when the canvas is resized by CSS
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
    onExport(canvas.toDataURL('image/png'));
  };

  return (
    <div className="flex flex-col gap-2 w-full h-full">
      <div className="flex justify-between items-center bg-slate-800 p-2 rounded-t-lg border border-slate-700">
        <div className="flex gap-2">
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
          <input 
            type="range" 
            min="1" 
            max="10" 
            value={lineWidth} 
            onChange={(e) => setLineWidth(parseInt(e.target.value))}
            className="w-20 mx-2 accent-blue-500"
            title="Brush Size"
          />
        </div>
        <button
          onClick={clearCanvas}
          className="p-2 text-red-400 hover:bg-red-900/30 hover:text-red-300 rounded-md transition-colors"
          title="Clear All"
        >
          <Trash2 size={18} />
        </button>
      </div>
      
      <div className="relative flex-grow w-full bg-slate-900 rounded-b-lg border border-slate-700 overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full bg-white cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="text-xs text-slate-500 text-center">
        Use your mouse or finger to sketch your impressions.
      </div>
    </div>
  );
};

export default SketchPad;