import express from 'express';
import { payBill, getOperators, rechargeMobile } from '../controllers/utilityController';

const router = express.Router();

router.post('/pay', payBill);
router.get('/operators', getOperators);
router.post('/recharge', rechargeMobile);

export default router;
