import { Router } from 'express';
import { 
  sendMessage, 
  getMessages, 
  getConversations,
  getUnreadCount
} from '../controllers/messageController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, sendMessage);
router.get('/conversations', authMiddleware, getConversations);
router.get('/unread-count', authMiddleware, getUnreadCount);
router.get('/:otherUserId', authMiddleware, getMessages);

export default router;
