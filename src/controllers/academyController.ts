import { Request, Response } from 'express';
import { createNotification } from './notificationController';
import User from '../models/User';
import Transaction from '../models/Transaction';

export const enrollCourse = async (req: Request, res: Response) => {
  const { userId, courseName, amount } = req.body;

  if (!userId || !courseName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const numericAmount = parseInt(amount.toString().replace(/[^0-9]/g, ''), 10) || 0;

    // Record the mock transaction
    await Transaction.create({
      user: userId,
      amount: numericAmount,
      type: 'debit',
      category: 'academy_enrollment',
      status: 'completed',
      referenceId: `course_${Date.now()}`
    } as any);

    // Send Real-Time Notification
    await createNotification(
      userId,
      'Enrolled Successfully',
      `You have successfully enrolled in ${courseName}. Happy learning!`,
      'success'
    );

    res.json({ success: true, message: 'Enrolled successfully' });
  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
