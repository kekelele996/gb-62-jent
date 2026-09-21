import { Router } from 'express';
import { createReport, getReports, handleReport } from '../controllers/reportController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, createReport);
router.get('/', authMiddleware, getReports);
router.put('/:id/handle', authMiddleware, handleReport);

export default router;
