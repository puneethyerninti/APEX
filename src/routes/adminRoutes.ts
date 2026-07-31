import express from 'express';
import { 
  getDashboardStats, 
  getPendingApprovals, 
  updateApprovalStatus, 
  getUsersList,
  getAllTransactions,
  deleteEntity,
  updateUserWallet,
  completeTransaction,
  getAllStoreOrders,
  updateStoreOrderStatus,
  getAllCharityDonations,
  broadcastMessage
} from '../controllers/adminController';
import { requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

router.use(requireAdmin);

router.get('/stats', getDashboardStats);
router.get('/approvals', getPendingApprovals);
router.post('/approvals/status', updateApprovalStatus);
router.get('/users', getUsersList);
router.get('/transactions', getAllTransactions);
router.delete('/:type/:id', deleteEntity);
router.post('/users/:id/wallet', updateUserWallet);
router.put('/transactions/:id/complete', completeTransaction);

// New Routes
router.get('/store-orders', getAllStoreOrders);
router.put('/store-orders/:id/status', updateStoreOrderStatus);
router.get('/charity-donations', getAllCharityDonations);
router.post('/broadcast', broadcastMessage);

export default router;
