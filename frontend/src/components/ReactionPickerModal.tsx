import React from 'react';
import { WaveReactionType, WAVE_REACTIONS } from '../types/index.js';

interface ReactionPickerProps {
  isOpen: boolean;
  onSelect: (type: WaveReactionType) => void;
  onClose: () => void;
  currentReaction?: WaveReactionType | null;
}

export const ReactionPickerModal: React.FC<ReactionPickerProps> = ({
  isOpen,
  onSelect,
  onClose,
  currentReaction
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose} 
      />
      <div className="absolute bottom-12 left-0 z-50 p-2 rounded-2xl glass-panel shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-purple-500/20 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
        {(Object.keys(WAVE_REACTIONS) as WaveReactionType[]).map((type) => {
          const meta = WAVE_REACTIONS[type];
          const isSelected = currentReaction === type;
          return (
            <button
              key={type}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(type);
                onClose();
              }}
              title={meta.label}
              className={`group relative flex flex-col items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 hover:scale-125 ${
                isSelected ? 'bg-purple-600/30 ring-1 ring-purple-400' : 'hover:bg-white/10'
              }`}
            >
              <span className="text-xl select-none">{meta.emoji}</span>
              
              {/* Tooltip on hover */}
              <span className="absolute -top-7 px-2 py-0.5 rounded-md bg-slate-900/90 text-[10px] font-semibold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md border border-white/10">
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
};
