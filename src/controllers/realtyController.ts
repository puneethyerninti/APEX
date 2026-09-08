import { Request, Response } from 'express';
import RealEstate from '../models/RealEstate';
import { createNotification } from './notificationController';

export const submitInquiry = async (req: Request, res: Response) => {
  try {
    const { propertyId, propertyTitle, userId, contactData } = req.body;
    
    // Find the property to get the owner
    let ownerId = null;
    if (propertyId) {
        const property = await Property.findById(propertyId);
        if (property) ownerId = property.user;
    }
    
    const io = req.app.get('io');

    // Notify the Property Owner
    if (ownerId) {
      const ownerNotification = await createNotification(
        ownerId.toString(),
        'New Property Inquiry',
        `${contactData?.name || 'Someone'} is interested in your property: ${propertyTitle}. Phone: ${contactData?.phone || 'N/A'}. Message: ${contactData?.message || 'N/A'}`,
        'success'
      );
      if (io) io.to(`user_${ownerId}`).emit('new_notification', ownerNotification);
    }

    // Notify the User who inquired
    if (userId && userId !== 'guest') {
      await createNotification(
        userId,
        'Inquiry Submitted',
        `Your inquiry regarding ${propertyTitle} has been received. The owner will contact you soon.`,
        'info'
      );
    }

    res.status(201).json({ success: true, message: 'Inquiry submitted' });
  } catch (error) {
    console.error('Realty inquiry error:', error);
    res.status(500).json({ error: 'Server error during inquiry' });
  }
};

import Property from '../models/Property';

export const createProperty = async (req: Request, res: Response) => {
  try {
    const { userId, listingType, propertyType, title, price, description, phone, longitude, latitude } = req.body;

    if (!userId || !listingType || !propertyType || !title || !price || !description || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newProperty = new Property({
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
  } catch (error) {
    console.error('createProperty Error:', error);
    res.status(500).json({ error: 'Failed to create property' });
  }
};

export const getPropertiesNearMe = async (req: Request, res: Response) => {
  try {
    const { longitude, latitude, maxDistance = 50000, type } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({ error: 'Longitude and latitude are required for nearby search' });
    }

    const query: any = {
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

    const properties = await Property.find(query).populate('user', 'name profilePicture');
    
    res.json({ properties });
  } catch (error) {
    console.error('getPropertiesNearMe Error:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
};

export const getAllProperties = async (req: Request, res: Response) => {
  try {
    const properties = await Property.find({ status: 'active' }).sort({ createdAt: -1 }).populate('user', 'name profilePicture');
    res.json({ properties });
  } catch (error) {
    console.error('getAllProperties Error:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
};
