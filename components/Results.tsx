import React from "react";
import type { StateName } from "../types";

// keep the prop shape super flexible to avoid crashes
type ScoreLike = { score?: number; critique?: string; explanation?: string };

interface ResultsProps {
  stateName: StateName;
  userDrawing: string;
  score: ScoreLike;
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

const Results: React.FC<ResultsProps> = ({
  stateName,
  userDrawing,
  score,
  onNext,
  isLastInChallenge,
}) => {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-400';
    if (s >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const outlineSrc = fileForState(stateName);

  // simple inline styles to avoid Tailwind issues
  const page: React.CSSProperties = { maxWidth: 980, margin: "0 auto", padding: 16, color: "#fff" };
  const h2: React.CSSProperties = { fontWeight: 800, fontSize: 28, textAlign: "center", margin: "8px 0 4px" };
  const pctStyle: React.CSSProperties = { fontWeight: 800, fontSize: 56, color: "#ef4444", textAlign: "center", margin: "4px 0" };
  const row: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr", gap: 16, marginTop: 16 } as React.CSSProperties;
  const row2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 } as React.CSSProperties;

  const card: React.CSSProperties = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 16, boxShadow: "0 10px 30px rgba(0,0,0,.35)" };
  const frame: React.CSSProperties = { border: "4px solid #ef4444", borderRadius: 16, background: "#fff", padding: 12, width: "100%", aspectRatio: "4 / 3", display: "flex", alignItems: "center", justifyContent: "center" };
  const imgStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit: "contain", borderRadius: 8, background: "#fff" };
  const btn: React.CSSProperties = { display: "inline-block", marginTop: 16, padding: "12px 18px", borderRadius: 12, fontWeight: 800, background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 12px 32px rgba(239,68,68,.35)" };

  return (
    <div className="w-full flex flex-col items-center p-4 animate-fadeIn">
      <h2 className="text-3xl font-bold mb-2">
        Results for <span className="text-cyan-400">{stateName}</span>
      </h2>

      <div className="text-center mb-6">
        <p className="text-lg">Accuracy:</p>
        <p
          className={`text-7xl font-bold ${getScoreColor(score.score)}`}
          style={{ textShadow: '0 0 10px currentColor' }}
        >
          {score.score}%
        </p>
        {/* If your Score has "critique", show it; if you switched to "explanation", update this line */}
        <p className="text-gray-400 italic mt-2 max-w-lg">"{(score as any).critique ?? (score as any).explanation ?? ''}"</p>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Your Drawing */}
        <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-xl font-semibold mb-2">Your Drawing</h3>
          <div className="w-full aspect-video bg-white rounded-md p-2">
            <img src={userDrawing} alt="Your drawing" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Actual Outline (PNG) */}
        <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-xl font-semibold mb-2">Actual Outline</h3>
          <div className="w-full aspect-video bg-white rounded-md p-2">
            <img
              src={outlineSrc}
              alt={`${stateName} outline`}
              className="w-full h-full object-contain"
              onError={(e) => {
                // optional fallback if a file is missing
                (e.currentTarget as HTMLImageElement).src = '/outlines/_placeholder.png';
              }}
            />
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
