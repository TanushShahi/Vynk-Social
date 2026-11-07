import { Router } from 'express';
import { postController } from '../controllers/postController.js';
import { reactionController } from '../controllers/reactionController.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/feed', optionalAuth, postController.getFeed);
router.get('/preferences', requireAuth, postController.getContentPreferences);
router.put('/preferences', requireAuth, postController.updateContentPreferences);
router.get('/user/:userId', optionalAuth, postController.getUserPosts);
router.get('/:id', optionalAuth, postController.getPostById);
router.post('/', requireAuth, postController.createPost);
router.delete('/:id', requireAuth, postController.deletePost);

// Wave reaction system
router.post('/:id/react', requireAuth, reactionController.toggleReaction);

// Save / Bookmark
router.post('/:id/save', requireAuth, postController.toggleSave);

// Negative feedback / Hiding
router.post('/:id/hide', requireAuth, postController.hidePost);
router.delete('/:id/hide', requireAuth, postController.unhidePost);

export default router;
