
import React from 'react';
import { GameMode } from '../constants';

interface HeaderProps {
  onSelectMode: (mode: GameMode) => void;
  onHomeClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSelectMode, onHomeClick }) => {
  return (
    <header className="w-full max-w-5xl p-4 bg-gray-800/50 rounded-xl shadow-lg border border-gray-700">
      <div className="flex justify-between items-center">
        <h1 
          onClick={onHomeClick}
          className="text-3xl font-bold text-cyan-400 cursor-pointer tracking-wider"
          style={{ textShadow: '0 0 8px rgba(0, 255, 255, 0.5)' }}
        >
          StateSketchr
        </h1>
        <nav className="flex items-center space-x-4">
          <button onClick={() => onSelectMode(GameMode.Choose)} className="px-4 py-2 rounded-md bg-gray-700 hover:bg-cyan-600 transition-colors duration-200">
            Choose
          </button>
          <button onClick={() => onSelectMode(GameMode.Random)} className="px-4 py-2 rounded-md bg-gray-700 hover:bg-cyan-600 transition-colors duration-200">
            Random
          </button>
          <button onClick={() => onSelectMode(GameMode.Challenge)} className="px-4 py-2 rounded-md bg-orange-600 hover:bg-orange-500 transition-colors duration-200 font-semibold">
            50 State Challenge
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
