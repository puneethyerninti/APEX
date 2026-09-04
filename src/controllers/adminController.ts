import { Request, Response } from 'express';
import User from '../models/User';
import Transaction from '../models/Transaction';
import Job from '../models/Job';
import MatrimonyProfile from '../models/MatrimonyProfile';
import RealEstate from '../models/RealEstate';
import StoreOrder from '../models/StoreOrder';
import CharityDonation from '../models/CharityDonation';
import TravelBooking from '../models/TravelBooking';
import Lead from '../models/Lead';
import Notification from '../models/Notification';
import UtilityTransaction from '../models/UtilityTransaction';
import { createNotification } from './notificationController';
import { sendPushNotification } from '../firebaseAdmin';
import { fulfillOrder } from '../services/fulfillmentService';
import { getRazorpay } from './financeController';
import { updateUtilityTransactionStatus } from './utilityController';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTransactions = await Transaction.countDocuments();
    const pendingJobs = await Job.countDocuments({ status: 'pending' });
    const pendingProfiles = await MatrimonyProfile.countDocuments({ status: 'pending' });
    const pendingRealty = await RealEstate.countDocuments({ status: 'pending' });
    const totalTravelBookings = await TravelBooking.countDocuments();

    // Calculate revenue (sum of all credit transactions, or just an example logic)
    const revenueAgg = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const revenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    // Revenue History (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const historyAgg = await Transaction.aggregate([
      { 
        $match: { 
          status: 'completed',
          createdAt: { $gte: sixMonthsAgo }
        } 
      },
      {
        $group: {
          _id: { 
            year: { $year: "$createdAt" }, 
            month: { $month: "$createdAt" } 
          },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Category Distribution
    const categoryAgg = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json({
      stats: {
        totalUsers,
        totalTransactions,
        revenue,
        pendingJobs,
        pendingProfiles,
        pendingRealty,
        totalTravelBookings,
        revenueHistory: historyAgg,
        categoryDistribution: categoryAgg
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
    let userIdToNotify;
    let title = '';

    if (type === 'job') {
      const doc = await Job.findByIdAndUpdate(id, { status });
      if (doc) userIdToNotify = doc.postedBy;
      title = `Job ${status === 'approved' ? 'Approved' : 'Rejected'}`;
    } else if (type === 'profile') {
      const doc = await MatrimonyProfile.findByIdAndUpdate(id, { status });
      if (doc) userIdToNotify = doc.user;
      title = `Matrimony Profile ${status === 'approved' ? 'Approved' : 'Rejected'}`;
    } else if (type === 'realty') {
      const doc = await RealEstate.findByIdAndUpdate(id, { status });
      if (doc) userIdToNotify = doc.ownerId;
      title = `Realty Listing ${status === 'approved' ? 'Approved' : 'Rejected'}`;
    }

    if (userIdToNotify) {
      const notification = await createNotification(
        userIdToNotify.toString(),
        title,
        `Your ${type} submission has been ${status} by the admin.`,
        status === 'approved' ? 'success' : 'error'
      );

      const io = req.app.get('io');
      if (io) {
        io.to(`user_${userIdToNotify}`).emit('new_notification', notification);
      }
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

// Manually complete a pending transaction (for razorpay.me verification)
export const completeTransaction = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const transaction = await Transaction.findById(id);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    
    if (transaction.status === 'completed') {
      return res.status(400).json({ error: 'Transaction is already completed' });
    }
    
    transaction.status = 'completed';
    await transaction.save();
    
    res.json({ success: true, message: 'Transaction manually marked as completed' });
  } catch (error) {
    console.error('Error completing transaction manually:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all store orders
export const getAllStoreOrders = async (req: Request, res: Response) => {
  try {
    const orders = await StoreOrder.find().populate('userId', 'name phone').sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching store orders' });
  }
};

// Update store order status
export const updateStoreOrderStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!['pending', 'shipped', 'delivered', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const order = await StoreOrder.findByIdAndUpdate(id, { status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Send real-time notification
    const notification = await createNotification(
      order.userId.toString(),
      `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      `Your store order has been marked as ${status}.`,
      'info'
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${order.userId}`).emit('new_notification', notification);
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating order status' });
  }
};

// Get all charity donations
export const getAllCharityDonations = async (req: Request, res: Response) => {
  try {
    const donations = await CharityDonation.find().populate('userId', 'name phone').sort({ createdAt: -1 });
    res.json({ donations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching charity donations' });
  }
};

// Get all leads
export const getAllLeads = async (req: Request, res: Response) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json({ leads });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching leads' });
  }
};

// Global Broadcast Message
export const broadcastMessage = async (req: Request, res: Response) => {
  const { title, message, type } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  try {
    // 1. Fetch all users to create DB notifications and get FCM tokens
    const users = await User.find({}, '_id fcmTokens');
    
    // 2. Prepare notifications for DB
    const notificationsToInsert = users.map(user => ({
      user: user._id,
      title,
      message,
      type: type || 'info',
      isRead: false
    }));

    if (notificationsToInsert.length > 0) {
      await Notification.insertMany(notificationsToInsert);
    }

    // 3. Emit real-time event to active connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('global_notification', {
        _id: new Date().getTime().toString(), // Client sees this until refresh
        title,
        message,
        type: type || 'info',
        createdAt: new Date().toISOString(),
        isRead: false
      });
    }

    // 4. Send Push Notifications in background
    const allTokens = users.reduce((acc, user) => {
      if (user.fcmTokens && user.fcmTokens.length > 0) {
        return acc.concat(user.fcmTokens);
      }
      return acc;
    }, [] as string[]);

    if (allTokens.length > 0) {
      sendPushNotification(allTokens, title, message).catch(err => console.error('Broadcast push failed:', err));
    }

    res.json({ success: true, message: 'Broadcast sent to all active users and saved to database' });
  } catch (error) {
    console.error('Error broadcasting message:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getUtilityTransactions = async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const filter = status ? { status } : {};
    const transactions = await UtilityTransaction.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Error fetching utility transactions:', error);
    res.status(500).json({ error: 'Server error fetching utility transactions' });
  }
};

export const retryUtilityTransaction = async (req: Request, res: Response) => {
  const id = String(req.params.id);

  try {
    const utilityTx = await UtilityTransaction.findById(id);
    if (!utilityTx) return res.status(404).json({ error: 'Utility transaction not found' });
    if (['eko_success', 'refunded'].includes(utilityTx.status)) {
      return res.status(400).json({ error: 'Transaction is already final' });
    }

    const paymentTx = await Transaction.findOne({ razorpayOrderId: utilityTx.razorpayOrderId });
    if (!paymentTx || paymentTx.status !== 'completed') {
      return res.status(400).json({ error: 'Payment transaction is not completed' });
    }

    await Transaction.findByIdAndUpdate(paymentTx._id, {
      $unset: {
        'metadata.fulfillmentQueued': '',
        'metadata.fulfillmentQueuedAt': '',
        'metadata.fulfillmentError': '',
        'metadata.fulfillmentFailedAt': ''
      }
    });

    const refreshed = await Transaction.findById(paymentTx._id);
    setImmediate(async () => {
      try {
        await fulfillOrder(refreshed, req.app.get('io'));
      } catch (error) {
        console.error(`Admin retry failed for utility transaction ${id}:`, error);
      }
    });

    await updateUtilityTransactionStatus(id, 'fulfillment_pending', 'Admin retry queued', {}, req.app.get('io'));
    res.json({ success: true, message: 'Utility fulfillment retry queued' });
  } catch (error) {
    console.error('Error retrying utility transaction:', error);
    res.status(500).json({ error: 'Server error retrying utility transaction' });
  }
};

export const markUtilityManualReview = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { reason } = req.body;

  try {
    const transaction = await updateUtilityTransactionStatus(
      id,
      'manual_review',
      reason || 'Marked for manual review by admin',
      {},
      req.app.get('io')
    );
    if (!transaction) return res.status(404).json({ error: 'Utility transaction not found' });
    res.json({ success: true, transaction });
  } catch (error) {
    console.error('Error marking utility manual review:', error);
    res.status(500).json({ error: 'Server error updating utility transaction' });
  }
};

export const refundUtilityTransaction = async (req: Request, res: Response) => {
  const id = String(req.params.id);

  try {
    const utilityTx = await UtilityTransaction.findById(id);
    if (!utilityTx) return res.status(404).json({ error: 'Utility transaction not found' });

    const paymentTx = await Transaction.findOne({ razorpayOrderId: utilityTx.razorpayOrderId });
    if (!paymentTx?.razorpayPaymentId) {
      return res.status(400).json({ error: 'Razorpay payment id not found' });
    }

    await updateUtilityTransactionStatus(id, 'refund_pending', 'Admin refund initiated', {}, req.app.get('io'));
    const refund = await getRazorpay().payments.refund(paymentTx.razorpayPaymentId, {
      amount: Math.round(paymentTx.amount * 100),
      notes: {
        reason: 'Utility service failed',
        utilityTransactionId: id
      }
    });

    await Transaction.findByIdAndUpdate(paymentTx._id, {
      $set: {
        status: 'refunded',
        'metadata.refundInfo': {
          refundId: refund.id,
          status: refund.status || 'processed',
          refundedAt: new Date()
        }
      }
    });

    const transaction = await updateUtilityTransactionStatus(
      id,
      'refunded',
      'Payment refunded',
      {
        refundStatus: refund.status || 'processed',
        'metadata.refundInfo': refund
      },
      req.app.get('io')
    );

    res.json({ success: true, transaction, refund });
  } catch (error: any) {
    console.error('Error refunding utility transaction:', error);
    await updateUtilityTransactionStatus(id, 'manual_review', error.message || 'Refund failed and needs review', {}, req.app.get('io'));
    res.status(500).json({ error: error.message || 'Server error refunding utility transaction' });
  }
};
