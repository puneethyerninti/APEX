import express from 'express';
import { enrollCourse } from '../controllers/academyController';

const router = express.Router();

router.post('/enroll', enrollCourse);

export default router;
