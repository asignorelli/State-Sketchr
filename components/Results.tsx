import React from 'react';
import type { StateName, Score } from '../types';

interface ResultsProps {
  stateName: StateName;
  userDrawing: string;
  score: Score;
  onNext: () => void;
  isLastInChallenge: boolean;
}

// "New York" -> "/outlines/new-york.png"
function fileForState(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `/outlines/${slug}.png`;
}

const Results: React.FC<ResultsProps> = ({
  stateName,
  userDrawing,
  score,
  onNext,
  isLastInChallenge
}) => {
  const critique =
    (score as any).critique ?? (score as any).explanation ?? '';

  const outlineSrc = fileForState(stateName);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Title + Accuracy */}
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-2">
          Draw: <span className="text-red-400">{stateName}</span>
        </h2>

        <p className="text-white/80">Accuracy:</p>
        <div className="relative inline-block mt-1">
          <span className="absolute inset-0 blur-xl bg-red-500/40 rounded-full"></span>
          <span className="relative text-6xl md:text-7xl font-extrabold text-red-400 drop-shadow-[0_0_18px_rgba(239,68,68,.45)]">
            {score.score}%
          </span>
        </div>

        {critique && (
          <p className="text-white/70 italic mt-3 max-w-2xl mx-auto">
            “{critique}”
          </p>
        )}
      </div>

      {/* Two framed panels */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Your Drawing */}
        <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl p-5">
          <div className="text-sm font-semibold text-white/90 mb-2">Your Drawing</div>
          <div className="rounded-2xl ring-4 ring-red-500 bg-white p-3 aspect-[4/3] flex items-center justify-center">
            <img
              src={userDrawing}
              alt="Your drawing"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
        </div>

        {/* Actual Outline */}
        <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl p-5">
          <div className="text-sm font-semibold text-white/90 mb-2">Actual Outline</div>
          <div className="rounded-2xl ring-4 ring-red-500 bg-white p-3 aspect-[4/3] flex items-center justify-center">
            <img
              src={outlineSrc}
              alt={`${stateName} outline`}
              className="w-full h-full object-contain rounded-lg"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/outlines/_placeholder.png';
              }}
            />
          </div>
        </div>
      </div>

      {/* Next button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onNext}
          className="px-6 py-3 rounded-xl font-bold bg-red-500 text-white shadow-[0_12px_32px_rgba(239,68,68,.35)] hover:brightness-105 active:brightness-95 transition"
        >
          {isLastInChallenge ? 'Finish Challenge' : 'Next State!'}
        </button>
      </div>
    </div>
  );
};

export default Results;
