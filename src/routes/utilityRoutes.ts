import express from 'express';
import { 
    payBill, 
    getOperators, 
    getPlans,
    getCategories,
    getLocations,
    getBBPSOperatorsList,
    getOperatorParams,
    fetchBBPSBill,
    activateServiceEndpoint
} from '../controllers/utilityController';

const router = express.Router();

// Mock endpoints kept for backward compatibility if needed by frontend initially
router.get('/operators', getOperators);
router.get('/plans', getPlans);

// Real BBPS Endpoints
router.get('/bbps/categories', getCategories);
router.get('/bbps/locations', getLocations);
router.get('/bbps/operators', getBBPSOperatorsList);
router.get('/bbps/operator/:id/parameters', getOperatorParams);
router.post('/bbps/fetch-bill', fetchBBPSBill);
router.post('/bbps/activate', activateServiceEndpoint);
router.post('/pay', payBill);

export default router;
