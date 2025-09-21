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

// "New York" -> "/outlines/new-york.png"
function fileForState(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `/outlines/${slug}.png`;
}

const Results: React.FC<ResultsProps> = ({
  stateName,
  userDrawing,
  score,
  onNext,
  isLastInChallenge,
}) => {
  const pct = typeof score?.score === "number" ? score!.score : 0;
  const critique = score?.critique ?? score?.explanation ?? "";
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
    <div style={page}>
      <div style={row}>
        <h2 style={h2}>
          Draw: <span style={{ color: "#ef4444" }}>{stateName}</span>
        </h2>
        <div style={{ textAlign: "center", opacity: 0.85 }}>Accuracy:</div>
        <div style={pctStyle}>{pct}%</div>
        {critique ? (
          <div style={{ textAlign: "center", opacity: 0.7, fontStyle: "italic", maxWidth: 720, margin: "0 auto" }}>
            “{critique}”
          </div>
        ) : null}
      </div>

      <div style={row2}>
        <div style={card}>
          <div style={{ fontWeight: 700, opacity: 0.9, marginBottom: 8 }}>Your Drawing</div>
          <div style={frame}>
            <img src={userDrawing} alt="Your drawing" style={imgStyle} />
          </div>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 700, opacity: 0.9, marginBottom: 8 }}>Actual Outline</div>
          <div style={frame}>
            <img
              src={outlineSrc}
              alt={`${stateName} outline`}
              style={imgStyle}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/outlines/_placeholder.png";
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <button style={btn} onClick={onNext}>
          {isLastInChallenge ? "Finish Challenge" : "Next State!"}
        </button>
      </div>
    </div>
  );
};

export default Results;
