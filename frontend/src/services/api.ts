import { 
  AuthResponse, 
  UserProfile, 
  Post, 
  Comment, 
  MoodType, 
  WaveReactionType, 
  AICaptionSuggestion,
  StoryItem,
  Conversation,
  Message,
  SharedSpaceItem,
  NotificationItem,
  GlobalSearchResponse,
  MomentCapsule,
  CapsuleItem,
  SocialRoom,
  RoomMessage,
  PollData,
  DailySocialSummary,
  UserAchievement
} from '../types/index.js';

const RAW_API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API_BASE = RAW_API_URL 
  ? (RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL}/api`) 
  : '/api';

export function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const rawApi = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '').replace(/\/+$/, '');
  if (rawApi && url.startsWith('/')) {
    return `${rawApi}${url}`;
  }
  return url;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('vynk_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(response.status, data.error || 'A network error occurred.');
  }

  return data as T;
}

export const api = {
  // Auth
  register: (payload: { name: string; email: string; password: string; uid?: string; interests?: string[] }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  login: (payload: { identifier: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  getMe: () => request<{ user: UserProfile }>('/auth/me'),

  getDemoAccounts: () => request<{ users: any[] }>('/auth/demo-accounts'),

  demoLogin: (userId: string) =>
    request<AuthResponse>('/auth/demo-login', { method: 'POST', body: JSON.stringify({ userId }) }),

  // Posts & Feed (Single or Collab)
  getFeed: (mood?: MoodType) =>
    request<{ posts: Post[] }>(`/posts/feed${mood ? `?mood=${mood}` : ''}`),

  getPost: (id: string) => request<{ post: Post }>(`/posts/${id}`),

  createPost: (payload: {
    caption: string;
    mood?: MoodType;
    audience?: string;
    tags?: string[];
    media?: Array<{ url: string; type: 'image' | 'video'; altText?: string }>;
    isVideo?: boolean;
    audioTitle?: string;
    isCollab?: boolean;
    collabTitle?: string;
    collaboratorIds?: string[];
  }) => request<{ post: Post }>('/posts', { method: 'POST', body: JSON.stringify(payload) }),

  deletePost: (id: string) => request<{ message: string }>(`/posts/${id}`, { method: 'DELETE' }),

  toggleSave: (id: string) => request<{ isSaved: boolean; message: string }>(`/posts/${id}/save`, { method: 'POST' }),

  getUserPosts: (userId: string) => request<{ posts: Post[] }>(`/posts/user/${userId}`),

  // Waves Reaction System
  reactToPost: (postId: string, reactionType: WaveReactionType) =>
    request<{
      message: string;
      userReaction: WaveReactionType | null;
      reactionsSummary: Record<WaveReactionType, number>;
      totalReactions: number;
      topReaction?: WaveReactionType;
      headline: string;
    }>(`/posts/${postId}/react`, {
      method: 'POST',
      body: JSON.stringify({ reactionType }),
    }),

  // Comments
  getComments: (postId: string) => request<{ comments: Comment[]; total: number }>(`/comments/post/${postId}`),

  addComment: (postId: string, content: string, parentId?: string) =>
    request<{ comment: Comment }>(`/comments/post/${postId}`, {
      method: 'POST',
      body: JSON.stringify({ content, parentId }),
    }),

  likeComment: (commentId: string) =>
    request<{ isLiked: boolean; likesCount: number }>(`/comments/${commentId}/like`, { method: 'POST' }),

  // Users & Profiles
  getProfile: (identifier: string) => request<{ profile: UserProfile }>(`/users/${identifier}`),

  updateProfile: (data: Partial<UserProfile>) =>
    request<{ profile: UserProfile }>('/users/profile', { method: 'PATCH', body: JSON.stringify(data) }),

  followUser: (targetId: string) =>
    request<{ isFollowing: boolean; followersCount: number }>(`/users/${targetId}/follow`, { method: 'POST' }),

  unfollowUser: (targetId: string) =>
    request<{ isFollowing: boolean; followersCount: number }>(`/users/${targetId}/follow`, { method: 'DELETE' }),

  getSuggested: () => request<{ suggestions: UserProfile[] }>('/users/suggested'),

  // Phase 2: Stories & Story Threads
  getStories: () => request<{ stories: StoryItem[] }>('/stories'),

  createStory: (payload: { mediaUrl: string; mediaType?: 'image' | 'video'; caption?: string; parentStoryId?: string }) =>
    request<{ story: StoryItem }>('/stories', { method: 'POST', body: JSON.stringify(payload) }),

  markStoryViewed: (id: string) => request<{ viewed: boolean }>(`/stories/${id}/view`, { method: 'POST' }),

  // Phase 2: Short Videos (Vynk Vibes)
  getVibesFeed: (type: 'for_you' | 'following' = 'for_you') =>
    request<{ videos: Post[] }>(`/vibes/feed?type=${type}`),

  recordVideoView: (id: string) => request<{ viewsCount: number }>(`/vibes/${id}/view`, { method: 'POST' }),

  // Phase 2: Messaging & Shared Space
  getConversations: () => request<{ conversations: Conversation[] }>('/messages/conversations'),

  getMessages: (conversationId: string) =>
    request<{ messages: Message[] }>(`/messages/conversations/${conversationId}/messages`),

  sendMessage: (conversationId: string, payload: { content: string; mediaUrl?: string; mediaType?: string; replyToId?: string }) =>
    request<{ message: Message }>(`/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  reactToMessage: (messageId: string, reaction: string) =>
    request<{ reactions: any[] }>(`/messages/messages/${messageId}/react`, {
      method: 'POST',
      body: JSON.stringify({ reaction }),
    }),

  getSharedSpace: (conversationId: string) =>
    request<{ items: SharedSpaceItem[] }>(`/messages/conversations/${conversationId}/shared-space`),

  addSharedSpaceItem: (conversationId: string, payload: { itemType: string; title?: string; content?: string; mediaUrl?: string }) =>
    request<{ item: SharedSpaceItem }>(`/messages/conversations/${conversationId}/shared-space`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Phase 2: Notifications
  getNotifications: () => request<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications'),

  markAllNotificationsRead: () => request<{ success: boolean }>('/notifications/read-all', { method: 'POST' }),

  // Phase 2: Search
  globalSearch: (q: string) => request<GlobalSearchResponse>(`/search?q=${encodeURIComponent(q)}`),

  getSearchSuggestions: (q: string) => request<{ suggestions: any[] }>(`/search/suggestions?q=${encodeURIComponent(q)}`),

  // =========================================================================
  // PHASE 3: MOMENT CAPSULES, SOCIAL ROOMS & HEALTHIER SOCIAL
  // =========================================================================

  // Moment Capsules
  getCapsules: (userId?: string, category?: string) => {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (category) params.append('category', category);
    const qs = params.toString();
    return request<{ capsules: MomentCapsule[] }>(`/capsules${qs ? `?${qs}` : ''}`);
  },

  getCapsule: (id: string) => request<{ capsule: MomentCapsule }>(`/capsules/${id}`),

  createCapsule: (payload: {
    title: string;
    description?: string;
    coverUrl?: string;
    category?: string;
    privacy?: string;
    musicTitle?: string;
    locationName?: string;
    startDate?: string;
    endDate?: string;
    items?: Array<{ itemType: string; mediaUrl?: string; caption?: string; locationName?: string; dateMoment?: string }>;
    collaboratorIds?: string[];
  }) => request<{ message: string; capsule: MomentCapsule }>('/capsules', { method: 'POST', body: JSON.stringify(payload) }),

  addCapsuleItem: (capsuleId: string, payload: { itemType: string; mediaUrl?: string; caption?: string; locationName?: string; dateMoment?: string }) =>
    request<{ message: string; item: CapsuleItem }>(`/capsules/${capsuleId}/items`, { method: 'POST', body: JSON.stringify(payload) }),

  // Social Rooms
  getRooms: (topic?: string) =>
    request<{ rooms: SocialRoom[] }>(`/rooms${topic ? `?topic=${encodeURIComponent(topic)}` : ''}`),

  getRoom: (id: string) => request<{ room: SocialRoom }>(`/rooms/${id}`),

  createRoom: (payload: { name: string; description?: string; topic?: string; avatarUrl?: string; bannerUrl?: string; isPermanent?: boolean }) =>
    request<{ message: string; room: SocialRoom }>('/rooms', { method: 'POST', body: JSON.stringify(payload) }),

  toggleRoomMembership: (roomId: string) =>
    request<{ isMember: boolean; membersCount: number }>(`/rooms/${roomId}/join`, { method: 'POST' }),

  getRoomMessages: (roomId: string) =>
    request<{ messages: RoomMessage[] }>(`/rooms/${roomId}/messages`),

  sendRoomMessage: (roomId: string, payload: { content?: string; mediaUrl?: string; mediaType?: string; pollData?: any }) =>
    request<{ message: RoomMessage }>(`/rooms/${roomId}/messages`, { method: 'POST', body: JSON.stringify(payload) }),

  voteRoomPoll: (messageId: string, optionIndex: number) =>
    request<{ pollData: PollData }>(`/rooms/messages/${messageId}/vote`, { method: 'POST', body: JSON.stringify({ optionIndex }) }),

  // Healthier Engagement & Gamification
  getDailySummary: () => request<{ summary: DailySocialSummary }>('/health-engagement/summary'),

  getAchievements: (userId?: string) =>
    request<{ achievements: UserAchievement[] }>(`/health-engagement/achievements${userId ? `/${userId}` : ''}`),

  // AI Assistant (Phase 1 & Phase 4)
  getAISuggestions: (topic?: string, text?: string) =>
    request<AICaptionSuggestion>('/ai/suggest', {
      method: 'POST',
      body: JSON.stringify({ topic, text }),
    }),

  getAIProvider: () => request<{ status: string; provider: any }>('/ai/provider'),

  aiContentAssist: (payload: { topic?: string; mediaUrl?: string; currentMood?: string; tone?: string; targetAudience?: string }) =>
    request<{ success: boolean; assistant: any }>('/ai/content/assist', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  aiImproveWriting: (text: string, tone: string = 'friendly', instructions?: string) =>
    request<{ success: boolean; result: { original: string; improved: string; explanation: string; tone: string } }>('/ai/content/improve', {
      method: 'POST',
      body: JSON.stringify({ text, tone, instructions }),
    }),

  aiSuggestHashtags: (text: string, mediaUrl?: string, count: number = 8) =>
    request<{ success: boolean; hashtags: string[] }>('/ai/content/hashtags', {
      method: 'POST',
      body: JSON.stringify({ text, mediaUrl, count }),
    }),

  aiUnderstandImage: (mediaUrl: string) =>
    request<{ success: boolean; imageUnderstanding: any }>('/ai/image/understand', {
      method: 'POST',
      body: JSON.stringify({ mediaUrl }),
    }),

  aiCapsuleAssist: (payload: { title?: string; description?: string; category?: string; items: any[] }) =>
    request<{ success: boolean; capsuleAssistant: any }>('/ai/capsule/assist', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  aiCapsuleRecap: (year?: number, month?: number) =>
    request<{ success: boolean; recap: any }>(`/ai/capsule/recap?${year ? `year=${year}` : ''}${month ? `&month=${month}` : ''}`),

  aiModerateContent: (content?: string, mediaUrl?: string) =>
    request<{ success: boolean; verdict: any }>('/ai/moderate', {
      method: 'POST',
      body: JSON.stringify({ content, mediaUrl }),
    }),

  submitModerationAppeal: (entityType: string, entityId: string, reason: string) =>
    request<{ success: boolean; appeal: any }>('/moderation/appeal', {
      method: 'POST',
      body: JSON.stringify({ entityType, entityId, reason }),
    }),

  getModerationAppeals: () =>
    request<{ success: boolean; appeals: any[] }>('/moderation/appeals'),

  aiCreatorInsights: () =>
    request<{ success: boolean; insights: any }>('/ai/creator/insights'),

  aiCreatorIdeas: (theme?: string, mood?: string) =>
    request<{ success: boolean; ideas: any[] }>('/ai/creator/ideas', {
      method: 'POST',
      body: JSON.stringify({ theme, mood }),
    }),

  // Negative feedback & Personalization
  hidePost: (postId: string, reason?: string) =>
    request<{ success: boolean; message: string }>(`/posts/${postId}/hide`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  unhidePost: (postId: string) =>
    request<{ success: boolean; message: string }>(`/posts/${postId}/hide`, {
      method: 'DELETE',
    }),

  getContentPreferences: () =>
    request<{ preferences: any }>('/posts/preferences'),

  updateContentPreferences: (prefs: any) =>
    request<{ success: boolean; preferences: any }>('/posts/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    }),

  // File Upload
  uploadFile: async (file: File): Promise<{ url: string; type: 'image' | 'video' }> => {
    const token = localStorage.getItem('vynk_token');
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new ApiError(res.status, data.error || 'Upload failed');
    return data;
  },
};
