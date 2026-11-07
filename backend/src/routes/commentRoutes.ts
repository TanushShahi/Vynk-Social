import { Router } from 'express';
import { commentController } from '../controllers/commentController.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/post/:id', optionalAuth, commentController.getComments);
router.post('/post/:id', requireAuth, commentController.addComment);
router.post('/:commentId/like', requireAuth, commentController.likeComment);

export default router;
