"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const realtyController_1 = require("../controllers/realtyController");
const router = express_1.default.Router();
router.post('/inquire', authMiddleware_1.requireAuth, realtyController_1.submitInquiry);
router.post('/property', authMiddleware_1.requireAuth, realtyController_1.createProperty);
router.get('/property/nearby', realtyController_1.getPropertiesNearMe);
router.get('/property/all', realtyController_1.getAllProperties);
exports.default = router;
