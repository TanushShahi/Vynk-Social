import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { MomentCapsule, CapsuleItem, Collaborator } from '../../../shared/types.js';

function formatCapsuleRow(c: any, currentUserId?: string, includeItems = false): MomentCapsule {
  const author = {
    id: c.user_id,
    uid: c.author_uid,
    name: c.author_name,
    avatarUrl: c.author_avatar,
  };

  const itemsCount = (query.get('SELECT COUNT(*) as count FROM capsule_items WHERE capsule_id = ?', [c.id]) as any)?.count || 0;

  // Collaborators
  const collabRows = query.all(`
    SELECT cc.role, u.id, u.uid, u.name, u.avatar_url
    FROM capsule_collaborators cc
    JOIN users u ON cc.user_id = u.id
    WHERE cc.capsule_id = ?
  `, [c.id]);

  const collaborators: Collaborator[] = collabRows.map((r: any) => ({
    id: r.id,
    uid: r.uid,
    name: r.name,
    avatarUrl: r.avatar_url,
    role: r.role,
  }));

  let items: CapsuleItem[] | undefined;
  if (includeItems) {
    const itemRows = query.all(`
      SELECT ci.*, u.name as user_name, u.avatar_url as user_avatar
      FROM capsule_items ci
      JOIN users u ON ci.user_id = u.id
      WHERE ci.capsule_id = ?
      ORDER BY ci.order_index ASC, ci.date_moment ASC
    `, [c.id]);

    items = itemRows.map((i: any) => ({
      id: i.id,
      capsuleId: i.capsule_id,
      userId: i.user_id,
      userName: i.user_name,
      userAvatar: i.user_avatar,
      itemType: i.item_type,
      mediaUrl: i.media_url,
      caption: i.caption,
      locationName: i.location_name,
      dateMoment: i.date_moment,
      orderIndex: i.order_index,
      createdAt: i.created_at,
    }));
  }

  return {
    id: c.id,
    userId: c.user_id,
    author,
    title: c.title,
    description: c.description || '',
    coverUrl: c.cover_url,
    category: c.category || 'Memories',
    privacy: c.privacy || 'public',
    musicTitle: c.music_title,
    locationName: c.location_name,
    startDate: c.start_date,
    endDate: c.end_date,
    isLocked: !!c.is_locked,
    itemsCount,
    items,
    collaborators,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

export const capsuleController = {
  // Get capsules (with optional filter by user or category)
  getCapsules: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const targetUserId = req.query.userId as string | undefined;
      const category = req.query.category as string | undefined;
      const currentUserId = req.user?.id;

      let sql = `
        SELECT c.*, u.uid as author_uid, u.name as author_name, u.avatar_url as author_avatar
        FROM capsules c
        JOIN users u ON c.user_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (targetUserId) {
        sql += ' AND c.user_id = ?';
        params.push(targetUserId);
      }

      if (category && category !== 'All') {
        sql += ' AND LOWER(c.category) = LOWER(?)';
        params.push(category);
      }

      sql += ' ORDER BY c.created_at DESC';

      const rows = query.all(sql, params);
      const capsules = rows.map(r => formatCapsuleRow(r, currentUserId, true));

      return res.json({ capsules });
    } catch (err) {
      console.error('getCapsules error:', err);
      return res.status(500).json({ error: 'Failed to retrieve capsules.' });
    }
  },

  // Get single capsule by ID with full timeline items
  getCapsuleById: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;

      const row = query.get(`
        SELECT c.*, u.uid as author_uid, u.name as author_name, u.avatar_url as author_avatar
        FROM capsules c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
      `, [id]);

      if (!row) {
        return res.status(404).json({ error: 'Moment capsule not found.' });
      }

      const capsule = formatCapsuleRow(row, currentUserId, true);
      return res.json({ capsule });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve capsule.' });
    }
  },

  // Create new Moment Capsule
  createCapsule: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

      const {
        title,
        description,
        coverUrl,
        category = 'Memories',
        privacy = 'public',
        musicTitle,
        locationName,
        startDate,
        endDate,
        items = [],
        collaboratorIds = []
      } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Capsule title is required.' });
      }

      // Verify no collaborators are blocked or have blocked owner (AUDIT 2)
      if (Array.isArray(collaboratorIds) && collaboratorIds.length > 0) {
        for (const collabId of collaboratorIds) {
          const isBlocked = query.get(`
            SELECT id FROM blocks 
            WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
          `, [req.user.id, collabId, collabId, req.user.id]);
          if (isBlocked) {
            return res.status(403).json({ error: 'Cannot add a blocked user as a capsule collaborator.' });
          }
        }
      }

      const capsuleId = uuidv4();
      const defaultCover = coverUrl || (items.length > 0 && items[0].mediaUrl) || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800';

      query.transaction(() => {
        // 1. Insert capsule
        query.run(`
          INSERT INTO capsules (
            id, user_id, title, description, cover_url, category, privacy,
            music_title, location_name, start_date, end_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          capsuleId,
          req.user!.id,
          title.trim(),
          description || '',
          defaultCover,
          category,
          privacy,
          musicTitle || null,
          locationName || null,
          startDate || null,
          endDate || null
        ]);

        // 2. Insert timeline items
        if (Array.isArray(items)) {
          items.forEach((item: any, idx: number) => {
            query.run(`
              INSERT INTO capsule_items (
                id, capsule_id, user_id, item_type, media_url, caption, location_name, date_moment, order_index
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              uuidv4(),
              capsuleId,
              req.user!.id,
              item.itemType || 'photo',
              item.mediaUrl || null,
              item.caption || '',
              item.locationName || locationName || null,
              item.dateMoment || new Date().toISOString(),
              idx
            ]);
          });
        }

        // 3. Insert collaborators
        if (Array.isArray(collaboratorIds)) {
          for (const cId of collaboratorIds) {
            if (cId && cId !== req.user!.id) {
              query.run(`
                INSERT OR IGNORE INTO capsule_collaborators (id, capsule_id, user_id, role)
                VALUES (?, ?, ?, 'collaborator')
              `, [uuidv4(), capsuleId, cId]);

              query.run(`
                INSERT INTO notifications (id, user_id, actor_id, type, entity_id, content)
                VALUES (?, ?, ?, 'collab_invite', ?, ?)
              `, [
                uuidv4(),
                cId,
                req.user!.id,
                capsuleId,
                `${req.user!.name} invited you to collaborate on the capsule "${title}"`
              ]);
            }
          }
        }
      });

      const created = query.get(`
        SELECT c.*, u.uid as author_uid, u.name as author_name, u.avatar_url as author_avatar
        FROM capsules c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
      `, [capsuleId]);

      const capsule = formatCapsuleRow(created, req.user.id, true);
      return res.status(201).json({ message: 'Capsule created successfully!', capsule });
    } catch (err) {
      console.error('createCapsule error:', err);
      return res.status(500).json({ error: 'Failed to create capsule.' });
    }
  },

  // Add item to an existing capsule
  addItem: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { id: capsuleId } = req.params;
      const { itemType = 'photo', mediaUrl, caption, locationName, dateMoment } = req.body;

      const capsule = query.get('SELECT * FROM capsules WHERE id = ?', [capsuleId]);
      if (!capsule) return res.status(404).json({ error: 'Capsule not found.' });

      // Check authorization and block restrictions (AUDIT 2)
      if (capsule.user_id !== req.user.id) {
        const isCollab = query.get('SELECT id FROM capsule_collaborators WHERE capsule_id = ? AND user_id = ?', [capsuleId, req.user.id]);
        if (!isCollab) {
          return res.status(403).json({ error: 'You do not have permission to add items to this capsule.' });
        }
      }

      const isBlocked = query.get(`
        SELECT id FROM blocks 
        WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
      `, [req.user.id, capsule.user_id, capsule.user_id, req.user.id]);

      if (isBlocked) {
        return res.status(403).json({ error: 'Cannot add items to this capsule due to privacy/blocking settings.' });
      }

      const itemId = uuidv4();
      const currentCount = (query.get('SELECT COUNT(*) as count FROM capsule_items WHERE capsule_id = ?', [capsuleId]) as any)?.count || 0;

      query.run(`
        INSERT INTO capsule_items (
          id, capsule_id, user_id, item_type, media_url, caption, location_name, date_moment, order_index
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        itemId,
        capsuleId,
        req.user.id,
        itemType,
        mediaUrl || null,
        caption || '',
        locationName || null,
        dateMoment || new Date().toISOString(),
        currentCount
      ]);

      const item: CapsuleItem = {
        id: itemId,
        capsuleId,
        userId: req.user.id,
        userName: req.user.name,
        itemType,
        mediaUrl,
        caption,
        locationName,
        dateMoment: dateMoment || new Date().toISOString(),
        orderIndex: currentCount,
        createdAt: new Date().toISOString(),
      };

      return res.status(201).json({ message: 'Item added to capsule!', item });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to add item to capsule.' });
    }
  },

  // Delete a capsule
  deleteCapsule: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { id } = req.params;
      const capsule = query.get('SELECT * FROM capsules WHERE id = ?', [id]);
      if (!capsule) {
        return res.status(404).json({ error: 'Capsule not found.' });
      }
      if (capsule.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to delete this capsule.' });
      }

      query.transaction(() => {
        query.run('DELETE FROM capsule_items WHERE capsule_id = ?', [id]);
        query.run('DELETE FROM capsule_collaborators WHERE capsule_id = ?', [id]);
        query.run('DELETE FROM capsules WHERE id = ?', [id]);
      });

      return res.json({ success: true, message: 'Capsule deleted successfully.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete capsule.' });
    }
  }
};
