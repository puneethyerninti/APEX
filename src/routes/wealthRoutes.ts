import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { getMarketData, logInvestIntent, seedMutualFunds } from '../controllers/wealthController';

const router = express.Router();

router.get('/market-data', getMarketData);
router.post('/invest-intent', requireAuth, logInvestIntent);
router.post('/seed', requireAdmin, seedMutualFunds);

export default router;
