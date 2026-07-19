"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController_1 = require("../controllers/adminController");
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const router = express_1.default.Router();
router.use(adminMiddleware_1.requireAdmin);
router.get('/stats', adminController_1.getDashboardStats);
router.get('/approvals', adminController_1.getPendingApprovals);
router.post('/approvals/status', adminController_1.updateApprovalStatus);
router.get('/users', adminController_1.getUsersList);
exports.default = router;
