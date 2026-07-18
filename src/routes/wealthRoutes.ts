import express from 'express';
import { getMarketData } from '../controllers/wealthController';

const router = express.Router();

router.get('/market-data', getMarketData);

export default router;
