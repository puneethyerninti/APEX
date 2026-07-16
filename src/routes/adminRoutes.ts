import express from 'express';
import { getDashboardStats, getPendingApprovals, updateApprovalStatus, getUsersList } from '../controllers/adminController';
import { requireAdmin } from '../middleware/adminMiddleware';

const router = express.Router();

router.use(requireAdmin);

router.get('/stats', getDashboardStats);
router.get('/approvals', getPendingApprovals);
router.post('/approvals/status', updateApprovalStatus);
router.get('/users', getUsersList);

export default router;
