"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const s3Upload_1 = require("../services/s3Upload");
const jobsController_1 = require("../controllers/jobsController");
const router = express_1.default.Router();
const upload = s3Upload_1.uploadToS3;
router.get('/', jobsController_1.getJobs);
router.post('/', jobsController_1.createJob);
router.post('/apply', upload.single('resume'), jobsController_1.applyJob);
exports.default = router;
