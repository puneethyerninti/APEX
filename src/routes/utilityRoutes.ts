import express from 'express';
import { payBill, getOperators, rechargeMobile, getPlans } from '../controllers/utilityController';

const router = express.Router();

router.post('/pay', payBill);
router.get('/operators', getOperators);
router.get('/plans', getPlans);
router.post('/recharge', rechargeMobile);

export default router;
