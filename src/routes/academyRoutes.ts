import express from 'express';
import { requireAdmin } from '../middleware/authMiddleware';
import { getCourses, createCourse } from '../controllers/academyController';

const router = express.Router();

router.get('/courses', getCourses);
router.post('/courses', requireAdmin, createCourse);

export default router;
