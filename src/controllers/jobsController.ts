import { Request, Response } from 'express';
import Job from '../models/Job';

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
    
    res.status(201).json(newJob);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Apply for a job (Mock File Upload)
export const applyJob = async (req: Request, res: Response) => {
  try {
    const { jobId, fullName, email } = req.body;
    
    // In a real app, you would process req.file (from multer)
    // and save it to S3/Cloudinary, then store the URL in the database
    const file = req.file;

    res.status(200).json({ 
      message: 'Application submitted successfully',
      application: {
        jobId,
        fullName,
        email,
        resumeName: file ? file.originalname : 'No file uploaded'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
