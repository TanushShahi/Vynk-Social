import { MoodType, Post, UserContentPreferences } from '../../../shared/types.js';
import { query } from '../config/db.js';

export interface RecommendationParams {
  userId?: string;
  selectedMood?: MoodType;
  userInterests?: string[];
  followingIds?: string[];
  savedPostTags?: string[];
  reactedMoods?: Record<string, number>;
  contentPreferences?: UserContentPreferences;
}

export class RecommendationEngine {
  /**
   * Transparent scoring algorithm:
   * score = interest_match (25%) + relationship_score (20%) + engagement_score (20%) +
   *         freshness_score (15%) + mood_match (10%) + preference_alignment (10%)
   * With explicit penalties for excluded topics.
   */
  calculateScore(post: Post, params: RecommendationParams): number {
    let score = 0;

    // 0. Negative Feedback / Excluded Topics check
    if (params.contentPreferences?.excludedTopics && params.contentPreferences.excludedTopics.length > 0) {
      const lowerCaption = post.caption.toLowerCase();
      const postTags = post.tags.map(t => t.replace('#', '').toLowerCase());
      const hasExcluded = params.contentPreferences.excludedTopics.some((topic: string) => {
        const t = topic.toLowerCase();
        return postTags.includes(t) || lowerCaption.includes(t);
      });
      if (hasExcluded) {
        return -1000; // Demote or filter out
      }
    }

    // 1. Mood match bonus (+50 points)
    if (params.selectedMood && params.selectedMood !== 'for_you') {
      if (post.mood.toLowerCase() === params.selectedMood.toLowerCase()) {
        score += 50;
      }
    }

    // 2. Relationship / Connection score (+35 points if followed)
    if (params.followingIds && params.followingIds.includes(post.authorId)) {
      score += 35;
    }

    // 3. User Interests match (up to +40 points)
    const postTags = (post.tags || []).map(t => t.replace('#', '').toLowerCase());
    const lowerCaption = (post.caption || '').toLowerCase();

    if (params.userInterests && params.userInterests.length > 0) {
      for (const interest of params.userInterests) {
        if (postTags.includes(interest.toLowerCase()) || lowerCaption.includes(interest.toLowerCase())) {
          score += 20;
          break;
        }
      }
    }

    // 4. Saved Posts Affinity (boost if post shares tags with user's saved items)
    if (params.savedPostTags && params.savedPostTags.length > 0) {
      const sharedTag = postTags.some(t => params.savedPostTags?.includes(t));
      if (sharedTag) {
        score += 15;
      }
    }

    // 5. Positive WAVES Reaction History (boost moods user actively resonates with)
    if (params.reactedMoods && post.mood) {
      const moodAffinity = params.reactedMoods[post.mood] || 0;
      if (moodAffinity > 0) {
        score += Math.min(moodAffinity * 3, 15);
      }
    }

    // 6. Explicit Content Preferences (preferred moods & sensitive filter)
    if (params.contentPreferences) {
      if (params.contentPreferences.preferredMoods?.includes(post.mood)) {
        score += 15;
      }
    }

    // 7. Engagement score (waves + comments)
    const wavesScore = (post.reactionsSummary.inspire * 2.5) + (post.reactionsSummary.love * 1.5) + (post.totalReactions * 0.5);
    const commentsScore = post.commentsCount * 2.0;
    score += Math.min(wavesScore + commentsScore, 40);

    // 8. Freshness score (posts in last 24h get higher boost)
    const postAgeHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
    if (postAgeHours < 24) {
      score += Math.max(0, 24 - postAgeHours);
    }

    return score;
  }

  /**
   * Rank and interleave posts to prevent repetitive clusters
   */
  rankFeed(posts: Post[], params: RecommendationParams): Post[] {
    const scored = posts
      .map(post => ({
        post,
        score: this.calculateScore(post, params)
      }))
      .filter(item => item.score > -500); // Exclude items with negative exclusion score

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Diversity pass: prevent 3 consecutive posts of the exact same category or author
    const result: Post[] = [];
    const remaining = [...scored];

    while (remaining.length > 0) {
      let chosenIdx = 0;
      if (result.length >= 2) {
        const lastAuthor = result[result.length - 1].authorId;
        const prevAuthor = result[result.length - 2].authorId;

        // If last two were from same author, find next different author
        if (lastAuthor === prevAuthor) {
          const diffIdx = remaining.findIndex(item => item.post.authorId !== lastAuthor);
          if (diffIdx !== -1) chosenIdx = diffIdx;
        }
      }
      result.push(remaining.splice(chosenIdx, 1)[0].post);
    }

    return result;
  }

  /**
   * Negative Feedback: Record hidden post
   */
  hidePost(userId: string, postId: string, reason?: string) {
    const now = new Date().toISOString();
    query.run(`
      INSERT OR REPLACE INTO hidden_posts (id, user_id, post_id, reason, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [`${userId}_${postId}`, userId, postId, reason || 'not_interested', now]);
  }

  /**
   * Remove post from hidden list
   */
  unhidePost(userId: string, postId: string) {
    query.run(`
      DELETE FROM hidden_posts WHERE user_id = ? AND post_id = ?
    `, [userId, postId]);
  }

  /**
   * Retrieve all hidden post IDs for a user
   */
  getHiddenPostIds(userId: string): string[] {
    const rows = query.all(`
      SELECT post_id FROM hidden_posts WHERE user_id = ?
    `, [userId]) as any[];
    return rows.map(r => r.post_id);
  }

  /**
   * Get user content preferences
   */
  getUserPreferences(userId: string): UserContentPreferences {
    const row = query.get(`
      SELECT interests, preferred_moods, excluded_topics, sensitive_content_filter
      FROM user_content_preferences
      WHERE user_id = ?
    `, [userId]) as any;

    if (!row) {
      return {
        userId,
        interests: [],
        preferredMoods: [],
        excludedTopics: [],
        sensitiveContentFilter: true,
        updatedAt: new Date().toISOString()
      };
    }

    const parseJsonArray = (val: any): string[] => {
      if (!val) return [];
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    return {
      userId,
      interests: parseJsonArray(row.interests),
      preferredMoods: parseJsonArray(row.preferred_moods) as MoodType[],
      excludedTopics: parseJsonArray(row.excluded_topics),
      sensitiveContentFilter: row.sensitive_content_filter !== 0
    };
  }

  /**
   * Update user content preferences
   */
  updateUserPreferences(userId: string, prefs: Partial<UserContentPreferences>) {
    const now = new Date().toISOString();
    const current = this.getUserPreferences(userId);

    const updated: UserContentPreferences = {
      userId,
      interests: prefs.interests ?? current.interests,
      preferredMoods: prefs.preferredMoods ?? current.preferredMoods,
      excludedTopics: prefs.excludedTopics ?? current.excludedTopics,
      sensitiveContentFilter: prefs.sensitiveContentFilter !== undefined ? prefs.sensitiveContentFilter : current.sensitiveContentFilter
    };

    query.run(`
      INSERT INTO user_content_preferences (user_id, interests, preferred_moods, excluded_topics, sensitive_content_filter, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        interests = excluded.interests,
        preferred_moods = excluded.preferred_moods,
        excluded_topics = excluded.excluded_topics,
        sensitive_content_filter = excluded.sensitive_content_filter,
        updated_at = excluded.updated_at
    `, [
      userId,
      JSON.stringify(updated.interests),
      JSON.stringify(updated.preferredMoods),
      JSON.stringify(updated.excludedTopics),
      updated.sensitiveContentFilter ? 1 : 0,
      now
    ]);

    return updated;
  }
}

export const recommendationEngine = new RecommendationEngine();
