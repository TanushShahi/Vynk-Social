import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { StoryItem } from '../../../shared/types.js';

export const storyController = {
  // Get all active stories (expires_at > NOW) grouped with story threads
  getStories: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user?.id;

      // Fetch top-level stories (excluding blocked creators)
      let sql = `
        SELECT s.*, u.uid as author_uid, u.name as author_name, u.avatar_url as author_avatar
        FROM stories s
        JOIN users u ON s.author_id = u.id
        WHERE s.expires_at > datetime('now') AND (s.parent_story_id IS NULL OR s.parent_story_id = '')
      `;
      const params: any[] = [];

      if (currentUserId) {
        sql += `
          AND s.author_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
          AND s.author_id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
        `;
        params.push(currentUserId, currentUserId);
      }

      sql += ' ORDER BY s.created_at DESC';

      const rows = query.all(sql, params);

      const stories: StoryItem[] = rows.map(r => {
        // Fetch thread replies attached to this story (Original feature: Story Threads!)
        const threadRows = query.all(`
          SELECT s.*, u.uid as author_uid, u.name as author_name, u.avatar_url as author_avatar
          FROM stories s
          JOIN users u ON s.author_id = u.id
          WHERE s.parent_story_id = ? AND s.expires_at > datetime('now')
          ORDER BY s.created_at ASC
        `, [r.id]);

        const threads: StoryItem[] = threadRows.map(t => ({
          id: t.id,
          authorId: t.author_id,
          author: {
            id: t.author_id,
            uid: t.author_uid,
            name: t.author_name,
            avatarUrl: t.author_avatar,
          },
          mediaUrl: t.media_url,
          mediaType: t.media_type as 'image' | 'video',
          caption: t.caption,
          parentStoryId: t.parent_story_id,
          createdAt: t.created_at,
          expiresAt: t.expires_at,
        }));

        let hasViewed = false;
        if (currentUserId) {
          hasViewed = !!query.get('SELECT id FROM story_views WHERE story_id = ? AND user_id = ?', [r.id, currentUserId]);
        }

        return {
          id: r.id,
          authorId: r.author_id,
          author: {
            id: r.author_id,
            uid: r.author_uid,
            name: r.author_name,
            avatarUrl: r.author_avatar,
          },
          mediaUrl: r.media_url,
          mediaType: r.media_type as 'image' | 'video',
          caption: r.caption,
          parentStoryId: r.parent_story_id,
          threadCount: threads.length,
          threads,
          createdAt: r.created_at,
          expiresAt: r.expires_at,
          hasViewed,
        };
      });

      return res.json({ stories });
    } catch (err) {
      console.error('getStories error:', err);
      return res.status(500).json({ error: 'Failed to retrieve stories.' });
    }
  },

  // Create a new story or add to a Story Thread
  createStory: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

      const { mediaUrl, mediaType = 'image', caption = '', parentStoryId } = req.body;
      if (!mediaUrl) return res.status(400).json({ error: 'Media URL is required.' });

      // If contributing to a Story Thread, verify parent story and block restrictions (BUG 4 & AUDIT 2)
      let parentAuthorId: string | null = null;
      if (parentStoryId) {
        const parentStory = query.get('SELECT author_id FROM stories WHERE id = ?', [parentStoryId]);
        if (!parentStory) {
          return res.status(404).json({ error: 'Parent story not found.' });
        }
        parentAuthorId = parentStory.author_id;

        const isBlocked = query.get(`
          SELECT id FROM blocks 
          WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
        `, [req.user.id, parentAuthorId, parentAuthorId, req.user.id]);

        if (isBlocked) {
          return res.status(403).json({ error: 'Cannot contribute to this Story Thread due to privacy/blocking settings.' });
        }
      }

      const storyId = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      query.run(`
        INSERT INTO stories (id, author_id, media_url, media_type, caption, parent_story_id, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [storyId, req.user.id, mediaUrl, mediaType, caption, parentStoryId || null, expiresAt]);

      // If added to a Story Thread, create notification for parent story author
      if (parentStoryId && parentAuthorId && parentAuthorId !== req.user.id) {
        query.run(`
          INSERT INTO notifications (id, user_id, actor_id, type, entity_id, content)
          VALUES (?, ?, ?, 'story_thread', ?, ?)
        `, [
          uuidv4(),
          parentAuthorId,
          req.user.id,
          storyId,
          `${req.user.name} added their moment to your Story Thread!`
        ]);
      }

      const userRow = query.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
      const story: StoryItem = {
        id: storyId,
        authorId: req.user.id,
        author: {
          id: userRow.id,
          uid: userRow.uid,
          name: userRow.name,
          avatarUrl: userRow.avatar_url,
        },
        mediaUrl,
        mediaType,
        caption,
        parentStoryId: parentStoryId || null,
        threadCount: 0,
        threads: [],
        createdAt: new Date().toISOString(),
        expiresAt,
        hasViewed: true,
      };

      return res.status(201).json({ message: 'Story posted!', story });
    } catch (err) {
      console.error('createStory error:', err);
      return res.status(500).json({ error: 'Failed to create story.' });
    }
  },

  // Mark story as viewed
  markViewed: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { id } = req.params;

      const existing = query.get('SELECT id FROM story_views WHERE story_id = ? AND user_id = ?', [id, req.user.id]);
      if (!existing) {
        query.run('INSERT INTO story_views (id, story_id, user_id) VALUES (?, ?, ?)', [
          uuidv4(),
          id,
          req.user.id
        ]);
      }

      return res.json({ viewed: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to record view.' });
    }
  }
};
