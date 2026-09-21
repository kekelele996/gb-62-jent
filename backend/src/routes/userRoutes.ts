import { Router } from 'express';
import { 
  followUser, 
  unfollowUser, 
  getFollowing, 
  getFollowers,
  getUserProfile,
  checkFollow
} from '../controllers/followController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/follow/:targetUserId', authMiddleware, followUser);
router.delete('/follow/:targetUserId', authMiddleware, unfollowUser);
router.get('/following/:userId', getFollowing);
router.get('/followers/:userId', getFollowers);
router.get('/profile/:userId', getUserProfile);
router.get('/check-follow/:targetUserId', authMiddleware, checkFollow);

export default router;
