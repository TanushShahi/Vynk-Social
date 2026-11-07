import React from 'react';

interface VynkLogoProps {
  size?: number;
  showText?: boolean;
  textSize?: string;
  className?: string;
}

export const VynkLogo: React.FC<VynkLogoProps> = ({
  size = 32,
  showText = false,
  textSize = 'text-2xl',
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div 
        className="relative flex items-center justify-center transition-transform hover:scale-105"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-[0_0_12px_rgba(168,85,247,0.45)]">
          <defs>
            <linearGradient id="vynk-wing-1" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <linearGradient id="vynk-wing-2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="60%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>
          {/* Left Ribbon Wing */}
          <path
            d="M50 82C50 82 20 74 16 46C12 20 34 10 44 28C50 38 50 62 50 82Z"
            fill="url(#vynk-wing-1)"
          />
          {/* Right Ribbon Wing */}
          <path
            d="M50 82C50 82 80 74 84 46C88 20 66 10 56 28C50 38 50 62 50 82Z"
            fill="url(#vynk-wing-2)"
          />
        </svg>
      </div>

      {showText && (
        <span className={`font-extrabold tracking-tight font-sans ${textSize} bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent`}>
          Vynk
        </span>
      )}
    </div>
  );
};
