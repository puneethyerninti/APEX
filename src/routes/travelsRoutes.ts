import express from 'express';
import { 
  getUserBookings, 
  getAllBookingsAdmin, 
  calculateFare,
  requestRide,
  getActiveRide,
  updateRideStatus,
  updateDriverStatus,
  getRide, getDriverRequests, createCabPaymentOrder, configureDriver, cancelRideAdmin
} from '../controllers/travelsController';
import { requireAdmin, requireAuth } from '../middleware/authMiddleware';

const router = express.Router();
router.use(requireAuth);
router.post('/quotes', calculateFare);
router.get('/history', getUserBookings);
router.get('/driver/requests', getDriverRequests);

router.post('/calculate-fare', calculateFare);
router.get('/user/:userId', getUserBookings);
router.get('/admin/all', requireAdmin, getAllBookingsAdmin);
router.put('/admin/drivers/:id/vehicle', requireAdmin, configureDriver);
router.post('/admin/rides/:id/cancel', requireAdmin, cancelRideAdmin);

// Phase 3 Uber-style Rides
router.post('/rides', requestRide);
router.get('/rides/active', getActiveRide);
router.get('/rides/:id', getRide);
router.post('/rides/:id/payment/order', createCabPaymentOrder);
router.put('/rides/:id/status', updateRideStatus);
router.put('/driver/status', updateDriverStatus);

export default router;
