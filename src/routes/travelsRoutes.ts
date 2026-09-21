import express from 'express';
import { 
  getUserBookings, 
  getAllBookingsAdmin, 
  calculateFare,
  requestRide,
  getActiveRide,
  updateRideStatus,
  updateDriverStatus
} from '../controllers/travelsController';
import { requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/calculate-fare', calculateFare);
router.get('/user/:userId', getUserBookings);
router.get('/admin/all', requireAdmin, getAllBookingsAdmin);

// Phase 3 Uber-style Rides
router.post('/rides', requestRide);
router.get('/rides/active', getActiveRide);
router.put('/rides/:id/status', updateRideStatus);
router.put('/driver/status', updateDriverStatus);

export default router;
