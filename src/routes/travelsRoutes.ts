import express from 'express';
import { createBooking, getUserBookings, getAllBookingsAdmin } from '../controllers/travelsController';
import { requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/book', createBooking);
router.get('/user/:userId', getUserBookings);
router.get('/admin/all', requireAdmin, getAllBookingsAdmin);

export default router;
