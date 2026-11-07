import { Response } from 'express';
import { query } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { formatPostRow } from './postController.js';
import { Post } from '../../../shared/types.js';

export const vibesController = {
  // Get vertical short-form video feed ("Vynk Vibes")
  getFeed: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const type = (req.query.type as string) || 'for_you'; // 'for_you' | 'following'
      const currentUserId = req.user?.id;

      let sql = `
        SELECT p.*, u.uid as author_uid, u.name as author_name, u.avatar_url as author_avatar, u.is_verified as author_verified
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.is_video = 1
      `;
      const params: any[] = [];

      if (type === 'following' && currentUserId) {
        sql += ' AND p.author_id IN (SELECT following_id FROM follows WHERE follower_id = ?)';
        params.push(currentUserId);
      }

      sql += ' ORDER BY p.views_count DESC, p.created_at DESC LIMIT 30';

      let rows = query.all(sql, params);

      // If following is empty or small, fallback to all videos so user never gets a blank screen
      if (rows.length === 0 && type === 'following') {
        rows = query.all(`
          SELECT p.*, u.uid as author_uid, u.name as author_name, u.avatar_url as author_avatar, u.is_verified as author_verified
          FROM posts p
          JOIN users u ON p.author_id = u.id
          WHERE p.is_video = 1
          ORDER BY p.created_at DESC LIMIT 30
        `);
      }

      const videos: Post[] = rows.map(r => formatPostRow(r, currentUserId));
      return res.json({ videos });
    } catch (err) {
      console.error('getVibesFeed error:', err);
      return res.status(500).json({ error: 'Failed to retrieve vibes video feed.' });
    }
  },

  // Record video view
  recordView: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      query.run('UPDATE posts SET views_count = views_count + 1 WHERE id = ?', [id]);
      const post = query.get('SELECT views_count FROM posts WHERE id = ?', [id]);
      return res.json({ viewsCount: post?.views_count || 0 });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to record video view.' });
    }
  }
};
