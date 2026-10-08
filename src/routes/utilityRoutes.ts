import express from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { 
    payBill, 
    getPlans,
    getCategories,
    getLocations,
    getBBPSOperatorsList,
    getOperatorParams,
    fetchBBPSBill,
    getUtilityTransactionStatus,
    getUserUtilityHistory
} from '../controllers/utilityController';

const router = express.Router();
router.use(requireAuth);

// BBPS Discovery Endpoints
router.get('/bbps/categories', getCategories);
router.get('/bbps/locations', getLocations);
router.get('/bbps/operators', getBBPSOperatorsList);
router.get('/bbps/operator/:id/parameters', getOperatorParams);

// BBPS Bill Fetch & Pay
router.post('/bbps/fetch-bill', fetchBBPSBill);
router.post('/pay', (_req, res) => res.status(409).json({ error: 'Direct utility payment is unavailable. Use the verified payment checkout.' }));
router.get('/transactions/:id/status', getUtilityTransactionStatus);
router.get('/history/:userId', getUserUtilityHistory);

// Recharge Plans (Mobile Prepaid / DTH)
router.get('/plans', getPlans);

export default router;
