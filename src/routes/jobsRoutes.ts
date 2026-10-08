import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { uploadToS3 } from '../services/s3Upload';
import { getJobs, createJob, applyJob } from '../controllers/jobsController';

const router = express.Router();
const upload = uploadToS3;

router.get('/', getJobs);
router.post('/', requireAdmin, createJob);
router.post('/apply', requireAuth, upload.single('resume'), applyJob);

export default router;
