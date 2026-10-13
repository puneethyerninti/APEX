"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyJob = exports.createJob = exports.getJobs = void 0;
const Job_1 = __importDefault(require("../models/Job"));
const notificationController_1 = require("./notificationController");
// Get all jobs
const getJobs = async (req, res) => {
    try {
        const jobs = await Job_1.default.find({ status: 'approved', type: { $ne: 'Application' } }).sort({ createdAt: -1 });
        res.json(jobs);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getJobs = getJobs;
// Administrative job publishing.
const createJob = async (req, res) => {
    try {
        const { title, company, location, type, salary, description } = req.body;
        if ([title, company, location].some(value => typeof value !== 'string' || !value.trim() || value.length > 150) || typeof description !== 'string' || description.length > 5000 || type === 'Application')
            return res.status(400).json({ error: 'Valid job details are required.' });
        const newJob = await Job_1.default.create({
            title,
            company,
            location,
            type,
            salary,
            description,
            status: 'approved',
            postedBy: req.user.id,
        });
        // Emit live event to admin dashboard
        const io = req.app.get('io');
        if (io) {
            io.to('admin_room').emit('admin_data_refresh');
        }
        const savedJob = await newJob.save();
        res.status(201).json(savedJob);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
exports.createJob = createJob;
// Apply for a job (Real File Upload to S3)
const applyJob = async (req, res) => {
    try {
        const { fullName, email, jobRole } = req.body;
        if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.length > 120 || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof jobRole !== 'string' || !jobRole.trim() || jobRole.length > 150)
            return res.status(400).json({ error: 'Valid name, email and job role are required.' });
        const userId = req.user.id;
        // multer-s3 attaches the S3 URL to req.file.location
        const file = req.file;
        const resumeUrl = file ? file.location : 'No file attached';
        // The user wants these applications to appear in the Admin Dashboard under "Pending Jobs".
        // We will create a Job document for this application.
        const newJobApp = await Job_1.default.create({
            title: `Application for ${jobRole}`,
            company: fullName, // Store name in company field for admin visibility
            location: email, // Store email in location
            type: 'Application',
            postedBy: userId,
            salary: 'N/A',
            description: `Resume Link: ${resumeUrl}`,
            status: 'pending'
        });
        // Notify Admin Dashboard in real-time
        const io = req.app.get('io');
        if (io) {
            io.to('admin_room').emit('admin_data_refresh');
        }
        if (userId) {
            await (0, notificationController_1.createNotification)(userId, 'Application Submitted', `Your application for ${jobRole} has been successfully submitted.`, 'success').catch(() => console.warn('Application saved; notification could not be delivered.'));
        }
        res.status(200).json({
            message: 'Application submitted successfully',
            application: newJobApp
        });
    }
    catch (error) {
        console.error('Job application error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.applyJob = applyJob;
