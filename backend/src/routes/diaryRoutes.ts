import { Router } from 'express';
import { 
  createDiary, 
  getDiaries, 
  getDiaryById, 
  updateDiary, 
  deleteDiary 
} from '../controllers/diaryController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, createDiary);
router.get('/', getDiaries);
router.get('/:id', getDiaryById);
router.put('/:id', authMiddleware, updateDiary);
router.delete('/:id', authMiddleware, deleteDiary);

export default router;
