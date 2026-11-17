import React, { useState } from "react";

const LOGO_OFICIAL_PATH = "/assets/aistudio/Logo_A_C_d0fa543a.jpg";

interface LogoProps {
  className?: string;
  showText?: boolean;
  logoUrl?: string;
  size?: "sm" | "md" | "lg";
}

function WaveEmblemSVG({ className = "w-11 h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 112 96" className={className} aria-hidden="true">
      {/* Onda superior esquerda (azul claro vibrante) */}
      <path
        d="M 4 46 C 10 14, 52 -2, 88 26 C 72 24, 58 29, 44 40 C 30 51, 15 54, 4 46 Z"
        fill="#4BBDF0"
      />
      {/* Dobra superior direita (azul médio) */}
      <path
        d="M 56 32 C 68 24, 79 22, 88 26 C 98 33, 105 42, 108 48 C 90 48, 72 41, 56 32 Z"
        fill="#1978B4"
      />
      {/* Onda inferior direita (azul médio) */}
      <path
        d="M 22 64 C 42 74, 56 50, 74 44 C 88 39, 99 44, 104 54 C 95 79, 55 96, 22 64 Z"
        fill="#1E82C2"
      />
      {/* Dobra inferior esquerda (azul profundo) */}
      <path
        d="M 10 58 C 24 66, 38 66, 52 57 C 40 72, 62 84, 88 78 C 63 96, 24 91, 10 58 Z"
        fill="#126196"
      />
    </svg>
  );
}

export function Logo({ className = "", showText = true, logoUrl, size = "md" }: LogoProps) {
  const [imgErro, setImgErro] = useState(false);
  const srcAtivo = logoUrl || LOGO_OFICIAL_PATH;

  const sizeStyles = {
    sm: {
      box: "px-2.5 py-1.5 rounded-xl gap-2",
      img: "h-8 max-w-[155px]",
      icon: "w-9 h-7",
      title: "text-xl",
      sub: "text-[6.5px]",
    },
    md: {
      box: "px-3 py-2 rounded-2xl gap-2.5",
      img: "h-10 max-w-[195px]",
      icon: "w-11 h-9",
      title: "text-2xl",
      sub: "text-[7.5px]",
    },
    lg: {
      box: "px-4 py-2.5 rounded-2xl gap-3",
      img: "h-14 max-w-[260px]",
      icon: "w-14 h-11",
      title: "text-3xl",
      sub: "text-[9px]",
    },
  }[size];

  if (!imgErro && srcAtivo) {
    return (
      <div
        className={`inline-flex items-center justify-center bg-white shadow-lg border border-slate-200/80 shrink-0 ${sizeStyles.box} ${className}`}
      >
        <img
          src={srcAtivo}
          alt="A&C Saúde e Segurança do Trabalho"
          onError={() => setImgErro(true)}
          className={`${sizeStyles.img} w-auto object-contain select-none`}
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center bg-white shadow-lg border border-slate-200/80 shrink-0 ${sizeStyles.box} ${className}`}
    >
      <WaveEmblemSVG className={`${sizeStyles.icon} shrink-0`} />
      {showText && (
        <div className="flex flex-col text-left select-none">
          <span className={`font-black text-[#1E81C0] tracking-tight leading-none ${sizeStyles.title}`}>
            A&amp;C
          </span>
          <span className={`text-[#194D6D] font-bold uppercase tracking-[0.1em] leading-[1.2] mt-0.5 whitespace-nowrap ${sizeStyles.sub}`}>
            SAÚDE E SEGURANÇA
            <br />
            DO TRABALHO
          </span>
        </div>
      )}
    </div>
  );
}

export function LogoIcon({ className = "w-10 h-10", logoUrl }: { className?: string; logoUrl?: string }) {
  const [imgErro, setImgErro] = useState(false);

  if (logoUrl && !imgErro) {
    return (
      <div className={`overflow-hidden rounded-xl bg-white p-1 flex items-center justify-center border border-slate-200/80 ${className}`}>
        <img
          src={logoUrl}
          alt="Logo A&C"
          onError={() => setImgErro(true)}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className={`rounded-xl bg-white p-1.5 flex items-center justify-center shadow-md border border-slate-200/80 ${className}`}>
      <WaveEmblemSVG className="w-full h-full" />
    </div>
  );
}
