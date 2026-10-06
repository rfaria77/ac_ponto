import React from "react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  logoUrl?: string;
}

export function Logo({ className = "", showText = true, logoUrl }: LogoProps) {
  if (logoUrl) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <img src={logoUrl} alt="Logo A&C" className="h-10 object-contain rounded-xl" />
        {showText && (
          <div className="flex flex-col text-left">
            <span className="font-black text-white text-base tracking-tight">A&C</span>
            <span className="text-[9px] text-sky-300 font-bold uppercase tracking-wider leading-none">
              Saúde e Segurança do Trabalho
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center shadow-xl shadow-sky-600/30 overflow-hidden shrink-0 border border-sky-300/30">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="logoLight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="logoDark" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
          </defs>
          <ellipse cx="50" cy="50" rx="46" ry="34" fill="url(#logoLight)" opacity="0.9" />
          <path d="M 8 50 Q 30 18 50 50 T 92 50 Q 70 82 50 50 T 8 50 Z" fill="url(#logoDark)" />
          <path d="M 16 38 Q 36 18 56 42 T 84 46" fill="none" stroke="#f0fdf4" strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col text-left">
          <span className="font-black text-white text-base tracking-tight flex items-center gap-1">
            A<span className="text-sky-400">&</span>C
          </span>
          <span className="text-[9px] text-sky-300 font-bold uppercase tracking-wider leading-none">
            Saúde e Segurança do Trabalho
          </span>
        </div>
      )}
    </div>
  );
}

export function LogoIcon({ className = "w-10 h-10", logoUrl }: { className?: string; logoUrl?: string }) {
  if (logoUrl) {
    return (
      <div className={`overflow-hidden rounded-xl flex items-center justify-center ${className}`}>
        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
      </div>
    );
  }

  return (
    <div className={`relative rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center shadow-xl shadow-sky-600/30 overflow-hidden border border-sky-300/30 ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id="iconLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="iconDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
        </defs>
        <ellipse cx="50" cy="50" rx="46" ry="34" fill="url(#iconLight)" opacity="0.9" />
        <path d="M 8 50 Q 30 18 50 50 T 92 50 Q 70 82 50 50 T 8 50 Z" fill="url(#iconDark)" />
        <path d="M 16 38 Q 36 18 56 42 T 84 46" fill="none" stroke="#f0fdf4" strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />
      </svg>
    </div>
  );
}
