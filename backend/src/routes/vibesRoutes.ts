import { Router } from 'express';
import { vibesController } from '../controllers/vibesController.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/feed', optionalAuth, vibesController.getFeed);
router.post('/:id/view', optionalAuth, vibesController.recordView);

export default router;
