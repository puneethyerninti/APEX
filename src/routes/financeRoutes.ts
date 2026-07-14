import express from 'express';
import { getWalletBalance, deductMoney, addMoney } from '../controllers/financeController';

const router = express.Router();

router.get('/wallet', getWalletBalance);
router.post('/wallet/deduct', deductMoney);
router.post('/wallet/add', addMoney);

export default router;
