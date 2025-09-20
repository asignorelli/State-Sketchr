import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { StateName, ChallengeProgress } from '../types';
import { ClockIcon } from './icons/ClockIcon';

interface DrawingProps {
  stateName: StateName;
  onSubmit: (dataUrl: string) => void;
  isJudging: boolean;
  error: string | null;
  challengeProgress?: ChallengeProgress;
}

const DRAW_TIME_SECONDS = 60;

const JudgingLoader: React.FC = () => {
    const messages = [
        "Analyzing your artistic flair...",
        "Consulting the geography experts...",
        "Calculating the wibbly-wobbliness...",
        "Comparing to satellite images...",
        "Just a moment more...",
    ];
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % messages.length);
        }, 2500);
        return () => clearInterval(interval);
    }, [messages.length]);

    return (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
            <div className="w-16 h-16 border-4 border-t-4 border-t-cyan-400 border-gray-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-xl font-semibold text-gray-200 transition-opacity duration-500">
                {messages[messageIndex]}
            </p>
        </div>
    );
};


const Drawing: React.FC<DrawingProps> = ({ stateName, onSubmit, isJudging, error, challengeProgress }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [timer, setTimer] = useState(DRAW_TIME_SECONDS);
  const [timerActive, setTimerActive] = useState(false);

  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    return canvas ? canvas.getContext('2d') : null;
  };

  const clearCanvas = useCallback(() => {
    const context = getCanvasContext();
    const canvas = canvasRef.current;
    if(context && canvas) {
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  useEffect(() => {
    clearCanvas();
    setTimer(DRAW_TIME_SECONDS);
    setTimerActive(false);
  }, [stateName, clearCanvas]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      handleSubmit();
    }
    return () => {
      if(interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerActive, timer]);
  
  const getCoords = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    const clientX = 'touches' in event.nativeEvent
      ? event.nativeEvent.touches[0].clientX
      : (event as React.MouseEvent).nativeEvent.clientX;
    const clientY = 'touches' in event.nativeEvent
      ? event.nativeEvent.touches[0].clientY
      : (event as React.MouseEvent).nativeEvent.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    return { x, y };
  };

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    if (isJudging) return;
    const context = getCanvasContext();
    if (!context) return;
    
    if (!timerActive) setTimerActive(true);

    const { x, y } = getCoords(event);
    context.beginPath();
    context.moveTo(x, y);
    isDrawing.current = true;
  };

  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || isJudging) return;
    const context = getCanvasContext();
    if (!context) return;
    
    const { x, y } = getCoords(event);
    context.lineTo(x, y);
    context.strokeStyle = 'black';
    context.lineWidth = 4;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.stroke();
  };

  const stopDrawing = () => {
    const context = getCanvasContext();
    if (!context) return;
    context.closePath();
    isDrawing.current = false;
  };
  
  const handleSubmit = () => {
      const canvas = canvasRef.current;
      if (canvas && !isJudging) {
          onSubmit(canvas.toDataURL('image/png'));
      }
  };

  return (
    <div className="w-full flex flex-col items-center animate-fadeIn">
      <div className="w-full max-w-3xl bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-700 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl sm:text-4xl font-bold">
            Draw: <span className="text-cyan-400">{stateName}</span>
          </h2>
           {challengeProgress && (
            <div className="text-sm font-medium text-gray-400 bg-gray-700 px-3 py-1 rounded-full">
                {challengeProgress.current} / {challengeProgress.total}
            </div>
          )}
          <div className={`flex items-center text-2xl sm:text-3xl font-mono ${timer < 11 && timerActive ? 'text-red-500 animate-pulse' : 'text-gray-300'}`}>
            <ClockIcon className="w-6 h-6 sm:w-8 sm:h-8 mr-2" />
            <span>0:{timer.toString().padStart(2, '0')}</span>
          </div>
        </div>

        <div className="relative w-full aspect-video bg-white rounded-lg overflow-hidden border-2 border-gray-500">
          <canvas
            ref={canvasRef}
            width={896} // for a 16:9 ratio
            height={504}
            className="w-full h-full cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {isJudging && <JudgingLoader />}
        </div>
        
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        
        <div className="mt-4 flex justify-end">
            <button
                onClick={handleSubmit}
                disabled={isJudging}
                className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
            >
                {isJudging ? 'Submitting...' : 'Submit'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default Drawing;