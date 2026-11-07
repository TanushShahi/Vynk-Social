import { Router } from 'express';
import { roomController } from '../controllers/roomController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, roomController.getRooms);
router.get('/:id', optionalAuth, roomController.getRoomById);
router.post('/', requireAuth, roomController.createRoom);
router.post('/:id/join', requireAuth, roomController.toggleMembership);
router.get('/:id/messages', optionalAuth, roomController.getMessages);
router.post('/:id/messages', requireAuth, roomController.sendMessage);
router.post('/messages/:messageId/vote', requireAuth, roomController.votePoll);

export default router;
