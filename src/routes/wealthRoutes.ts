import express from 'express';
import { getMarketData, logInvestIntent } from '../controllers/wealthController';

const router = express.Router();

router.get('/market-data', getMarketData);
router.post('/invest-intent', logInvestIntent);

export default router;
