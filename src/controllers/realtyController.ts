import { Request, Response } from 'express';
import RealEstate from '../models/RealEstate';

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

    res.status(201).json({ success: true, message: 'Inquiry submitted', data: newPropertyLead });
  } catch (error) {
    console.error('Realty inquiry error:', error);
    res.status(500).json({ error: 'Server error during inquiry' });
  }
};
