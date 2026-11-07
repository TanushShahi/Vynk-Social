import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Sparkles, RefreshCw, Globe, Users, Film, Clock, Archive, Plus, Check } from 'lucide-react';
import { api } from '../services/api.js';
import { MoodType, AudienceType } from '../types/index.js';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

const AVAILABLE_COLLABORATORS = [
  { id: 'user-2', name: 'Elena Rostova', uid: 'vynk.elena99', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
  { id: 'user-3', name: 'Marcus Chen', uid: 'vynk.marcus88', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { id: 'user-4', name: 'Priya Sharma', uid: 'vynk.priya12', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' },
  { id: 'user-5', name: 'Liam O\'Connor', uid: 'vynk.liam_lens', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'Post' | 'Video' | 'Story' | 'Capsule'>('Post');
  const [caption, setCaption] = useState('');
  const [mediaList, setMediaList] = useState<Array<{ url: string; type: 'image' | 'video' }>>([
    {
      url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80',
      type: 'image'
    }
  ]);
  const [mood, setMood] = useState<MoodType>('travel');
  const [audience, setAudience] = useState<AudienceType>('public');
  const [tags, setTags] = useState<string[]>(['#Travel', '#Sunset', '#Nature', '#Peace']);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Collab Post state
  const [isCollab, setIsCollab] = useState(false);
  const [collabTitle, setCollabTitle] = useState('Goa 2026 Trip');
  const [selectedCollabIds, setSelectedCollabIds] = useState<string[]>(['user-2']);

  // Video state
  const [audioTitle, setAudioTitle] = useState('Cyberpunk Pulse • Original');

  // Capsule state
  const [capsuleTitle, setCapsuleTitle] = useState('');
  const [capsuleDesc, setCapsuleDesc] = useState('');
  const [capsuleCategory, setCapsuleCategory] = useState('travel');
  const [capsuleLocation, setCapsuleLocation] = useState('Goa, India');
  const [capsuleMusic, setCapsuleMusic] = useState('Ocean Breeze Lofi');
  const [capsuleMomentCaption, setCapsuleMomentCaption] = useState('First sunset together by the shore');

  // AI Assistant suggestion (Phase 4 AI Intelligence)
  const [selectedTone, setSelectedTone] = useState<string>('friendly');
  const [activeProvider, setActiveProvider] = useState<string>('local_semantic');
  const [aiSuggestion, setAiSuggestion] = useState({
    caption: 'Chasing sunsets and better days. 🌅',
    tags: ['#Travel', '#Sunset', '#Nature', '#Peace'],
    mood: 'travel' as MoodType,
    variations: {} as Record<string, string>,
    writingTip: ''
  });

  useEffect(() => {
    if (isOpen) {
      api.getAIProvider().then(res => {
        if (res?.provider?.provider) {
          setActiveProvider(`${res.provider.provider} (${res.provider.model})`);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleRegenerateAI = async () => {
    setIsAiLoading(true);
    try {
      const res = await api.aiContentAssist({
        topic: caption.trim() || 'A thoughtful moment in life',
        mediaUrl: mediaList[0]?.url,
        tone: selectedTone,
        currentMood: mood
      });
      if (res.success && res.assistant) {
        setAiSuggestion({
          caption: res.assistant.caption,
          tags: res.assistant.hashtags.map((t: string) => `#${t.replace(/^#/, '')}`),
          mood: (res.assistant.suggestedMood?.toLowerCase() || mood) as MoodType,
          variations: res.assistant.toneVariations || {},
          writingTip: res.assistant.writingSuggestions?.[0] || ''
        });
      }
    } catch (err) {
      console.warn('aiContentAssist failed, falling back:', err);
      try {
        const res = await api.getAISuggestions(caption.trim() || 'sunset travel photography');
        setAiSuggestion(prev => ({
          ...prev,
          caption: res.caption,
          tags: res.tags,
          mood: res.mood
        }));
      } catch (fallbackErr) {
        console.error(fallbackErr);
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const applyAISuggestion = (chosenCaption?: string) => {
    setCaption(chosenCaption || aiSuggestion.caption);
    setTags(aiSuggestion.tags);
    setMood(aiSuggestion.mood);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploaded = await api.uploadFile(files[0]);
      setMediaList(prev => [...prev, uploaded]);
    } catch (err) {
      console.error('File upload failed', err);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleCollaborator = (id: string) => {
    setSelectedCollabIds(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handlePublish = async () => {
    setIsSubmitting(true);
    try {
      if (activeTab === 'Post') {
        if (!caption.trim() && mediaList.length === 0) return;
        await api.createPost({
          caption: caption.trim() || aiSuggestion.caption,
          mood,
          audience,
          tags,
          media: mediaList,
          isCollab,
          collabTitle: isCollab ? collabTitle : undefined,
          collaboratorIds: isCollab ? selectedCollabIds : undefined,
        });
      } else if (activeTab === 'Video') {
        await api.createPost({
          caption: caption.trim() || 'New Vibe Drop 🔥',
          mood: 'creative',
          audience,
          tags: ['#VynkVibes', '#Original', '#Motion'],
          media: mediaList.length > 0 ? mediaList : [
            { url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600', type: 'video' }
          ],
          isVideo: true,
          audioTitle,
        });
      } else if (activeTab === 'Story') {
        const storyMedia = mediaList[0]?.url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800';
        await api.createStory({
          mediaUrl: storyMedia,
          caption: caption.trim() || 'Today\'s highlight ✨',
        });
      } else if (activeTab === 'Capsule') {
        if (!capsuleTitle.trim()) {
          alert('Please enter a title for your Moment Capsule.');
          setIsSubmitting(false);
          return;
        }
        await api.createCapsule({
          title: capsuleTitle.trim(),
          description: capsuleDesc.trim() || undefined,
          category: capsuleCategory,
          locationName: capsuleLocation,
          musicTitle: capsuleMusic,
          coverUrl: mediaList[0]?.url || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800',
          collaboratorIds: isCollab ? selectedCollabIds : undefined,
          items: [
            {
              itemType: 'photo',
              mediaUrl: mediaList[0]?.url || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800',
              caption: capsuleMomentCaption || 'Capsule memory opening day',
              locationName: capsuleLocation,
              dateMoment: '2026-05-10',
            }
          ]
        });
      }

      onPostCreated?.();
      onClose();
    } catch (err: any) {
      console.error('Publishing failed', err);
      alert(err.message || 'Failed to publish');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#0a0c18] border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X size={20} />
          </button>
          <h2 className="text-base font-bold text-white tracking-wide">
            {activeTab === 'Capsule' ? 'New Moment Capsule' : `Create ${activeTab}`}
          </h2>
          <div className="w-8" />
        </div>

        {/* Create Types Tabs */}
        <div className="flex items-center justify-between gap-1 p-1 bg-white/[0.04] rounded-2xl mb-4 border border-white/[0.06]">
          {[
            { id: 'Post', icon: ImageIcon, label: 'Post' },
            { id: 'Video', icon: Film, label: 'Vibe' },
            { id: 'Story', icon: Clock, label: 'Story' },
            { id: 'Capsule', icon: Archive, label: 'Capsule' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: POST (with Collab Post toggle) */}
        {activeTab === 'Post' && (
          <>
            {/* Media Upload Area */}
            <div className="relative mb-3">
              <label className="flex flex-col items-center justify-center h-28 rounded-2xl border-2 border-dashed border-white/10 hover:border-purple-500/50 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-all group">
                <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center text-slate-400 group-hover:text-purple-400 mb-1.5 transition-colors">
                  <ImageIcon size={20} />
                </div>
                <span className="text-xs font-semibold text-slate-200">Add Photos / Videos</span>
                <span className="text-[10px] text-slate-500">Tap to upload</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>

            {/* Thumbnail Previews */}
            {mediaList.length > 0 && (
              <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar pb-1">
                {mediaList.map((m, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 group">
                    <img src={m.url} alt="upload preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setMediaList(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <label className="w-16 h-16 rounded-xl border border-dashed border-white/20 flex items-center justify-center text-slate-400 hover:text-white hover:border-purple-400 cursor-pointer flex-shrink-0">
                  <Plus size={16} />
                  <input type="file" accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            )}

            {/* AI Assistant Card (Phase 4 Intelligence) */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-950/40 via-[#101428] to-[#0c0e1e] border border-purple-500/25 mb-3 shadow-sm relative">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1.5 text-purple-300 text-xs font-bold">
                    <Sparkles size={13} className="text-purple-400 animate-pulse" />
                    <span>AI Content Assistant</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5 truncate max-w-[150px]">
                    {activeProvider}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleRegenerateAI}
                    disabled={isAiLoading}
                    title="Generate with chosen tone"
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-600/30 text-purple-300 hover:text-white text-[10px] font-semibold transition-colors cursor-pointer"
                  >
                    <RefreshCw size={10} className={isAiLoading ? 'animate-spin' : ''} />
                    <span>{isAiLoading ? 'Thinking...' : 'Inspire'}</span>
                  </button>
                </div>
              </div>

              {/* Tone Selection Chips (All 8 Tones) */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 mb-2">
                {(['friendly', 'witty', 'poetic', 'minimalist', 'inspirational', 'humorous', 'analytical', 'rebellious'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setSelectedTone(t);
                      if (aiSuggestion.variations[t]) {
                        applyAISuggestion(aiSuggestion.variations[t]);
                      }
                    }}
                    className={`px-2 py-0.5 rounded-md text-[9px] capitalize transition-all whitespace-nowrap cursor-pointer ${
                      selectedTone === t
                        ? 'bg-purple-500 text-white font-bold shadow-sm'
                        : 'bg-white/[0.05] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <p className="text-xs text-slate-200 mb-1.5 font-normal leading-relaxed italic">
                "{aiSuggestion.caption}"
              </p>

              {aiSuggestion.writingTip && (
                <div className="text-[10px] text-cyan-300/80 mb-2 flex items-center gap-1">
                  <span>💡 Tip:</span>
                  <span className="truncate">{aiSuggestion.writingTip}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => applyAISuggestion()}
                className="w-full py-1 text-[10px] font-semibold text-center rounded-lg bg-purple-500/25 text-purple-200 hover:bg-purple-500/40 transition-colors"
              >
                Apply to Caption & Mood
              </button>
            </div>

            {/* Caption Input */}
            <div className="mb-3">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a meaningful caption or note..."
                rows={2}
                className="w-full px-3 py-2 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
              />
            </div>

            {/* Collab Post Section (Feature #5) */}
            <div className="mb-3 p-3 rounded-2xl bg-gradient-to-r from-purple-950/30 to-cyan-950/20 border border-purple-500/20">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-500 flex items-center justify-center">
                    <Users size={13} className="text-white" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block leading-none">Collab Post</span>
                    <span className="text-[10px] text-slate-400">Co-author with friends on one shared post</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isCollab}
                  onChange={(e) => setIsCollab(e.target.checked)}
                  className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                />
              </label>

              {isCollab && (
                <div className="mt-3 pt-2.5 border-t border-white/[0.08] space-y-2">
                  <div>
                    <label className="text-[10px] font-semibold text-purple-200 uppercase tracking-wider block mb-1">
                      Collab Title
                    </label>
                    <input
                      type="text"
                      value={collabTitle}
                      onChange={(e) => setCollabTitle(e.target.value)}
                      placeholder="e.g. GOA 2026, Hackathon Crew"
                      className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-300 block mb-1">
                      Choose Collaborators
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {AVAILABLE_COLLABORATORS.map((collab) => {
                        const isSelected = selectedCollabIds.includes(collab.id);
                        return (
                          <button
                            key={collab.id}
                            type="button"
                            onClick={() => toggleCollaborator(collab.id)}
                            className={`flex items-center gap-2 p-1.5 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'bg-purple-600/30 border-purple-400/60 text-white'
                                : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            <img src={collab.avatar} alt={collab.name} className="w-5 h-5 rounded-full object-cover" />
                            <span className="text-[11px] font-medium truncate flex-1">{collab.name}</span>
                            {isSelected && <Check size={12} className="text-cyan-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mood Selector */}
            <div className="mb-3">
              <label className="text-[10px] font-semibold text-slate-400 mb-1 block">Moment Mood</label>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {(['travel', 'motivated', 'tech', 'creative', 'chill', 'adventure'] as MoodType[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMood(m)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium capitalize transition-all whitespace-nowrap ${
                      mood === m
                        ? 'bg-purple-600 text-white font-semibold'
                        : 'bg-white/[0.05] text-slate-400 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Tab 2: VIDEO (Vynk Vibes) */}
        {activeTab === 'Video' && (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/20 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-bold text-white mb-1">
                <Film size={15} className="text-cyan-400" />
                <span>Vynk Vibes (Vertical Short Video)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Share a quick vertical moment with original audio or music.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Video Cover / Media URL</label>
              <input
                type="text"
                value={mediaList[0]?.url || ''}
                onChange={(e) => setMediaList([{ url: e.target.value, type: 'video' }])}
                placeholder="https://... (or choose preset below)"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setMediaList([{ url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800', type: 'video' }])}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[10px] text-purple-300"
                >
                  ⚡ Preset: Skate Trick
                </button>
                <button
                  type="button"
                  onClick={() => setMediaList([{ url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800', type: 'video' }])}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[10px] text-cyan-300"
                >
                  🎮 Preset: Cyber Synth
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Audio Track Name</label>
              <input
                type="text"
                value={audioTitle}
                onChange={(e) => setAudioTitle(e.target.value)}
                placeholder="e.g. Cyberpunk Pulse • Original"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Caption</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What is this vibe about?"
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* Tab 3: STORY */}
        {activeTab === 'Story' && (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-bold text-white mb-1">
                <Clock size={15} className="text-indigo-400" />
                <span>24h Ephemeral Story</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Moments that disappear in 24 hours. Friends can add connected Story Threads to create chain memories!
              </p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Story Media URL</label>
              <input
                type="text"
                value={mediaList[0]?.url || ''}
                onChange={(e) => setMediaList([{ url: e.target.value, type: 'image' }])}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Story Caption / Prompt</label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. Best coffee spot in town ☕"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Tab 4: CAPSULE (Moment Capsule - Feature #4) */}
        {activeTab === 'Capsule' && (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/40 via-cyan-950/30 to-slate-900 border border-cyan-500/30 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-bold text-white mb-1">
                <Archive size={15} className="text-cyan-400" />
                <span>Moment Capsule</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Preserve curated chapters of life with timeline photos, voice, music, and friend contributions.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Capsule Title *</label>
              <input
                type="text"
                value={capsuleTitle}
                onChange={(e) => setCapsuleTitle(e.target.value)}
                placeholder="e.g. College First Year, Goa Trip 2026"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Category</label>
                <select
                  value={capsuleCategory}
                  onChange={(e) => setCapsuleCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#0f1325] border border-white/10 text-xs text-white focus:outline-none"
                >
                  <option value="travel">Travel</option>
                  <option value="college">College</option>
                  <option value="friends">Friends</option>
                  <option value="life">Life Chapter</option>
                  <option value="career">Career / Work</option>
                  <option value="creative">Creative</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Location</label>
                <input
                  type="text"
                  value={capsuleLocation}
                  onChange={(e) => setCapsuleLocation(e.target.value)}
                  placeholder="e.g. Goa, India"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">Soundtrack / Music Theme</label>
              <input
                type="text"
                value={capsuleMusic}
                onChange={(e) => setCapsuleMusic(e.target.value)}
                placeholder="e.g. Ocean Breeze Lofi"
                className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">Description / Backstory</label>
              <textarea
                value={capsuleDesc}
                onChange={(e) => setCapsuleDesc(e.target.value)}
                placeholder="What made this time special?"
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">First Timeline Moment Caption</label>
              <input
                type="text"
                value={capsuleMomentCaption}
                onChange={(e) => setCapsuleMomentCaption(e.target.value)}
                placeholder="e.g. Reached the beach villa at dawn"
                className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Audience Selector (common to all) */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] my-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Globe size={14} className="text-cyan-400" />
            <span>Audience</span>
          </div>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as AudienceType)}
            className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
          >
            <option value="public" className="bg-[#0f1325]">Public</option>
            <option value="followers" className="bg-[#0f1325]">Followers only</option>
            <option value="friends" className="bg-[#0f1325]">Close friends</option>
            <option value="private" className="bg-[#0f1325]">Private Capsule</option>
          </select>
        </div>

        {/* Submit Button */}
        <button
          onClick={handlePublish}
          disabled={isSubmitting}
          className="w-full py-3 rounded-2xl btn-vynk text-sm font-bold flex items-center justify-center gap-2 shadow-lg cursor-pointer"
        >
          {isSubmitting ? 'Creating...' : `Publish ${activeTab}`}
        </button>
      </div>
    </div>
  );
};
