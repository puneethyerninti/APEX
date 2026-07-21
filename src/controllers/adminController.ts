import { Request, Response } from 'express';
import User from '../models/User';
import Transaction from '../models/Transaction';
import Job from '../models/Job';
import MatrimonyProfile from '../models/MatrimonyProfile';
import RealEstate from '../models/RealEstate';
import StoreOrder from '../models/StoreOrder';
import CharityDonation from '../models/CharityDonation';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTransactions = await Transaction.countDocuments();
    const pendingJobs = await Job.countDocuments({ status: 'pending' });
    const pendingProfiles = await MatrimonyProfile.countDocuments({ status: 'pending' });
    const pendingRealty = await RealEstate.countDocuments({ status: 'pending' });

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
        pendingProfiles,
        pendingRealty
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
    const realty = await RealEstate.find({ status: 'pending' }).populate('ownerId', 'name phone');
    
    res.json({ jobs, profiles, realty });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching pending approvals' });
  }
};

export const updateApprovalStatus = async (req: Request, res: Response) => {
  const { type, id, status } = req.body; // type: 'job' | 'profile' | 'realty', status: 'approved' | 'rejected'
  
  if (!['job', 'profile', 'realty'].includes(type) || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  try {
    if (type === 'job') {
      await Job.findByIdAndUpdate(id, { status });
    } else if (type === 'profile') {
      await MatrimonyProfile.findByIdAndUpdate(id, { status });
    } else if (type === 'realty') {
      await RealEstate.findByIdAndUpdate(id, { status });
    }
    res.json({ message: `${type} successfully ${status}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating status' });
  }
};

export const getUsersList = async (req: Request, res: Response) => {
  try {
    const users = await User.find({}, 'name phone email walletBalance role createdAt');
    res.json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching users' });
  }
};

export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const transactions = await Transaction.find().populate('user', 'name phone').sort({ createdAt: -1 }).limit(100);
    res.json({ transactions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching transactions' });
  }
};

// Advanced: Delete entities
export const deleteEntity = async (req: Request, res: Response) => {
  const { type, id } = req.params;
  
  try {
    if (type === 'job') await Job.findByIdAndDelete(id);
    else if (type === 'profile') await MatrimonyProfile.findByIdAndDelete(id);
    else if (type === 'realty') await RealEstate.findByIdAndDelete(id);
    else if (type === 'user') await User.findByIdAndDelete(id);
    else return res.status(400).json({ error: 'Invalid entity type' });

    res.json({ message: `${type} deleted successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error deleting entity' });
  }
};

// Advanced: Update User Wallet
export const updateUserWallet = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount } = req.body;
  
  try {
    await User.findByIdAndUpdate(id, { walletBalance: amount });
    res.json({ message: 'Wallet updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating wallet' });
  }
};
