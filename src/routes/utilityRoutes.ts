import express from 'express';
import { payBill, getOperators, getPlans } from '../controllers/utilityController';

const router = express.Router();

router.post('/pay', payBill);
router.get('/operators', getOperators);
router.get('/plans', getPlans);

export default router;
