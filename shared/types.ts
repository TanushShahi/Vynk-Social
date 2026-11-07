// Vynk Social Platform - Shared Data Types & Contracts (Phase 1, Phase 2 & Phase 3)

export type MoodType = 
  | 'for_you'
  | 'chill'
  | 'happy'
  | 'motivated'
  | 'curious'
  | 'creative'
  | 'funny'
  | 'emotional'
  | 'adventure'
  | 'learning'
  | 'travel'
  | 'tech';

export type WaveReactionType = 
  | 'love'       // ❤️ Loved it
  | 'inspire'    // ✦ Inspired me
  | 'laugh'      // 😂 Made me laugh
  | 'learn'      // 💡 Learned something
  | 'relatable'  // 🤝 Relatable
  | 'wow'        // 🔥 Wow
  | 'curious';   // 🔮 Curious

export interface WaveReactionMeta {
  type: WaveReactionType;
  emoji: string;
  label: string;
  description: string;
  color: string;
}

export const WAVE_REACTIONS: Record<WaveReactionType, WaveReactionMeta> = {
  love: { type: 'love', emoji: '❤️', label: 'Loved it', description: 'Felt genuine warmth & love', color: '#f43f5e' },
  inspire: { type: 'inspire', emoji: '✦', label: 'Inspired me', description: 'Sparked creative or life motivation', color: '#a855f7' },
  laugh: { type: 'laugh', emoji: '😂', label: 'Made me laugh', description: 'Brightened up my day', color: '#eab308' },
  learn: { type: 'learn', emoji: '💡', label: 'Learned something', description: 'Gained new insight or knowledge', color: '#38bdf8' },
  relatable: { type: 'relatable', emoji: '🤝', label: 'Relatable', description: 'Been there, felt that', color: '#10b981' },
  wow: { type: 'wow', emoji: '🔥', label: 'Wow', description: 'Impressive craft or moment', color: '#f97316' },
  curious: { type: 'curious', emoji: '🔮', label: 'Curious', description: 'Intriguing, want to learn more', color: '#8b5cf6' },
};

export type AudienceType = 'public' | 'followers' | 'friends' | 'private';

export interface User {
  id: string;
  uid: string; // e.g. "vynk.t7x4k9"
  name: string;
  email: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  isVerified?: boolean;
  isPrivate?: boolean;
  interests?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface UserAchievement {
  id: string;
  userId: string;
  badgeId: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export interface UserStats {
  postsCount: number;
  connectionsCount: number;
  followersCount: number;
  followingCount: number;
  capsulesCount: number;
  inspiredScore: number;
}

export interface UserProfile extends User {
  stats: UserStats;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  isPending?: boolean;
  isBlocked?: boolean;
  isBlockedBy?: boolean;
  achievements?: UserAchievement[];
}

export interface PostMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  aspectRatio?: number;
  thumbnailUrl?: string;
  duration?: number;
  altText?: string;
}

export interface Collaborator {
  id: string;
  uid: string;
  name: string;
  avatarUrl?: string;
  role?: string;
  contributionNote?: string;
}

export interface Post {
  id: string;
  authorId: string;
  author: {
    id: string;
    uid: string;
    name: string;
    avatarUrl?: string;
    isVerified?: boolean;
  };
  caption: string;
  media: PostMedia[];
  tags: string[];
  mood: MoodType;
  audience: AudienceType;
  isVideo?: boolean;
  isCollab?: boolean;
  collabTitle?: string;
  collaborators?: Collaborator[];
  audioTitle?: string;
  viewsCount?: number;
  createdAt: string;
  reactionsSummary: Record<WaveReactionType, number>;
  totalReactions: number;
  topReaction?: WaveReactionType;
  userReaction?: WaveReactionType | null;
  commentsCount: number;
  sharesCount: number;
  isSaved?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: {
    id: string;
    uid: string;
    name: string;
    avatarUrl?: string;
  };
  content: string;
  createdAt: string;
  parentId?: string | null;
  likesCount: number;
  isLiked?: boolean;
  replies?: Comment[];
}

// Phase 2: Stories & Story Threads
export interface StoryItem {
  id: string;
  authorId: string;
  author: {
    id: string;
    uid: string;
    name: string;
    avatarUrl?: string;
  };
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  parentStoryId?: string | null;
  threadCount?: number;
  threads?: StoryItem[];
  createdAt: string;
  expiresAt: string;
  hasViewed?: boolean;
}

// Phase 2: Messaging & Shared Spaces
export interface MessageReaction {
  reaction: string;
  userId: string;
  userName: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: {
    id: string;
    uid: string;
    name: string;
    avatarUrl?: string;
  };
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'voice';
  replyToId?: string | null;
  replyToMessage?: {
    id: string;
    senderName: string;
    content: string;
  };
  reactions: MessageReaction[];
  createdAt: string;
}

export interface SharedSpaceItem {
  id: string;
  conversationId: string;
  creatorId: string;
  creatorName: string;
  itemType: 'photo' | 'note' | 'link' | 'memory' | 'poll';
  title?: string;
  content?: string;
  mediaUrl?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageAt: string;
  unreadCount: number;
  participants: UserProfile[];
  sharedSpaceItemsCount?: number;
}

// =========================================================================
// PHASE 3 TYPES: MOMENT CAPSULES, SOCIAL ROOMS & HEALTHIER ENGAGEMENT
// =========================================================================

export interface CapsuleItem {
  id: string;
  capsuleId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  itemType: 'photo' | 'video' | 'text' | 'voice' | 'note';
  mediaUrl?: string;
  caption?: string;
  locationName?: string;
  dateMoment: string;
  orderIndex: number;
  createdAt: string;
}

export interface MomentCapsule {
  id: string;
  userId: string;
  author: {
    id: string;
    uid: string;
    name: string;
    avatarUrl?: string;
  };
  title: string;
  description: string;
  coverUrl: string;
  category: string;
  privacy: AudienceType;
  musicTitle?: string;
  locationName?: string;
  startDate?: string;
  endDate?: string;
  isLocked?: boolean;
  itemsCount: number;
  items?: CapsuleItem[];
  collaborators?: Collaborator[];
  createdAt: string;
  updatedAt?: string;
}

export interface PollOption {
  text: string;
  votes: number;
}

export interface PollData {
  question: string;
  options: PollOption[];
  totalVotes: number;
  userVote?: number | null;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  senderId: string;
  sender: {
    id: string;
    uid: string;
    name: string;
    avatarUrl?: string;
  };
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'poll' | 'voice';
  pollData?: PollData;
  createdAt: string;
}

export interface SocialRoom {
  id: string;
  creatorId: string;
  creator: {
    id: string;
    uid: string;
    name: string;
    avatarUrl?: string;
  };
  name: string;
  description: string;
  topic: string;
  avatarUrl?: string;
  bannerUrl?: string;
  isPermanent: boolean;
  expiresAt?: string;
  membersCount: number;
  isMember?: boolean;
  activeDiscussionsCount?: number;
  latestMessage?: string;
  createdAt: string;
}

export interface DailySocialSummary {
  creatorsDiscovered: number;
  momentsInspired: number;
  communitiesActive: number;
  meaningfulInteractions: number;
  healthyTimeMinutes: number;
}

// Follow Requests & Blocks
export interface FollowRequest {
  id: string;
  followerId: string;
  targetId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  follower?: UserProfile;
  target?: UserProfile;
}

export interface BlockRecord {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
  blockedUser?: UserProfile;
}

// Notifications
export interface NotificationItem {
  id: string;
  userId: string;
  actorId: string;
  actor: {
    id: string;
    uid: string;
    name: string;
    avatarUrl?: string;
  };
  type: 'follow' | 'follow_request' | 'follow_accept' | 'reaction' | 'comment' | 'message' | 'story_thread' | 'collab_invite' | 'room_invite' | 'mention';
  entityId?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

// Global Search
export interface SearchPagination {
  page: number;
  limit: number;
  totalUsers: number;
  totalPosts: number;
  totalVideos: number;
  totalRooms: number;
  hasMore: boolean;
}

export interface GlobalSearchResponse {
  users: UserProfile[];
  posts: Post[];
  videos: Post[];
  rooms?: SocialRoom[];
  capsules?: MomentCapsule[];
  hashtags: Array<{ tag: string; count: number }>;
  pagination?: SearchPagination;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface AICaptionSuggestion {
  caption: string;
  tags: string[];
  mood: MoodType;
  altText: string;
}

// =========================================================================
// PHASE 4: ADVANCED AI INTELLIGENCE & PERSONALIZATION TYPES
// =========================================================================

export type AIProviderType = 'gemini' | 'openai' | 'ollama' | 'huggingface' | 'local_semantic';

export type AICaptionTone = 
  | 'friendly'
  | 'witty'
  | 'poetic'
  | 'minimalist'
  | 'inspirational'
  | 'humorous'
  | 'analytical'
  | 'rebellious';

export interface AIContentAssistantRequest {
  topic?: string;
  text?: string;
  mediaUrl?: string;
  tone?: AICaptionTone;
  language?: string;
  currentMood?: MoodType;
  targetAudience?: string;
  action?: 'generate' | 'improve' | 'expand' | 'shorten' | 'hashtags';
}

export interface AIContentAssistantResponse {
  caption: string;
  tags?: string[];
  hashtags: string[];
  mood?: MoodType;
  suggestedMood: MoodType;
  altText: string;
  category: string;
  provider?: AIProviderType | string;
  modelUsed?: string;
  variations?: Array<{ tone: AICaptionTone; caption: string }>;
  toneVariations?: Record<string, string>;
  writingFeedback?: string;
  writingSuggestions?: string[];
  imageUnderstanding?: AIImageUnderstanding;
}

export interface AIImageUnderstanding {
  detectedObjects: string[];
  sceneDescription: string;
  description?: string;
  dominantColors: string[];
  suggestedCategory: string;
  visualMood: MoodType;
  confidenceScore: number;
  perceptualHash?: string;
}

export interface AICapsuleAssistantRequest {
  title?: string;
  description?: string;
  category?: string;
  items: Array<{
    mediaUrl?: string;
    caption?: string;
    locationName?: string;
    dateMoment?: string;
  }>;
}

export interface AICapsuleAssistantResponse {
  suggestedTitle: string;
  memoryDescription: string;
  chronologicalSummary: string;
  duplicatesDetected: Array<{
    indexA: number;
    indexB: number;
    similarity: number;
    recommendation: string;
  }>;
  chapterHighlights: string[];
  provider: string;
}

export interface AICreatorInsights {
  creatorId: string;
  topPerformingMoods: Array<{ mood: MoodType; count: number; avgReactions: number }>;
  audienceTopWaveReactions: Array<{ type: WaveReactionType; percentage: number }>;
  topHashtags: Array<{ tag: string; count: number }>;
  contentIdeas: Array<{
    title: string;
    rationale: string;
    suggestedMood: MoodType;
    suggestedTags: string[];
  }>;
  performanceSummary: string;
  provider: string;
}

export interface ModerationCategory {
  category: string;
  flagged: boolean;
  score: number;
}

export interface ModerationVerdict {
  status: 'APPROVED' | 'FLAGGED_FOR_REVIEW' | 'REJECTED';
  severity: 'low' | 'medium' | 'high';
  categories: ModerationCategory[];
  explanation: string;
  appealEligible: boolean;
  confidence: number;
}

export interface ModerationAppeal {
  id: string;
  userId: string;
  entityType: 'post' | 'comment' | 'story' | 'capsule';
  entityId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  explanation?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface UserContentPreferences {
  userId: string;
  interests?: string[];
  preferredMoods: MoodType[];
  excludedTopics?: string[];
  mutedTags?: string[];
  mutedCreators?: string[];
  sensitiveContentFilter?: boolean | number;
  updatedAt?: string;
}
