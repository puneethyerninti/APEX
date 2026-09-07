"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllProperties = exports.getPropertiesNearMe = exports.createProperty = exports.submitInquiry = void 0;
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
const Property_1 = __importDefault(require("../models/Property"));
const createProperty = async (req, res) => {
    try {
        const { userId, listingType, propertyType, title, price, description, phone, longitude, latitude } = req.body;
        if (!userId || !listingType || !propertyType || !title || !price || !description || !phone) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const newProperty = new Property_1.default({
            user: userId,
            listingType,
            propertyType,
            title,
            price,
            description,
            phone,
            location: (longitude !== undefined && latitude !== undefined) ? {
                type: 'Point',
                coordinates: [Number(longitude), Number(latitude)]
            } : undefined
        });
        await newProperty.save();
        res.status(201).json({ message: 'Property created successfully', property: newProperty });
    }
    catch (error) {
        console.error('createProperty Error:', error);
        res.status(500).json({ error: 'Failed to create property' });
    }
};
exports.createProperty = createProperty;
const getPropertiesNearMe = async (req, res) => {
    try {
        const { longitude, latitude, maxDistance = 50000, type } = req.query;
        if (!longitude || !latitude) {
            return res.status(400).json({ error: 'Longitude and latitude are required for nearby search' });
        }
        const query = {
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [Number(longitude), Number(latitude)]
                    },
                    $maxDistance: Number(maxDistance) // in meters
                }
            },
            status: 'active'
        };
        if (type) {
            query.listingType = type;
        }
        const properties = await Property_1.default.find(query).populate('user', 'name profilePicture');
        res.json({ properties });
    }
    catch (error) {
        console.error('getPropertiesNearMe Error:', error);
        res.status(500).json({ error: 'Failed to fetch properties' });
    }
};
exports.getPropertiesNearMe = getPropertiesNearMe;
const getAllProperties = async (req, res) => {
    try {
        const properties = await Property_1.default.find({ status: 'active' }).sort({ createdAt: -1 }).populate('user', 'name profilePicture');
        res.json({ properties });
    }
    catch (error) {
        console.error('getAllProperties Error:', error);
        res.status(500).json({ error: 'Failed to fetch properties' });
    }
};
exports.getAllProperties = getAllProperties;
