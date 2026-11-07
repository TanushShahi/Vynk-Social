import React, { useState, useEffect } from 'react';
import { StoryTray } from '../components/StoryTray.js';
import { MoodFilterBar } from '../components/MoodFilterBar.js';
import { PostCard } from '../components/PostCard.js';
import { Post } from '../types/index.js';
import { api } from '../services/api.js';
import { useMood } from '../context/MoodContext.js';

interface FeedPageProps {
  onStoryClick?: (user: any) => void;
  onAddStoryClick?: () => void;
}

export const FeedPage: React.FC<FeedPageProps> = ({ onStoryClick, onAddStoryClick }) => {
  const { currentMood } = useMood();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFeed = async () => {
    setIsLoading(true);
    try {
      const res = await api.getFeed(currentMood);
      setPosts(res.posts);
    } catch (err) {
      console.error('Failed to load feed', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [currentMood]);

  return (
    <div className="w-full pb-24">
      {/* Stories Tray */}
      <StoryTray onStoryClick={onStoryClick} onAddStoryClick={onAddStoryClick} />

      {/* Mood Filters */}
      <MoodFilterBar />

      {/* Posts Stream */}
      <div className="px-3 sm:px-4 pt-2 max-w-xl mx-auto">
        {isLoading ? (
          // Skeleton loading states
          <div className="space-y-4 pt-2">
            {[1, 2].map((i) => (
              <div key={i} className="glass-card rounded-3xl p-4 border border-white/[0.08] animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-slate-800" />
                  <div className="space-y-1.5 flex-1">
                    <div className="w-24 h-3 bg-slate-800 rounded" />
                    <div className="w-16 h-2 bg-slate-800/60 rounded" />
                  </div>
                </div>
                <div className="w-full h-64 bg-slate-800/50 rounded-2xl mb-4" />
                <div className="w-3/4 h-3 bg-slate-800 rounded mb-2" />
                <div className="w-1/2 h-2.5 bg-slate-800/60 rounded" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center text-slate-400 glass-card rounded-3xl p-8 border border-white/[0.06] mt-4">
            <span className="text-4xl mb-3 block">🌌</span>
            <h3 className="text-base font-bold text-white mb-1">No moments yet in this mood</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
              Be the first to share an inspiring moment under the <span className="text-purple-400 font-semibold">{currentMood}</span> mood!
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPostUpdated={(updated) => {
                setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};
