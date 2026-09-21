import { Router } from 'express';
import { 
  createMoment, 
  getMoments, 
  getUserMoments, 
  deleteMoment 
} from '../controllers/momentController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, createMoment);
router.get('/', authMiddleware, getMoments);
router.get('/user/:userId', getUserMoments);
router.delete('/:id', authMiddleware, deleteMoment);

export default router;
