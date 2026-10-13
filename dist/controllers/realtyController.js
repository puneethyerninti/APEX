"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllProperties = exports.getPropertiesNearMe = exports.createProperty = exports.submitInquiry = void 0;
const notificationController_1 = require("./notificationController");
const Lead_1 = __importDefault(require("../models/Lead"));
const User_1 = __importDefault(require("../models/User"));
const mongoose_1 = __importDefault(require("mongoose"));
const submitInquiry = async (req, res) => {
    try {
        const { propertyId, contactData } = req.body;
        if (!mongoose_1.default.isValidObjectId(propertyId) || typeof contactData?.name !== 'string' || !contactData.name.trim() || contactData.name.length > 120 || typeof contactData.phone !== 'string' || !/^(?:\+91)?[6-9]\d{9}$/.test(contactData.phone) || (contactData.message && (typeof contactData.message !== 'string' || contactData.message.length > 2000)))
            return res.status(400).json({ error: 'Valid property and contact details are required.' });
        const selected = await Property_1.default.findOne({ _id: propertyId, status: 'active' });
        if (!selected)
            return res.status(404).json({ error: 'This property is no longer available.' });
        const propertyTitle = selected.title;
        const userId = req.user.id;
        const ownerId = selected.user;
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
            await (0, notificationController_1.createNotification)(ownerId.toString(), 'New Property Inquiry', `${contactData?.name || 'Someone'} is interested in your property: ${propertyTitle}. Phone: ${contactData?.phone || 'N/A'}. Message: ${contactData?.message || 'N/A'}`, 'success').catch(() => null);
        }
        // Notify the User who inquired
        if (userId && userId !== 'guest') {
            await (0, notificationController_1.createNotification)(userId, 'Inquiry Submitted', `Your inquiry regarding ${propertyTitle} has been received. The owner will contact you soon.`, 'info').catch(() => null);
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
        const { listingType, propertyType, title, price, description, phone, longitude, latitude, images } = req.body;
        const userId = req.user.id;
        if (!userId || !listingType || !propertyType || !title || !price || !description || !phone) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (!['sell', 'rent'].includes(listingType) || !['apartment', 'villa', 'plot', 'commercial'].includes(propertyType) || typeof title !== 'string' || title.length > 150 || typeof description !== 'string' || description.length > 5000 || !Number.isFinite(Number(price)) || Number(price) <= 0 || typeof phone !== 'string' || !/^(?:\+91)?[6-9]\d{9}$/.test(phone))
            return res.status(400).json({ error: 'Enter valid property details.' });
        if (images && (!Array.isArray(images) || images.length > 5 || images.some(image => typeof image !== 'string' || image.length > 1400000 || !/^(https:\/\/|data:image\/(jpeg|png|webp);base64,)/.test(image))))
            return res.status(400).json({ error: 'Use up to five JPEG, PNG or WebP photos under 1 MB each.' });
        if ((longitude !== undefined || latitude !== undefined) && (!Number.isFinite(Number(longitude)) || !Number.isFinite(Number(latitude)) || Math.abs(Number(longitude)) > 180 || Math.abs(Number(latitude)) > 90))
            return res.status(400).json({ error: 'Invalid property location.' });
        const user = await User_1.default.findById(userId);
        const status = user?.role === 'admin' ? 'active' : 'pending';
        const newProperty = new Property_1.default({
            user: userId,
            listingType,
            propertyType,
            title,
            price,
            description,
            phone,
            images: images || [],
            status,
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
        if (!Number.isFinite(Number(longitude)) || !Number.isFinite(Number(latitude)) || Math.abs(Number(longitude)) > 180 || Math.abs(Number(latitude)) > 90 || !Number.isFinite(Number(maxDistance)) || Number(maxDistance) <= 0 || Number(maxDistance) > 100000 || (type && !['sell', 'rent'].includes(String(type))))
            return res.status(400).json({ error: 'Invalid nearby search.' });
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
        const properties = await Property_1.default.find({ status: 'active' }).sort({ createdAt: -1 }).populate('user', 'name profilePicture').limit(100);
        res.json({ properties });
    }
    catch (error) {
        console.error('getAllProperties Error:', error);
        res.status(500).json({ error: 'Failed to fetch properties' });
    }
};
exports.getAllProperties = getAllProperties;
