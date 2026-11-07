import React from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface StoryUser {
  id: string;
  name: string;
  avatarUrl: string;
  hasUnseen?: boolean;
}

interface StoryTrayProps {
  onStoryClick?: (user: StoryUser) => void;
  onAddStoryClick?: () => void;
}

export const StoryTray: React.FC<StoryTrayProps> = ({ onStoryClick, onAddStoryClick }) => {
  const { user } = useAuth();

  const mockStories: StoryUser[] = [
    {
      id: 'user_riya_03',
      name: 'Riya',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      hasUnseen: true
    },
    {
      id: 'user_arjun_04',
      name: 'Arjun',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      hasUnseen: true
    },
    {
      id: 'user_sneha_05',
      name: 'Sneha',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
      hasUnseen: true
    },
    {
      id: 'user_kabir_06',
      name: 'Kabir',
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
      hasUnseen: true
    }
  ];

  return (
    <div className="w-full px-4 py-3 overflow-x-auto no-scrollbar flex items-center gap-4 border-b border-white/[0.04]">
      {/* Current User Story */}
      <div 
        onClick={onAddStoryClick}
        className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0 group"
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-full p-[2px] bg-slate-800">
            <img
              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt="Your story"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-cyan-500 border-2 border-[#080a14] flex items-center justify-center text-white shadow-sm">
            <Plus size={12} strokeWidth={3} />
          </div>
        </div>
        <span className="text-xs font-medium text-slate-300 group-hover:text-white">Your Story</span>
      </div>

      {/* Friends Stories */}
      {mockStories.map((story) => (
        <div
          key={story.id}
          onClick={() => onStoryClick?.(story)}
          className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0 group"
        >
          <div className="story-ring hover:scale-105 transition-transform duration-200">
            <div className="w-[60px] h-[60px] rounded-full p-[2px] bg-[#080a14]">
              <img
                src={story.avatarUrl}
                alt={story.name}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          </div>
          <span className="text-xs font-medium text-slate-300 group-hover:text-white">{story.name}</span>
        </div>
      ))}
    </div>
  );
};
