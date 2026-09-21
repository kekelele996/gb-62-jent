import { Router } from 'express';
import {
  createChallengeController,
  getChallenges,
  getChallengeByIdController,
  registerController,
  cancelController,
  submitChallenge,
  updateSubmissionController
} from '../controllers/challengeController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { optionalAuthMiddleware } from '../middleware/optionalAuth';

const router = Router();

router.post('/', authMiddleware, adminMiddleware, createChallengeController);
router.get('/', optionalAuthMiddleware, getChallenges);
router.get('/:id', optionalAuthMiddleware, getChallengeByIdController);
router.post('/:challengeId/register', authMiddleware, registerController);
router.delete('/:challengeId/register', authMiddleware, cancelController);
router.post('/:challengeId/submit', authMiddleware, submitChallenge);
router.put('/:challengeId/submit', authMiddleware, updateSubmissionController);

export default router;
