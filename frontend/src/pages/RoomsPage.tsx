import React, { useState, useEffect } from 'react';
import { 
  Users, MessageSquare, BarChart2, Plus, ArrowLeft, Send, Sparkles, Check, 
  Flame, Clock, Hash, CheckCircle2 
} from 'lucide-react';
import { api } from '../services/api.js';
import { SocialRoom, RoomMessage } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';

const TOPICS = [
  'All',
  'AI & Technology',
  'Gaming',
  'Photography',
  'College Life',
  'Coding',
  'Travel',
  'Music'
];

export const RoomsPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [rooms, setRooms] = useState<SocialRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Room state
  const [activeRoom, setActiveRoom] = useState<SocialRoom | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  // Create Room modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomTopic, setNewRoomTopic] = useState('AI & Technology');
  const [isPermanent, setIsPermanent] = useState(true);

  // Create Poll inside active room
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOption1, setPollOption1] = useState('');
  const [pollOption2, setPollOption2] = useState('');

  const fetchRooms = async (topic?: string) => {
    setIsLoading(true);
    try {
      const t = topic === 'All' ? undefined : topic;
      const res = await api.getRooms(t);
      setRooms(res.rooms);
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms(selectedTopic);
  }, [selectedTopic]);

  const handleOpenRoom = async (room: SocialRoom) => {
    setActiveRoom(room);
    setIsMessagesLoading(true);
    try {
      const res = await api.getRoomMessages(room.id);
      setMessages(res.messages);
    } catch (err) {
      console.error('Failed to load room messages', err);
    } finally {
      setIsMessagesLoading(false);
    }
  };

  const handleToggleJoin = async (room: SocialRoom, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await api.toggleRoomMembership(room.id);
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, isMember: res.isMember, membersCount: res.membersCount } : r));
      if (activeRoom && activeRoom.id === room.id) {
        setActiveRoom(prev => prev ? { ...prev, isMember: res.isMember, membersCount: res.membersCount } : null);
      }
    } catch (err) {
      console.error('Failed to toggle membership', err);
    }
  };

  const handleSendMessage = async () => {
    if (!activeRoom || !newMessage.trim()) return;
    try {
      const res = await api.sendRoomMessage(activeRoom.id, {
        content: newMessage.trim(),
        mediaType: 'text'
      });
      setMessages(prev => [...prev, res.message]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send room message', err);
    }
  };

  const handleCreatePoll = async () => {
    if (!activeRoom || !pollQuestion.trim() || !pollOption1.trim() || !pollOption2.trim()) return;
    try {
      const res = await api.sendRoomMessage(activeRoom.id, {
        pollData: {
          question: pollQuestion.trim(),
          options: [pollOption1.trim(), pollOption2.trim()]
        }
      });
      setMessages(prev => [...prev, res.message]);
      setShowPollCreator(false);
      setPollQuestion('');
      setPollOption1('');
      setPollOption2('');
    } catch (err) {
      console.error('Failed to create poll', err);
    }
  };

  const handleVotePoll = async (messageId: string, optionIndex: number) => {
    if (!activeRoom) return;
    try {
      const res = await api.voteRoomPoll(messageId, optionIndex);
      // Update poll in local message list
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          return { ...m, pollData: res.pollData };
        }
        return m;
      }));
    } catch (err) {
      console.error('Failed to vote', err);
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    try {
      const res = await api.createRoom({
        name: newRoomName.trim(),
        description: newRoomDesc.trim(),
        topic: newRoomTopic,
        isPermanent
      });
      setIsCreateModalOpen(false);
      setNewRoomName('');
      setNewRoomDesc('');
      fetchRooms(selectedTopic);
      handleOpenRoom(res.room);
    } catch (err) {
      console.error('Failed to create room', err);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 pb-24 animate-in fade-in duration-200">
      {/* View 1: Active Room View */}
      {activeRoom ? (
        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col h-[82vh]">
          {/* Room Header */}
          <div className="p-4 bg-gradient-to-r from-purple-950/60 via-[#0e1222] to-slate-900 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveRoom(null)}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-300 hover:text-white"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="w-10 h-10 rounded-2xl overflow-hidden border border-purple-500/30 flex-shrink-0">
                <img
                  src={activeRoom.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'}
                  alt={activeRoom.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-white text-base leading-tight">{activeRoom.name}</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                    {activeRoom.topic}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Users size={12} className="text-cyan-400" />
                    {activeRoom.membersCount} members
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live discussions
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleJoin(activeRoom)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeRoom.isMember
                    ? 'bg-white/[0.08] text-slate-300 hover:bg-rose-500/20 hover:text-rose-400 border border-white/10'
                    : 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md'
                }`}
              >
                {activeRoom.isMember ? 'Joined' : 'Join Room'}
              </button>
            </div>
          </div>

          {/* Room Description Banner */}
          {activeRoom.description && (
            <div className="px-5 py-2.5 bg-white/[0.02] border-b border-white/[0.05] text-xs text-slate-300 flex items-center justify-between">
              <span>{activeRoom.description}</span>
              <button
                onClick={() => setShowPollCreator(!showPollCreator)}
                className="flex items-center gap-1 text-[11px] font-bold text-purple-300 hover:text-purple-200 bg-purple-500/20 px-2.5 py-1 rounded-lg"
              >
                <BarChart2 size={13} />
                <span>+ Launch Poll</span>
              </button>
            </div>
          )}

          {/* Poll Creator Dropdown */}
          {showPollCreator && (
            <div className="p-4 bg-purple-950/40 border-b border-purple-500/30 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                  <BarChart2 size={14} className="text-cyan-400" />
                  Create a Community Poll
                </span>
                <button
                  onClick={() => setShowPollCreator(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Ask the room a question..."
                className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 mb-2 focus:outline-none focus:border-purple-400"
              />
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  type="text"
                  value={pollOption1}
                  onChange={(e) => setPollOption1(e.target.value)}
                  placeholder="Option 1"
                  className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                />
                <input
                  type="text"
                  value={pollOption2}
                  onChange={(e) => setPollOption2(e.target.value)}
                  placeholder="Option 2"
                  className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>
              <button
                onClick={handleCreatePoll}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-xs font-bold shadow-md hover:opacity-90"
              >
                Publish Poll to Room
              </button>
            </div>
          )}

          {/* Messages & Discussions Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
            {isMessagesLoading ? (
              <div className="flex items-center justify-center h-48 text-slate-400 text-xs">
                Loading live discussions...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <MessageSquare size={32} className="mx-auto mb-2 text-slate-600" />
                <p>No messages yet in this room. Break the ice!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = user?.id === msg.sender.id;
                const isPoll = msg.mediaType === 'poll' && msg.pollData;

                return (
                  <div key={msg.id} className="flex items-start gap-2.5">
                    <img
                      src={msg.sender.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={msg.sender.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-white/10"
                    />

                    <div className="flex-1 max-w-[85%]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white">{msg.sender.name}</span>
                        <span className="text-[10px] text-slate-500">@{msg.sender.uid}</span>
                      </div>

                      {/* Normal text message */}
                      {!isPoll && (
                        <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          isMe
                            ? 'bg-purple-600/30 border border-purple-500/40 text-purple-100'
                            : 'bg-white/[0.05] border border-white/10 text-slate-200'
                        }`}>
                          {msg.content}
                        </div>
                      )}

                      {/* Interactive Poll widget (Phase 3 Core Feature) */}
                      {isPoll && msg.pollData && (
                        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#12162b] to-[#0a0d1a] border border-cyan-500/40 shadow-lg">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 mb-2">
                            <BarChart2 size={14} className="text-cyan-400" />
                            <span>Room Poll: {msg.pollData.question}</span>
                          </div>

                          <div className="space-y-2 mb-2">
                            {msg.pollData.options.map((option, idx) => {
                              const isSelected = msg.pollData?.userVote === idx;
                              const percentage = msg.pollData?.totalVotes && msg.pollData.totalVotes > 0
                                ? Math.round((option.votes / msg.pollData.totalVotes) * 100)
                                : 0;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleVotePoll(msg.id, idx)}
                                  className={`w-full relative overflow-hidden rounded-xl border p-2.5 text-left text-xs transition-all ${
                                    isSelected
                                      ? 'border-cyan-400/80 bg-cyan-950/40 font-bold text-white'
                                      : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/40 hover:bg-white/[0.06]'
                                  }`}
                                >
                                  {/* Progress bar background */}
                                  <div
                                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-cyan-600/30 to-purple-600/30 rounded-xl transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                  />

                                  <div className="relative flex items-center justify-between z-10">
                                    <div className="flex items-center gap-2">
                                      {isSelected ? (
                                        <CheckCircle2 size={14} className="text-cyan-400 flex-shrink-0" />
                                      ) : (
                                        <div className="w-3.5 h-3.5 rounded-full border border-slate-500 flex-shrink-0" />
                                      )}
                                      <span>{option.text}</span>
                                    </div>
                                    <span className="text-[11px] font-mono text-cyan-300">
                                      {percentage}% ({option.votes})
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          <div className="text-[10px] text-slate-400 flex items-center justify-between px-1">
                            <span>{msg.pollData.totalVotes} total votes</span>
                            <span>Click any option to cast or update vote</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Message Input Box */}
          <div className="p-3 bg-[#0a0d1a] border-t border-white/10 flex items-center gap-2">
            <button
              onClick={() => setShowPollCreator(!showPollCreator)}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-purple-300 hover:text-white transition-colors"
              title="Add Poll"
            >
              <BarChart2 size={16} />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={`Share thoughts in #${activeRoom.name}...`}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 shadow-md"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      ) : (
        /* View 2: Room Discovery & Listing */
        <div>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center shadow-lg">
                  <Users size={18} className="text-white" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Social Rooms</h1>
              </div>
              <p className="text-xs text-slate-400">
                Temporary & permanent topic spaces. Join discussions, answer polls, and connect around your passions.
              </p>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-bold shadow-lg hover:opacity-95 cursor-pointer"
            >
              <Plus size={15} />
              <span>Create Room</span>
            </button>
          </div>

          {/* Topic Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-5">
            {TOPICS.map((topic) => (
              <button
                key={topic}
                onClick={() => setSelectedTopic(topic)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedTopic === topic
                    ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-md'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.05]'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>

          {/* Room Cards Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="glass-card rounded-3xl h-44 animate-pulse bg-white/[0.02]" />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-3xl p-8 border border-white/10">
              <Users size={40} className="mx-auto mb-3 text-slate-600" />
              <h3 className="text-sm font-bold text-white mb-1">No rooms found for "{selectedTopic}"</h3>
              <p className="text-xs text-slate-400 mb-4">Be the first to start a social room on this topic!</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold"
              >
                Create Room
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => handleOpenRoom(room)}
                  className="glass-card rounded-3xl border border-white/10 overflow-hidden hover:border-purple-500/40 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  {/* Banner */}
                  <div className="h-24 w-full relative bg-slate-900 overflow-hidden">
                    <img
                      src={room.bannerUrl || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600'}
                      alt={room.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#090b16] via-black/40 to-transparent" />
                    
                    <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-cyan-300 border border-white/10 flex items-center gap-1">
                      <Hash size={11} />
                      {room.topic}
                    </span>

                    {room.isPermanent ? (
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-purple-900/70 backdrop-blur-md text-[10px] font-semibold text-purple-200">
                        Permanent
                      </span>
                    ) : (
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-amber-900/70 backdrop-blur-md text-[10px] font-semibold text-amber-200 flex items-center gap-1">
                        <Clock size={10} /> 24h Room
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 -mt-7 mb-2.5">
                        <img
                          src={room.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'}
                          alt={room.name}
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-[#090b16] shadow-md flex-shrink-0"
                        />
                        <div className="pt-4">
                          <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors leading-tight">
                            {room.name}
                          </h3>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3">
                        {room.description || 'Join the live conversation with community members.'}
                      </p>
                    </div>

                    {/* Footer stats & action */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Users size={12} className="text-cyan-400" />
                          {room.membersCount}
                        </span>
                        <span className="flex items-center gap-1 text-purple-300">
                          <Flame size={12} className="text-purple-400" />
                          {room.activeDiscussionsCount || 3} active
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleToggleJoin(room, e)}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                            room.isMember
                              ? 'bg-white/[0.07] text-slate-300 hover:text-white'
                              : 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-sm'
                          }`}
                        >
                          {room.isMember ? 'Joined' : 'Join'}
                        </button>

                        <button className="px-3 py-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-white transition-colors">
                          Enter →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Room Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-[#0a0c18] border border-white/10 rounded-3xl p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Create a Social Room</h3>
            <p className="text-xs text-slate-400 mb-4">
              Gather real people around shared topics, discussions, and live polls.
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Room Name *</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g. NextGen Web & AI Builders"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Topic</label>
                <select
                  value={newRoomTopic}
                  onChange={(e) => setNewRoomTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0f1325] border border-white/10 text-xs text-white focus:outline-none"
                >
                  {TOPICS.filter(t => t !== 'All').map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Description</label>
                <textarea
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  placeholder="What will members discuss and share in this room?"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <span className="text-xs font-bold text-white block">Permanent Room</span>
                  <span className="text-[10px] text-slate-400">Keep as ongoing community rather than 24h temporary</span>
                </div>
                <input
                  type="checkbox"
                  checked={isPermanent}
                  onChange={(e) => setIsPermanent(e.target.checked)}
                  className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={!newRoomName.trim()}
                className="flex-1 py-2.5 rounded-xl btn-vynk text-xs font-bold text-white disabled:opacity-50"
              >
                Launch Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
