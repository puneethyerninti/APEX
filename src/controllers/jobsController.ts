import { Request, Response } from 'express';
import Job from '../models/Job';
import { createNotification } from './notificationController';

// Get all jobs
export const getJobs = async (req: Request, res: Response) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Create a new job (Admin only in real app, open for demo)
export const createJob = async (req: Request, res: Response) => {
  try {
    const { title, company, location, type, salary, description } = req.body;
    
    const newJob = await Job.create({
      title,
      company,
      location,
      type,
      salary,
      description,
    });
    
    // Emit live event to admin dashboard
    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('admin_data_refresh');
    }
    const savedJob = await newJob.save();

    res.status(201).json(savedJob);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Apply for a job (Mock File Upload)
export const applyJob = async (req: Request, res: Response) => {
  try {
    const { fullName, email, jobRole, userId } = req.body;
    
    // In a real app, you would process req.file (from multer)
    // and save it to S3/Cloudinary, then store the URL in the database
    const file = req.file;

    // The user wants these applications to appear in the Admin Dashboard under "Pending Jobs".
    // We will create a Job document for this application.
    const newJobApp = await Job.create({
      title: `Application for ${jobRole}`,
      company: fullName, // Store name in company field for admin visibility
      location: email, // Store email in location
      type: 'Application',
      salary: 'N/A',
      description: `Resume attached: ${file ? file.originalname : 'No file'}`,
      status: 'pending'
    });

    // Notify Admin Dashboard in real-time
    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('admin_data_refresh');
    }

    if (userId) {
      await createNotification(
        userId,
        'Application Submitted',
        `Your application for ${jobRole} has been successfully submitted.`,
        'success'
      );
    }

    res.status(200).json({ 
      message: 'Application submitted successfully',
      application: newJobApp
    });
  } catch (error) {
    console.error('Job application error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
