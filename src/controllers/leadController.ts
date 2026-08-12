import { Request, Response } from 'express';
import Lead from '../models/Lead';
import { createNotification } from './notificationController';

export const createLead = async (req: Request, res: Response) => {
  try {
    const { name, mobile, serviceType } = req.body;

    if (!name || !mobile || !serviceType) {
      return res.status(400).json({ error: 'Name, mobile, and service type are required' });
    }

    const newLead = new Lead({
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
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Server error creating lead' });
  }
};
