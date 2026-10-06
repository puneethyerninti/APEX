import express from 'express';
import http from 'http';
import { initSocket } from './utils/socketManager';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db';

import financeRoutes from './routes/financeRoutes';
import jobsRoutes from './routes/jobsRoutes';
import matrimonyRoutes from './routes/matrimonyRoutes';
import userRoutes from './routes/userRoutes';
import adminRoutes from './routes/adminRoutes';
import wealthRoutes from './routes/wealthRoutes';
import realtyRoutes from './routes/realtyRoutes';
import travelsRoutes from './routes/travelsRoutes';
import { expireSearches, reconcileCabPayments } from './controllers/travelsController';
import Ride from './models/Ride';
import CabQuote from './models/CabQuote';
import RideSlot from './models/RideSlot';
import WalletTransfer from './models/WalletTransfer';
import MatrimonyProfile from './models/MatrimonyProfile';
import { validLocation } from './services/cabPolicy';
import notificationRoutes from './routes/notificationRoutes';
import leadRoutes from './routes/leadRoutes';
import academyRoutes from './routes/academyRoutes';
import utilityRoutes from './routes/utilityRoutes';

import Message from './models/Message';
import { authorizeChat } from './services/matrimonyPolicy';
import { reconcileWalletAndMembershipPayments } from './services/paymentRecovery';
import User from './models/User';
import TravelBooking from './models/TravelBooking';
import { initFirebaseAdmin } from './firebaseAdmin';
import { createNotification } from './controllers/notificationController';

dotenv.config();

// Connect to Database

// Initialize Firebase Admin for Push Notifications
initFirebaseAdmin();

const app = express();
const server = http.createServer(app);

// Global Security Middleware
app.use(helmet());
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(globalLimiter);

// Middleware
app.use(cors());
app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf) => {
    if (req.originalUrl?.includes('/api/finance/razorpay/webhook')) {
      req.rawBody = buf;
    }
  }
}));

import { AuthenticatedSocket } from './utils/socketManager';

// Socket.io setup
const io = initSocket(server);
app.set('io', io); // Bind io to express app

io.on('connection', (socket: AuthenticatedSocket) => {
  console.log(`User connected: ${socket.id}, Authenticated DB ID: ${socket.user?.dbId}`);

  // Note: 'join_user' and 'join_admin_room' are now handled server-side in the authentication middleware!
  // Any legacy client emits of these events will simply be ignored.

  // --- MATRIMONY CHAT ---
  socket.on('join_room', async (roomId, acknowledge) => {
    try {
      await authorizeChat(String(socket.user?.dbId), roomId);
      await socket.join(roomId);
      if (typeof acknowledge === 'function') acknowledge({ success: true });
    } catch {
      if (typeof acknowledge === 'function') acknowledge({ error: 'Chat access denied.' });
    }
  });

  socket.on('send_message', async (data) => {
    // SECURITY: Enforce senderId to be the authenticated socket user
    const senderId = socket.user?.dbId;
    if (!senderId) return;

    try {
      const receiverId = await authorizeChat(senderId, data?.roomId);
      if (typeof data?.text !== 'string' || !data.text.trim() || data.text.length > 2000 ||
          typeof data.clientMessageId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(data.clientMessageId)) return;
      const newMessage = await Message.findOneAndUpdate({ senderId, clientMessageId: data.clientMessageId }, { $setOnInsert: {
        roomId: data.roomId,
        senderId: senderId, // Server authoritative!
        receiverId,
        text: data.text.trim(),
        timestamp: new Date()
      } }, { upsert: true, new: true });
      if (newMessage.roomId !== data.roomId || newMessage.text !== data.text.trim()) return;
      
      io.to('user_' + senderId).emit('receive_message', newMessage.toObject());
      io.to('user_' + receiverId).emit('receive_message', newMessage.toObject());

      // Send global toast notification to receiver
      try {
        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);
        
        if (sender && receiver) {
          io.to(`user_${receiver._id}`).emit('system_notice', {
            message: `New message from ${sender.name}: ${data.text.length > 20 ? data.text.substring(0, 20) + '...' : data.text}`
          });
          
          await createNotification(
            receiver._id.toString(),
            `Message from ${sender.name}`,
            data.text.length > 30 ? data.text.substring(0, 30) + '...' : data.text,
            'info'
          );
        }
      } catch (err) {
        console.error('Error fetching users for notification', err);
      }
    } catch (err) {
      console.error('Error saving message', err);
    }
  });

  socket.on('typing', async (data) => {
    try {
      const receiver = await authorizeChat(String(socket.user?.dbId), data?.roomId);
      io.to('user_' + receiver).emit('typing', { roomId: data.roomId, isTyping: data.isTyping === true });
    } catch { /* Unauthorized rooms receive no events. */ }
  });

  // --- TRAVELS REAL-TIME CAB DRIVER SYSTEM ---
  
  // Requests are fetched through the authenticated driver API; no public driver room.

  socket.on('driver_location_update', async (data) => {
    try {
      if (socket.user?.role !== 'driver' || !validLocation(data)) return;
      const ride = await Ride.findOne({ _id: data.rideId, driverId: socket.user.dbId, status: { $in: ['accepted', 'arrived', 'in_progress'] } });
      if (!ride) return;
      io.to(`user_${ride.userId}`).emit('ride_location_update', {
        rideId: ride._id, lat: data.lat, lng: data.lng,
        heading: Number.isFinite(data.heading) ? data.heading : 0
      });
    } catch { /* Invalid or stale GPS updates are ignored. */ }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Routes

app.use('/api/finance', financeRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/matrimony', matrimonyRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wealth', wealthRoutes);
app.use('/api/realty', realtyRoutes);
app.use('/api/travels', travelsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/academy', academyRoutes);
app.use('/api/utility', utilityRoutes);

// Routes Placeholder
app.get('/', (req, res) => {
  res.send('APEX Backend is running');
});

// Start server
const PORT = process.env.PORT || 5000;
const start = async () => {
  await connectDB();
  await Promise.all([Ride.init(), CabQuote.init(), RideSlot.init(), User.init(), WalletTransfer.init(), MatrimonyProfile.init(), Message.init()]);
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};
start().catch(() => { console.error('Backend startup failed. Check database configuration and indexes.'); process.exit(1); });
let expiring = false;
setInterval(async () => {
  if (expiring || Ride.db.readyState !== 1) return;
  expiring = true;
  try { await expireSearches(); await reconcileCabPayments(io); await reconcileWalletAndMembershipPayments(io); } catch (error) { console.error('Payment/trip recovery failed', error); }
  finally { expiring = false; }
}, 30000).unref();
