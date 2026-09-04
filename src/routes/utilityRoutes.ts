import express from 'express';
import { 
    payBill, 
    getPlans,
    getCategories,
    getLocations,
    getBBPSOperatorsList,
    getOperatorParams,
    fetchBBPSBill,
    getUtilityTransactionStatus,
} from '../controllers/utilityController';

const router = express.Router();

// BBPS Discovery Endpoints
router.get('/bbps/categories', getCategories);
router.get('/bbps/locations', getLocations);
router.get('/bbps/operators', getBBPSOperatorsList);
router.get('/bbps/operator/:id/parameters', getOperatorParams);

// BBPS Bill Fetch & Pay
router.post('/bbps/fetch-bill', fetchBBPSBill);
router.post('/pay', payBill);
router.get('/transactions/:id/status', getUtilityTransactionStatus);

// Recharge Plans (Mobile Prepaid / DTH)
router.get('/plans', getPlans);

export default router;
