import express from 'express';
import { createOrder, verifyPayment, recordMockTransaction } from '../controllers/paymentController';

const router = express.Router();

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.post('/record-mock', recordMockTransaction);

export default router;
