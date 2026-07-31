import express from 'express';
import { 
  sendEmailNotification, 
  getUserNotifications, 
  markAsRead, 
  markAllAsRead 
} from '../controllers/notificationController';

const router = express.Router();

// Email routes
router.post('/email', sendEmailNotification);

// App notification routes
router.get('/user/:userId', getUserNotifications);
router.put('/:id/read', markAsRead);
router.put('/mark-all-read', markAllAsRead);

export default router;
