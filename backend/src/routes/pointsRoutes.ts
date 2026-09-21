import { Router } from 'express';
import { checkIn, getCheckInStatus } from '../controllers/pointsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/check-in', authMiddleware, checkIn);
router.get('/check-in/status', authMiddleware, getCheckInStatus);

export default router;
