import React, { useState, useEffect } from 'react';
import { X, Send, Heart, Sparkles, Plus, Layers, ChevronRight, CornerDownRight } from 'lucide-react';
import { StoryItem } from '../types/index.js';
import { api } from '../services/api.js';

interface StoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  isOpen,
  onClose,
  user
}) => {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [activeStoryIdx, setActiveStoryIdx] = useState(0);
  const [activeThreadIdx, setActiveThreadIdx] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [sentMessage, setSentMessage] = useState(false);
  const [showThreadSheet, setShowThreadSheet] = useState(false);
  const [threadInputText, setThreadInputText] = useState('');

  useEffect(() => {
    if (isOpen) {
      api.getStories().then(res => {
        setStories(res.stories);
        // Find selected user's story if matching
        if (user?.id) {
          const idx = res.stories.findIndex(s => s.authorId === user.id);
          if (idx !== -1) setActiveStoryIdx(idx);
        }
      }).catch(console.error);
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen || showThreadSheet) return;

    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          // Advance to next story or close
          if (activeStoryIdx < stories.length - 1) {
            setActiveStoryIdx(prevIdx => prevIdx + 1);
            return 0;
          } else {
            clearInterval(interval);
            onClose();
            return 100;
          }
        }
        return prev + 1.5;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, activeStoryIdx, stories.length, showThreadSheet]);

  if (!isOpen) return null;

  const currentStory = stories[activeStoryIdx];
  const threads = currentStory?.threads || [];

  // Active story to display (either main story or thread child)
  const displayStory = (activeThreadIdx !== null && threads[activeThreadIdx])
    ? threads[activeThreadIdx]
    : currentStory;

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSentMessage(true);
    setReplyText('');
    setTimeout(() => setSentMessage(false), 2000);
  };

  const handleAddThreadMoment = async () => {
    if (!threadInputText.trim() || !currentStory) return;
    try {
      await api.createStory({
        mediaUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800',
        caption: threadInputText.trim(),
        parentStoryId: currentStory.id
      });
      setThreadInputText('');
      setShowThreadSheet(false);
      // Reload stories
      const res = await api.getStories();
      setStories(res.stories);
      alert('Your moment was added to this Story Thread! ✦');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between border border-white/10">
        {/* Background Story Image */}
        <img
          src={displayStory?.mediaUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800'}
          alt="Story moment"
          className="absolute inset-0 w-full h-full object-cover brightness-90"
        />

        {/* Ambient Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/85" />

        {/* Top Story Header & Progress Bar */}
        <div className="relative z-10 p-4 space-y-3">
          {/* Progress bar */}
          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden flex gap-1">
            {stories.map((_, i) => (
              <div key={i} className="flex-1 h-full bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100 ease-linear"
                  style={{
                    width: i === activeStoryIdx ? `${progress}%` : i < activeStoryIdx ? '100%' : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* User info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={displayStory?.author.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'}
                alt={displayStory?.author.name || 'User'}
                className="w-9 h-9 rounded-full object-cover border border-white/20"
              />
              <div>
                <span className="text-xs font-bold text-white block">
                  {displayStory?.author.name || 'Riya Mehta'}
                </span>
                <span className="text-[10px] text-slate-300">
                  {displayStory?.parentStoryId ? 'Thread entry • 1h ago' : '2h ago'}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Center Typography */}
        <div className="relative z-10 text-center px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)] font-serif italic">
            {displayStory?.caption || 'Good Vibes Only ✨'}
          </h2>
        </div>

        {/* STORY THREADS BADGE (Original Feature!) */}
        {threads.length > 0 && (
          <div className="relative z-10 px-4">
            <button
              onClick={() => setShowThreadSheet(!showThreadSheet)}
              className="w-full py-2 px-3 rounded-2xl bg-black/60 backdrop-blur-md border border-purple-500/40 flex items-center justify-between text-xs text-purple-200 hover:bg-black/80 transition-all shadow-glow-sm"
            >
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-cyan-400" />
                <span className="font-bold">Story Thread</span>
                <span className="px-1.5 py-0.2 rounded-full bg-purple-600 text-[10px] text-white">
                  {threads.length} connected
                </span>
              </div>
              <ChevronRight size={14} className={`transform transition-transform ${showThreadSheet ? 'rotate-90' : ''}`} />
            </button>
          </div>
        )}

        {/* THREADS EXPANDED DRAWER */}
        {showThreadSheet && (
          <div className="relative z-20 mx-4 p-3 rounded-2xl bg-[#090c1a]/95 backdrop-blur-xl border border-purple-500/30 max-h-48 overflow-y-auto space-y-2">
            <div className="text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
              <span>Friends who added their moment:</span>
              <button
                onClick={() => setActiveThreadIdx(null)}
                className="text-[10px] text-purple-400 hover:underline"
              >
                View Root
              </button>
            </div>

            {threads.map((t, idx) => (
              <div
                key={t.id}
                onClick={() => setActiveThreadIdx(idx)}
                className={`flex items-center gap-2.5 p-1.5 rounded-xl cursor-pointer ${
                  activeThreadIdx === idx ? 'bg-purple-600/30 border border-purple-400/40' : 'hover:bg-white/10'
                }`}
              >
                <img src={t.author.avatarUrl} alt={t.author.name} className="w-6 h-6 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-bold text-white block">{t.author.name}</span>
                  <span className="text-[10px] text-slate-300 truncate block">{t.caption}</span>
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-white/10 flex items-center gap-1.5">
              <input
                type="text"
                value={threadInputText}
                onChange={(e) => setThreadInputText(e.target.value)}
                placeholder="Add your moment to thread..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 text-[11px] text-white border border-white/10"
              />
              <button
                onClick={handleAddThreadMoment}
                className="px-2.5 py-1.5 rounded-lg bg-purple-600 text-[11px] font-bold text-white"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Bottom Reply Bar & Reactions */}
        <div className="relative z-10 p-4 space-y-2">
          {sentMessage && (
            <div className="text-center text-xs font-semibold text-emerald-400 bg-black/60 py-1 rounded-xl">
              Reply sent to {displayStory?.author.name}!
            </div>
          )}

          <div className="flex items-center gap-2">
            <form onSubmit={handleSendReply} className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Send a message..."
                className="w-full px-4 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs text-white placeholder-slate-300 focus:outline-none focus:border-purple-400"
              />
              <button
                type="submit"
                className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white flex-shrink-0"
              >
                <Send size={15} />
              </button>
            </form>

            <button
              onClick={() => {
                setSentMessage(true);
                setTimeout(() => setSentMessage(false), 2000);
              }}
              className="w-9 h-9 rounded-full bg-rose-500/20 backdrop-blur-md border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0 hover:scale-110 transition-transform"
            >
              <Heart size={18} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
