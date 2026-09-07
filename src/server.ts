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
import notificationRoutes from './routes/notificationRoutes';
import leadRoutes from './routes/leadRoutes';
import academyRoutes from './routes/academyRoutes';
import utilityRoutes from './routes/utilityRoutes';

import Message from './models/Message';
import User from './models/User';
import TravelBooking from './models/TravelBooking';
import { initFirebaseAdmin } from './firebaseAdmin';
import { createNotification } from './controllers/notificationController';

dotenv.config();

// Connect to Database
connectDB();

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
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.user?.dbId} joined room ${roomId}`);
  });

  socket.on('send_message', async (data) => {
    // SECURITY: Enforce senderId to be the authenticated socket user
    const senderId = socket.user?.dbId;
    if (!senderId) return;

    try {
      const newMessage = new Message({
        roomId: data.roomId,
        senderId: senderId, // Server authoritative!
        receiverId: data.receiverId,
        text: data.text,
        timestamp: data.timestamp || new Date()
      });
      await newMessage.save();
      
      io.to(data.roomId).emit('receive_message', { ...data, senderId });

      // Send global toast notification to receiver
      try {
        const sender = await User.findById(senderId);
        const receiver = await User.findById(data.receiverId);
        
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

  socket.on('typing', (data) => {
    socket.to(data.roomId).emit('typing', data);
  });

  // --- TRAVELS REAL-TIME CAB DRIVER SYSTEM ---
  
  socket.on('driver_online', (data) => {
    // SECURITY: Ideally, we should verify the user is a registered driver in DB.
    socket.join('driver_room');
    console.log(`Driver ${socket.user?.dbId} is online`);
  });

  socket.on('request_ride', async (data) => {
    const riderId = socket.user?.dbId;
    if (!riderId) return;
    const { rideId, origin, destination, fare, riderName, phone } = data;
    console.log(`Rider ${riderId} requesting ride ${rideId}`);
    
    // Broadcast to the driver room (pilot driver will receive this)
    io.to('driver_room').emit('new_ride_request', {
      rideId,
      origin,
      destination,
      fare,
      riderId,
      riderName,
      phone,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('accept_ride', async (data) => {
    const { rideId, driverId, driverName, riderId } = data;
    
    try {
      await TravelBooking.findByIdAndUpdate(rideId, { 
        status: 'driver_accepted', 
        driverName: driverName 
      });
      io.to('admin_room').emit('admin_data_refresh');
      
      // Notify rider
      io.to(`user_${riderId}`).emit(`ride_update_${rideId}`, { 
        status: 'driver_accepted', 
        driverName,
        message: `${driverName} has accepted your ride!`
      });
    } catch(err) {
      console.error(err);
    }
  });

  socket.on('driver_location_update', (data) => {
    const { rideId, riderId, lat, lng, bearing } = data;
    // Forward driver's live GPS directly to the specific rider
    io.to(`user_${riderId}`).emit(`ride_update_${rideId}`, {
      lat,
      lng,
      bearing,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('update_ride_status', async (data) => {
    const { rideId, riderId, status } = data; // status: 'en_route_to_pickup', 'arrived', 'en_route', 'completed'
    
    try {
      await TravelBooking.findByIdAndUpdate(rideId, { status });
      io.to('admin_room').emit('admin_data_refresh');
      
      io.to(`user_${riderId}`).emit(`ride_update_${rideId}`, { 
        status,
        timestamp: new Date().toISOString()
      });
    } catch(err) {
      console.error(err);
    }
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
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
