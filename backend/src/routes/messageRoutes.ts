import { Router } from 'express';
import { messageController } from '../controllers/messageController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/conversations', requireAuth, messageController.getConversations);
router.post('/conversations', requireAuth, messageController.getOrCreateConversation);
router.get('/conversations/:id/messages', requireAuth, messageController.getMessages);
router.post('/conversations/:id/messages', requireAuth, messageController.sendMessage);
router.post('/messages/:messageId/react', requireAuth, messageController.reactMessage);

// Shared Space endpoints
router.get('/conversations/:id/shared-space', requireAuth, messageController.getSharedSpace);
router.post('/conversations/:id/shared-space', requireAuth, messageController.addSharedSpaceItem);

export default router;
