import express from 'express';
import { getCourses, createCourse } from '../controllers/academyController';

const router = express.Router();

router.get('/courses', getCourses);
router.post('/courses', createCourse);

export default router;
