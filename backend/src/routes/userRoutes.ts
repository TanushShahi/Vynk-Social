import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Static paths first
router.get('/suggested', optionalAuth, userController.getSuggested);
router.get('/follow-requests', requireAuth, userController.getFollowRequests);
router.get('/blocked', requireAuth, userController.getBlockedUsers);
router.patch('/profile', requireAuth, userController.updateProfile);

// Specific action paths
router.post('/:targetId/follow-request/accept', requireAuth, userController.acceptFollowRequest);
router.post('/:targetId/follow-request/reject', requireAuth, userController.rejectFollowRequest);
router.post('/:targetId/block', requireAuth, userController.blockUser);
router.delete('/:targetId/block', requireAuth, userController.unblockUser);
router.post('/:targetId/follow', requireAuth, userController.follow);
router.delete('/:targetId/follow', requireAuth, userController.unfollow);

// Identifier lookup (catch-all for uid or id)
router.get('/:identifier', optionalAuth, userController.getProfile);

export default router;
