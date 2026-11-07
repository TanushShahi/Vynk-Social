import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', requireAuth, authController.me);
router.get('/demo-accounts', authController.demoAccounts);
router.post('/demo-login', authController.demoLogin);

export default router;
