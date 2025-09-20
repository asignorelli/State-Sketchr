
import React from 'react';
import { GameMode } from '../constants';

interface WelcomeProps {
    onStart: (mode: GameMode) => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onStart }) => {
  return (
    <div className="text-center p-8 bg-gray-800/50 rounded-xl shadow-lg border border-gray-700 animate-fadeIn">
      <h2 className="text-4xl font-bold mb-4 text-cyan-400">Welcome to StateSketchr!</h2>
      <p className="text-lg text-gray-300 mb-8 max-w-md mx-auto">
        Test your geographical knowledge. Draw a US state from memory and see how well you did.
      </p>
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
         <button onClick={() => onStart(GameMode.Choose)} className="w-full sm:w-auto px-6 py-3 rounded-md bg-gray-700 hover:bg-cyan-600 transition-colors duration-200 text-lg">
            Choose a State
          </button>
          <button onClick={() => onStart(GameMode.Random)} className="w-full sm:w-auto px-6 py-3 rounded-md bg-gray-700 hover:bg-cyan-600 transition-colors duration-200 text-lg">
            Random State
          </button>
          <button onClick={() => onStart(GameMode.Challenge)} className="w-full sm:w-auto px-6 py-3 rounded-md bg-orange-600 hover:bg-orange-500 transition-colors duration-200 font-semibold text-lg">
            Start 50 State Challenge
          </button>
      </div>
    </div>
  );
};

// Fix: Add missing default export.
export default Welcome;
