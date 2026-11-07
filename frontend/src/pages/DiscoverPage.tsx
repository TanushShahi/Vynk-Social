import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Sparkles, Film, Grid, Tag, X } from 'lucide-react';
import { api } from '../services/api.js';
import { UserProfile, Post, GlobalSearchResponse } from '../types/index.js';

export const DiscoverPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Users' | 'Posts' | 'Videos' | 'Hashtags'>('All');
  const [suggested, setSuggested] = useState<UserProfile[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [searchResults, setSearchResults] = useState<GlobalSearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    api.getSuggested().then(res => {
      setSuggested(res.suggestions);
      const initialMap: Record<string, boolean> = {};
      res.suggestions.forEach(u => {
        initialMap[u.id] = !!u.isFollowing;
      });
      setFollowingMap(initialMap);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.globalSearch(searchQuery.trim());
        setSearchResults(res);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleToggleFollow = async (user: UserProfile) => {
    const isCurrentlyFollowing = !!followingMap[user.id];
    try {
      if (isCurrentlyFollowing) {
        await api.unfollowUser(user.id);
        setFollowingMap(prev => ({ ...prev, [user.id]: false }));
      } else {
        await api.followUser(user.id);
        setFollowingMap(prev => ({ ...prev, [user.id]: true }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const trendingTopics = [
    {
      tag: '#Travel',
      count: '2.4M posts',
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80'
    },
    {
      tag: '#Tech',
      count: '1.8M posts',
      image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80'
    },
    {
      tag: '#CollegeLife',
      count: '1.1M posts',
      image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80'
    }
  ];

  return (
    <div className="w-full pb-24 max-w-xl mx-auto px-4 pt-3">
      {/* Search Bar */}
      <div className="relative mb-3.5">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users, posts, videos, hashtags..."
          className="w-full pl-11 pr-10 py-3 rounded-2xl glass-input text-xs placeholder-slate-500 font-medium"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter Pills (All, Users, Posts, Videos, Hashtags) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-5">
        {(['All', 'Users', 'Posts', 'Videos', 'Hashtags'] as const).map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-sm'
                  : 'bg-white/[0.05] text-slate-400 hover:text-white'
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* SEARCH RESULTS VIEW (When query present) */}
      {searchResults ? (
        <div className="space-y-5">
          {/* User Results */}
          {(activeFilter === 'All' || activeFilter === 'Users') && searchResults.users.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-2">Users</h3>
              <div className="space-y-2">
                {searchResults.users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-2xl glass-card border border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <img src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <div className="text-xs font-bold text-white">{u.name}</div>
                        <div className="text-[11px] text-slate-400">@{u.uid}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleFollow(u)}
                      className="px-3.5 py-1 rounded-full text-xs font-semibold bg-purple-600 text-white"
                    >
                      {followingMap[u.id] ? 'Following' : 'Follow'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos Results */}
          {(activeFilter === 'All' || activeFilter === 'Videos') && searchResults.videos.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-2 flex items-center gap-1.5">
                <Film size={14} />
                <span>Vynk Vibes</span>
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {searchResults.videos.map(v => (
                  <div key={v.id} className="relative aspect-[9/16] rounded-2xl overflow-hidden group border border-white/10">
                    <img src={v.media?.[0]?.url} alt={v.caption} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex flex-col justify-end p-2.5">
                      <span className="text-xs font-bold text-white line-clamp-1">{v.caption}</span>
                      <span className="text-[10px] text-purple-300">✦ {v.viewsCount || 120000} views</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hashtag Results */}
          {(activeFilter === 'All' || activeFilter === 'Hashtags') && searchResults.hashtags.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-2">Hashtags</h3>
              <div className="space-y-1.5">
                {searchResults.hashtags.map(h => (
                  <div key={h.tag} className="p-3 rounded-xl glass-card flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-300">{h.tag}</span>
                    <span className="text-slate-400">{(h.count / 1000000).toFixed(1)}M posts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* DEFAULT DISCOVER VIEW (Matching Screen 6) */
        <>
          {/* Trending Header & Cards */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-white font-bold text-sm">
                <TrendingUp size={16} className="text-cyan-400" />
                <span>Trending</span>
              </div>
              <button className="text-xs font-semibold text-purple-400 hover:text-purple-300">
                See all
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {trendingTopics.map((topic, i) => (
                <div
                  key={i}
                  onClick={() => setSearchQuery(topic.tag)}
                  className="relative aspect-[3/4] rounded-2xl overflow-hidden group cursor-pointer border border-white/10 shadow-lg"
                >
                  <img
                    src={topic.image}
                    alt={topic.tag}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 brightness-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-2.5">
                    <span className="text-xs font-bold text-white leading-tight">{topic.tag}</span>
                    <span className="text-[10px] text-slate-300 font-medium">{topic.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested For You Creators */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-white font-bold text-sm">
                <Sparkles size={16} className="text-purple-400" />
                <span>Suggested for you</span>
              </div>
              <button className="text-xs font-semibold text-purple-400 hover:text-purple-300">
                See all
              </button>
            </div>

            <div className="space-y-3">
              {suggested.map((creator) => {
                const isFollowing = !!followingMap[creator.id];
                return (
                  <div
                    key={creator.id}
                    className="flex items-center justify-between p-3 rounded-2xl glass-card border border-white/[0.06]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="story-ring p-[1px]">
                        <img
                          src={creator.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                          alt={creator.name}
                          className="w-11 h-11 rounded-full object-cover border border-[#080a14]"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-white">{creator.name}</span>
                          {creator.isVerified && <span className="text-cyan-400 text-xs">✦</span>}
                        </div>
                        <span className="text-[11px] text-slate-400">@{creator.uid}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleFollow(creator)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                        isFollowing
                          ? 'bg-white/[0.08] text-slate-300 hover:bg-rose-500/20 hover:text-rose-300'
                          : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-glow-sm hover:scale-105'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
