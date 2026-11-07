import { Router } from 'express';
import { capsuleController } from '../controllers/capsuleController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, capsuleController.getCapsules);
router.get('/:id', optionalAuth, capsuleController.getCapsuleById);
router.post('/', requireAuth, capsuleController.createCapsule);
router.post('/:id/items', requireAuth, capsuleController.addItem);
router.delete('/:id', requireAuth, capsuleController.deleteCapsule);

export default router;
