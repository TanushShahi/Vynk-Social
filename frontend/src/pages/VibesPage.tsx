import React, { useState, useEffect } from 'react';
import { Heart, Sparkles, MessageCircle, Share2, Music, Plus, Check, ChevronUp, ChevronDown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Post, WaveReactionType } from '../types/index.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { CommentModal } from '../components/CommentModal.js';

export const VibesPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'for_you' | 'following'>('for_you');
  const [videos, setVideos] = useState<Post[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadVideos();
  }, [activeTab]);

  const loadVideos = async () => {
    setIsLoading(true);
    try {
      const res = await api.getVibesFeed(activeTab);
      setVideos(res.videos);
      if (res.videos.length > 0) {
        // Record view on current video
        api.recordVideoView(res.videos[0].id).catch(console.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < videos.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      api.recordVideoView(videos[nextIdx].id).catch(console.error);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleWave = async (type: WaveReactionType) => {
    if (!currentVideo) return;
    if (type === 'inspire' || type === 'love') {
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.7 },
        colors: type === 'inspire' ? ['#8b5cf6', '#ec4899', '#06b6d4'] : ['#f43f5e', '#ec4899']
      });
    }

    try {
      const res = await api.reactToPost(currentVideo.id, type);
      setVideos(prev => prev.map((v, i) => i === currentIndex ? {
        ...v,
        userReaction: res.userReaction,
        reactionsSummary: res.reactionsSummary,
        totalReactions: res.totalReactions
      } : v));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFollow = async (authorId: string) => {
    const isCurrentlyFollowing = !!followingMap[authorId];
    try {
      if (isCurrentlyFollowing) {
        await api.unfollowUser(authorId);
        setFollowingMap(prev => ({ ...prev, [authorId]: false }));
      } else {
        await api.followUser(authorId);
        setFollowingMap(prev => ({ ...prev, [authorId]: true }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const currentVideo = videos[currentIndex];

  const formatCount = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1).replace('.0', '')}K`;
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-120px)] w-full flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!currentVideo) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center p-6 text-center text-slate-400">
        <span className="text-4xl mb-2">🎬</span>
        <h3 className="text-white font-bold text-base mb-1">No short clips yet</h3>
        <p className="text-xs">Be the first to upload a vertical Vynk vibe!</p>
      </div>
    );
  }

  const isAuthorFollowing = !!followingMap[currentVideo.authorId];

  return (
    <div className="relative h-[calc(100vh-115px)] w-full max-w-md mx-auto overflow-hidden bg-black select-none sm:rounded-3xl border border-white/10 shadow-2xl">
      {/* Background Media Clip */}
      <div className="relative w-full h-full">
        <img
          src={currentVideo.media?.[0]?.url || 'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?w=1080'}
          alt={currentVideo.caption}
          className="w-full h-full object-cover brightness-95"
        />

        {/* Shadow overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/85 pointer-events-none" />
      </div>

      {/* Top Tabs: For You | Following (Matching Screen 7) */}
      <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-center gap-6 text-sm font-bold">
        <button
          onClick={() => { setActiveTab('for_you'); setCurrentIndex(0); }}
          className={`relative pb-1 transition-colors ${
            activeTab === 'for_you' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          For You
          {activeTab === 'for_you' && (
            <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full shadow-[0_0_8px_#a855f7]" />
          )}
        </button>

        <button
          onClick={() => { setActiveTab('following'); setCurrentIndex(0); }}
          className={`relative pb-1 transition-colors ${
            activeTab === 'following' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Following
          {activeTab === 'following' && (
            <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full shadow-[0_0_8px_#a855f7]" />
          )}
        </button>
      </div>

      {/* Up / Down Navigation Chevrons */}
      <div className="absolute top-1/2 -translate-y-1/2 left-3 z-20 flex flex-col gap-2 opacity-50 hover:opacity-100 transition-opacity">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white disabled:opacity-20"
        >
          <ChevronUp size={18} />
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === videos.length - 1}
          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white disabled:opacity-20"
        >
          <ChevronDown size={18} />
        </button>
      </div>

      {/* Right Action Column (❤️, ✦, 💬, 📤) */}
      <div className="absolute right-3 bottom-20 z-20 flex flex-col items-center gap-4">
        {/* Creator Avatar with follow (+) badge */}
        <div className="relative mb-1">
          <div className="story-ring p-[1.5px]">
            <img
              src={currentVideo.author.avatarUrl || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150'}
              alt={currentVideo.author.name}
              className="w-11 h-11 rounded-full object-cover border-2 border-black"
            />
          </div>
          <button
            onClick={() => handleToggleFollow(currentVideo.authorId)}
            className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-md transition-all ${
              isAuthorFollowing ? 'bg-emerald-500' : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:scale-110'
            }`}
          >
            {isAuthorFollowing ? <Check size={11} strokeWidth={3} /> : <Plus size={11} strokeWidth={3} />}
          </button>
        </div>

        {/* Love Wave (❤️ 12.4K) */}
        <button
          onClick={() => handleWave('love')}
          className="flex flex-col items-center gap-0.5 group"
        >
          <div className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
            currentVideo.userReaction === 'love'
              ? 'bg-rose-500/30 text-rose-400 ring-2 ring-rose-500'
              : 'bg-black/40 text-white group-hover:bg-rose-500/20 group-hover:text-rose-400'
          }`}>
            <Heart size={22} fill={currentVideo.userReaction === 'love' ? 'currentColor' : 'none'} />
          </div>
          <span className="text-[11px] font-bold text-white drop-shadow-md">
            {formatCount(currentVideo.reactionsSummary.love || 12400)}
          </span>
        </button>

        {/* Inspire Wave (✦ 320) */}
        <button
          onClick={() => handleWave('inspire')}
          className="flex flex-col items-center gap-0.5 group"
        >
          <div className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
            currentVideo.userReaction === 'inspire'
              ? 'bg-purple-500/35 text-purple-300 ring-2 ring-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
              : 'bg-black/40 text-purple-300 group-hover:bg-purple-500/25 group-hover:text-purple-200'
          }`}>
            <Sparkles size={21} className="text-purple-400 animate-pulse" />
          </div>
          <span className="text-[11px] font-bold text-white drop-shadow-md">
            {formatCount(currentVideo.reactionsSummary.inspire || 320)}
          </span>
        </button>

        {/* Comments (💬 96) */}
        <button
          onClick={() => setShowComments(true)}
          className="flex flex-col items-center gap-0.5 group"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-white/20 transition-all">
            <MessageCircle size={22} />
          </div>
          <span className="text-[11px] font-bold text-white drop-shadow-md">
            {formatCount(currentVideo.commentsCount || 96)}
          </span>
        </button>

        {/* Share */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert('Vibe link copied!');
          }}
          className="flex flex-col items-center gap-0.5 group"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-white/20 transition-all">
            <Share2 size={21} />
          </div>
          <span className="text-[11px] font-bold text-white drop-shadow-md">Share</span>
        </button>
      </div>

      {/* Bottom Creator Info & Audio Badge (Matching Screen 7) */}
      <div className="absolute bottom-4 left-4 right-16 z-20 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-white drop-shadow-md">
            {currentVideo.author.name}
          </span>
          <span className="text-xs text-slate-300">@{currentVideo.author.uid}</span>
          <button
            onClick={() => handleToggleFollow(currentVideo.authorId)}
            className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/20"
          >
            {isAuthorFollowing ? 'Following' : 'Follow'}
          </button>
        </div>

        <p className="text-xs text-slate-100 font-normal leading-relaxed drop-shadow-md line-clamp-2">
          {currentVideo.caption}
        </p>

        {/* Music / Audio Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-xs text-purple-200 shadow-sm">
          <Music size={13} className="text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span className="text-[11px] font-medium tracking-wide">
            {currentVideo.audioTitle || 'Original Audio - Sunset Flow'}
          </span>
        </div>
      </div>

      {/* Comment Modal */}
      <CommentModal
        postId={currentVideo.id}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        onCommentAdded={() => {
          setVideos(prev => prev.map((v, i) => i === currentIndex ? { ...v, commentsCount: (v.commentsCount || 0) + 1 } : v));
        }}
      />
    </div>
  );
};
