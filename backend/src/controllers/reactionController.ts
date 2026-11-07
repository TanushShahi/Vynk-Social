import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import type { WaveReactionType } from '../../../shared/types.js';
import { WAVE_REACTIONS } from '../utils/constants.js';

export const reactionController = {
  // Add or toggle Wave reaction on a post
  toggleReaction: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

      const { id: postId } = req.params;
      const { reactionType } = req.body as { reactionType: WaveReactionType };
      const userId = req.user.id;

      if (!reactionType || !WAVE_REACTIONS[reactionType]) {
        return res.status(400).json({ error: `Invalid reaction type. Valid types are: ${Object.keys(WAVE_REACTIONS).join(', ')}` });
      }

      const postExists = query.get('SELECT id, author_id FROM posts WHERE id = ?', [postId]);
      if (!postExists) return res.status(404).json({ error: 'Post not found.' });

      // Check block restrictions between reactor and post author (AUDIT 2)
      const isBlocked = query.get(`
        SELECT id FROM blocks 
        WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
      `, [userId, postExists.author_id, postExists.author_id, userId]);

      if (isBlocked) {
        return res.status(403).json({ error: 'Cannot react to this post due to privacy/blocking settings.' });
      }

      const existingReaction = query.get('SELECT id, reaction_type FROM reactions WHERE post_id = ? AND user_id = ?', [postId, userId]);

      let userReaction: WaveReactionType | null = null;

      if (existingReaction) {
        if (existingReaction.reaction_type === reactionType) {
          // Same reaction clicked again -> remove reaction (toggle off)
          query.run('DELETE FROM reactions WHERE id = ?', [existingReaction.id]);
          userReaction = null;
        } else {
          // Different reaction clicked -> update to new reaction
          query.run('UPDATE reactions SET reaction_type = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?', [reactionType, existingReaction.id]);
          userReaction = reactionType;
        }
      } else {
        // Insert new reaction & generate notification
        query.transaction(() => {
          query.run('INSERT INTO reactions (id, post_id, user_id, reaction_type) VALUES (?, ?, ?, ?)', [
            uuidv4(),
            postId,
            userId,
            reactionType
          ]);

          if (postExists.author_id !== userId) {
            query.run(`
              INSERT INTO notifications (id, user_id, actor_id, type, entity_id, content)
              VALUES (?, ?, ?, 'reaction', ?, ?)
            `, [
              uuidv4(),
              postExists.author_id,
              userId,
              postId,
              `@${req.user!.uid || 'Someone'} reacted with ${WAVE_REACTIONS[reactionType].label} (${WAVE_REACTIONS[reactionType].emoji}) to your moment.`
            ]);
          }
        });
        userReaction = reactionType;
      }

      // Compute updated summary
      const reactionRows = query.all(`
        SELECT reaction_type, COUNT(*) as count 
        FROM reactions 
        WHERE post_id = ? 
        GROUP BY reaction_type
      `, [postId]);

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

      // Generate human-friendly label
      let headline = '';
      if (topReaction && reactionsSummary[topReaction] > 0) {
        const topCount = reactionsSummary[topReaction];
        const formattedCount = topCount >= 1000 ? `${(topCount / 1000).toFixed(1)}k` : `${topCount}`;
        const meta = WAVE_REACTIONS[topReaction];
        headline = `${formattedCount} people felt ${meta.label.toLowerCase()}`;
      } else {
        headline = 'Be the first to share a wave';
      }

      return res.json({
        message: userReaction ? `Reacted with ${WAVE_REACTIONS[userReaction].label}` : 'Reaction removed',
        userReaction,
        reactionsSummary,
        totalReactions,
        topReaction,
        headline
      });
    } catch (err) {
      console.error('toggleReaction error:', err);
      return res.status(500).json({ error: 'Failed to update reaction.' });
    }
  }
};
