"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const realtyController_1 = require("../controllers/realtyController");
const router = express_1.default.Router();
router.post('/inquire', realtyController_1.submitInquiry);
exports.default = router;
