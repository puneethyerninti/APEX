import express from 'express';
import { getUserBookings, getAllBookingsAdmin } from '../controllers/travelsController';
import { requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/user/:userId', getUserBookings);
router.get('/admin/all', requireAdmin, getAllBookingsAdmin);

export default router;
