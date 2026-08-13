"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrollCourse = void 0;
const notificationController_1 = require("./notificationController");
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const enrollCourse = async (req, res) => {
    const { userId, courseName, amount } = req.body;
    if (!userId || !courseName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const numericAmount = parseInt(amount.toString().replace(/[^0-9]/g, ''), 10) || 0;
        // Record the mock transaction
        await Transaction_1.default.create({
            user: userId,
            amount: numericAmount,
            type: 'debit',
            category: 'academy_enrollment',
            status: 'completed',
            referenceId: `course_${Date.now()}`
        });
        // Send Real-Time Notification
        await (0, notificationController_1.createNotification)(userId, 'Enrolled Successfully', `You have successfully enrolled in ${courseName}. Happy learning!`, 'success');
        res.json({ success: true, message: 'Enrolled successfully' });
    }
    catch (error) {
        console.error('Error enrolling in course:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.enrollCourse = enrollCourse;
