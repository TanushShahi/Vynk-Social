import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { recommendationEngine } from '../services/recommendationService.js';
import { Post, PostMedia, MoodType, WaveReactionType } from '../../../shared/types.js';

export function formatPostRow(postRow: any, currentUserId?: string): Post {
  // Author
  const author = {
    id: postRow.author_id,
    uid: postRow.author_uid,
    name: postRow.author_name,
    avatarUrl: postRow.author_avatar,
    isVerified: !!postRow.author_verified,
  };

  // Media
  const mediaRows = query.all('SELECT * FROM post_media WHERE post_id = ? ORDER BY order_index ASC', [postRow.id]);
  const media: PostMedia[] = mediaRows.map(m => ({
    id: m.id,
    url: m.media_url,
    type: m.media_type as 'image' | 'video',
    aspectRatio: m.aspect_ratio,
    thumbnailUrl: m.thumbnail_url,
    duration: m.duration,
    altText: m.alt_text,
  }));

  // Reactions summary ("Waves")
  const reactionRows = query.all(`
    SELECT reaction_type, COUNT(*) as count 
    FROM reactions 
    WHERE post_id = ? 
    GROUP BY reaction_type
  `, [postRow.id]);

  const reactionsSummary: Record<WaveReactionType, number> = {
    love: 0,
    inspire: 0,
    laugh: 0,
    learn: 0,
    relatable: 0,
    wow: 0,
    curious: 0,
  };

  let totalReactions = 0;
  let topReaction: WaveReactionType | undefined;
  let maxCount = -1;

  for (const r of reactionRows) {
    const type = r.reaction_type as WaveReactionType;
    const count = parseInt(r.count, 10);
    reactionsSummary[type] = count;
    totalReactions += count;
    if (count > maxCount) {
      maxCount = count;
      topReaction = type;
    }
  }

  // Current user's reaction
  let userReaction: WaveReactionType | null = null;
  if (currentUserId) {
    const userReactRow = query.get('SELECT reaction_type FROM reactions WHERE post_id = ? AND user_id = ?', [postRow.id, currentUserId]);
    if (userReactRow) {
      userReaction = userReactRow.reaction_type as WaveReactionType;
    }
  }

  // Comments count
  const commentsCount = (query.get('SELECT COUNT(*) as count FROM comments WHERE post_id = ?', [postRow.id]) as any)?.count || 0;

  // Saved check
  let isSaved = false;
  if (currentUserId) {
    isSaved = !!query.get('SELECT id FROM saved_posts WHERE post_id = ? AND user_id = ?', [postRow.id, currentUserId]);
  }

  // Tags
  let tags: string[] = [];
  try {
    if (postRow.tags) {
      tags = JSON.parse(postRow.tags);
    }
  } catch {
    tags = postRow.tags ? postRow.tags.split(',').map((t: string) => t.trim()) : [];
  }

  // Collaborators for Collab Posts
  const collabRows = query.all(`
    SELECT pc.role, pc.contribution_note, u.id, u.uid, u.name, u.avatar_url
    FROM post_collaborators pc
    JOIN users u ON pc.user_id = u.id
    WHERE pc.post_id = ?
  `, [postRow.id]);

  const collaborators = collabRows.map((c: any) => ({
    id: c.id,
    uid: c.uid,
    name: c.name,
    avatarUrl: c.avatar_url,
    role: c.role,
    contributionNote: c.contribution_note,
  }));

  return {
    id: postRow.id,
    authorId: postRow.author_id,
    author,
    caption: postRow.caption,
    media,
    tags,
    mood: postRow.mood as MoodType,
    audience: postRow.audience,
    isVideo: !!postRow.is_video,
    isCollab: !!postRow.is_collab,
    collabTitle: postRow.collab_title || undefined,
    collaborators,
    audioTitle: postRow.audio_title || 'Original Audio',
    viewsCount: postRow.views_count || 0,
    createdAt: postRow.created_at,
    reactionsSummary,
    totalReactions,
    topReaction,
    userReaction,
    commentsCount,
    sharesCount: Math.floor(totalReactions / 4), // Organic proportional shares metric
    isSaved,
  };
}

export const postController = {
  // Get main feed with mood filter & intelligent ranking
  getFeed: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const mood = req.query.mood as MoodType | undefined;
      const currentUserId = req.user?.id;

      let sql = `
        SELECT p.*, u.uid as author_uid, u.name as author_name, u.avatar_url as author_avatar, u.is_verified as author_verified
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      // Exclude posts from blocked users and blockers (AUDIT 2)
      if (currentUserId) {
        sql += `
          AND p.author_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
          AND p.author_id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
          AND p.id NOT IN (SELECT post_id FROM hidden_posts WHERE user_id = ?)
        `;
        params.push(currentUserId, currentUserId, currentUserId);
      }

      // If user selected a specific mood (not "for_you"), filter by that mood
      if (mood && mood !== 'for_you') {
        sql += ' AND LOWER(p.mood) = LOWER(?)';
        params.push(mood);
      }

      sql += ' ORDER BY p.created_at DESC LIMIT 50';

      const postRows = query.all(sql, params);
      const rawPosts = postRows.map(r => formatPostRow(r, currentUserId));

      // Gather recommendation context
      let userInterests: string[] = [];
      let followingIds: string[] = [];
      let savedPostTags: string[] = [];
      const reactedMoods: Record<string, number> = {};
      let contentPreferences = undefined;

      if (currentUserId) {
        const interestRows = query.all('SELECT interest FROM user_interests WHERE user_id = ?', [currentUserId]);
        userInterests = interestRows.map(r => r.interest);

        const followRows = query.all('SELECT following_id FROM follows WHERE follower_id = ?', [currentUserId]);
        followingIds = followRows.map(r => r.following_id);

        // Saved post tags affinity
        const savedRows = query.all(`
          SELECT p.tags FROM saved_posts sp
          JOIN posts p ON sp.post_id = p.id
          WHERE sp.user_id = ?
        `, [currentUserId]) as any[];
        savedRows.forEach(sr => {
          try {
            const parsed = typeof sr.tags === 'string' && sr.tags.startsWith('[') ? JSON.parse(sr.tags) : sr.tags?.split(',');
            if (Array.isArray(parsed)) {
              parsed.forEach((t: string) => {
                const cleaned = t.trim().replace(/^#/, '').toLowerCase();
                if (cleaned && !savedPostTags.includes(cleaned)) savedPostTags.push(cleaned);
              });
            }
          } catch {}
        });

        // Reacted moods affinity
        const waveRows = query.all(`
          SELECT p.mood, COUNT(*) as cnt
          FROM reactions r
          JOIN posts p ON r.post_id = p.id
          WHERE r.user_id = ?
          GROUP BY p.mood
        `, [currentUserId]) as any[];
        waveRows.forEach(wr => {
          if (wr.mood) reactedMoods[wr.mood] = wr.cnt;
        });

        contentPreferences = recommendationEngine.getUserPreferences(currentUserId);
      }

      // Rank feed using transparent hybrid algorithm
      const rankedPosts = recommendationEngine.rankFeed(rawPosts, {
        userId: currentUserId,
        selectedMood: mood,
        userInterests,
        followingIds,
        savedPostTags,
        reactedMoods,
        contentPreferences
      });

      return res.json({ posts: rankedPosts });
    } catch (err) {
      console.error('getFeed error:', err);
      return res.status(500).json({ error: 'Failed to retrieve feed.' });
    }
  },

  // Get single post
  getPostById: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;

      const postRow = query.get(`
        SELECT p.*, u.uid as author_uid, u.name as author_name, u.avatar_url as author_avatar, u.is_verified as author_verified
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.id = ?
      `, [id]);

      if (!postRow) {
        return res.status(404).json({ error: 'Post not found.' });
      }

      const post = formatPostRow(postRow, currentUserId);
      return res.json({ post });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve post.' });
    }
  },

  // Create new post (Single or Collaborative)
  createPost: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

      const {
        caption,
        mood = 'chill',
        audience = 'public',
        tags = [],
        media = [],
        isCollab = false,
        collabTitle,
        collaboratorIds = [],
        isVideo = false,
        audioTitle = 'Original Audio'
      } = req.body;

      if (!caption && (!media || media.length === 0)) {
        return res.status(400).json({ error: 'Post must have a caption or media item.' });
      }

      // Verify no collaborators are blocked or have blocked creator (AUDIT 2)
      if (isCollab && Array.isArray(collaboratorIds) && collaboratorIds.length > 0) {
        for (const collabId of collaboratorIds) {
          const isBlocked = query.get(`
            SELECT id FROM blocks 
            WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
          `, [req.user.id, collabId, collabId, req.user.id]);
          if (isBlocked) {
            return res.status(403).json({ error: 'Cannot add a blocked user as a collaborator.' });
          }
        }
      }

      const postId = uuidv4();
      const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);

      query.transaction(() => {
        // 1. Insert post
        query.run(`
          INSERT INTO posts (id, author_id, caption, mood, audience, tags, is_collab, collab_title, is_video, audio_title)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          postId,
          req.user!.id,
          caption || '',
          mood,
          audience,
          tagsJson,
          isCollab ? 1 : 0,
          collabTitle || null,
          isVideo ? 1 : 0,
          audioTitle || 'Original Audio'
        ]);

        // 2. Insert media items
        if (Array.isArray(media)) {
          media.forEach((item, index) => {
            query.run(`
              INSERT INTO post_media (id, post_id, media_url, media_type, aspect_ratio, thumbnail_url, duration, alt_text, order_index)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              uuidv4(),
              postId,
              item.url,
              item.type || 'image',
              item.aspectRatio || 1.0,
              item.thumbnailUrl || null,
              item.duration || 0,
              item.altText || '',
              index
            ]);
          });
        }

        // 3. Insert collaborators if collab post
        if (isCollab && Array.isArray(collaboratorIds)) {
          for (const collabId of collaboratorIds) {
            if (collabId && collabId !== req.user!.id) {
              query.run(`
                INSERT OR IGNORE INTO post_collaborators (id, post_id, user_id, role)
                VALUES (?, ?, ?, 'co-author')
              `, [uuidv4(), postId, collabId]);

              // Notify collaborator
              query.run(`
                INSERT INTO notifications (id, user_id, actor_id, type, entity_id, content)
                VALUES (?, ?, ?, 'collab_invite', ?, ?)
              `, [
                uuidv4(),
                collabId,
                req.user!.id,
                postId,
                `${req.user!.name} invited you as a co-author on "${collabTitle || 'a shared moment'}"`
              ]);
            }
          }
        }
      });

      // Fetch the created post
      const createdRow = query.get(`
        SELECT p.*, u.uid as author_uid, u.name as author_name, u.avatar_url as author_avatar, u.is_verified as author_verified
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.id = ?
      `, [postId]);

      const post = formatPostRow(createdRow, req.user.id);
      return res.status(201).json({ message: 'Post created successfully!', post });
    } catch (err) {
      console.error('createPost error:', err);
      return res.status(500).json({ error: 'Failed to create post.' });
    }
  },

  // Delete post
  deletePost: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { id } = req.params;

      const post = query.get('SELECT author_id FROM posts WHERE id = ?', [id]);
      if (!post) return res.status(404).json({ error: 'Post not found.' });

      if (post.author_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only delete your own posts.' });
      }

      query.run('DELETE FROM posts WHERE id = ?', [id]);
      return res.json({ message: 'Post deleted successfully.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete post.' });
    }
  },

  // Toggle Save / Bookmark
  toggleSave: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { id } = req.params;
      const userId = req.user.id;

      const existing = query.get('SELECT id FROM saved_posts WHERE post_id = ? AND user_id = ?', [id, userId]);
      if (existing) {
        query.run('DELETE FROM saved_posts WHERE id = ?', [existing.id]);
        return res.json({ isSaved: false, message: 'Removed from saved moments.' });
      } else {
        query.run('INSERT INTO saved_posts (id, user_id, post_id) VALUES (?, ?, ?)', [uuidv4(), userId, id]);
        return res.json({ isSaved: true, message: 'Saved to your collection!' });
      }
    } catch (err) {
      return res.status(500).json({ error: 'Failed to toggle save.' });
    }
  },

  // Get user's posts
  getUserPosts: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id;

      // Check block restrictions (AUDIT 2)
      if (currentUserId && currentUserId !== userId) {
        const isBlocked = query.get(`
          SELECT id FROM blocks 
          WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
        `, [currentUserId, userId, userId, currentUserId]);
        if (isBlocked) {
          return res.status(403).json({ error: 'Cannot view posts from this creator due to privacy/blocking settings.' });
        }
      }

      const postRows = query.all(`
        SELECT p.*, u.uid as author_uid, u.name as author_name, u.avatar_url as author_avatar, u.is_verified as author_verified
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.author_id = ?
        ORDER BY p.created_at DESC
      `, [userId]);

      const posts = postRows.map(r => formatPostRow(r, currentUserId));
      return res.json({ posts });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to get user posts.' });
    }
  },

  // Negative Feedback: Hide a post from feed
  hidePost: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;
      if (!currentUserId) return res.status(401).json({ error: 'Authentication required' });
      const { reason } = req.body;
      recommendationEngine.hidePost(currentUserId, id, reason);
      return res.json({ success: true, message: 'Post hidden from your feed.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to hide post.' });
    }
  },

  // Unhide post
  unhidePost: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;
      if (!currentUserId) return res.status(401).json({ error: 'Authentication required' });
      recommendationEngine.unhidePost(currentUserId, id);
      return res.json({ success: true, message: 'Post unhidden.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to unhide post.' });
    }
  },

  // Get user content preferences
  getContentPreferences: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user?.id;
      if (!currentUserId) return res.status(401).json({ error: 'Authentication required' });
      const preferences = recommendationEngine.getUserPreferences(currentUserId);
      return res.json({ preferences });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to get preferences.' });
    }
  },

  // Update user content preferences
  updateContentPreferences: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user?.id;
      if (!currentUserId) return res.status(401).json({ error: 'Authentication required' });
      const preferences = recommendationEngine.updateUserPreferences(currentUserId, req.body);
      return res.json({ success: true, preferences });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update preferences.' });
    }
  }
};
