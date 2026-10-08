"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const utilityController_1 = require("../controllers/utilityController");
const router = express_1.default.Router();
router.use(authMiddleware_1.requireAuth);
// BBPS Discovery Endpoints
router.get('/bbps/categories', utilityController_1.getCategories);
router.get('/bbps/locations', utilityController_1.getLocations);
router.get('/bbps/operators', utilityController_1.getBBPSOperatorsList);
router.get('/bbps/operator/:id/parameters', utilityController_1.getOperatorParams);
// BBPS Bill Fetch & Pay
router.post('/bbps/fetch-bill', utilityController_1.fetchBBPSBill);
router.post('/pay', (_req, res) => res.status(409).json({ error: 'Direct utility payment is unavailable. Use the verified payment checkout.' }));
router.get('/transactions/:id/status', utilityController_1.getUtilityTransactionStatus);
router.get('/history/:userId', utilityController_1.getUserUtilityHistory);
// Recharge Plans (Mobile Prepaid / DTH)
router.get('/plans', utilityController_1.getPlans);
exports.default = router;
