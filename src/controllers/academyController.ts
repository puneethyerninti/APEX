import { Request, Response } from 'express';
import { createNotification } from './notificationController';
import User from '../models/User';
import Transaction from '../models/Transaction';

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
