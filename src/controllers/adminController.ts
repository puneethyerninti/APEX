import { Request, Response } from 'express';
import User from '../models/User';
import Transaction from '../models/Transaction';
import Job from '../models/Job';
import MatrimonyProfile from '../models/MatrimonyProfile';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTransactions = await Transaction.countDocuments();
    const pendingJobs = await Job.countDocuments({ status: 'pending' });
    const pendingProfiles = await MatrimonyProfile.countDocuments({ status: 'pending' });

    // Calculate revenue (sum of all credit transactions, or just an example logic)
    const revenueAgg = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const revenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    res.json({
      stats: {
        totalUsers,
        totalTransactions,
        revenue,
        pendingJobs,
        pendingProfiles
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching admin stats' });
  }
};

export const getPendingApprovals = async (req: Request, res: Response) => {
  try {
    const jobs = await Job.find({ status: 'pending' }).populate('postedBy', 'name phone');
    const profiles = await MatrimonyProfile.find({ status: 'pending' }).populate('user', 'name phone');
    
    res.json({ jobs, profiles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching pending approvals' });
  }
};

export const updateApprovalStatus = async (req: Request, res: Response) => {
  const { type, id, status } = req.body; // type: 'job' | 'profile', status: 'approved' | 'rejected'
  
  if (!['job', 'profile'].includes(type) || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  try {
    if (type === 'job') {
      await Job.findByIdAndUpdate(id, { status });
    } else {
      await MatrimonyProfile.findByIdAndUpdate(id, { status });
    }
    res.json({ message: `${type} successfully ${status}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating status' });
  }
};

export const getUsersList = async (req: Request, res: Response) => {
  try {
    const users = await User.find({}, 'name phone email walletBalance createdAt');
    res.json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching users' });
  }
};
