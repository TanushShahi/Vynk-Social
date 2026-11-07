import { Request, Response } from 'express';
import { aiService } from '../services/aiService.js';
import { imageAnalysisService } from '../services/imageAnalysisService.js';
import { capsuleAIService } from '../services/capsuleAIService.js';
import { moderationAIService } from '../services/moderationAIService.js';
import { creatorAIService } from '../services/creatorAIService.js';
import { aiProvider } from '../services/aiProvider.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const aiController = {
  // Provider health and status
  getProviderStatus: async (req: Request, res: Response) => {
    try {
      const info = aiProvider.getProviderInfo();
      return res.json({ status: 'ok', provider: info });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve AI provider status.' });
    }
  },

  // Backward compatible suggest endpoint
  suggestMetadata: async (req: Request, res: Response) => {
    try {
      const { topic, filename, text, mediaUrl } = req.body;
      const content = topic || text || filename || '';
      const analysis = await aiService.analyzeContent(content, mediaUrl || filename);
      return res.json(analysis);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to generate AI suggestions.' });
    }
  },

  // Step 2: Full Content Assistant
  contentAssist: async (req: Request, res: Response) => {
    try {
      const { topic, mediaUrl, currentMood, tone, targetAudience } = req.body;
      const result = await aiService.generateContentAssistant({
        topic,
        mediaUrl,
        currentMood,
        tone,
        targetAudience
      });
      return res.json({ success: true, assistant: result });
    } catch (err) {
      console.error('contentAssist error:', err);
      return res.status(500).json({ error: 'Failed to generate content assistance.' });
    }
  },

  // Step 2: Tone & Writing improvement
  improveWriting: async (req: Request, res: Response) => {
    try {
      const { text, tone, instructions } = req.body;
      if (!text) return res.status(400).json({ error: 'Text is required for improvement.' });
      const result = await aiService.improveText(text, tone, instructions);
      return res.json({ success: true, result });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to improve writing.' });
    }
  },

  // Step 2: Hashtag suggestions
  suggestHashtags: async (req: Request, res: Response) => {
    try {
      const { text, mediaUrl, count } = req.body;
      const hashtags = await aiService.suggestHashtags(text || '', mediaUrl, count ? parseInt(count, 10) : 8);
      return res.json({ success: true, hashtags });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to suggest hashtags.' });
    }
  },

  // Step 2 & 4: Image Understanding
  understandImage: async (req: Request, res: Response) => {
    try {
      const { mediaUrl } = req.body;
      if (!mediaUrl) return res.status(400).json({ error: 'mediaUrl is required.' });
      const understanding = await imageAnalysisService.understandImage(mediaUrl);
      return res.json({ success: true, imageUnderstanding: understanding });
    } catch (err) {
      return res.status(500).json({ error: 'Image analysis failed.' });
    }
  },

  // Step 4: Capsule Metadata Assistant (with duplicate detection)
  capsuleAssist: async (req: Request, res: Response) => {
    try {
      const { title, description, category, items } = req.body;
      const metadata = await capsuleAIService.generateCapsuleMetadata({
        title,
        description,
        category,
        items: items || []
      });
      return res.json({ success: true, capsuleAssistant: metadata });
    } catch (err) {
      console.error('capsuleAssist error:', err);
      return res.status(500).json({ error: 'Failed to generate capsule metadata.' });
    }
  },

  // Step 4: Monthly or Yearly Recap
  getCapsuleRecap: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user?.id;
      if (!currentUserId) return res.status(401).json({ error: 'Authentication required' });
      const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;

      const recap = await capsuleAIService.generateRecap(currentUserId, year, month);
      return res.json({ success: true, recap });
    } catch (err) {
      console.error('getCapsuleRecap error:', err);
      return res.status(500).json({ error: 'Failed to generate activity recap.' });
    }
  },

  // Step 5: Advanced Multimodal Moderation
  moderateContent: async (req: Request, res: Response) => {
    try {
      const { content, mediaUrl } = req.body;
      if (!content && !mediaUrl) {
        return res.status(400).json({ error: 'Content or mediaUrl is required.' });
      }
      const verdict = await moderationAIService.moderateContent(content || '', mediaUrl);
      return res.json({ success: true, verdict });
    } catch (err) {
      console.error('moderateContent error:', err);
      return res.status(500).json({ error: 'Content moderation check failed.' });
    }
  },

  // Step 5: Submit Appeal
  submitAppeal: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user?.id;
      if (!currentUserId) return res.status(401).json({ error: 'Authentication required' });
      const { entityType, entityId, reason } = req.body;
      if (!entityType || !entityId || !reason) {
        return res.status(400).json({ error: 'entityType, entityId, and reason are required.' });
      }
      const appeal = await moderationAIService.submitAppeal(currentUserId, entityType, entityId, reason);
      return res.status(201).json({ success: true, appeal });
    } catch (err) {
      console.error('submitAppeal error:', err);
      return res.status(500).json({ error: 'Failed to submit appeal.' });
    }
  },

  // Step 5: Get Appeals
  getAppeals: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user?.id;
      if (!currentUserId) return res.status(401).json({ error: 'Authentication required' });
      const appeals = await moderationAIService.getUserAppeals(currentUserId);
      return res.json({ success: true, appeals });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve appeals.' });
    }
  },

  // Step 6: Creator Insights
  getCreatorInsights: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user?.id;
      if (!currentUserId) return res.status(401).json({ error: 'Authentication required' });
      const insights = await creatorAIService.getCreatorInsights(currentUserId);
      return res.json({ success: true, insights });
    } catch (err) {
      console.error('getCreatorInsights error:', err);
      return res.status(500).json({ error: 'Failed to get creator insights.' });
    }
  },

  // Step 6: Creator Ideas
  getCreatorIdeas: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user?.id;
      if (!currentUserId) return res.status(401).json({ error: 'Authentication required' });
      const { theme, mood } = req.body;
      const ideas = await creatorAIService.generateCustomIdeas(currentUserId, theme || 'Creative Expression', mood);
      return res.json({ success: true, ...ideas });
    } catch (err) {
      console.error('getCreatorIdeas error:', err);
      return res.status(500).json({ error: 'Failed to generate custom ideas.' });
    }
  }
};
