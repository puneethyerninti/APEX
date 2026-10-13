"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const s3Upload_1 = require("../services/s3Upload");
const jobsController_1 = require("../controllers/jobsController");
const router = express_1.default.Router();
const upload = s3Upload_1.uploadToS3;
router.get('/', jobsController_1.getJobs);
router.post('/', authMiddleware_1.requireAdmin, jobsController_1.createJob);
router.post('/apply', authMiddleware_1.requireAuth, (req, res, next) => upload.single('resume')(req, res, error => {
    if (!error)
        return next();
    const invalidFile = error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE' || String(error.message).startsWith('Only PDF');
    return res.status(invalidFile ? 400 : 503).json({ error: invalidFile ? 'Use one PDF, DOC or DOCX resume under 5 MB.' : 'Resume storage is temporarily unavailable. No application has been confirmed.' });
}), jobsController_1.applyJob);
exports.default = router;
