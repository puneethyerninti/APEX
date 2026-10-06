"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const travelsController_1 = require("../controllers/travelsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.requireAuth);
router.post('/quotes', travelsController_1.calculateFare);
router.get('/history', travelsController_1.getUserBookings);
router.get('/driver/requests', travelsController_1.getDriverRequests);
router.post('/calculate-fare', travelsController_1.calculateFare);
router.get('/user/:userId', travelsController_1.getUserBookings);
router.get('/admin/all', authMiddleware_1.requireAdmin, travelsController_1.getAllBookingsAdmin);
router.put('/admin/drivers/:id/vehicle', authMiddleware_1.requireAdmin, travelsController_1.configureDriver);
router.post('/admin/rides/:id/cancel', authMiddleware_1.requireAdmin, travelsController_1.cancelRideAdmin);
// Phase 3 Uber-style Rides
router.post('/rides', travelsController_1.requestRide);
router.get('/rides/active', travelsController_1.getActiveRide);
router.get('/rides/:id', travelsController_1.getRide);
router.post('/rides/:id/payment/order', travelsController_1.createCabPaymentOrder);
router.put('/rides/:id/status', travelsController_1.updateRideStatus);
router.put('/driver/status', travelsController_1.updateDriverStatus);
exports.default = router;
