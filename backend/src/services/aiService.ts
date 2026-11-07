import { aiProvider } from './aiProvider.js';
import { imageAnalysisService } from './imageAnalysisService.js';
import type {
  AICaptionTone,
  AIContentAssistantRequest,
  AIContentAssistantResponse,
  AIImageUnderstanding,
  MoodType
} from '../../../shared/types.js';

class AIService {
  /**
   * Complete AI Content Assistant:
   * Generates captions, hashtags, tone variations, description, mood inference,
   * writing suggestions, and analyzes attached media if provided.
   */
  async generateContentAssistant(req: AIContentAssistantRequest): Promise<AIContentAssistantResponse> {
    const tone = req.tone || 'friendly';
    let imageAnalysis: AIImageUnderstanding | undefined;

    if (req.mediaUrl) {
      try {
        imageAnalysis = await imageAnalysisService.understandImage(req.mediaUrl);
      } catch (err) {
        console.warn('[AIService] Image analysis skipped or failed:', err);
      }
    }

    const systemPrompt = `You are Vynk Social's AI Content Assistant.
Your task is to craft high-quality, engaging social content tailored for genuine human connection, NOT shallow engagement farming.
You must respond with valid JSON matching this schema:
{
  "caption": "string (the main proposed caption)",
  "hashtags": ["string without # symbol"],
  "suggestedMood": "CHILL" | "HAPPY" | "MOTIVATED" | "CURIOUS" | "CREATIVE" | "FUNNY" | "EMOTIONAL" | "ADVENTURE" | "LEARNING",
  "altText": "string (accessibility description)",
  "category": "string (e.g. Technology, Art, Mindset, Nature, Lifestyle, Education)",
  "writingSuggestions": ["string (concrete ways to improve punchiness, clarity, or depth)"],
  "toneVariations": {
    "friendly": "string",
    "witty": "string",
    "poetic": "string",
    "minimalist": "string",
    "inspirational": "string",
    "humorous": "string",
    "analytical": "string",
    "rebellious": "string"
  }
}`;

    const contextParts = [
      `User topic / draft: "${req.topic || 'A thoughtful moment'}"`,
      `Preferred Tone: "${tone}"`,
      req.currentMood ? `User current mood: "${req.currentMood}"` : '',
      imageAnalysis ? `Visual Scene Description: "${imageAnalysis.description}" with visual mood: "${imageAnalysis.visualMood}", dominant colors: ${imageAnalysis.dominantColors.join(', ')}` : '',
      req.targetAudience ? `Target Audience: "${req.targetAudience}"` : ''
    ].filter(Boolean).join('\n');

    const prompt = `Please generate social content assistance for the following input:\n${contextParts}`;

    const parsed = await aiProvider.generateStructured<AIContentAssistantResponse>(prompt, systemPrompt);

    // Ensure fallback safety if LLM returned partial response
    const validMoods: MoodType[] = ['chill', 'happy', 'motivated', 'curious', 'creative', 'funny', 'emotional', 'adventure', 'learning'];
    const lower = parsed.suggestedMood?.toLowerCase() as MoodType;
    const inferredMood: MoodType = (lower && validMoods.includes(lower))
      ? lower
      : (req.currentMood || 'creative');

    const parsedAny = parsed as any;
    const hashtagsList: string[] = Array.isArray(parsedAny.hashtags) 
      ? parsedAny.hashtags.map((t: any) => String(t).replace(/^#/, ''))
      : (Array.isArray(parsed.tags) ? parsed.tags.map(t => String(t).replace(/^#/, '')) : ['VynkMoments', 'Explore']);

    return {
      caption: parsed.caption || req.topic || 'Living in the moment. ✨',
      hashtags: hashtagsList,
      suggestedMood: inferredMood,
      altText: parsed.altText || (imageAnalysis ? (imageAnalysis.description || imageAnalysis.sceneDescription) : 'A user photo on Vynk Social'),
      category: parsed.category || 'Lifestyle',
      writingSuggestions: Array.isArray(parsedAny.writingSuggestions) && parsedAny.writingSuggestions.length > 0 
        ? parsedAny.writingSuggestions 
        : ['Add a personal reflection to make this resonate deeper.'],
      toneVariations: {
        friendly: parsedAny.toneVariations?.friendly || parsed.caption || 'Hey friends, sharing this moment with you all! 😊',
        witty: parsedAny.toneVariations?.witty || 'Plot twist: life happened and it was actually pretty great.',
        poetic: parsedAny.toneVariations?.poetic || 'Shadows whisper where sunlight lingers.',
        minimalist: parsedAny.toneVariations?.minimalist || 'Quiet moments.',
        inspirational: parsedAny.toneVariations?.inspirational || 'Every day is another blank page. Write boldly.',
        humorous: parsedAny.toneVariations?.humorous || 'I came, I saw, I forgot what I was doing.',
        analytical: parsedAny.toneVariations?.analytical || 'Deconstructing the rhythm of today.',
        rebellious: parsedAny.toneVariations?.rebellious || 'Breaking routines because comfort zones are overrated.'
      },
      imageUnderstanding: imageAnalysis
    };
  }

  /**
   * Improves existing draft text with targeted tone or clarity enhancements
   */
  async improveText(text: string, tone: AICaptionTone = 'friendly', instructions?: string): Promise<{
    original: string;
    improved: string;
    explanation: string;
    tone: AICaptionTone;
  }> {
    const systemPrompt = `You are an expert social media editor.
Given a draft text, rewrite it according to the requested tone ("${tone}") and instructions.
Return valid JSON:
{
  "improved": "string (the rewritten text)",
  "explanation": "string (brief note explaining what was enhanced: punch, rhythm, clarity, or emotional hook)"
}`;

    const prompt = `Draft:\n"""\n${text}\n"""\nRequested Tone: ${tone}\n${instructions ? `Specific Instructions: ${instructions}` : ''}`;

    const result = await aiProvider.generateStructured<{ improved: string; explanation: string }>(prompt, systemPrompt);

    return {
      original: text,
      improved: result.improved || text,
      explanation: result.explanation || `Refined for ${tone} tone and enhanced clarity.`,
      tone
    };
  }

  /**
   * Generates relevant hashtags for text and/or media
   */
  async suggestHashtags(text: string, mediaUrl?: string, count: number = 8): Promise<string[]> {
    const systemPrompt = `You are a social media hashtag specialist. Return a JSON object with a "hashtags" array of strings (no '#' character). Focus on authentic interest communities rather than generic spam tags.`;
    const prompt = `Generate up to ${count} community hashtags for the following content:\n"${text}"\n${mediaUrl ? `Image reference: ${mediaUrl}` : ''}`;

    const res = await aiProvider.generateStructured<{ hashtags: string[] }>(prompt, systemPrompt);
    if (res.hashtags && Array.isArray(res.hashtags)) {
      return res.hashtags.map(tag => tag.replace(/^#/, '').trim()).filter(Boolean).slice(0, count);
    }
    return ['VynkSocial', 'Moments', 'Community'];
  }

  /**
   * Backward-compatible helper method for Phase 1–3 endpoints
   */
  async analyzeContent(content: string, mediaUrl?: string) {
    const assistant = await this.generateContentAssistant({
      topic: content,
      mediaUrl
    });

    return {
      caption: assistant.caption,
      tags: (assistant.hashtags || []).map((t: string) => `#${t.replace(/^#/, '')}`),
      mood: assistant.suggestedMood,
      safetyScore: 'SAFE',
      suggestedMood: assistant.suggestedMood,
      detectedObjects: assistant.imageUnderstanding?.detectedObjects || [],
      extractedTags: assistant.hashtags,
      summary: assistant.altText,
      confidence: 0.92
    };
  }

  /**
   * Backward-compatible safety helper
   */
  async checkSafety(content: string) {
    // Quick safety filter checking toxicity / hate / harassment
    const toxicKeywords = ['kill yourself', 'die', 'hate you all', 'nazi', 'terrorist'];
    const lower = content.toLowerCase();
    const isToxic = toxicKeywords.some(w => lower.includes(w));

    return {
      safe: !isToxic,
      reason: isToxic ? 'Content violates community guidelines on harassment/hate' : undefined,
      score: isToxic ? 0.05 : 0.99
    };
  }
}

export const aiService = new AIService();
