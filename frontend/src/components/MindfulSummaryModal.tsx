import React, { useState, useEffect } from 'react';
import { X, Sparkles, Heart, Users, Clock, ShieldCheck, Smile } from 'lucide-react';
import { api } from '../services/api.js';
import { DailySocialSummary } from '../types/index.js';

interface MindfulSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MindfulSummaryModal: React.FC<MindfulSummaryModalProps> = ({ isOpen, onClose }) => {
  const [summary, setSummary] = useState<DailySocialSummary>({
    creatorsDiscovered: 6,
    momentsInspired: 14,
    communitiesActive: 3,
    meaningfulInteractions: 28,
    healthyTimeMinutes: 18,
  });

  useEffect(() => {
    if (isOpen) {
      api.getDailySummary()
        .then(res => setSummary(res.summary))
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm bg-[#0a0d1e] border border-purple-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background */}
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-cyan-500/10 blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-purple-500/15 blur-2xl" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-purple-600 flex items-center justify-center text-white shadow-md">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="font-bold text-white text-base leading-tight">Mindful Daily Summary</h3>
            <span className="text-[10px] text-cyan-300 font-semibold">Healthy Social Engagement</span>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          "Share moments, discover people through interests, and interact meaningfully instead of chasing likes."
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <span className="text-base font-black text-white block leading-none">{summary.momentsInspired}</span>
              <span className="text-[10px] text-slate-400">Moments Inspired</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
              <Users size={16} />
            </div>
            <div>
              <span className="text-base font-black text-white block leading-none">{summary.creatorsDiscovered}</span>
              <span className="text-[10px] text-slate-400">Creators Discovered</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <Smile size={16} />
            </div>
            <div>
              <span className="text-base font-black text-white block leading-none">{summary.communitiesActive}</span>
              <span className="text-[10px] text-slate-400">Active Rooms</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-300 flex items-center justify-center">
              <Clock size={16} />
            </div>
            <div>
              <span className="text-base font-black text-white block leading-none">{summary.healthyTimeMinutes}m</span>
              <span className="text-[10px] text-slate-400">Session Balance</span>
            </div>
          </div>
        </div>

        {/* Mindful Badge */}
        <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2.5 mb-4">
          <ShieldCheck size={20} className="text-emerald-400 flex-shrink-0" />
          <div className="text-[11px] text-emerald-200">
            <strong className="text-white block font-semibold">Mindful Scroll Target Met</strong>
            Zero algorithm manipulation. Feed ordered purely by your selected mood.
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-bold text-white transition-colors"
        >
          Keep Exploring Mindfully
        </button>
      </div>
    </div>
  );
};
