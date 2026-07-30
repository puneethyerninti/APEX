import express from 'express';
import { submitInquiry } from '../controllers/realtyController';

const router = express.Router();

router.post('/inquire', submitInquiry);

export default router;
