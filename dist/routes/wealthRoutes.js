"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const wealthController_1 = require("../controllers/wealthController");
const router = express_1.default.Router();
router.get('/market-data', wealthController_1.getMarketData);
router.post('/invest-intent', wealthController_1.logInvestIntent);
router.post('/seed', wealthController_1.seedMutualFunds);
exports.default = router;
