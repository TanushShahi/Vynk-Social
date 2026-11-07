import { Response } from 'express';
import { query } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { NotificationItem } from '../../../shared/types.js';

export const notificationController = {
  // Get notifications for current user
  getNotifications: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const userId = req.user.id;

      const rows = query.all(`
        SELECT n.*, u.uid as actor_uid, u.name as actor_name, u.avatar_url as actor_avatar
        FROM notifications n
        JOIN users u ON n.actor_id = u.id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
        LIMIT 40
      `, [userId]);

      const notifications: NotificationItem[] = rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        actorId: r.actor_id,
        actor: {
          id: r.actor_id,
          uid: r.actor_uid,
          name: r.actor_name,
          avatarUrl: r.actor_avatar,
        },
        type: r.type,
        entityId: r.entity_id,
        content: r.content,
        isRead: !!r.is_read,
        createdAt: r.created_at,
      }));

      const unreadCount = notifications.filter(n => !n.isRead).length;

      return res.json({ notifications, unreadCount });
    } catch (err) {
      console.error('getNotifications error:', err);
      return res.status(500).json({ error: 'Failed to retrieve notifications.' });
    }
  },

  // Mark a single notification as read
  markRead: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { id } = req.params;
      query.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, req.user.id]);
      return res.json({ success: true, message: 'Notification marked as read.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to mark notification as read.' });
    }
  },

  // Mark all notifications as read
  markAllRead: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      query.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
      return res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to mark notifications read.' });
    }
  }
};
