import express from 'express';
import { payBill } from '../controllers/utilityController';

const router = express.Router();

router.post('/pay', payBill);

export default router;
