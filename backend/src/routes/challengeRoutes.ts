import { Router } from 'express';
import {
  createChallenge,
  getChallenges,
  getChallengeById,
  registerChallenge,
  cancelRegistration,
  submitChallenge
} from '../controllers/challengeController';
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, adminMiddleware, createChallenge);
router.get('/', optionalAuthMiddleware, getChallenges);
router.get('/:id', optionalAuthMiddleware, getChallengeById);
router.post('/:challengeId/register', authMiddleware, registerChallenge);
router.delete('/:challengeId/register', authMiddleware, cancelRegistration);
router.post('/:challengeId/submit', authMiddleware, submitChallenge);

export default router;
