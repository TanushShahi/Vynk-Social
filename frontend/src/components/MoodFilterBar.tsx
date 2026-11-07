import React from 'react';
import { useMood } from '../context/MoodContext.js';
import { MoodType } from '../types/index.js';

interface MoodOption {
  id: MoodType;
  label: string;
}

const MOODS: MoodOption[] = [
  { id: 'for_you', label: 'For You' },
  { id: 'motivated', label: 'Motivated' },
  { id: 'travel', label: 'Travel' },
  { id: 'tech', label: 'Tech' },
  { id: 'creative', label: 'Creative' },
  { id: 'chill', label: 'Chill' },
  { id: 'adventure', label: 'Adventure' },
];

export const MoodFilterBar: React.FC = () => {
  const { currentMood, setMood } = useMood();

  return (
    <div className="w-full px-4 py-2.5 overflow-x-auto no-scrollbar flex items-center gap-2">
      {MOODS.map((item) => {
        const isActive = currentMood === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setMood(item.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              isActive
                ? 'bg-gradient-to-r from-indigo-500/90 to-purple-600/90 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] border border-purple-400/40'
                : 'bg-white/[0.05] hover:bg-white/[0.09] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
