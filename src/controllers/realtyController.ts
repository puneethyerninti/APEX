import { Request, Response } from 'express';
import RealEstate from '../models/RealEstate';
import { createNotification } from './notificationController';

export const submitInquiry = async (req: Request, res: Response) => {
  try {
    const { propertyTitle, userId } = req.body;
    
    // In a real app we might create a specific "Inquiry" model, 
    // but the user wants to use RealEstate model to populate the admin dashboard
    // so we'll create a RealEstate document representing their interest/lead.
    
    const newPropertyLead = await RealEstate.create({
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
      await createNotification(
        userId,
        'Inquiry Submitted',
        `Your inquiry regarding ${propertyTitle} has been received.`,
        'info'
      );
    }

    res.status(201).json({ success: true, message: 'Inquiry submitted', data: newPropertyLead });
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
