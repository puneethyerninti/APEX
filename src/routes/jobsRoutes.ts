import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { uploadToS3 } from '../services/s3Upload';
import { getJobs, createJob, applyJob } from '../controllers/jobsController';

const router = express.Router();
const upload = uploadToS3;

router.get('/', getJobs);
router.post('/', requireAdmin, createJob);
router.post('/apply', requireAuth, (req, res, next) => upload.single('resume')(req, res, error => {
  if (!error) return next();
  const invalidFile = error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE' || String(error.message).startsWith('Only PDF');
  return res.status(invalidFile ? 400 : 503).json({ error: invalidFile ? 'Use one PDF, DOC or DOCX resume under 5 MB.' : 'Resume storage is temporarily unavailable. No application has been confirmed.' });
}), applyJob);

export default router;
