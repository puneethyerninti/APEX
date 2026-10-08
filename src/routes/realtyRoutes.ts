import express from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { submitInquiry, createProperty, getPropertiesNearMe, getAllProperties } from '../controllers/realtyController';

const router = express.Router();

router.post('/inquire', requireAuth, submitInquiry);
router.post('/property', requireAuth, createProperty);
router.get('/property/nearby', getPropertiesNearMe);
router.get('/property/all', getAllProperties);

export default router;
