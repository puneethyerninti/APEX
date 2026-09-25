import { Request, Response } from 'express';
import { createNotification } from './notificationController';
import User from '../models/User';
import Transaction from '../models/Transaction';
import Course from '../models/Course';

export const handleAcademyEnrollment = async (userId: string, metadata: any) => {
  const { courseName } = metadata;
  
  if (!userId || !courseName) throw new Error('Missing required fields');

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  await createNotification(
    userId,
    'Enrolled Successfully',
    `You have successfully enrolled in ${courseName}. Happy learning!`,
    'success'
  );

  return { success: true };
};

export const getCourses = async (req: Request, res: Response) => {
  try {
    const courses = await Course.find({ status: 'active' });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const createCourse = async (req: Request, res: Response) => {
  try {
    const { title, category, price, description, thumbnailUrl, instructor } = req.body;
    
    const newCourse = await Course.create({
      title,
      category,
      price,
      description,
      thumbnailUrl,
      instructor
    });

    res.status(201).json(newCourse);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
