import { query } from '../config/db.js';
import { aiProvider } from './aiProvider.js';
import type { AICreatorInsights, MoodType, WaveReactionType } from '../../../shared/types.js';

class CreatorAIService {
  /**
   * Generates actionable insights and audience analytics for a creator
   * based on their real SQLite post history and engagement metrics.
   */
  async getCreatorInsights(creatorId: string): Promise<AICreatorInsights> {
    // 1. Fetch posts by creator
    const posts = query.all(`
      SELECT p.id, p.caption, p.mood, p.tags, p.created_at,
             (SELECT COUNT(*) FROM reactions w WHERE w.post_id = p.id) as reaction_count,
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
      FROM posts p
      WHERE p.author_id = ?
      ORDER BY p.created_at DESC
      LIMIT 100
    `, [creatorId]) as any[];

    // 2. Fetch reactions across creator's posts
    const postIds = posts.map(p => `'${p.id}'`).join(',');
    let waveRows: any[] = [];
    if (postIds.length > 0) {
      waveRows = query.all(`
        SELECT reaction_type, COUNT(*) as count
        FROM reactions
        WHERE post_id IN (${postIds})
        GROUP BY reaction_type
      `) as any[];
    }

    const totalWaves = waveRows.reduce((sum, r) => sum + r.count, 0);
    const audienceTopWaveReactions = waveRows.map(r => ({
      type: r.reaction_type as WaveReactionType,
      percentage: totalWaves > 0 ? Math.round((r.count / totalWaves) * 100) : 0
    })).sort((a, b) => b.percentage - a.percentage);

    // 3. Mood Performance
    const moodMap: Record<string, { count: number; totalReactions: number }> = {};
    posts.forEach(p => {
      const m = p.mood || 'CHILL';
      if (!moodMap[m]) moodMap[m] = { count: 0, totalReactions: 0 };
      moodMap[m].count += 1;
      moodMap[m].totalReactions += (p.reaction_count || 0);
    });

    const topPerformingMoods = Object.entries(moodMap).map(([mood, data]) => ({
      mood: mood as MoodType,
      count: data.count,
      avgReactions: data.count > 0 ? Math.round((data.totalReactions / data.count) * 10) / 10 : 0
    })).sort((a, b) => b.avgReactions - a.avgReactions);

    // 4. Hashtag Frequency
    const tagMap: Record<string, number> = {};
    posts.forEach(p => {
      if (p.tags) {
        try {
          const parsed = typeof p.tags === 'string' && p.tags.startsWith('[') ? JSON.parse(p.tags) : p.tags.split(',');
          if (Array.isArray(parsed)) {
            parsed.forEach((t: string) => {
              const cleaned = t.trim().replace(/^#/, '');
              if (cleaned) tagMap[cleaned] = (tagMap[cleaned] || 0) + 1;
            });
          }
        } catch {
          // ignore tag parse error
        }
      }
    });

    const topHashtags = Object.entries(tagMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 5. Synthesize AI Content Ideas & Performance Summary
    const systemPrompt = `You are Vynk Social's Senior Creator Strategist & AI Mentor.
Based on the creator's real performance data, suggest fresh, meaningful content concepts and summarize their growth trajectory.
Return valid JSON:
{
  "contentIdeas": [
    {
      "title": "string (creative concept title)",
      "rationale": "string (why this will resonate given their data)",
      "suggestedMood": "CHILL" | "HAPPY" | "MOTIVATED" | "CURIOUS" | "CREATIVE" | "FUNNY" | "EMOTIONAL" | "ADVENTURE" | "LEARNING",
      "suggestedTags": ["string"]
    }
  ],
  "performanceSummary": "string (encouraging, data-driven 2-3 sentence overview of their trajectory)"
}`;

    const prompt = `Creator metrics:
Total analyzed posts: ${posts.length}
Total reactions received: ${totalWaves}
Top Performing Moods: ${JSON.stringify(topPerformingMoods.slice(0, 3))}
Wave Reaction Breakdown: ${JSON.stringify(audienceTopWaveReactions.slice(0, 4))}
Top Hashtags Used: ${topHashtags.map(t => `#${t.tag}`).join(', ') || 'None yet'}
Recent topics: ${posts.slice(0, 5).map(p => (p.caption || '').slice(0, 60)).join(' | ')}`;

    let aiResult: { contentIdeas: any[]; performanceSummary: string };
    try {
      aiResult = await aiProvider.generateStructured(prompt, systemPrompt);
    } catch {
      aiResult = {
        contentIdeas: [
          {
            title: 'Behind the Craft: Deep Dive',
            rationale: 'Audiences love transparent looks into creative processes.',
            suggestedMood: (topPerformingMoods[0]?.mood || 'CREATIVE') as MoodType,
            suggestedTags: ['BehindTheScenes', 'CreatorJourney', 'VynkStories']
          },
          {
            title: 'Midweek Motivation & Reflection',
            rationale: 'Shares that ask an open-ended question prompt higher comment engagement.',
            suggestedMood: 'MOTIVATED',
            suggestedTags: ['Mindset', 'Growth', 'DailyReflections']
          }
        ],
        performanceSummary: `You have published ${posts.length} moments with an active audience engagement profile. Focus on your strongest mood resonance to expand your community.`
      };
    }

    return {
      creatorId,
      topPerformingMoods,
      audienceTopWaveReactions,
      topHashtags,
      contentIdeas: Array.isArray(aiResult.contentIdeas) && aiResult.contentIdeas.length > 0
        ? aiResult.contentIdeas.map(idea => ({
            title: idea.title || 'Creative Concept',
            rationale: idea.rationale || 'High resonance potential with your audience.',
            suggestedMood: idea.suggestedMood || 'CREATIVE',
            suggestedTags: Array.isArray(idea.suggestedTags) ? idea.suggestedTags : ['Community', 'Vynk']
          }))
        : [
            {
              title: 'Visual Micro-Essay',
              rationale: 'Pairs evocative visuals with thoughtful storytelling.',
              suggestedMood: 'CREATIVE',
              suggestedTags: ['VisualStory', 'Explore']
            }
          ],
      performanceSummary: aiResult.performanceSummary || `Analyzed ${posts.length} posts with ${totalWaves} reactions across your community.`,
      provider: aiProvider.getProviderInfo().provider
    };
  }

  /**
   * Generates tailored ideas for a creator on a specific theme or topic
   */
  async generateCustomIdeas(creatorId: string, theme: string, mood?: MoodType) {
    const insights = await this.getCreatorInsights(creatorId);

    const systemPrompt = `You are a creative director for social media content.
Generate 3 distinct, authentic post ideas for the given theme and creator profile.
Return JSON:
{
  "ideas": [
    {
      "title": "string",
      "hook": "string (first line of post)",
      "format": "photo" | "short_video" | "carousel" | "text_reflection",
      "suggestedMood": "CHILL" | "HAPPY" | "MOTIVATED" | "CURIOUS" | "CREATIVE" | "FUNNY" | "EMOTIONAL" | "ADVENTURE" | "LEARNING",
      "hashtags": ["string"]
    }
  ]
}`;

    const prompt = `Theme: "${theme}"
Preferred Mood: ${mood || 'CREATIVE'}
Creator's Top Mood: ${insights.topPerformingMoods[0]?.mood || 'CREATIVE'}`;

    const result = await aiProvider.generateStructured<{ ideas: any[] }>(prompt, systemPrompt);

    return {
      theme,
      ideas: result.ideas || [],
      provider: aiProvider.getProviderInfo().provider
    };
  }
}

export const creatorAIService = new CreatorAIService();
