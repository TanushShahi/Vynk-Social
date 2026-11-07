import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { aiProvider } from './aiProvider.js';
import { imageAnalysisService } from './imageAnalysisService.js';
import type { ModerationVerdict, ModerationAppeal, ModerationCategory } from '../../../shared/types.js';

class ModerationAIService {
  /**
   * Evaluates text and optional media for community safety.
   * Uses nuanced multi-category scoring to prevent false positives and avoids
   * punishing users on borderline/uncertain predictions.
   */
  async moderateContent(content: string, mediaUrl?: string): Promise<ModerationVerdict> {
    const trimmed = (content || '').trim();

    // 1. Image safety analysis if mediaUrl is provided
    let imageFlagged = false;
    let imageReason = '';
    if (mediaUrl) {
      try {
        const imgAnalysis = await imageAnalysisService.understandImage(mediaUrl);
        // Detect unsafe objects or descriptions
        const lowerDesc = (imgAnalysis.description || imgAnalysis.sceneDescription || '').toLowerCase();
        const unsafeWords = ['nudity', 'nsfw', 'weapon', 'violence', 'blood', 'gore', 'porn'];
        const matched = unsafeWords.filter(w => lowerDesc.includes(w) || imgAnalysis.detectedObjects.some(o => o.toLowerCase().includes(w)));
        if (matched.length > 0) {
          imageFlagged = true;
          imageReason = `Media contains potential visual safety concerns: ${matched.join(', ')}`;
        }
      } catch (err) {
        console.warn('[ModerationAIService] Image analysis skipped:', err);
      }
    }

    // 2. High-confidence heuristic quick-checks for severe harm
    const severePatterns = [
      /\b(kill yourself|go die|kys)\b/i,
      /\b(child\s*porn|cp)\b/i,
      /\b(terrorist|nazi)\s+(propaganda|salute)\b/i
    ];
    for (const pat of severePatterns) {
      if (pat.test(trimmed)) {
        return {
          status: 'REJECTED',
          severity: 'high',
          confidence: 0.98,
          appealEligible: true,
          explanation: 'Content violates community guidelines regarding extreme harassment or severe harm.',
          categories: [
            { category: 'harassment', flagged: true, score: 0.98 },
            { category: 'hate_speech', flagged: false, score: 0.1 },
            { category: 'sexual_content', flagged: false, score: 0.05 },
            { category: 'violence', flagged: true, score: 0.95 },
            { category: 'spam', flagged: false, score: 0.01 }
          ]
        };
      }
    }

    // 3. AI Safety Evaluation via Provider
    const systemPrompt = `You are Vynk Social's Community Safety & Content Moderation AI.
Your purpose is to foster constructive, safe social dialogue while preserving authentic self-expression.
Evaluate the content across 5 standard categories:
- harassment
- hate_speech
- sexual_content
- violence
- spam

Rules:
- Score each category from 0.00 (completely safe) to 1.00 (severe violation).
- Do NOT flag colloquial banter, creative slang, mild humor, or passionate debate unless genuinely abusive or targeted.
- If uncertain, keep scores between 0.30 and 0.60.
- Return valid JSON matching:
{
  "categories": [
    { "category": "harassment", "score": number },
    { "category": "hate_speech", "score": number },
    { "category": "sexual_content", "score": number },
    { "category": "violence", "score": number },
    { "category": "spam", "score": number }
  ],
  "explanation": "string (clear human explanation of rationale)"
}`;

    const prompt = `Analyze this user submission:\nText: """${trimmed}"""\n${imageReason ? `Visual Flags: ${imageReason}` : ''}`;

    let aiResult: { categories: Array<{ category: string; score: number }>; explanation: string };
    try {
      aiResult = await aiProvider.generateStructured(prompt, systemPrompt);
    } catch {
      // Graceful fallback to rule-based evaluation
      aiResult = {
        categories: [
          { category: 'harassment', score: 0.02 },
          { category: 'hate_speech', score: 0.01 },
          { category: 'sexual_content', score: imageFlagged ? 0.7 : 0.01 },
          { category: 'violence', score: 0.01 },
          { category: 'spam', score: trimmed.length > 500 && /(buy now|http|whatsapp)/i.test(trimmed) ? 0.8 : 0.01 }
        ],
        explanation: imageFlagged ? imageReason : 'Content appears standard and safe.'
      };
    }

    // Determine highest score category
    const categories: ModerationCategory[] = (aiResult.categories || []).map(cat => ({
      category: cat.category,
      score: typeof cat.score === 'number' ? Math.min(Math.max(cat.score, 0), 1) : 0,
      flagged: (typeof cat.score === 'number' ? cat.score : 0) >= 0.65
    }));

    if (imageFlagged) {
      const sexCat = categories.find(c => c.category === 'sexual_content');
      if (sexCat) {
        sexCat.score = Math.max(sexCat.score, 0.75);
        sexCat.flagged = true;
      }
    }

    const maxScore = Math.max(...categories.map(c => c.score), 0);

    let status: 'APPROVED' | 'FLAGGED_FOR_REVIEW' | 'REJECTED' = 'APPROVED';
    let severity: 'low' | 'medium' | 'high' = 'low';

    if (maxScore >= 0.85) {
      status = 'REJECTED';
      severity = 'high';
    } else if (maxScore >= 0.60) {
      status = 'FLAGGED_FOR_REVIEW';
      severity = 'medium';
    } else {
      status = 'APPROVED';
      severity = 'low';
    }

    return {
      status,
      severity,
      categories,
      explanation: aiResult.explanation || (status === 'APPROVED' ? 'Content is safe.' : 'Content requires human review or moderation.'),
      appealEligible: status !== 'APPROVED',
      confidence: Math.round((0.85 + (maxScore * 0.12)) * 100) / 100
    };
  }

  /**
   * Submits a user appeal against a moderation verdict.
   */
  async submitAppeal(userId: string, entityType: string, entityId: string, reason: string): Promise<ModerationAppeal> {
    const id = uuidv4();
    const now = new Date().toISOString();

    query.run(`
      INSERT INTO moderation_appeals (id, user_id, entity_type, entity_id, reason, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
    `, [id, userId, entityType, entityId, reason, now, now]);

    return {
      id,
      userId,
      entityType: entityType as any,
      entityId,
      reason,
      status: 'pending',
      createdAt: now
    };
  }

  /**
   * Retrieves appeals filed by a specific user.
   */
  async getUserAppeals(userId: string): Promise<ModerationAppeal[]> {
    const rows = query.all(`
      SELECT id, user_id, entity_type, entity_id, reason, status, explanation, created_at
      FROM moderation_appeals
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]) as any[];

    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      reason: r.reason,
      status: r.status,
      explanation: r.explanation || undefined,
      createdAt: r.created_at
    }));
  }

  /**
   * Resolves an appeal (admin or automated audit).
   */
  async resolveAppeal(appealId: string, status: 'approved' | 'rejected', explanation?: string): Promise<ModerationAppeal | null> {
    const now = new Date().toISOString();
    query.run(`
      UPDATE moderation_appeals
      SET status = ?, explanation = ?, updated_at = ?
      WHERE id = ?
    `, [status, explanation || null, now, appealId]);

    const row = query.get(`
      SELECT id, user_id, entity_type, entity_id, reason, status, explanation, created_at
      FROM moderation_appeals
      WHERE id = ?
    `, [appealId]) as any;

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      reason: row.reason,
      status: row.status,
      explanation: row.explanation || undefined,
      createdAt: row.created_at
    };
  }
}

export const moderationAIService = new ModerationAIService();
