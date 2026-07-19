"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyJob = exports.createJob = exports.getJobs = void 0;
const Job_1 = __importDefault(require("../models/Job"));
// Get all jobs
const getJobs = async (req, res) => {
    try {
        const jobs = await Job_1.default.find().sort({ createdAt: -1 });
        res.json(jobs);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getJobs = getJobs;
// Create a new job (Admin only in real app, open for demo)
const createJob = async (req, res) => {
    try {
        const { title, company, location, type, salary, description } = req.body;
        const newJob = await Job_1.default.create({
            title,
            company,
            location,
            type,
            salary,
            description,
        });
        // Emit live event to admin dashboard
        const io = req.app.get('io');
        if (io) {
            io.to('admin_room').emit('admin_data_refresh');
        }
        res.status(201).json(newJob);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
exports.createJob = createJob;
// Apply for a job (Mock File Upload)
const applyJob = async (req, res) => {
    try {
        const { jobId, fullName, email } = req.body;
        // In a real app, you would process req.file (from multer)
        // and save it to S3/Cloudinary, then store the URL in the database
        const file = req.file;
        res.status(200).json({
            message: 'Application submitted successfully',
            application: {
                jobId,
                fullName,
                email,
                resumeName: file ? file.originalname : 'No file uploaded'
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
exports.applyJob = applyJob;
