import React, { useState, useEffect } from 'react';
import { Search, Edit, ArrowLeft, Send, Image as ImageIcon, Sparkles, FolderHeart, Plus, Smile, Check } from 'lucide-react';
import { Conversation, Message, SharedSpaceItem } from '../types/index.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [activeTab, setActiveTab] = useState<'All' | 'Unread' | 'Groups'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Shared Space states
  const [viewMode, setViewMode] = useState<'chat' | 'shared_space'>('chat');
  const [sharedItems, setSharedItems] = useState<SharedSpaceItem[]>([]);
  const [showAddShared, setShowAddShared] = useState(false);
  const [sharedTitle, setSharedTitle] = useState('');
  const [sharedContent, setSharedContent] = useState('');
  const [sharedType, setSharedType] = useState<'photo' | 'note' | 'link' | 'memory'>('note');

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv.id);
      loadSharedSpace(activeConv.id);
    }
  }, [activeConv]);

  const loadConversations = async () => {
    try {
      const res = await api.getConversations();
      setConversations(res.conversations);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const res = await api.getMessages(convId);
      setMessages(res.messages);
    } catch (err) {
      console.error(err);
    }
  };

  const loadSharedSpace = async (convId: string) => {
    try {
      const res = await api.getSharedSpace(convId);
      setSharedItems(res.items);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !messageText.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await api.sendMessage(activeConv.id, { content: messageText.trim() });
      setMessages(prev => [...prev, res.message]);
      setMessageText('');
      loadConversations();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      await api.reactToMessage(messageId, emoji);
      if (activeConv) loadMessages(activeConv.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSharedItem = async () => {
    if (!activeConv || !sharedContent.trim()) return;
    try {
      await api.addSharedSpaceItem(activeConv.id, {
        itemType: sharedType,
        title: sharedTitle || undefined,
        content: sharedContent
      });
      setShowAddShared(false);
      setSharedTitle('');
      setSharedContent('');
      loadSharedSpace(activeConv.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter(c => {
    if (activeTab === 'Unread' && c.unreadCount === 0) return false;
    if (activeTab === 'Groups' && c.type !== 'group') return false;
    if (searchQuery.trim()) {
      return (
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  // ACTIVE CHAT VIEW
  if (activeConv) {
    return (
      <div className="flex flex-col h-[calc(100vh-115px)] max-w-xl mx-auto bg-[#090c1a] border-x border-white/10 sm:rounded-3xl overflow-hidden shadow-2xl">
        {/* Chat Header */}
        <div className="px-4 py-3 bg-[#0c1024] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setActiveConv(null); setViewMode('chat'); }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="relative">
              <img
                src={activeConv.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'}
                alt={activeConv.name}
                className="w-9 h-9 rounded-full object-cover border border-purple-500/30"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black" />
            </div>

            <div>
              <h3 className="font-bold text-sm text-white leading-tight">{activeConv.name}</h3>
              <span className="text-[11px] text-slate-400">
                {activeConv.type === 'group' ? `${activeConv.participants.length} members` : 'Active now'}
              </span>
            </div>
          </div>

          {/* Toggle between Chat & Shared Space */}
          <button
            onClick={() => setViewMode(viewMode === 'chat' ? 'shared_space' : 'chat')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'shared_space'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-glow-sm'
                : 'bg-white/[0.06] hover:bg-white/[0.1] text-purple-300 border border-purple-500/30'
            }`}
          >
            <FolderHeart size={14} />
            <span>Shared Space</span>
            {sharedItems.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
                {sharedItems.length}
              </span>
            )}
          </button>
        </div>

        {/* VIEW 1: MESSAGES STREAM */}
        {viewMode === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-12">
                  <span className="text-3xl mb-2">💬</span>
                  <p className="text-xs">No messages yet. Send a moment or greeting!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                      <div className="flex items-end gap-2 max-w-[80%]">
                        {!isMe && (
                          <img
                            src={msg.sender.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                            alt={msg.sender.name}
                            className="w-7 h-7 rounded-full object-cover mb-1"
                          />
                        )}
                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed ${
                            isMe
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none shadow-md'
                              : 'bg-white/[0.08] text-slate-100 rounded-bl-none border border-white/[0.06]'
                          }`}
                        >
                          {!isMe && activeConv.type === 'group' && (
                            <span className="text-[10px] font-bold text-purple-300 block mb-0.5">
                              {msg.sender.name}
                            </span>
                          )}

                          {msg.mediaUrl && (
                            <div className="mb-2 rounded-xl overflow-hidden max-w-xs">
                              <img src={msg.mediaUrl} alt="message media" className="w-full object-cover" />
                            </div>
                          )}

                          <p>{msg.content}</p>

                          {/* Message Reactions */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-white/10">
                              {msg.reactions.map((r, i) => (
                                <span key={i} className="text-xs bg-black/40 px-1.5 py-0.5 rounded-full" title={r.userName}>
                                  {r.reaction}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hover / Quick Reaction toolbar */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1 px-1">
                        {['❤️', '🔥', '✦', '😂'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleAddReaction(msg.id, emoji)}
                            className="text-xs hover:scale-125 transition-transform"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[#0a0d1e] border-t border-white/[0.08] flex items-center gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Message..."
                disabled={isSending}
                className="flex-1 px-4 py-2.5 rounded-full bg-white/[0.05] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={!messageText.trim() || isSending}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white disabled:opacity-40 shadow-sm"
              >
                <Send size={16} />
              </button>
            </form>
          </>
        ) : (
          /* VIEW 2: ORIGINAL SHARED SPACE */
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Sparkles size={15} className="text-purple-400" />
                  <span>Shared Space</span>
                </h4>
                <p className="text-[11px] text-slate-400">Collaborative moments, notes & links</p>
              </div>

              <button
                onClick={() => setShowAddShared(true)}
                className="px-3 py-1.5 rounded-xl bg-purple-600 text-xs font-semibold text-white flex items-center gap-1 shadow-sm"
              >
                <Plus size={13} />
                <span>Add Item</span>
              </button>
            </div>

            {showAddShared && (
              <div className="mb-4 p-4 rounded-2xl glass-panel border border-purple-500/30 space-y-3">
                <div className="flex items-center gap-2">
                  {(['note', 'link', 'memory'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setSharedType(t)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize ${
                        sharedType === t ? 'bg-purple-600 text-white' : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={sharedTitle}
                  onChange={(e) => setSharedTitle(e.target.value)}
                  placeholder="Title (e.g. Packing list, Playlist link)"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 text-xs text-white border border-white/10"
                />
                <textarea
                  value={sharedContent}
                  onChange={(e) => setSharedContent(e.target.value)}
                  rows={3}
                  placeholder="Content or URL..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 text-xs text-white border border-white/10 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowAddShared(false)} className="px-3 py-1 text-xs text-slate-400">Cancel</button>
                  <button onClick={handleAddSharedItem} className="px-3 py-1 bg-purple-600 rounded-lg text-xs font-semibold text-white">Save</button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {sharedItems.map(item => (
                <div key={item.id} className="p-3.5 rounded-2xl glass-card border border-white/[0.08]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">{item.title || 'Shared Moment'}</span>
                    <span className="text-[10px] text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full capitalize">
                      {item.itemType}
                    </span>
                  </div>

                  {item.mediaUrl && (
                    <div className="mb-2 rounded-xl overflow-hidden max-h-48">
                      <img src={item.mediaUrl} alt={item.title || 'shared'} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">{item.content}</p>

                  <div className="mt-2 text-[10px] text-slate-400">
                    Shared by {item.creatorName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // CONVERSATIONS LIST VIEW (Matching Screen 9)
  return (
    <div className="w-full pb-24 max-w-xl mx-auto px-4 pt-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <h1 className="text-xl font-bold text-white tracking-tight">Messages</h1>
        <button
          onClick={() => alert('New message: Select any contact below or search!')}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10"
        >
          <Edit size={19} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-3.5">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search messages..."
          className="w-full pl-11 pr-4 py-2.5 rounded-2xl glass-input text-xs placeholder-slate-500 font-medium"
        />
      </div>

      {/* Filter Tabs (All, Unread, Groups - Matching Screen 9) */}
      <div className="flex items-center gap-2 mb-4">
        {(['All', 'Unread', 'Groups'] as const).map(tab => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-sm'
                  : 'bg-white/[0.05] text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Conversations List */}
      <div className="space-y-2">
        {filteredConversations.length === 0 ? (
          <div className="py-16 text-center text-slate-400 glass-card rounded-2xl p-6">
            <span className="text-3xl mb-2 block">📬</span>
            <p className="text-xs">No conversations matching this filter.</p>
          </div>
        ) : (
          filteredConversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => setActiveConv(conv)}
              className="flex items-center justify-between p-3 rounded-2xl glass-card hover:bg-white/[0.04] cursor-pointer transition-all border border-white/[0.06]"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="story-ring p-[1px]">
                    <img
                      src={conv.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'}
                      alt={conv.name}
                      className="w-12 h-12 rounded-full object-cover border border-[#080a14]"
                    />
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-cyan-400 border-2 border-[#080a14] shadow-[0_0_8px_#06b6d4]" />
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-xs text-white truncate">{conv.name}</span>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">5m</span>
                  </div>
                  <p className="text-xs text-slate-300 truncate font-normal">
                    {conv.lastMessage}
                  </p>
                </div>
              </div>

              {/* Unread Counter Badge */}
              {conv.unreadCount > 0 && (
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm flex-shrink-0">
                  {conv.unreadCount}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
