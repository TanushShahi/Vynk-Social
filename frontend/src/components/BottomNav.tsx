import React from 'react';
import { Home, Compass, Users, Plus, MessageSquare, User, Film } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export type NavTab = 'home' | 'discover' | 'rooms' | 'vibes' | 'messages' | 'profile';

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onCreateClick: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  onCreateClick,
}) => {
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 py-2 bg-[#0a0d1e]/95 backdrop-blur-xl border-t border-white/[0.08] flex items-center justify-around max-w-lg mx-auto sm:rounded-t-3xl shadow-2xl">
      {/* Home */}
      <button
        onClick={() => onTabChange('home')}
        className={`flex flex-col items-center gap-0.5 transition-all p-1.5 ${
          currentTab === 'home' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Home size={20} strokeWidth={currentTab === 'home' ? 2.5 : 1.8} />
        {currentTab === 'home' && <span className="w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />}
      </button>

      {/* Discover */}
      <button
        onClick={() => onTabChange('discover')}
        className={`flex flex-col items-center gap-0.5 transition-all p-1.5 ${
          currentTab === 'discover' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Compass size={20} strokeWidth={currentTab === 'discover' ? 2.5 : 1.8} />
        {currentTab === 'discover' && <span className="w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />}
      </button>

      {/* Social Rooms (Feature #6) */}
      <button
        onClick={() => onTabChange('rooms')}
        className={`flex flex-col items-center gap-0.5 transition-all p-1.5 ${
          currentTab === 'rooms' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Users size={20} strokeWidth={currentTab === 'rooms' ? 2.5 : 1.8} />
        {currentTab === 'rooms' && <span className="w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />}
      </button>

      {/* Center Create Button (+) */}
      <button
        onClick={onCreateClick}
        aria-label="Create new moment"
        className="relative -top-2 w-11 h-11 rounded-full bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(139,92,246,0.5)] hover:scale-105 active:scale-95 transition-transform"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>

      {/* Vibes (Vertical Videos) */}
      <button
        onClick={() => onTabChange('vibes')}
        className={`flex flex-col items-center gap-0.5 transition-all p-1.5 ${
          currentTab === 'vibes' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Film size={20} strokeWidth={currentTab === 'vibes' ? 2.5 : 1.8} />
        {currentTab === 'vibes' && <span className="w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />}
      </button>

      {/* Messages */}
      <button
        onClick={() => onTabChange('messages')}
        className={`flex flex-col items-center gap-0.5 transition-all p-1.5 relative ${
          currentTab === 'messages' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <MessageSquare size={20} strokeWidth={currentTab === 'messages' ? 2.5 : 1.8} />
        {currentTab === 'messages' && <span className="w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />}
        <span className="absolute 1 top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
      </button>

      {/* Profile */}
      <button
        onClick={() => onTabChange('profile')}
        className={`flex flex-col items-center gap-0.5 transition-all p-1.5 ${
          currentTab === 'profile' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className={`w-6 h-6 rounded-full object-cover border ${
              currentTab === 'profile' ? 'border-cyan-400 ring-2 ring-purple-500/50' : 'border-transparent'
            }`}
          />
        ) : (
          <User size={20} strokeWidth={currentTab === 'profile' ? 2.5 : 1.8} />
        )}
        {currentTab === 'profile' && <span className="w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />}
      </button>
    </nav>
  );
};
