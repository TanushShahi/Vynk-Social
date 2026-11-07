import React, { useState, useEffect } from 'react';
import { 
  Settings, QrCode, Share2, Grid, Film, Sparkles, Tag, Plus, Archive, 
  MapPin, Calendar, Award, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { UIDQRModal } from '../components/UIDQRModal.js';
import { CapsuleViewerModal } from '../components/CapsuleViewerModal.js';
import { api } from '../services/api.js';
import { Post, MomentCapsule, UserAchievement } from '../types/index.js';

interface ProfilePageProps {
  onLogoutClick?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onLogoutClick }) => {
  const { user, refreshUser } = useAuth();
  const [showQRModal, setShowQRModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'videos' | 'capsules' | 'tagged'>('posts');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [capsules, setCapsules] = useState<MomentCapsule[]>([]);
  const [selectedCapsule, setSelectedCapsule] = useState<MomentCapsule | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editName, setEditName] = useState(user?.name || '');

  useEffect(() => {
    if (user?.id) {
      api.getUserPosts(user.id).then(res => setUserPosts(res.posts)).catch(console.error);
      api.getCapsules(user.id).then(res => setCapsules(res.capsules)).catch(console.error);
      api.getAchievements(user.id).then(res => setAchievements(res.achievements)).catch(console.error);
    }
  }, [user?.id]);

  const handleSaveProfile = async () => {
    try {
      await api.updateProfile({
        name: editName,
        bio: editBio
      });
      await refreshUser();
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const defaultPhotos = [
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
  ];

  return (
    <div className="w-full pb-24 max-w-xl mx-auto">
      {/* Cover Banner with Settings Header */}
      <div className="relative w-full h-44 sm:h-52 bg-slate-900 overflow-hidden">
        <img
          src={user?.coverUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80'}
          alt="Cover"
          className="w-full h-full object-cover brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-[#080a14]" />

        {/* Top Header Controls */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <button
            onClick={onLogoutClick}
            aria-label="Settings / Logout"
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <Settings size={19} />
          </button>

          <button
            onClick={() => setShowQRModal(true)}
            aria-label="View QR Code"
            className="w-10 h-10 rounded-full bg-purple-600/40 backdrop-blur-md border border-purple-400/30 flex items-center justify-center text-white hover:bg-purple-600/60 transition-colors shadow-glow-sm"
          >
            <QrCode size={19} />
          </button>
        </div>
      </div>

      {/* Profile Info Header */}
      <div className="px-4 sm:px-6 relative -top-12 z-20">
        <div className="flex items-end justify-between mb-3">
          {/* Avatar with Online Status */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 shadow-glow-md">
              <img
                src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
                alt={user?.name}
                className="w-full h-full rounded-full object-cover border-2 border-[#080a14]"
              />
            </div>
            {/* Green Online Dot */}
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#080a14] shadow-sm" />
          </div>

          {/* Quick QR Badge Card */}
          <button
            onClick={() => setShowQRModal(true)}
            className="px-3 py-2 rounded-2xl glass-panel border border-purple-500/30 hover:border-purple-400 flex items-center gap-2 text-xs font-semibold text-white shadow-glow-sm hover:scale-105 transition-all"
          >
            <div className="p-1 rounded-lg bg-gradient-to-tr from-purple-500 to-pink-500 text-white">
              <QrCode size={16} />
            </div>
            <span>UID Card</span>
          </button>
        </div>

        {/* Name and UID Handle */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold text-white tracking-tight">{user?.name || 'Tanush'}</h1>
            <span className="text-cyan-400 text-sm">✦</span>
          </div>
          <p className="text-xs text-purple-400 font-medium">@{user?.uid || 'vynk.t7x4k9'}</p>
        </div>

        {/* Stats Row (Posts | Connections | Capsules) */}
        <div className="grid grid-cols-3 gap-2 py-3 px-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] mb-4 text-center">
          <div>
            <span className="text-base font-extrabold text-white block">
              {user?.stats?.postsCount || userPosts.length || 132}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Posts</span>
          </div>
          <div className="border-x border-white/[0.06]">
            <span className="text-base font-extrabold text-white block">
              {user?.stats?.connectionsCount ? `${(user.stats.connectionsCount / 1000).toFixed(1)}K` : '1.4K'}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Connections</span>
          </div>
          <div>
            <span className="text-base font-extrabold text-white block">
              {capsules.length || user?.stats?.capsulesCount || 3}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Capsules</span>
          </div>
        </div>

        {/* Bio */}
        {isEditing ? (
          <div className="space-y-2 mb-4 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Display Name"
              className="w-full px-3 py-1.5 rounded-lg bg-black/40 text-xs text-white border border-white/10"
            />
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              rows={2}
              placeholder="Bio"
              className="w-full px-3 py-1.5 rounded-lg bg-black/40 text-xs text-white border border-white/10"
            />
            <div className="flex gap-2">
              <button onClick={handleSaveProfile} className="px-3 py-1 bg-purple-600 rounded-lg text-xs font-semibold text-white">Save</button>
              <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-white/10 rounded-lg text-xs font-semibold text-slate-300">Cancel</button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-200 leading-relaxed mb-4 whitespace-pre-line font-normal">
            {user?.bio || 'Tech | AI | Travel | Good Food.\nTurning moments into memories. ✨'}
          </p>
        )}

        {/* Profile Action Buttons */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => {
              setEditName(user?.name || '');
              setEditBio(user?.bio || '');
              setIsEditing(true);
            }}
            className="flex-1 py-2 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-white transition-all text-center"
          >
            Edit Profile
          </button>

          <button
            onClick={() => setShowQRModal(true)}
            aria-label="Share Profile"
            className="w-10 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all"
          >
            <Share2 size={16} />
          </button>
        </div>

        {/* Interest Badges */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {(user?.interests && user.interests.length > 0 ? user.interests : [
              'Tech & AI', 'Travel', 'Photography', 'Music', 'Gaming', 'Fitness', 'Movies'
            ]).map((interest, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full text-xs font-medium bg-white/[0.05] border border-white/[0.08] text-slate-300 hover:text-white transition-colors"
              >
                {interest}
              </span>
            ))}
            <button className="px-3 py-1 rounded-full text-xs font-medium bg-purple-600/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 hover:bg-purple-600/30 transition-all">
              <Plus size={12} />
              Add
            </button>
          </div>
        </div>

        {/* Health & Community Badges (Gamification & Mindfulness) */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/30 via-slate-900/60 to-cyan-950/20 border border-purple-500/20 mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Award size={15} className="text-amber-400" />
              <span>Community Achievements</span>
            </div>
            <span className="text-[10px] text-cyan-300 font-semibold">Healthy Social Score 94%</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: '🌟', title: 'Inspiring Creator', desc: '410+ Moments inspired' },
              { icon: '🤝', title: 'Community Builder', desc: '5 Social Rooms active' },
              { icon: '🧘', title: 'Mindful Explorer', desc: 'Balanced scroll habits' },
              { icon: '🔮', title: 'Founding Member', desc: 'Permanent UID pioneer' },
            ].map((badge, idx) => (
              <div key={idx} className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center text-center">
                <span className="text-xl mb-1">{badge.icon}</span>
                <span className="text-[11px] font-bold text-white leading-tight">{badge.title}</span>
                <span className="text-[9px] text-slate-400 mt-0.5">{badge.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content Tabs (Posts | Videos | Capsules | Tagged) */}
        <div className="flex items-center justify-around border-b border-white/[0.08] mb-4">
          <button
            onClick={() => setActiveTab('posts')}
            className={`py-2.5 text-xs font-semibold flex items-center gap-1.5 relative ${
              activeTab === 'posts' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid size={15} />
            <span>Posts</span>
            {activeTab === 'posts' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-500" />}
          </button>

          <button
            onClick={() => setActiveTab('videos')}
            className={`py-2.5 text-xs font-semibold flex items-center gap-1.5 relative ${
              activeTab === 'videos' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film size={15} />
            <span>Videos</span>
            {activeTab === 'videos' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-500" />}
          </button>

          <button
            onClick={() => setActiveTab('capsules')}
            className={`py-2.5 text-xs font-semibold flex items-center gap-1.5 relative ${
              activeTab === 'capsules' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Archive size={15} />
            <span>Capsules ({capsules.length})</span>
            {activeTab === 'capsules' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-500" />}
          </button>

          <button
            onClick={() => setActiveTab('tagged')}
            className={`py-2.5 text-xs font-semibold flex items-center gap-1.5 relative ${
              activeTab === 'tagged' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag size={15} />
            <span>Tagged</span>
            {activeTab === 'tagged' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-500" />}
          </button>
        </div>

        {/* Tab Content: CAPSULES */}
        {activeTab === 'capsules' && (
          <div className="space-y-3">
            {capsules.length === 0 ? (
              <div className="text-center py-10 glass-card rounded-2xl p-6 border border-white/10">
                <Archive size={32} className="mx-auto mb-2 text-slate-500" />
                <h4 className="text-sm font-bold text-white mb-1">No Moment Capsules Yet</h4>
                <p className="text-xs text-slate-400">
                  Capsules let you save chapters of your life with photos, music, and friend memories.
                </p>
              </div>
            ) : (
              capsules.map((capsule) => (
                <div
                  key={capsule.id}
                  onClick={() => setSelectedCapsule(capsule)}
                  className="glass-card rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/40 transition-all cursor-pointer group flex items-center p-3 gap-3"
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 relative">
                    <img
                      src={capsule.coverUrl || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=300'}
                      alt={capsule.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-white">
                      {capsule.itemsCount || capsule.items?.length || 1} moments
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                        {capsule.category}
                      </span>
                      {capsule.locationName && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                          <MapPin size={9} />
                          {capsule.locationName}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                      {capsule.title}
                    </h4>

                    {capsule.description && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {capsule.description}
                      </p>
                    )}

                    {capsule.collaborators && capsule.collaborators.length > 0 && (
                      <div className="flex items-center -space-x-1.5 mt-2">
                        {capsule.collaborators.map((c) => (
                          <img
                            key={c.id}
                            src={c.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}
                            alt={c.name}
                            title={c.name}
                            className="w-4 h-4 rounded-full border border-[#080a14] object-cover"
                          />
                        ))}
                        <span className="text-[9px] text-purple-300 pl-2">
                          +{capsule.collaborators.length} friends
                        </span>
                      </div>
                    )}
                  </div>

                  <ChevronRight size={18} className="text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab Content: POSTS / VIDEOS / TAGGED */}
        {activeTab !== 'capsules' && (
          <div className="grid grid-cols-3 gap-2">
            {defaultPhotos.map((img, idx) => (
              <div
                key={idx}
                className="relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-white/[0.05] group cursor-pointer"
              >
                <img
                  src={img}
                  alt="user moment"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                  {activeTab === 'videos' ? '▶ 1.2K' : '✦ 412'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* UID QR Modal */}
      <UIDQRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        uid={user?.uid || 'vynk.t7x4k9'}
        name={user?.name || 'Tanush'}
      />

      {/* Capsule Timeline Viewer Modal (Phase 3 Core Feature) */}
      <CapsuleViewerModal
        capsule={selectedCapsule}
        isOpen={!!selectedCapsule}
        onClose={() => setSelectedCapsule(null)}
        onItemAdded={(newItem) => {
          if (selectedCapsule) {
            setSelectedCapsule(prev => prev ? {
              ...prev,
              items: [...(prev.items || []), newItem],
              itemsCount: (prev.itemsCount || 0) + 1
            } : null);
          }
        }}
      />
    </div>
  );
};
