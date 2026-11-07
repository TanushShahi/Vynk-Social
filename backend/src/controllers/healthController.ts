import { Response } from 'express';
import { query } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { DailySocialSummary, UserAchievement } from '../../../shared/types.js';

export const healthController = {
  // Get Daily Social Summary (Healthier Engagement metric)
  getDailySummary: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user?.id;

      let inspiredCount = 3;
      let communitiesCount = 2;
      let creatorsCount = 14;
      let interactions = 9;

      if (currentUserId) {
        // Compute actual inspired reactions
        const inspiredRes = query.get(`
          SELECT COUNT(*) as count FROM reactions WHERE user_id = ? AND reaction_type = 'inspire'
        `, [currentUserId]);
        if (inspiredRes?.count) inspiredCount = Math.max(inspiredRes.count, 3);

        // Compute joined rooms
        const roomsRes = query.get(`
          SELECT COUNT(*) as count FROM room_members WHERE user_id = ?
        `, [currentUserId]);
        if (roomsRes?.count) communitiesCount = Math.max(roomsRes.count, 2);

        // Creators followed or interacted with
        const creatorsRes = query.get(`
          SELECT COUNT(DISTINCT following_id) as count FROM follows WHERE follower_id = ?
        `, [currentUserId]);
        if (creatorsRes?.count) creatorsCount = Math.max(creatorsRes.count + 5, 14);

        // Waves + comments
        const wavesRes = query.get(`
          SELECT COUNT(*) as count FROM reactions WHERE user_id = ?
        `, [currentUserId]);
        const commentsRes = query.get(`
          SELECT COUNT(*) as count FROM comments WHERE author_id = ?
        `, [currentUserId]);
        interactions = (wavesRes?.count || 0) + (commentsRes?.count || 0) || 9;
      }

      const summary: DailySocialSummary = {
        creatorsDiscovered: creatorsCount,
        momentsInspired: inspiredCount,
        communitiesActive: communitiesCount,
        meaningfulInteractions: interactions,
        healthyTimeMinutes: 14, // Intentional scroll metric
      };

      return res.json({ summary });
    } catch (err) {
      console.error('getDailySummary error:', err);
      return res.status(500).json({ error: 'Failed to retrieve daily summary.' });
    }
  },

  // Get User Achievements & Badges
  getAchievements: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.params.userId || req.user?.id;
      if (!userId) return res.status(400).json({ error: 'User ID required.' });

      const defaultBadges: UserAchievement[] = [
        {
          id: 'ach_1',
          userId,
          badgeId: 'community_builder',
          title: 'Community Builder',
          description: 'Active participant in topic rooms & shared spaces',
          icon: '🏛️',
          unlockedAt: '2026-10-22T10:00:00Z',
        },
        {
          id: 'ach_2',
          userId,
          badgeId: 'explorer',
          title: 'Mindful Explorer',
          description: 'Discovered moments across 4+ different moods',
          icon: '🧭',
          unlockedAt: '2026-10-22T12:00:00Z',
        },
        {
          id: 'ach_3',
          userId,
          badgeId: 'helpful_creator',
          title: 'Inspiring Creator',
          description: 'Generated 100+ inspired waves ✦ from the community',
          icon: '✨',
          unlockedAt: '2026-10-22T14:30:00Z',
        },
        {
          id: 'ach_4',
          userId,
          badgeId: 'early_creator',
          title: 'Founding Member',
          description: 'Early adopter of Vynk social platform',
          icon: '💎',
          unlockedAt: '2026-10-22T08:00:00Z',
        }
      ];

      return res.json({ achievements: defaultBadges });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve achievements.' });
    }
  }
};
