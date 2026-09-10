"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllProperties = exports.getPropertiesNearMe = exports.createProperty = exports.submitInquiry = void 0;
const notificationController_1 = require("./notificationController");
const Lead_1 = __importDefault(require("../models/Lead"));
const submitInquiry = async (req, res) => {
    try {
        const { propertyId, propertyTitle, userId, contactData } = req.body;
        // Find the property to get the owner
        let ownerId = null;
        if (propertyId) {
            const property = await Property_1.default.findById(propertyId);
            if (property)
                ownerId = property.user;
        }
        const io = req.app.get('io');
        // Save as a Lead for the Admin Dashboard
        const newLead = new Lead_1.default({
            name: contactData?.name || 'Unknown',
            mobile: contactData?.phone || 'Unknown',
            serviceType: `Realty Inquiry: ${propertyTitle}`,
            notes: contactData?.message || '',
        });
        await newLead.save();
        // Notify the Property Owner
        if (ownerId) {
            const ownerNotification = await (0, notificationController_1.createNotification)(ownerId.toString(), 'New Property Inquiry', `${contactData?.name || 'Someone'} is interested in your property: ${propertyTitle}. Phone: ${contactData?.phone || 'N/A'}. Message: ${contactData?.message || 'N/A'}`, 'success');
            if (io)
                io.to(`user_${ownerId}`).emit('new_notification', ownerNotification);
        }
        // Notify the User who inquired
        if (userId && userId !== 'guest') {
            await (0, notificationController_1.createNotification)(userId, 'Inquiry Submitted', `Your inquiry regarding ${propertyTitle} has been received. The owner will contact you soon.`, 'info');
        }
        res.status(201).json({ success: true, message: 'Inquiry submitted' });
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
