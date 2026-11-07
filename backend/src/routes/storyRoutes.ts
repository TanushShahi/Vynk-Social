import { Router } from 'express';
import { storyController } from '../controllers/storyController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, storyController.getStories);
router.post('/', requireAuth, storyController.createStory);
router.post('/:id/view', requireAuth, storyController.markViewed);

export default router;
