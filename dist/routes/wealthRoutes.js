"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const wealthController_1 = require("../controllers/wealthController");
const router = express_1.default.Router();
router.get('/market-data', wealthController_1.getMarketData);
router.post('/invest-intent', authMiddleware_1.requireAuth, wealthController_1.logInvestIntent);
router.post('/seed', authMiddleware_1.requireAdmin, wealthController_1.seedMutualFunds);
exports.default = router;
