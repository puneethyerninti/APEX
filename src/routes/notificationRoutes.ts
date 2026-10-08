import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { 
  sendEmailNotification, 
  getUserNotifications, 
  markAsRead, 
  markAllAsRead 
} from '../controllers/notificationController';

const router = express.Router();

// Email routes
router.post('/email', requireAdmin, sendEmailNotification);
router.use(requireAuth);

// App notification routes
router.get('/user/:userId', getUserNotifications);
router.put('/:id/read', markAsRead);
router.put('/mark-all-read', markAllAsRead);

export default router;
