"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLead = void 0;
const Lead_1 = __importDefault(require("../models/Lead"));
const createLead = async (req, res) => {
    try {
        const { name, mobile, serviceType } = req.body;
        if (!name || !mobile || !serviceType) {
            return res.status(400).json({ error: 'Name, mobile, and service type are required' });
        }
        const newLead = new Lead_1.default({
            name,
            mobile,
            serviceType
        });
        await newLead.save();
        // Optionally notify admin (if admin rooms are connected via socket)
        const io = req.app.get('io');
        if (io) {
            io.to('admin_room').emit('admin_data_refresh');
        }
        res.status(201).json({ success: true, lead: newLead });
    }
    catch (error) {
        console.error('Error creating lead:', error);
        res.status(500).json({ error: 'Server error creating lead' });
    }
};
exports.createLead = createLead;
