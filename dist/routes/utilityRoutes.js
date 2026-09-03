"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const utilityController_1 = require("../controllers/utilityController");
const router = express_1.default.Router();
// BBPS Discovery Endpoints
router.get('/bbps/categories', utilityController_1.getCategories);
router.get('/bbps/locations', utilityController_1.getLocations);
router.get('/bbps/operators', utilityController_1.getBBPSOperatorsList);
router.get('/bbps/operator/:id/parameters', utilityController_1.getOperatorParams);
// BBPS Bill Fetch & Pay
router.post('/bbps/fetch-bill', utilityController_1.fetchBBPSBill);
router.post('/pay', utilityController_1.payBill);
// Recharge Plans (Mobile Prepaid / DTH)
router.get('/plans', utilityController_1.getPlans);
exports.default = router;
