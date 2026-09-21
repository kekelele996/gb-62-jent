import { Router } from 'express';
import { 
  register, 
  login, 
  getCurrentUser, 
  updateProfile,
  registerValidators,
  loginValidators
} from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', registerValidators, register);
router.post('/login', loginValidators, login);
router.get('/me', authMiddleware, getCurrentUser);
router.put('/profile', authMiddleware, updateProfile);

export default router;
