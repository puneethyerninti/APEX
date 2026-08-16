"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAcademyEnrollment = void 0;
const notificationController_1 = require("./notificationController");
const User_1 = __importDefault(require("../models/User"));
const handleAcademyEnrollment = async (userId, metadata) => {
    const { courseName } = metadata;
    if (!userId || !courseName)
        throw new Error('Missing required fields');
    const user = await User_1.default.findById(userId);
    if (!user)
        throw new Error('User not found');
    await (0, notificationController_1.createNotification)(userId, 'Enrolled Successfully', `You have successfully enrolled in ${courseName}. Happy learning!`, 'success');
    return { success: true };
};
exports.handleAcademyEnrollment = handleAcademyEnrollment;
