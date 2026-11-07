import { Router } from 'express';
import { healthController } from '../controllers/healthController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/summary', optionalAuth, healthController.getDailySummary);
router.get('/achievements', optionalAuth, healthController.getAchievements);
router.get('/achievements/:userId', optionalAuth, healthController.getAchievements);

export default router;
