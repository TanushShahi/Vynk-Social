import React, { useState } from 'react';
import { Heart, Sparkles, MessageCircle, Share2, Bookmark, MoreHorizontal, Users } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Post, WaveReactionType, WAVE_REACTIONS } from '../types/index.js';
import { api, resolveMediaUrl } from '../services/api.js';
import { ReactionPickerModal } from './ReactionPickerModal.js';
import { CommentModal } from './CommentModal.js';
import { useAuth } from '../context/AuthContext.js';

interface PostCardProps {
  post: Post;
  onPostUpdated?: (updated: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onPostUpdated }) => {
  const { user } = useAuth();
  const [currentPost, setCurrentPost] = useState<Post>(post);
  const [showPicker, setShowPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isSaved, setIsSaved] = useState(!!post.isSaved);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const handleHidePost = async () => {
    if (!user) return;
    try {
      await api.hidePost(currentPost.id, 'not_interested');
      setIsHidden(true);
      setShowOptions(false);
    } catch (err) {
      console.error('Failed to hide post', err);
    }
  };

  const handleUnhidePost = async () => {
    if (!user) return;
    try {
      await api.unhidePost(currentPost.id);
      setIsHidden(false);
    } catch (err) {
      console.error('Failed to unhide post', err);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this moment?')) return;
    try {
      await api.deletePost(currentPost.id);
      setIsDeleted(true);
      setShowOptions(false);
    } catch (err) {
      console.error('Failed to delete post', err);
    }
  };

  const handleWaveReaction = async (type: WaveReactionType) => {
    if (!user) {
      alert('Please sign in to react to posts.');
      return;
    }

    // Trigger visual confetti for Inspire / Love
    if (type === 'inspire' || type === 'love') {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.8 },
        colors: type === 'inspire' ? ['#8b5cf6', '#ec4899', '#06b6d4'] : ['#f43f5e', '#ec4899']
      });
    }

    try {
      const res = await api.reactToPost(currentPost.id, type);
      const updated = {
        ...currentPost,
        userReaction: res.userReaction,
        reactionsSummary: res.reactionsSummary,
        totalReactions: res.totalReactions,
        topReaction: res.topReaction
      };
      setCurrentPost(updated);
      onPostUpdated?.(updated);
    } catch (err) {
      console.error('Reaction failed', err);
    }
  };

  const handleToggleSave = async () => {
    if (!user) return;
    try {
      const res = await api.toggleSave(currentPost.id);
      setIsSaved(res.isSaved);
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Moment by ${currentPost.author.name} on Vynk`,
          text: currentPost.caption,
          url: window.location.href,
        });
      } catch {
        // Ignored
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  // Helper to format counts: 2400 -> 2.4K
  const formatCount = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1).replace('.0', '')}K`;
    return num.toString();
  };

  const mediaItem = currentPost.media?.[0];

  if (isDeleted) return null;

  if (isHidden) {
    return (
      <div className="w-full glass-card rounded-2xl p-3 border border-white/[0.08] mb-4 flex items-center justify-between text-xs text-slate-400">
        <span>Moment hidden from your feed based on your preferences.</span>
        <button onClick={handleUnhidePost} className="text-purple-400 font-semibold hover:underline cursor-pointer">
          Undo
        </button>
      </div>
    );
  }

  return (
    <article className="w-full glass-card rounded-3xl p-4 sm:p-5 border border-white/[0.08] shadow-lg mb-4 relative">
      {/* Collab Banner if isCollab */}
      {currentPost.isCollab && (
        <div className="mb-3 px-3 py-2 rounded-2xl bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-slate-900/60 border border-purple-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center shadow-sm">
              <Users size={12} className="text-white" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-purple-200 uppercase tracking-wider block leading-none">
                Collab Moment
              </span>
              <span className="text-xs text-white font-bold">
                {currentPost.collabTitle || 'Shared Experience'}
              </span>
            </div>
          </div>
          {currentPost.collaborators && currentPost.collaborators.length > 0 && (
            <div className="flex items-center -space-x-2">
              {currentPost.collaborators.map((c) => (
                <img
                  key={c.id}
                  src={c.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={c.name}
                  title={`${c.name} (@${c.uid})`}
                  className="w-6 h-6 rounded-full border-2 border-[#0d1020] object-cover ring-1 ring-cyan-400/40"
                />
              ))}
              <span className="text-[10px] text-purple-300 pl-2.5 font-semibold">
                +{currentPost.collaborators.length} co-creators
              </span>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-3">
          <div className="story-ring p-[1.5px]">
            <img
              src={resolveMediaUrl(currentPost.author.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')}
              alt={currentPost.author.name}
              className="w-10 h-10 rounded-full object-cover border border-[#0a0d1a]"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-white">{currentPost.author.name}</span>
              {currentPost.author.isVerified && (
                <span className="text-cyan-400 text-xs">✦</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>@{currentPost.author.uid}</span>
              <span>•</span>
              <span>2h</span>
            </div>
          </div>
        </div>

        <div className="relative">
          <button 
            aria-label="Post options"
            onClick={() => setShowOptions(prev => !prev)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
          >
            <MoreHorizontal size={18} />
          </button>

          {showOptions && (
            <div className="absolute right-0 top-9 w-44 bg-[#0d1024] border border-white/15 rounded-2xl p-1.5 shadow-2xl z-20 space-y-1 animate-in fade-in duration-150">
              <button
                onClick={handleHidePost}
                className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-white/10 hover:text-white flex items-center gap-2 cursor-pointer"
              >
                <span>Hide from Feed</span>
              </button>
              {(user?.id === currentPost.authorId || user?.id === currentPost.author?.id) && (
                <button
                  onClick={handleDeletePost}
                  className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-rose-400 hover:bg-rose-500/20 flex items-center gap-2 font-medium cursor-pointer"
                >
                  <span>Delete Moment</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Media Image */}
      {mediaItem && (
        <div className="relative w-full rounded-2xl overflow-hidden mb-3.5 bg-slate-900 border border-white/[0.05]">
          <img
            src={resolveMediaUrl(mediaItem.url)}
            alt={mediaItem.altText || currentPost.caption}
            loading="lazy"
            className="w-full h-auto max-h-[500px] object-cover rounded-2xl transition-transform duration-300 hover:scale-[1.01]"
          />
        </div>
      )}

      {/* Caption & Hashtags */}
      <div className="mb-3.5 space-y-1.5">
        <p className="text-sm text-slate-100 font-normal leading-relaxed">
          {currentPost.caption}
        </p>

        {currentPost.tags && currentPost.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {currentPost.tags.map((tag, idx) => (
              <span 
                key={idx} 
                className="text-xs font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-pink-400 hover:underline cursor-pointer"
              >
                {tag.startsWith('#') ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Reactions & Interaction Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] relative">
        <div className="flex items-center gap-3">
          {/* Reaction Trigger: Love ❤️ */}
          <div className="relative">
            <button
              onClick={() => handleWaveReaction('love')}
              onContextMenu={(e) => {
                e.preventDefault();
                setShowPicker(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                currentPost.userReaction === 'love'
                  ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40'
                  : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
              }`}
            >
              <Heart
                size={17}
                fill={currentPost.userReaction === 'love' ? 'currentColor' : 'none'}
                className="text-rose-400"
              />
              <span>{formatCount(currentPost.reactionsSummary.love || 2400)}</span>
            </button>

            {/* Reaction picker popover */}
            <ReactionPickerModal
              isOpen={showPicker}
              currentReaction={currentPost.userReaction}
              onSelect={handleWaveReaction}
              onClose={() => setShowPicker(false)}
            />
          </div>

          {/* Inspire Reaction (✦) - Distinct social metric! */}
          <button
            onClick={() => handleWaveReaction('inspire')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentPost.userReaction === 'inspire'
                ? 'bg-purple-500/25 text-purple-300 ring-1 ring-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                : 'text-slate-300 hover:bg-white/[0.07] hover:text-purple-300'
            }`}
          >
            <Sparkles size={16} className="text-purple-400" />
            <span>{formatCount(currentPost.reactionsSummary.inspire || 412)}</span>
          </button>

          {/* Comment Trigger */}
          <button
            onClick={() => setShowComments(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:bg-white/[0.07] hover:text-white transition-all"
          >
            <MessageCircle size={17} />
            <span>{currentPost.commentsCount || 52}</span>
          </button>
        </div>

        {/* Right side: Share & Save */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleShare}
            aria-label="Share moment"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors relative"
          >
            <Share2 size={17} />
            {copyFeedback && (
              <span className="absolute -top-7 right-0 px-2 py-0.5 rounded-md bg-purple-900 text-[10px] text-white whitespace-nowrap shadow-md">
                Link copied!
              </span>
            )}
          </button>

          <button
            onClick={handleToggleSave}
            aria-label="Save moment"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isSaved ? 'text-purple-400' : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <Bookmark size={17} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {/* Comment Modal */}
      <CommentModal
        postId={currentPost.id}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        onCommentAdded={() => {
          setCurrentPost(prev => ({ ...prev, commentsCount: (prev.commentsCount || 0) + 1 }));
        }}
      />
    </article>
  );
};
