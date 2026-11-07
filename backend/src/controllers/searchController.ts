import { Request, Response } from 'express';
import { query } from '../config/db.js';
import { formatPostRow } from './postController.js';
import { buildUserProfile } from './userController.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { GlobalSearchResponse, UserProfile, SearchPagination } from '../../../shared/types.js';

export const searchController = {
  // Global search across all entities with full pagination support (BUG 5 & BUG 6 FIX)
  search: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const q = ((req.query.q as string) || '').trim().toLowerCase();
      const currentUserId = req.user?.id;

      // Pagination parameter parsing
      const rawPage = parseInt(req.query.page as string, 10);
      const rawLimit = parseInt(req.query.limit as string, 10);
      const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
      const limit = isNaN(rawLimit) || rawLimit < 1 ? 10 : Math.min(rawLimit, 50);
      const offset = (page - 1) * limit;

      if (!q) {
        return res.json({
          users: [],
          posts: [],
          videos: [],
          rooms: [],
          hashtags: [],
          pagination: {
            page,
            limit,
            totalUsers: 0,
            totalPosts: 0,
            totalVideos: 0,
            totalRooms: 0,
            hasMore: false
          }
        });
      }

      const cleanQ = q.replace(/^@/, '').replace(/^#/, '');

      // 1. Search Users (by name, uid, or bio) - excluding mutually blocked users if authenticated
      let userBlockFilter = '';
      const userParams: any[] = [`%${cleanQ}%`, `%${cleanQ}%`, `%${cleanQ}%`];
      if (currentUserId) {
        userBlockFilter = `
          AND id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
          AND id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
        `;
        userParams.push(currentUserId, currentUserId);
      }

      const totalUsers = (query.get(`
        SELECT COUNT(*) as count FROM users
        WHERE (LOWER(name) LIKE ? OR LOWER(uid) LIKE ? OR LOWER(bio) LIKE ?)
        ${userBlockFilter}
      `, userParams) as any)?.count || 0;

      const userRows = query.all(`
        SELECT * FROM users
        WHERE (LOWER(name) LIKE ? OR LOWER(uid) LIKE ? OR LOWER(bio) LIKE ?)
        ${userBlockFilter}
        ORDER BY is_verified DESC, created_at DESC
        LIMIT ? OFFSET ?
      `, [...userParams, limit, offset]);

      // Use real database user profile builder (BUG 6 FIX: zero hardcoded statistics)
      const users: UserProfile[] = userRows.map(u => buildUserProfile(u, currentUserId));

      // 2. Search Posts & Videos (by caption or tags)
      const totalPosts = (query.get(`
        SELECT COUNT(*) as count FROM posts
        WHERE (is_video = 0 OR is_video IS NULL) 
          AND (LOWER(caption) LIKE ? OR LOWER(tags) LIKE ?)
      `, [`%${q}%`, `%${cleanQ}%`]) as any)?.count || 0;

      const totalVideos = (query.get(`
        SELECT COUNT(*) as count FROM posts
        WHERE is_video = 1 
          AND (LOWER(caption) LIKE ? OR LOWER(tags) LIKE ?)
      `, [`%${q}%`, `%${cleanQ}%`]) as any)?.count || 0;

      const postRows = query.all(`
        SELECT p.*, u.uid as author_uid, u.name as author_name, u.avatar_url as author_avatar, u.is_verified as author_verified
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE LOWER(p.caption) LIKE ? OR LOWER(p.tags) LIKE ?
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `, [`%${q}%`, `%${cleanQ}%`, limit, offset]);

      const formatted = postRows.map(r => formatPostRow(r, currentUserId));
      const posts = formatted.filter(p => !p.isVideo);
      const videos = formatted.filter(p => p.isVideo);

      // 3. Search Social Rooms
      const totalRooms = (query.get(`
        SELECT COUNT(*) as count FROM rooms
        WHERE LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(topic) LIKE ?
      `, [`%${cleanQ}%`, `%${cleanQ}%`, `%${cleanQ}%`]) as any)?.count || 0;

      const roomRows = query.all(`
        SELECT r.*, u.uid as creator_uid, u.name as creator_name, u.avatar_url as creator_avatar
        FROM rooms r
        JOIN users u ON r.creator_id = u.id
        WHERE LOWER(r.name) LIKE ? OR LOWER(r.description) LIKE ? OR LOWER(r.topic) LIKE ?
        ORDER BY r.members_count DESC, r.created_at DESC
        LIMIT ? OFFSET ?
      `, [`%${cleanQ}%`, `%${cleanQ}%`, `%${cleanQ}%`, limit, offset]);

      const rooms = roomRows.map((r: any) => ({
        id: r.id,
        creatorId: r.creator_id,
        creator: {
          id: r.creator_id,
          uid: r.creator_uid,
          name: r.creator_name,
          avatarUrl: r.creator_avatar,
        },
        name: r.name,
        description: r.description || '',
        topic: r.topic,
        avatarUrl: r.avatar_url,
        bannerUrl: r.banner_url,
        isPermanent: !!r.is_permanent,
        membersCount: r.members_count,
        createdAt: r.created_at,
      }));

      // 4. Dynamic Hashtag Aggregation from Real Database Records
      const tagRows = query.all("SELECT tags FROM posts WHERE tags IS NOT NULL AND tags != ''");
      const tagCountMap: Record<string, number> = {};

      for (const row of tagRows) {
        try {
          const parsed = JSON.parse(row.tags);
          if (Array.isArray(parsed)) {
            for (const t of parsed) {
              const cleanedTag = (typeof t === 'string' ? t.trim() : '');
              if (cleanedTag) {
                const formattedTag = cleanedTag.startsWith('#') ? cleanedTag : `#${cleanedTag}`;
                tagCountMap[formattedTag] = (tagCountMap[formattedTag] || 0) + 1;
              }
            }
          }
        } catch {
          if (typeof row.tags === 'string') {
            const split = row.tags.split(',').map((s: string) => s.trim());
            for (const t of split) {
              if (t) {
                const formattedTag = t.startsWith('#') ? t : `#${t}`;
                tagCountMap[formattedTag] = (tagCountMap[formattedTag] || 0) + 1;
              }
            }
          }
        }
      }

      // Convert tag map into sorted matching list
      const hashtags = Object.entries(tagCountMap)
        .filter(([tag]) => tag.toLowerCase().includes(cleanQ))
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Pagination indicator
      const maxTotal = Math.max(totalUsers, totalPosts, totalVideos, totalRooms);
      const hasMore = (offset + limit) < maxTotal;

      const pagination: SearchPagination = {
        page,
        limit,
        totalUsers,
        totalPosts,
        totalVideos,
        totalRooms,
        hasMore
      };

      const response: GlobalSearchResponse = {
        users,
        posts,
        videos,
        rooms,
        hashtags,
        pagination
      };

      return res.json(response);
    } catch (err) {
      console.error('search error:', err);
      return res.status(500).json({ error: 'Search failed.' });
    }
  },

  // Instant Suggestions with real database lookup
  suggestions: async (req: Request, res: Response) => {
    try {
      const q = ((req.query.q as string) || '').trim().toLowerCase();
      if (!q) return res.json({ suggestions: [] });

      const cleanQ = q.replace(/^@/, '');
      const userMatches = query.all(`
        SELECT uid, name FROM users WHERE LOWER(name) LIKE ? OR LOWER(uid) LIKE ? LIMIT 5
      `, [`%${cleanQ}%`, `%${cleanQ}%`]);

      const suggestions = userMatches.map(u => ({
        type: 'user',
        title: u.name,
        subtitle: `@${u.uid}`
      }));

      return res.json({ suggestions });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to get suggestions.' });
    }
  }
};
