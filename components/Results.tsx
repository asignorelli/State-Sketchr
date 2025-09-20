
import React from 'react';
import type { StateName, Score } from '../types';

interface ResultsProps {
  stateName: StateName;
  userDrawing: string;
  StateOutlineComponent: React.FC;
  score: Score;
  onNext: () => void;
  isLastInChallenge: boolean;
}

const Results: React.FC<ResultsProps> = ({ stateName, userDrawing, StateOutlineComponent, score, onNext, isLastInChallenge }) => {
    
    const getScoreColor = (s: number) => {
        if (s >= 80) return 'text-green-400';
        if (s >= 50) return 'text-yellow-400';
        return 'text-red-400';
    }

  return (
    <div className="w-full flex flex-col items-center p-4 animate-fadeIn">
      <h2 className="text-3xl font-bold mb-2">Results for <span className="text-cyan-400">{stateName}</span></h2>
      <div className="text-center mb-6">
        <p className="text-lg">Accuracy:</p>
        <p className={`text-7xl font-bold ${getScoreColor(score.score)}`} style={{ textShadow: '0 0 10px currentColor' }}>
            {score.score}%
        </p>
        <p className="text-gray-400 italic mt-2 max-w-lg">"{score.critique}"</p>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-xl font-semibold mb-2">Your Drawing</h3>
          <div className="w-full aspect-video bg-white rounded-md p-2">
            <img src={userDrawing} alt="User's drawing" className="w-full h-full object-contain" />
          </div>
        </div>
        <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-xl font-semibold mb-2">Actual Outline</h3>
          <div className="w-full aspect-video bg-white rounded-md p-4 flex items-center justify-center">
            <StateOutlineComponent />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={onNext}
          className="px-10 py-4 bg-cyan-600 text-white font-bold text-xl rounded-lg hover:bg-cyan-500 transition-colors duration-200 shadow-lg"
        >
          {isLastInChallenge ? 'Finish Challenge' : 'Next State'}
        </button>
      </div>
    </div>
  );
};

export default Results;
