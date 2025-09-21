import React from "react";
import { GameMode } from "../constants";

type Props = {
  onSelectMode: (mode: GameMode) => void;
  onHomeClick?: () => void;
};

const Header: React.FC<Props> = ({ onSelectMode, onHomeClick }) => {
  const baseBtn =
    "w-full py-2 md:py-3 rounded-lg font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-cyan-400";
  const grayBtn = `${baseBtn} bg-gray-700 hover:bg-gray-600`;
  const orangeBtn = `${baseBtn} bg-orange-600 hover:bg-orange-500`;

return (
  <header className="w-full pt-0 pb-1">
    {/* Title (bigger, no glow) */}
    <div className="max-w-6xl mx-auto text-center">
      <button
        type="button"
        onClick={onHomeClick}
        aria-label="Go to home"
        className="text-5xl md:text-5xl leading-none font-extrabold tracking-tight text-cyan-300"
      >
        StateSketchr
      </button>
    </div>

      {/* Mini-nav bar: wider background, same button sizes */}
      <div className="mt-3 mx-auto w-[94%] max-w-7xl px-2">
        <nav className="bg-slate-800/60 border border-white/10 rounded-xl shadow-lg px-6 py-2">
          <div className="flex items-center justify-center gap-6">
            {/* Fixed widths keep the buttons the same size even as the bar widens */}
            <div className="w-48 md:w-56">
              <button
                className={grayBtn}
                onClick={() => onSelectMode(GameMode.Choose)}
              >
                Choose Your State
              </button>
            </div>
            <div className="w-48 md:w-56">
              <button
                className={grayBtn}
                onClick={() => onSelectMode(GameMode.Random)}
              >
                Random State
              </button>
            </div>
            <div className="w-48 md:w-56">
              <button
                className={orangeBtn}
                onClick={() => onSelectMode(GameMode.Challenge)}
              >
                50 State Challenge
              </button>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
 