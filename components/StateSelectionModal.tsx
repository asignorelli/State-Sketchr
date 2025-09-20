
import React from 'react';
import { US_STATES } from '../constants';
import type { StateName } from '../types';

interface StateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectState: (state: StateName) => void;
}

const StateSelectionModal: React.FC<StateSelectionModalProps> = ({ isOpen, onClose, onSelectState }) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fadeIn"
        onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-4xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-center text-cyan-400">Choose a State</h2>
        </div>
        <div className="p-6 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {US_STATES.map((state) => (
                    <button
                        key={state}
                        onClick={() => onSelectState(state)}
                        className="p-3 text-center bg-gray-700 rounded-md hover:bg-cyan-600 transition-colors duration-200"
                    >
                        {state}
                    </button>
                ))}
            </div>
        </div>
         <div className="p-4 border-t border-gray-700 text-right">
            <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-600 rounded-md hover:bg-gray-500 transition-colors"
            >
                Cancel
            </button>
        </div>
      </div>
    </div>
  );
};

export default StateSelectionModal;
