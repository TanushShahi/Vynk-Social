import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { Comment } from '../../../shared/types.js';

export const commentController = {
  // Get all comments for a post
  getComments: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id: postId } = req.params;
      const currentUserId = req.user?.id;

      const rows = query.all(`
        SELECT c.*, u.uid as author_uid, u.name as author_name, u.avatar_url as author_avatar
        FROM comments c
        JOIN users u ON c.author_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
      `, [postId]);

      const comments: Comment[] = rows.map(r => {
        const likesCount = (query.get('SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = ?', [r.id]) as any)?.count || 0;
        let isLiked = false;
        if (currentUserId) {
          isLiked = !!query.get('SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?', [r.id, currentUserId]);
        }

        return {
          id: r.id,
          postId: r.post_id,
          authorId: r.author_id,
          author: {
            id: r.author_id,
            uid: r.author_uid,
            name: r.author_name,
            avatarUrl: r.author_avatar,
          },
          content: r.content,
          createdAt: r.created_at,
          parentId: r.parent_id,
          likesCount,
          isLiked,
        };
      });

      // Organize top-level comments and replies
      const topLevel: Comment[] = [];
      const replyMap = new Map<string, Comment[]>();

      for (const c of comments) {
        if (c.parentId) {
          if (!replyMap.has(c.parentId)) replyMap.set(c.parentId, []);
          replyMap.get(c.parentId)!.push(c);
        } else {
          topLevel.push(c);
        }
      }

      for (const c of topLevel) {
        c.replies = replyMap.get(c.id) || [];
      }

      return res.json({ comments: topLevel, total: comments.length });
    } catch (err) {
      console.error('getComments error:', err);
      return res.status(500).json({ error: 'Failed to retrieve comments.' });
    }
  },

  // Add comment
  addComment: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

      const { id: postId } = req.params;
      const { content, parentId } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Comment content cannot be empty.' });
      }

      const post = query.get('SELECT id, author_id FROM posts WHERE id = ?', [postId]);
      if (!post) return res.status(404).json({ error: 'Post not found.' });

      // Check block restrictions between commenter and post author (BUG 4 & AUDIT 2)
      const isBlocked = query.get(`
        SELECT id FROM blocks 
        WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
      `, [req.user.id, post.author_id, post.author_id, req.user.id]);

      if (isBlocked) {
        return res.status(403).json({ error: 'Cannot comment on this post due to privacy/blocking settings.' });
      }

      // If reply, check block restrictions with parent comment author
      if (parentId) {
        const parentComment = query.get('SELECT author_id FROM comments WHERE id = ?', [parentId]);
        if (parentComment) {
          const isParentBlocked = query.get(`
            SELECT id FROM blocks 
            WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
          `, [req.user.id, parentComment.author_id, parentComment.author_id, req.user.id]);
          if (isParentBlocked) {
            return res.status(403).json({ error: 'Cannot reply to this comment due to privacy/blocking settings.' });
          }
        }
      }

      const commentId = uuidv4();
      query.transaction(() => {
        query.run(`
          INSERT INTO comments (id, post_id, author_id, parent_id, content)
          VALUES (?, ?, ?, ?, ?)
        `, [commentId, postId, req.user!.id, parentId || null, content.trim()]);

        // Emit comment notification if commenter is not post author
        if (post.author_id !== req.user!.id) {
          query.run(`
            INSERT INTO notifications (id, user_id, actor_id, type, entity_id, content)
            VALUES (?, ?, ?, 'comment', ?, ?)
          `, [
            uuidv4(),
            post.author_id,
            req.user!.id,
            postId,
            `@${req.user!.uid || 'Someone'} commented on your post: "${content.trim().slice(0, 40)}${content.trim().length > 40 ? '...' : ''}"`
          ]);
        }
      });

      const userRow = query.get('SELECT id, uid, name, avatar_url FROM users WHERE id = ?', [req.user.id]);
      const comment: Comment = {
        id: commentId,
        postId,
        authorId: req.user.id,
        author: {
          id: userRow.id,
          uid: userRow.uid,
          name: userRow.name,
          avatarUrl: userRow.avatar_url,
        },
        content: content.trim(),
        createdAt: new Date().toISOString(),
        parentId: parentId || null,
        likesCount: 0,
        isLiked: false,
        replies: []
      };

      return res.status(201).json({ message: 'Comment posted!', comment });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to post comment.' });
    }
  },

  // Toggle like comment
  likeComment: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { commentId } = req.params;
      const userId = req.user.id;

      const existing = query.get('SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?', [commentId, userId]);
      let isLiked = false;

      if (existing) {
        query.run('DELETE FROM comment_likes WHERE id = ?', [existing.id]);
        isLiked = false;
      } else {
        query.run('INSERT INTO comment_likes (id, comment_id, user_id) VALUES (?, ?, ?)', [uuidv4(), commentId, userId]);
        isLiked = true;
      }

      const likesCount = (query.get('SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = ?', [commentId]) as any)?.count || 0;

      return res.json({ isLiked, likesCount });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to toggle comment like.' });
    }
  }
};
