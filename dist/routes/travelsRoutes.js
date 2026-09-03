"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const travelsController_1 = require("../controllers/travelsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/calculate-fare', travelsController_1.calculateFare);
router.get('/user/:userId', travelsController_1.getUserBookings);
router.get('/admin/all', authMiddleware_1.requireAdmin, travelsController_1.getAllBookingsAdmin);
exports.default = router;
