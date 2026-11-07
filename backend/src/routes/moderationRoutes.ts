import { Router } from 'express';
import { aiController } from '../controllers/aiController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.post('/check', optionalAuth, aiController.moderateContent);
router.post('/appeal', requireAuth, aiController.submitAppeal);
router.get('/appeals', requireAuth, aiController.getAppeals);

export default router;
