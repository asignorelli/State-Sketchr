// Welcome.tsx
import React from "react";
import { GameMode } from "../constants";

type Props = { onStart: (mode: GameMode) => void };

const Welcome: React.FC<Props> = ({ onStart }) => {
  return (
    <section className="w-full max-w-5xl mx-auto">
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl shadow-2xl p-8 md:p-12 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-cyan-300">
          Welcome to StateSketchr!
        </h1>
        <p className="mt-4 text-lg md:text-xl text-slate-200">
          The game where you draw each U.S. State from memory! You have one minute to draw the best state outline you can, and then compare your art to the real thing
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => onStart(GameMode.Choose)}
            className="px-6 py-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold"
          >
            Choose a State
          </button>

          <button
            onClick={() => onStart(GameMode.Random)}
            className="px-6 py-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold"
          >
            Random State
          </button>

          <button
            onClick={() => onStart(GameMode.Challenge)}
            className="px-6 py-4 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold"
          >
            Start 50 State Challenge
          </button>
        </div>
      </div>
    </section>
  );
};

export default Welcome;
