import express from 'express';
import { requireAdmin, requireAuth } from '../middleware/authMiddleware';
import { getCourses, createCourse, getMyEnrollments } from '../controllers/academyController';

const router = express.Router();

router.get('/courses', getCourses);
router.get('/enrollments', requireAuth, getMyEnrollments);
router.post('/courses', requireAdmin, createCourse);

export default router;
