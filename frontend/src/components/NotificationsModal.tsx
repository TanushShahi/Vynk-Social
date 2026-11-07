import React, { useState, useEffect } from 'react';
import { X, Bell, Heart, Sparkles, MessageCircle, Layers, UserPlus, CheckCheck } from 'lucide-react';
import { NotificationItem } from '../types/index.js';
import { api } from '../services/api.js';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'reaction':
        return <Sparkles size={14} className="text-purple-400" />;
      case 'comment':
        return <MessageCircle size={14} className="text-cyan-400" />;
      case 'story_thread':
        return <Layers size={14} className="text-pink-400" />;
      case 'follow':
        return <UserPlus size={14} className="text-emerald-400" />;
      default:
        return <Bell size={14} className="text-purple-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#0a0d1f] border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-pink-500 text-[10px] font-bold text-white shadow-sm">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Bell size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs">All caught up! No notifications yet.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-2xl flex items-start gap-3 transition-colors ${
                  n.isRead ? 'bg-white/[0.02]' : 'bg-purple-950/20 border border-purple-500/20'
                }`}
              >
                <div className="relative">
                  <img
                    src={n.actor.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={n.actor.name}
                    className="w-10 h-10 rounded-full object-cover border border-[#080a14]"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0a0d1f] flex items-center justify-center shadow-sm">
                    {getIcon(n.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-200 leading-snug">{n.content}</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">5m ago</span>
                </div>

                {!n.isRead && (
                  <span className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_6px_#ec4899] mt-1.5 flex-shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
