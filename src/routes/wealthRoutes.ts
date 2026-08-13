import express from 'express';
import { getMarketData, logInvestIntent, seedMutualFunds } from '../controllers/wealthController';

const router = express.Router();

router.get('/market-data', getMarketData);
router.post('/invest-intent', logInvestIntent);
router.post('/seed', seedMutualFunds);

export default router;
