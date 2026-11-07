import { Router } from 'express';
import { searchController } from '../controllers/searchController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, searchController.search);
router.get('/suggestions', optionalAuth, searchController.suggestions);

export default router;
