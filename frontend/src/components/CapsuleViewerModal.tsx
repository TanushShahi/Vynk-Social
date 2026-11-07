import React, { useState } from 'react';
import { X, MapPin, Music, Calendar, Plus, Users, Clock, Send, Lock, Sparkles, Image as ImageIcon } from 'lucide-react';
import { MomentCapsule, CapsuleItem } from '../types/index.js';
import { api } from '../services/api.js';

interface CapsuleViewerModalProps {
  capsule: MomentCapsule | null;
  isOpen: boolean;
  onClose: () => void;
  onItemAdded?: (newItem: CapsuleItem) => void;
}

export const CapsuleViewerModal: React.FC<CapsuleViewerModalProps> = ({
  capsule,
  isOpen,
  onClose,
  onItemAdded
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [itemType, setItemType] = useState<'photo' | 'video' | 'note'>('photo');
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [locationName, setLocationName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localItems, setLocalItems] = useState<CapsuleItem[]>(capsule?.items || []);

  React.useEffect(() => {
    if (capsule?.items) {
      setLocalItems(capsule.items);
    }
  }, [capsule]);

  if (!isOpen || !capsule) return null;

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() && !mediaUrl.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.addCapsuleItem(capsule.id, {
        itemType,
        caption: caption.trim(),
        mediaUrl: mediaUrl.trim() || undefined,
        locationName: locationName.trim() || undefined,
        dateMoment: new Date().toISOString()
      });
      setLocalItems(prev => [...prev, res.item]);
      onItemAdded?.(res.item);
      setCaption('');
      setMediaUrl('');
      setLocationName('');
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-[#090c1c] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Hero Banner */}
        <div className="relative w-full h-48 bg-slate-900 overflow-hidden flex-shrink-0">
          <img
            src={capsule.coverUrl}
            alt={capsule.title}
            className="w-full h-full object-cover brightness-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090c1c] via-[#090c1c]/40 to-black/60" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 z-10"
          >
            <X size={18} />
          </button>

          {/* Category Tag & Privacy Badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
            <span className="px-2.5 py-1 rounded-full bg-purple-600/60 backdrop-blur-md border border-purple-400/40 text-[11px] font-bold text-white shadow-sm">
              {capsule.category}
            </span>
            {capsule.isLocked && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/30 backdrop-blur-md border border-amber-400/40 text-[10px] font-semibold text-amber-200 flex items-center gap-1">
                <Lock size={10} />
                Sealed
              </span>
            )}
          </div>

          {/* Title & Metadata on Cover */}
          <div className="absolute bottom-3 left-5 right-5 z-10">
            <h2 className="text-2xl font-extrabold text-white tracking-tight drop-shadow-md">
              {capsule.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-300">
              {capsule.locationName && (
                <span className="flex items-center gap-1 text-cyan-300">
                  <MapPin size={12} />
                  {capsule.locationName}
                </span>
              )}
              {capsule.musicTitle && (
                <span className="flex items-center gap-1 text-pink-300">
                  <Music size={12} />
                  {capsule.musicTitle}
                </span>
              )}
              {capsule.startDate && (
                <span className="flex items-center gap-1 text-slate-400">
                  <Calendar size={12} />
                  {capsule.startDate}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Collaborators Row */}
        <div className="px-5 py-2.5 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-purple-400" />
            <span className="text-slate-400">Collaborators:</span>
            <div className="flex items-center -space-x-1.5">
              <img
                src={capsule.author.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={capsule.author.name}
                title={`Creator: ${capsule.author.name}`}
                className="w-6 h-6 rounded-full object-cover border-2 border-[#090c1c]"
              />
              {capsule.collaborators?.map(c => (
                <img
                  key={c.id}
                  src={c.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                  alt={c.name}
                  title={`Co-creator: ${c.name}`}
                  className="w-6 h-6 rounded-full object-cover border-2 border-[#090c1c]"
                />
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-1 transition-all"
          >
            <Plus size={13} />
            <span>Add Moment</span>
          </button>
        </div>

        {/* Add Moment Form (Expandable) */}
        {showAddForm && (
          <form onSubmit={handleAddItem} className="p-4 bg-purple-950/20 border-b border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles size={13} className="text-purple-400" />
                <span>Add Memory to Capsule Timeline</span>
              </span>
              <div className="flex gap-1">
                {(['photo', 'video', 'note'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setItemType(t)}
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold capitalize ${
                      itemType === t ? 'bg-purple-600 text-white' : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="Media image/video URL (optional)"
              className="w-full px-3 py-1.5 rounded-xl bg-black/40 text-xs text-white border border-white/10"
            />

            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Location tag (e.g. Anjuna Beach, CS Lab)"
              className="w-full px-3 py-1.5 rounded-xl bg-black/40 text-xs text-white border border-white/10"
            />

            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write memory note or reflection..."
              rows={2}
              className="w-full px-3 py-1.5 rounded-xl bg-black/40 text-xs text-white border border-white/10 resize-none"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-3.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-xs font-bold text-white shadow-sm"
              >
                {isSubmitting ? 'Adding...' : 'Save Moment'}
              </button>
            </div>
          </form>
        )}

        {/* TIMELINE VISUALIZATION STREAM */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {capsule.description && (
            <p className="text-xs text-slate-300 leading-relaxed italic border-l-2 border-purple-500 pl-3">
              "{capsule.description}"
            </p>
          )}

          <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-cyan-400 before:via-purple-500 before:to-pink-500">
            {localItems.map((item, idx) => (
              <div key={item.id || idx} className="relative group">
                {/* Timeline node bullet */}
                <div className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full bg-[#090c1c] border-2 border-purple-400 shadow-[0_0_8px_#a855f7] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                </div>

                {/* Timeline Card */}
                <div className="p-4 rounded-2xl glass-card border border-white/[0.08] hover:border-purple-500/30 transition-all space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-purple-300">
                      Moment #{idx + 1} • {item.itemType.toUpperCase()}
                    </span>
                    {item.locationName && (
                      <span className="flex items-center gap-1 text-cyan-300">
                        <MapPin size={11} />
                        {item.locationName}
                      </span>
                    )}
                  </div>

                  {item.mediaUrl && (
                    <div className="rounded-xl overflow-hidden max-h-64 border border-white/10 bg-black/40">
                      <img
                        src={item.mediaUrl}
                        alt="timeline moment"
                        className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-200"
                      />
                    </div>
                  )}

                  {item.caption && (
                    <p className="text-xs text-slate-100 font-normal leading-relaxed whitespace-pre-line">
                      {item.caption}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
