"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const academyController_1 = require("../controllers/academyController");
const router = express_1.default.Router();
router.post('/enroll', academyController_1.enrollCourse);
exports.default = router;
