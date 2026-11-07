import { Router } from 'express';
import { aiController } from '../controllers/aiController.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();

// Provider Info
router.get('/provider', aiController.getProviderStatus);

// Step 1 & Backward compatibility
router.post('/suggest', optionalAuth, aiController.suggestMetadata);

// Step 2: Content Assistant & Writing
router.post('/content/assist', optionalAuth, aiController.contentAssist);
router.post('/content/improve', optionalAuth, aiController.improveWriting);
router.post('/content/hashtags', optionalAuth, aiController.suggestHashtags);

// Step 2 & 4: Image Understanding
router.post('/image/understand', optionalAuth, aiController.understandImage);

// Step 4: Capsule AI Assistant & Recap
router.post('/capsule/assist', optionalAuth, aiController.capsuleAssist);
router.get('/capsule/recap', requireAuth, aiController.getCapsuleRecap);

// Step 5: Safety & Moderation
router.post('/moderate', optionalAuth, aiController.moderateContent);
router.post('/moderation/appeal', requireAuth, aiController.submitAppeal);
router.get('/moderation/appeals', requireAuth, aiController.getAppeals);

// Step 6: Creator AI
router.get('/creator/insights', requireAuth, aiController.getCreatorInsights);
router.post('/creator/ideas', requireAuth, aiController.getCreatorIdeas);

export default router;
