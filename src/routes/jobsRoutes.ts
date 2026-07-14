import express from 'express';
import multer from 'multer';
import { getJobs, createJob, applyJob } from '../controllers/jobsController';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.get('/', getJobs);
router.post('/', createJob);
router.post('/apply', upload.single('resume'), applyJob);

export default router;
