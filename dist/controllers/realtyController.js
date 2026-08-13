"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitInquiry = void 0;
const RealEstate_1 = __importDefault(require("../models/RealEstate"));
const notificationController_1 = require("./notificationController");
const submitInquiry = async (req, res) => {
    try {
        const { propertyTitle, userId } = req.body;
        // In a real app we might create a specific "Inquiry" model, 
        // but the user wants to use RealEstate model to populate the admin dashboard
        // so we'll create a RealEstate document representing their interest/lead.
        const newPropertyLead = await RealEstate_1.default.create({
            title: `Inquiry: ${propertyTitle}`,
            price: 0,
            location: 'Website Inquiry',
            description: `User is inquiring about ${propertyTitle}`,
            ownerId: userId // The user making the inquiry
        });
        // Notify Admin Dashboard in real-time
        const io = req.app.get('io');
        if (io) {
            io.to('admin_room').emit('admin_data_refresh');
        }
        if (userId) {
            await (0, notificationController_1.createNotification)(userId, 'Inquiry Submitted', `Your inquiry regarding ${propertyTitle} has been received.`, 'info');
        }
        res.status(201).json({ success: true, message: 'Inquiry submitted', data: newPropertyLead });
    }
    catch (error) {
        console.error('Realty inquiry error:', error);
        res.status(500).json({ error: 'Server error during inquiry' });
    }
};
exports.submitInquiry = submitInquiry;
