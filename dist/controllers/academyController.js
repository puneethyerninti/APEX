"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCourse = exports.getCourses = exports.getMyEnrollments = exports.handleAcademyEnrollment = void 0;
const notificationController_1 = require("./notificationController");
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const Course_1 = __importDefault(require("../models/Course"));
const AcademyEnrollment_1 = __importDefault(require("../models/AcademyEnrollment"));
const mongoose_1 = __importDefault(require("mongoose"));
const handleAcademyEnrollment = async (userId, metadata, transaction) => {
    const { courseName } = metadata;
    if (!userId || !courseName)
        throw new Error('Missing required fields');
    const user = await User_1.default.findById(userId);
    if (!user)
        throw new Error('User not found');
    if (!transaction?._id || transaction.category !== 'academy_enrollment' || transaction.status !== 'completed' || String(transaction.user) !== userId)
        throw new Error('Verified course payment is required');
    const existing = await AcademyEnrollment_1.default.findOne({ transaction: transaction._id, user: userId });
    if (existing)
        return { success: true, enrollmentId: existing._id };
    const course = await Course_1.default.findOne({ _id: metadata.courseId, status: 'active' }).select('+accessUrl');
    if (!course?.accessUrl || !/^https:\/\//.test(course.accessUrl) || Number(course.price) !== transaction.amount)
        throw new Error('Course access is unavailable. Payment requires refund review.');
    const session = await mongoose_1.default.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            const tx = await Transaction_1.default.findById(transaction._id).session(session);
            if (!tx || tx.status !== 'completed' || tx.category !== 'academy_enrollment' || String(tx.user) !== userId || tx.amount !== Number(course.price) || String(tx.metadata?.courseId) !== String(course._id))
                throw new Error('Invalid course payment.');
            if (tx.metadata?.fulfilled) {
                result = tx.metadata.fulfillmentResult;
                return;
            }
            const enrollment = await AcademyEnrollment_1.default.findOneAndUpdate({ transaction: tx._id }, { $setOnInsert: {
                    user: userId, course: course._id, transaction: tx._id, title: course.title, accessUrl: course.accessUrl
                } }, { upsert: true, new: true, session });
            result = { success: true, enrollmentId: enrollment._id };
            await Transaction_1.default.updateOne({ _id: tx._id }, { $set: { 'metadata.fulfilled': true, 'metadata.fulfilledAt': new Date(), 'metadata.fulfillmentResult': result } }, { session });
        });
    }
    finally {
        await session.endSession();
    }
    await (0, notificationController_1.createNotification)(userId, 'Enrolled Successfully', `You have successfully enrolled in ${courseName}. Happy learning!`, 'success').catch(() => console.warn('Course enrollment notification could not be delivered.'));
    return result;
};
exports.handleAcademyEnrollment = handleAcademyEnrollment;
const getMyEnrollments = async (req, res) => {
    try {
        return res.json(await AcademyEnrollment_1.default.find({ user: req.user.id }).sort({ createdAt: -1 }));
    }
    catch {
        return res.status(503).json({ error: 'Course access is temporarily unavailable.' });
    }
};
exports.getMyEnrollments = getMyEnrollments;
const getCourses = async (req, res) => {
    try {
        const courses = await Course_1.default.find({ status: 'active' }).select('+accessUrl').limit(100);
        res.json(courses.map(course => {
            const { accessUrl, ...publicCourse } = course.toObject();
            return { ...publicCourse, enrollmentAvailable: typeof accessUrl === 'string' && /^https:\/\//.test(accessUrl) && Number(course.price) > 0 };
        }));
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getCourses = getCourses;
const createCourse = async (req, res) => {
    try {
        const { title, category, price, description, thumbnailUrl, instructor, accessUrl } = req.body;
        if (typeof title !== 'string' || !title.trim() || title.length > 150 || typeof category !== 'string' || !category.trim() || !Number.isFinite(Number(price)) || Number(price) < 0 || Number(price) > 100000)
            return res.status(400).json({ error: 'Valid course details are required.' });
        if (accessUrl && (typeof accessUrl !== 'string' || !/^https:\/\//.test(accessUrl)))
            return res.status(400).json({ error: 'Course access must use HTTPS.' });
        const newCourse = await Course_1.default.create({
            title,
            category,
            price,
            description,
            thumbnailUrl,
            instructor,
            accessUrl
        });
        res.status(201).json(newCourse);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
exports.createCourse = createCourse;
