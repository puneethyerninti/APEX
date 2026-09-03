import express from 'express';
import { getUserBookings, getAllBookingsAdmin, calculateFare } from '../controllers/travelsController';
import { requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/calculate-fare', calculateFare);
router.get('/user/:userId', getUserBookings);
router.get('/admin/all', requireAdmin, getAllBookingsAdmin);

export default router;
