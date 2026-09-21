import { Router } from 'express';
import { createComment, deleteComment, toggleLike } from '../controllers/interactionController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/comments', authMiddleware, createComment);
router.delete('/comments/:id', authMiddleware, deleteComment);
router.post('/likes', authMiddleware, toggleLike);

export default router;
