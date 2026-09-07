import express from 'express';
import { submitInquiry, createProperty, getPropertiesNearMe, getAllProperties } from '../controllers/realtyController';

const router = express.Router();

router.post('/inquire', submitInquiry);
router.post('/property', createProperty);
router.get('/property/nearby', getPropertiesNearMe);
router.get('/property/all', getAllProperties);

export default router;
