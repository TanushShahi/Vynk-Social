import type { WaveReactionType, WaveReactionMeta } from '../../../shared/types.js';

export const WAVE_REACTIONS: Record<WaveReactionType, WaveReactionMeta> = {
  love: { type: 'love', emoji: '❤️', label: 'Loved it', description: 'Felt genuine warmth & love', color: '#f43f5e' },
  inspire: { type: 'inspire', emoji: '✦', label: 'Inspired me', description: 'Sparked creative or life motivation', color: '#a855f7' },
  laugh: { type: 'laugh', emoji: '😂', label: 'Made me laugh', description: 'Brightened up my day', color: '#eab308' },
  learn: { type: 'learn', emoji: '💡', label: 'Learned something', description: 'Gained new insight or knowledge', color: '#38bdf8' },
  relatable: { type: 'relatable', emoji: '🤝', label: 'Relatable', description: 'Been there, felt that', color: '#10b981' },
  wow: { type: 'wow', emoji: '🔥', label: 'Wow', description: 'Impressive craft or moment', color: '#f97316' },
  curious: { type: 'curious', emoji: '🔮', label: 'Curious', description: 'Intriguing, want to learn more', color: '#8b5cf6' },
};
