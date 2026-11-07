import { query } from '../config/db.js';
import { aiProvider } from './aiProvider.js';
import { imageAnalysisService } from './imageAnalysisService.js';
import type { AICapsuleAssistantRequest, AICapsuleAssistantResponse, MoodType } from '../../../shared/types.js';

class CapsuleAIService {
  /**
   * Generates capsule title, memory description, chapter highlights,
   * chronological summary, and detects duplicate/near-identical photos.
   */
  async generateCapsuleMetadata(req: AICapsuleAssistantRequest): Promise<AICapsuleAssistantResponse> {
    const items = req.items || [];
    const mediaUrls = items.map(i => i.mediaUrl).filter((url): url is string => Boolean(url));

    // 1. Detect duplicate or near-identical images
    const rawDuplicates = imageAnalysisService.detectDuplicates(items, 0.85);
    const duplicatesDetected = rawDuplicates.map(dup => ({
      indexA: dup.indexA,
      indexB: dup.indexB,
      similarity: Math.round(dup.similarity * 100) / 100,
      recommendation: dup.similarity >= 0.95 
        ? 'Exact or identical duplicate photo detected. Consider keeping only one to maintain capsule pacing.'
        : 'Very similar composition/scene. We suggest choosing your favorite single shot.'
    }));

    // 2. Build context for LLM
    const itemsContext = items.map((it, idx) => {
      const parts = [`Item #${idx + 1}`];
      if (it.dateMoment) parts.push(`Date: ${it.dateMoment}`);
      if (it.locationName) parts.push(`Location: ${it.locationName}`);
      if (it.caption) parts.push(`Caption: "${it.caption}"`);
      return parts.join(' | ');
    }).join('\n');

    const systemPrompt = `You are Vynk Social's AI Capsule Memory Curator.
You turn photo collections, journeys, and life chapters into beautifully organized memory capsules.
You must respond with valid JSON matching:
{
  "suggestedTitle": "string (evocative, personal 3-6 word title)",
  "memoryDescription": "string (warm, narrative paragraph describing the essence of these memories)",
  "chronologicalSummary": "string (concise journey walkthrough from start to finish)",
  "chapterHighlights": ["string (3-5 key milestones or highlights from the collection)"]
}`;

    const prompt = `Please create memory capsule metadata for this collection:
User Given Title: ${req.title || 'Untitled Memory'}
User Given Category: ${req.category || 'Memories'}
User Given Notes: ${req.description || 'No additional notes'}
Items included (${items.length} items):
${itemsContext || 'No specific captions or locations provided.'}`;

    const parsed = await aiProvider.generateStructured<{
      suggestedTitle: string;
      memoryDescription: string;
      chronologicalSummary: string;
      chapterHighlights: string[];
    }>(prompt, systemPrompt);

    return {
      suggestedTitle: parsed.suggestedTitle || req.title || 'Echoes of a Moment',
      memoryDescription: parsed.memoryDescription || req.description || 'A timeless collection of captured moments.',
      chronologicalSummary: parsed.chronologicalSummary || 'A sequence of meaningful memories preserved in time.',
      chapterHighlights: Array.isArray(parsed.chapterHighlights) && parsed.chapterHighlights.length > 0
        ? parsed.chapterHighlights
        : ['The journey begins', 'Captured moments together', 'Reflecting on the experience'],
      duplicatesDetected,
      provider: aiProvider.getProviderInfo().provider
    };
  }

  /**
   * Generates a rich Monthly or Yearly Recap based on the user's real database activity:
   * posts created, mood distribution, reactions received, and moment capsules.
   */
  async generateRecap(userId: string, year: number, month?: number) {
    let dateFilter = '';
    const params: any[] = [userId];

    if (month !== undefined && month >= 1 && month <= 12) {
      const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
      // Next month calculation
      const endMonth = month === 12 ? 1 : month + 1;
      const endYear = month === 12 ? year + 1 : year;
      const endStr = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
      dateFilter = ` AND p.created_at >= ? AND p.created_at < ?`;
      params.push(startStr, endStr);
    } else {
      dateFilter = ` AND p.created_at >= ? AND p.created_at < ?`;
      params.push(`${year}-01-01`, `${year + 1}-01-01`);
    }

    // Query real user posts in the period
    const posts = query.all(`
      SELECT p.id, p.caption, p.mood, p.created_at,
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count,
             (SELECT COUNT(*) FROM reactions w WHERE w.post_id = p.id) as reaction_count
      FROM posts p
      WHERE p.author_id = ? ${dateFilter}
      ORDER BY p.created_at ASC
    `, params) as any[];

    // Query capsules created in the period
    let capsuleDateFilter = '';
    const capsuleParams: any[] = [userId];
    if (month !== undefined && month >= 1 && month <= 12) {
      const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const endMonth = month === 12 ? 1 : month + 1;
      const endYear = month === 12 ? year + 1 : year;
      const endStr = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
      capsuleDateFilter = ` AND created_at >= ? AND created_at < ?`;
      capsuleParams.push(startStr, endStr);
    } else {
      capsuleDateFilter = ` AND created_at >= ? AND created_at < ?`;
      capsuleParams.push(`${year}-01-01`, `${year + 1}-01-01`);
    }

    const capsules = query.all(`
      SELECT id, title, category, created_at
      FROM capsules
      WHERE user_id = ? ${capsuleDateFilter}
      ORDER BY created_at ASC
    `, capsuleParams) as any[];

    // Query reactions received
    const reactionDistribution: Record<string, number> = {};
    if (posts.length > 0) {
      const postIds = posts.map(p => `'${p.id}'`).join(',');
      const reactions = query.all(`
        SELECT reaction_type, COUNT(*) as count
        FROM reactions
        WHERE post_id IN (${postIds})
        GROUP BY reaction_type
      `) as any[];
      reactions.forEach(r => {
        reactionDistribution[r.reaction_type] = r.count;
      });
    }

    // Mood distribution
    const moodCounts: Record<string, number> = {};
    posts.forEach(p => {
      if (p.mood) {
        moodCounts[p.mood] = (moodCounts[p.mood] || 0) + 1;
      }
    });

    const totalPosts = posts.length;
    const totalCapsules = capsules.length;
    const topMoodEntry = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
    const topMood: MoodType = topMoodEntry ? (topMoodEntry[0] as MoodType) : 'creative';

    const timeframeLabel = month !== undefined ? `${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}` : `${year}`;

    // Generate AI Recap Narrative
    const systemPrompt = `You are Vynk Social's Memory Recap Synthesizer.
Summarize the user's authentic social journey into an inspiring, uplifting personal recap.
Return valid JSON:
{
  "themeTitle": "string (e.g. 'A Season of Curiosity & Momentum')",
  "narrativeSummary": "string (2-3 warm, reflective sentences capturing their moments)",
  "milestones": ["string (notable moments or milestones)"],
  "closingThought": "string (a thoughtful closing sentiment)"
}`;

    const prompt = `Create a personal recap for ${timeframeLabel}:
Total moments posted: ${totalPosts}
Total moment capsules crafted: ${totalCapsules}
Predominant mood: ${topMood} (${moodCounts[topMood] || 0} times)
Reactions received across moments: ${JSON.stringify(reactionDistribution)}
Sample post themes: ${posts.slice(0, 5).map(p => (p.caption || '').slice(0, 80)).join(' | ')}`;

    const aiSummary = await aiProvider.generateStructured<{
      themeTitle: string;
      narrativeSummary: string;
      milestones: string[];
      closingThought: string;
    }>(prompt, systemPrompt);

    return {
      timeframe: timeframeLabel,
      year,
      month: month || null,
      stats: {
        totalPosts,
        totalCapsules,
        dominantMood: topMood,
        moodDistribution: moodCounts,
        reactionsReceived: reactionDistribution
      },
      recapContent: {
        themeTitle: aiSummary.themeTitle || `Memories of ${timeframeLabel}`,
        narrativeSummary: aiSummary.narrativeSummary || `You captured ${totalPosts} moments and shared your journey authentically.`,
        milestones: Array.isArray(aiSummary.milestones) && aiSummary.milestones.length > 0
          ? aiSummary.milestones
          : [`Shared ${totalPosts} authentic reflections`, `Preserved ${totalCapsules} moment capsules`],
        closingThought: aiSummary.closingThought || 'Here is to many more shared stories and genuine connections.'
      },
      requiresConfirmation: true, // User must review and approve before saving/sharing
      provider: aiProvider.getProviderInfo().provider
    };
  }
}

export const capsuleAIService = new CapsuleAIService();
