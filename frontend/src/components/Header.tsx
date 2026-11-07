import React, { useState } from 'react';
import { Search, Bell, Sparkles } from 'lucide-react';
import { VynkLogo } from './VynkLogo.js';
import { MindfulSummaryModal } from './MindfulSummaryModal.js';

interface HeaderProps {
  onSearchClick?: () => void;
  onNotificationsClick?: () => void;
  onRoomsClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchClick, onNotificationsClick, onRoomsClick }) => {
  const [isMindfulOpen, setIsMindfulOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 w-full px-4 py-3 bg-[#080a14]/90 backdrop-blur-md border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <VynkLogo size={32} showText textSize="text-2xl" />
        </div>

        <div className="flex items-center gap-2">
          {/* Mindful Daily Wellbeing Pill */}
          <button
            onClick={() => setIsMindfulOpen(true)}
            aria-label="Mindful Health Summary"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 text-xs font-semibold transition-all shadow-sm"
          >
            <Sparkles size={13} className="text-cyan-400 animate-pulse" />
            <span className="text-[11px] font-bold">Mindful</span>
          </button>

          <button
            onClick={onSearchClick}
            aria-label="Search"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <Search size={19} />
          </button>

          <button
            onClick={onNotificationsClick}
            aria-label="Notifications"
            className="relative w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <Bell size={19} />
            {/* Notification dot */}
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_#ec4899]" />
          </button>
        </div>
      </header>

      <MindfulSummaryModal
        isOpen={isMindfulOpen}
        onClose={() => setIsMindfulOpen(false)}
      />
    </>
  );
};
