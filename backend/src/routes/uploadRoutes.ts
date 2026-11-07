import { Router } from 'express';
import { uploadController, uploadMiddleware } from '../controllers/uploadController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, uploadMiddleware.single('file'), uploadController.uploadSingle);

export default router;
