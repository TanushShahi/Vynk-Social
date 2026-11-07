import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { UserProfile, UserStats, FollowRequest, BlockRecord } from '../../../shared/types.js';

export function buildUserProfile(userRowOrId: any, currentUserId?: string): UserProfile {
  let userRow: any;
  if (typeof userRowOrId === 'string') {
    userRow = query.get('SELECT * FROM users WHERE id = ?', [userRowOrId]);
    if (!userRow) {
      userRow = { id: userRowOrId };
    }
  } else {
    userRow = userRowOrId;
  }

  // Posts count
  const postsCount = (query.get('SELECT COUNT(*) as count FROM posts WHERE author_id = ?', [userRow.id]) as any)?.count || 0;
  
  // Followers & Following counts
  const followersCount = (query.get('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [userRow.id]) as any)?.count || 0;
  const followingCount = (query.get('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', [userRow.id]) as any)?.count || 0;
  
  // Mutual connections
  const mutualCount = (query.get(`
    SELECT COUNT(*) as count FROM follows f1
    JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
    WHERE f1.follower_id = ?
  `, [userRow.id]) as any)?.count || 0;
  const connectionsCount = Math.max(followersCount + followingCount - mutualCount, 0);

  // Inspired score
  const inspiredScore = (query.get(`
    SELECT COUNT(*) as count FROM reactions r
    JOIN posts p ON r.post_id = p.id
    WHERE p.author_id = ? AND r.reaction_type = 'inspire'
  `, [userRow.id]) as any)?.count || 0;

  // Interests
  const interestRows = query.all('SELECT interest FROM user_interests WHERE user_id = ?', [userRow.id]);
  const interests = interestRows.map(r => r.interest);

  // Follow & Relationship status
  let isFollowing = false;
  let isFollowedBy = false;
  let isPending = false;
  let isBlocked = false;
  let isBlockedBy = false;

  if (currentUserId && currentUserId !== userRow.id) {
    isFollowing = !!query.get('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', [currentUserId, userRow.id]);
    isFollowedBy = !!query.get('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', [userRow.id, currentUserId]);
    isPending = !!query.get("SELECT id FROM follow_requests WHERE follower_id = ? AND target_id = ? AND status = 'pending'", [currentUserId, userRow.id]);
    isBlocked = !!query.get('SELECT id FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [currentUserId, userRow.id]);
    isBlockedBy = !!query.get('SELECT id FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [userRow.id, currentUserId]);
  }

  // Capsule count - Dynamic SQL calculation (BUG 2 & BUG 6 FIX)
  let capsulesCount = 0;
  if (!currentUserId || currentUserId === userRow.id) {
    // Owner view: count all owned capsules
    capsulesCount = (query.get('SELECT COUNT(*) as count FROM capsules WHERE user_id = ?', [userRow.id]) as any)?.count || 0;
  } else {
    // Viewer view: respect privacy settings
    const isMutual = isFollowing && isFollowedBy;
    if (isMutual) {
      capsulesCount = (query.get(`
        SELECT COUNT(*) as count FROM capsules 
        WHERE user_id = ? AND (privacy = 'public' OR privacy = 'friends' OR privacy = 'followers')
      `, [userRow.id]) as any)?.count || 0;
    } else if (isFollowing) {
      capsulesCount = (query.get(`
        SELECT COUNT(*) as count FROM capsules 
        WHERE user_id = ? AND (privacy = 'public' OR privacy = 'followers')
      `, [userRow.id]) as any)?.count || 0;
    } else {
      capsulesCount = (query.get(`
        SELECT COUNT(*) as count FROM capsules 
        WHERE user_id = ? AND privacy = 'public'
      `, [userRow.id]) as any)?.count || 0;
    }
  }

  const stats: UserStats = {
    postsCount,
    connectionsCount,
    followersCount,
    followingCount,
    capsulesCount,
    inspiredScore
  };

  return {
    id: userRow.id,
    uid: userRow.uid,
    name: userRow.name,
    email: userRow.email,
    avatarUrl: userRow.avatar_url,
    coverUrl: userRow.cover_url,
    bio: userRow.bio,
    isVerified: !!userRow.is_verified,
    isPrivate: !!userRow.is_private,
    interests,
    createdAt: userRow.created_at,
    updatedAt: userRow.updated_at,
    stats,
    isFollowing,
    isFollowedBy,
    isPending,
    isBlocked,
    isBlockedBy
  };
}

export const userController = {
  // Get profile by UID or ID
  getProfile: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { identifier } = req.params;
      const clean = identifier.replace(/^@/, '').toLowerCase();

      const userRow = query.get(`
        SELECT * FROM users
        WHERE LOWER(uid) = ? OR LOWER(uid) = ? OR id = ?
      `, [clean, `vynk.${clean}`, identifier]);

      if (!userRow) {
        return res.status(404).json({ error: 'User not found.' });
      }

      // Check if current user is blocked by target user or has blocked target user
      let isBlockedByTarget = false;
      let isBlockingTarget = false;
      if (req.user && req.user.id !== userRow.id) {
        isBlockedByTarget = !!query.get('SELECT id FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [userRow.id, req.user.id]);
        isBlockingTarget = !!query.get('SELECT id FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [req.user.id, userRow.id]);
      }

      const profile = buildUserProfile(userRow, req.user?.id);

      return res.json({ profile, isBlockedByTarget, isBlockingTarget });
    } catch (err) {
      console.error('getProfile error:', err);
      return res.status(500).json({ error: 'Failed to retrieve profile.' });
    }
  },

  // Update profile (including privacy toggle)
  updateProfile: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

      const { name, bio, avatarUrl, coverUrl, interests, isPrivate } = req.body;
      const userId = req.user.id;

      query.run(`
        UPDATE users
        SET name = COALESCE(?, name),
            bio = COALESCE(?, bio),
            avatar_url = COALESCE(?, avatar_url),
            cover_url = COALESCE(?, cover_url),
            is_private = COALESCE(?, is_private),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        name !== undefined ? name : null,
        bio !== undefined ? bio : null,
        avatarUrl !== undefined ? avatarUrl : null,
        coverUrl !== undefined ? coverUrl : null,
        isPrivate !== undefined ? (isPrivate ? 1 : 0) : null,
        userId
      ]);

      // If interests provided, update them
      if (Array.isArray(interests)) {
        query.run('DELETE FROM user_interests WHERE user_id = ?', [userId]);
        for (const item of interests) {
          if (item && item.trim()) {
            query.run('INSERT INTO user_interests (id, user_id, interest) VALUES (?, ?, ?)', [
              uuidv4(),
              userId,
              item.trim()
            ]);
          }
        }
      }

      const updatedRow = query.get('SELECT * FROM users WHERE id = ?', [userId]);
      const profile = buildUserProfile(updatedRow, userId);

      return res.json({ message: 'Profile updated!', profile });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update profile.' });
    }
  },

  // Follow / Connect with user (BUG 1, 3, 4 FIXES)
  follow: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { targetId } = req.params;
      const followerId = req.user.id;

      if (targetId === followerId) {
        return res.status(400).json({ error: 'You cannot connect with yourself.' });
      }

      const targetUser = query.get('SELECT id, uid, name, is_private FROM users WHERE id = ?', [targetId]);
      if (!targetUser) return res.status(404).json({ error: 'Target user not found.' });

      // Block checks (BUG 4)
      const isBlockedByTarget = query.get('SELECT id FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [targetId, followerId]);
      if (isBlockedByTarget) {
        return res.status(403).json({ error: 'You cannot follow this user.' });
      }
      const isBlockingTarget = query.get('SELECT id FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [followerId, targetId]);
      if (isBlockingTarget) {
        return res.status(403).json({ error: 'You must unblock this user before following.' });
      }

      // Check if already following
      const existingFollow = query.get('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', [followerId, targetId]);
      if (existingFollow) {
        return res.status(400).json({ error: 'Already following this creator.' });
      }

      const followerUser = query.get('SELECT uid, name FROM users WHERE id = ?', [followerId]);

      // Check if target is a PRIVATE account (BUG 3)
      if (targetUser.is_private) {
        const existingReq = query.get("SELECT id, status FROM follow_requests WHERE follower_id = ? AND target_id = ? AND status = 'pending'", [followerId, targetId]);
        if (existingReq) {
          return res.status(400).json({ error: 'Follow request already sent and pending.' });
        }

        query.transaction(() => {
          const reqId = uuidv4();
          query.run(`
            INSERT INTO follow_requests (id, follower_id, target_id, status)
            VALUES (?, ?, ?, 'pending')
            ON CONFLICT(follower_id, target_id) DO UPDATE SET status = 'pending', updated_at = CURRENT_TIMESTAMP
          `, [reqId, followerId, targetId]);

          // Create notification for target user
          query.run(`
            INSERT INTO notifications (id, user_id, actor_id, type, entity_id, content)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            uuidv4(),
            targetId,
            followerId,
            'follow_request',
            followerId,
            `@${followerUser?.uid || 'Someone'} requested to follow your private profile.`
          ]);
        });

        const currentFollowersCount = (query.get('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [targetId]) as any)?.count || 0;
        return res.json({
          message: 'Follow request sent.',
          isFollowing: false,
          isPending: true,
          followersCount: currentFollowersCount
        });
      }

      // Target is a PUBLIC account: immediate follow + notification (BUG 1 FIX)
      query.transaction(() => {
        query.run('INSERT INTO follows (id, follower_id, following_id) VALUES (?, ?, ?)', [
          uuidv4(),
          followerId,
          targetId
        ]);

        // Clean up any stale requests
        query.run('DELETE FROM follow_requests WHERE follower_id = ? AND target_id = ?', [followerId, targetId]);

        // Create follow notification for target user
        query.run(`
          INSERT INTO notifications (id, user_id, actor_id, type, entity_id, content)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          uuidv4(),
          targetId,
          followerId,
          'follow',
          followerId,
          `@${followerUser?.uid || 'Someone'} started following you.`
        ]);
      });

      const followersCount = (query.get('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [targetId]) as any)?.count || 0;

      return res.json({
        message: 'Successfully connected!',
        isFollowing: true,
        isPending: false,
        followersCount
      });
    } catch (err) {
      console.error('follow error:', err);
      return res.status(500).json({ error: 'Failed to connect.' });
    }
  },

  // Unfollow / Cancel Follow Request
  unfollow: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { targetId } = req.params;
      const followerId = req.user.id;

      query.transaction(() => {
        query.run('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [followerId, targetId]);
        query.run('DELETE FROM follow_requests WHERE follower_id = ? AND target_id = ?', [followerId, targetId]);
      });

      const followersCount = (query.get('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [targetId]) as any)?.count || 0;

      return res.json({
        message: 'Disconnected.',
        isFollowing: false,
        isPending: false,
        followersCount
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to disconnect.' });
    }
  },

  // Get Pending Follow Requests for Current User (BUG 3)
  getFollowRequests: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const userId = req.user.id;

      const rows = query.all(`
        SELECT fr.*, u.id as user_id, u.uid, u.name, u.avatar_url, u.bio, u.is_verified
        FROM follow_requests fr
        JOIN users u ON fr.follower_id = u.id
        WHERE fr.target_id = ? AND fr.status = 'pending'
        ORDER BY fr.created_at DESC
      `, [userId]);

      const requests: FollowRequest[] = rows.map((r: any) => ({
        id: r.id,
        followerId: r.follower_id,
        targetId: r.target_id,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        follower: buildUserProfile(r.user_id, userId) || {
          id: r.user_id,
          uid: r.uid,
          name: r.name,
          email: '',
          avatarUrl: r.avatar_url,
          bio: r.bio,
          isVerified: !!r.is_verified,
          createdAt: r.created_at,
          stats: {
            postsCount: 0,
            connectionsCount: 0,
            followersCount: 0,
            followingCount: 0,
            capsulesCount: 0,
            inspiredScore: 0
          }
        }
      }));

      return res.json({ requests, total: requests.length });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve follow requests.' });
    }
  },

  // Accept Follow Request (BUG 3)
  acceptFollowRequest: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { targetId: requesterId } = req.params;
      const targetId = req.user.id;

      const requestRow = query.get(`
        SELECT id FROM follow_requests 
        WHERE follower_id = ? AND target_id = ? AND status = 'pending'
      `, [requesterId, targetId]);

      if (!requestRow) {
        return res.status(404).json({ error: 'No pending follow request from this user.' });
      }

      query.transaction(() => {
        // Mark request accepted
        query.run("UPDATE follow_requests SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [requestRow.id]);

        // Insert follow relationship
        query.run(`
          INSERT INTO follows (id, follower_id, following_id) 
          VALUES (?, ?, ?)
          ON CONFLICT(follower_id, following_id) DO NOTHING
        `, [uuidv4(), requesterId, targetId]);

        // Send acceptance notification to the follower
        const targetUser = query.get('SELECT uid, name FROM users WHERE id = ?', [targetId]);
        query.run(`
          INSERT INTO notifications (id, user_id, actor_id, type, entity_id, content)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          uuidv4(),
          requesterId,
          targetId,
          'follow_accept',
          targetId,
          `@${targetUser?.uid || 'Someone'} accepted your follow request.`
        ]);
      });

      const followersCount = (query.get('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [targetId]) as any)?.count || 0;

      return res.json({
        success: true,
        message: 'Follow request accepted.',
        followersCount
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to accept follow request.' });
    }
  },

  // Reject Follow Request (BUG 3)
  rejectFollowRequest: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { targetId: requesterId } = req.params;
      const targetId = req.user.id;

      const requestRow = query.get(`
        SELECT id FROM follow_requests 
        WHERE follower_id = ? AND target_id = ? AND status = 'pending'
      `, [requesterId, targetId]);

      if (!requestRow) {
        return res.status(404).json({ error: 'No pending follow request from this user.' });
      }

      query.run("UPDATE follow_requests SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [requestRow.id]);

      return res.json({
        success: true,
        message: 'Follow request rejected.'
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to reject follow request.' });
    }
  },

  // Block User (BUG 4)
  blockUser: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { targetId } = req.params;
      const blockerId = req.user.id;

      if (targetId === blockerId) {
        return res.status(400).json({ error: 'You cannot block yourself.' });
      }

      const targetExists = query.get('SELECT id FROM users WHERE id = ?', [targetId]);
      if (!targetExists) {
        return res.status(404).json({ error: 'Target user not found.' });
      }

      query.transaction(() => {
        // 1. Insert block record
        query.run(`
          INSERT INTO blocks (id, blocker_id, blocked_id) 
          VALUES (?, ?, ?)
          ON CONFLICT(blocker_id, blocked_id) DO NOTHING
        `, [uuidv4(), blockerId, targetId]);

        // 2. Sever all follow relationships between both accounts
        query.run(`
          DELETE FROM follows 
          WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)
        `, [blockerId, targetId, targetId, blockerId]);

        // 3. Clear all pending follow requests between both accounts
        query.run(`
          DELETE FROM follow_requests 
          WHERE (follower_id = ? AND target_id = ?) OR (follower_id = ? AND target_id = ?)
        `, [blockerId, targetId, targetId, blockerId]);
      });

      return res.json({
        success: true,
        message: 'User blocked successfully.',
        isBlocked: true
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to block user.' });
    }
  },

  // Unblock User (BUG 4)
  unblockUser: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const { targetId } = req.params;
      const blockerId = req.user.id;

      query.run('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [blockerId, targetId]);

      return res.json({
        success: true,
        message: 'User unblocked successfully.',
        isBlocked: false
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to unblock user.' });
    }
  },

  // Get Blocked Users (BUG 4)
  getBlockedUsers: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const blockerId = req.user.id;

      const rows = query.all(`
        SELECT b.id as block_id, b.created_at as blocked_at, u.id, u.uid, u.name, u.avatar_url
        FROM blocks b
        JOIN users u ON b.blocked_id = u.id
        WHERE b.blocker_id = ?
        ORDER BY b.created_at DESC
      `, [blockerId]);

      const blockedList = rows.map((r: any) => ({
        id: r.block_id,
        blockedId: r.id,
        createdAt: r.blocked_at,
        blockedUser: {
          id: r.id,
          uid: r.uid,
          name: r.name,
          avatarUrl: r.avatar_url
        }
      }));

      return res.json({ blockedUsers: blockedList, total: blockedList.length });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve blocked users.' });
    }
  },

  // Suggested creators for discovery
  getSuggested: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user?.id;
      let sql = 'SELECT * FROM users';
      const params: any[] = [];

      if (currentUserId) {
        sql += ` 
          WHERE id != ? 
            AND id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
            AND id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
            AND id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
        `;
        params.push(currentUserId, currentUserId, currentUserId, currentUserId);
      }
      sql += ' LIMIT 6';

      const rows = query.all(sql, params);
      const suggestions = rows.map(r => buildUserProfile(r, currentUserId));

      return res.json({ suggestions });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to load suggestions.' });
    }
  }
};
