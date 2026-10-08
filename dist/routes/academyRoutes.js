"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const academyController_1 = require("../controllers/academyController");
const router = express_1.default.Router();
router.get('/courses', academyController_1.getCourses);
router.post('/courses', authMiddleware_1.requireAdmin, academyController_1.createCourse);
exports.default = router;
