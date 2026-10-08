import express from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { createLead } from '../controllers/leadController';

const router = express.Router();

router.post('/', requireAuth, createLead);

export default router;
