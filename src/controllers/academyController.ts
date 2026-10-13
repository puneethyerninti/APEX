import { Request, Response } from 'express';
import { createNotification } from './notificationController';
import User from '../models/User';
import Transaction from '../models/Transaction';
import Course from '../models/Course';
import AcademyEnrollment from '../models/AcademyEnrollment';
import mongoose from 'mongoose';

export const handleAcademyEnrollment = async (userId: string, metadata: any, transaction?: any) => {
  const { courseName } = metadata;
  
  if (!userId || !courseName) throw new Error('Missing required fields');

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  if (!transaction?._id || transaction.category !== 'academy_enrollment' || transaction.status !== 'completed' || String(transaction.user) !== userId) throw new Error('Verified course payment is required');
  const existing = await AcademyEnrollment.findOne({ transaction: transaction._id, user: userId });
  if (existing) return { success: true, enrollmentId: existing._id };
  const course = await Course.findOne({ _id: metadata.courseId, status: 'active' }).select('+accessUrl');
  if (!course?.accessUrl || !/^https:\/\//.test(course.accessUrl) || Number(course.price) !== transaction.amount) throw new Error('Course access is unavailable. Payment requires refund review.');
  const session = await mongoose.startSession();
  let result: any;
  try {
    await session.withTransaction(async () => {
      const tx = await Transaction.findById(transaction._id).session(session);
      if (!tx || tx.status !== 'completed' || tx.category !== 'academy_enrollment' || String(tx.user) !== userId || tx.amount !== Number(course.price) || String(tx.metadata?.courseId) !== String(course._id)) throw new Error('Invalid course payment.');
      if (tx.metadata?.fulfilled) { result = tx.metadata.fulfillmentResult; return; }
      const enrollment = await AcademyEnrollment.findOneAndUpdate({ transaction: tx._id }, { $setOnInsert: {
        user: userId, course: course._id, transaction: tx._id, title: course.title, accessUrl: course.accessUrl
      } }, { upsert: true, new: true, session });
      result = { success: true, enrollmentId: enrollment!._id };
      await Transaction.updateOne({ _id: tx._id }, { $set: { 'metadata.fulfilled': true, 'metadata.fulfilledAt': new Date(), 'metadata.fulfillmentResult': result } }, { session });
    });
  } finally { await session.endSession(); }

  await createNotification(
    userId,
    'Enrolled Successfully',
    `You have successfully enrolled in ${courseName}. Happy learning!`,
    'success'
  ).catch(() => console.warn('Course enrollment notification could not be delivered.'));

  return result;
};

export const getMyEnrollments = async (req: Request, res: Response) => {
  try { return res.json(await AcademyEnrollment.find({ user: (req as any).user.id }).sort({ createdAt: -1 })); }
  catch { return res.status(503).json({ error: 'Course access is temporarily unavailable.' }); }
};

export const getCourses = async (req: Request, res: Response) => {
  try {
    const courses = await Course.find({ status: 'active' }).select('+accessUrl').limit(100);
    res.json(courses.map(course => {
      const { accessUrl, ...publicCourse } = course.toObject();
      return { ...publicCourse, enrollmentAvailable: typeof accessUrl === 'string' && /^https:\/\//.test(accessUrl) && Number(course.price) > 0 };
    }));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const createCourse = async (req: Request, res: Response) => {
  try {
    const { title, category, price, description, thumbnailUrl, instructor, accessUrl } = req.body;
    if (typeof title !== 'string' || !title.trim() || title.length > 150 || typeof category !== 'string' || !category.trim() || !Number.isFinite(Number(price)) || Number(price) < 0 || Number(price) > 100000) return res.status(400).json({ error: 'Valid course details are required.' });
    if (accessUrl && (typeof accessUrl !== 'string' || !/^https:\/\//.test(accessUrl))) return res.status(400).json({ error: 'Course access must use HTTPS.' });
    
    const newCourse = await Course.create({
      title,
      category,
      price,
      description,
      thumbnailUrl,
      instructor,
      accessUrl
    });

    res.status(201).json(newCourse);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
