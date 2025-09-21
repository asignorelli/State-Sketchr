import React from "react";

export const Card: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className = "", children }) => (
  <div className={`rounded-2xl bg-white/5 border border-white/10 shadow-xl ${className}`}>{children}</div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = "", ...props }) => (
  <button
    className={`px-6 py-3 rounded-xl font-bold bg-accent text-white shadow-[0_12px_32px_rgba(239,68,68,.35)] hover:brightness-105 active:brightness-95 transition ${className}`}
    {...props}
  />
);

// red "whiteboard" frame container
export const Frame: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className = "", children }) => (
  <div className={`rounded-2xl ring-4 ring-accent bg-white p-3 ${className}`}>{children}</div>
);

// small timer badge
export const TimerBadge: React.FC<{ mmss: string }> = ({ mmss }) => (
  <span className="inline-flex items-center gap-2 text-white/90 bg-white/10 border border-white/15 px-3 py-1 rounded-lg">
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="1.7" d="M12 8v5l3 2"/><circle cx="12" cy="13" r="8" strokeWidth="1.7"/><path d="M9 2h6" strokeWidth="1.7"/></svg>
    <span className="font-mono">{mmss}</span>
  </span>
);
