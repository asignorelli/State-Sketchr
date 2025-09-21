import React from 'react';
import type { StateName, Score } from '../types';

interface ResultsProps {
  stateName: StateName;
  userDrawing: string;
  score: Score;                 // kept for compatibility, not rendered
  onNext: () => void;
  isLastInChallenge: boolean;
}

// Turn "New York" -> "/outlines/new-york.png"
function fileForState(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // spaces/punct -> hyphen
    .replace(/(^-|-$)/g, '');    // trim hyphens
  return `/outlines/${slug}.png`;
}

const SquareBox: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="w-full flex justify-center">
    <div className="w-full max-w-[520px] bg-gray-800 rounded-lg border border-gray-700 p-4">
      <h3 className="text-lg font-semibold mb-2 text-center">{title}</h3>

      {/* Square frame */}
      <div className="w-full bg-white rounded-md p-2 border border-gray-200">
        {/* Keep the inner area perfectly square */}
        <div className="relative w-full aspect-square overflow-hidden rounded">
          {children}
        </div>
      </div>
    </div>
  </div>
);

const Results: React.FC<ResultsProps> = ({
  stateName,
  userDrawing,
  score: _score, // intentionally unused
  onNext,
  isLastInChallenge,
}) => {
  const outlineSrc = fileForState(stateName);

  return (
    <div className="w-full flex flex-col items-center p-4 animate-fadeIn">
      {/* Header */}
      <h2 className="text-3xl md:text-4xl font-bold mb-1 text-center">
        Results for <span className="text-cyan-400">{stateName}</span>
      </h2>
      <p className="text-gray-300 mb-6">See how you did.</p>

      {/* Two equal squares */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 place-items-center mx-auto">
        <SquareBox title="Your Drawing">
          <img
            src={userDrawing}
            alt="Your drawing"
            className="absolute inset-0 w-full h-full object-contain"
          />
        </SquareBox>

        <SquareBox title="Actual Outline">
          <img
            src={outlineSrc}
            alt={`${stateName} outline`}
            className="absolute inset-0 w-full h-full object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/outlines/_placeholder.png';
            }}
          />
        </SquareBox>
      </div>

      {/* Next button */}
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
