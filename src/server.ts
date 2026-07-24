import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import financeRoutes from './routes/financeRoutes';
import jobsRoutes from './routes/jobsRoutes';
import matrimonyRoutes from './routes/matrimonyRoutes';
import userRoutes from './routes/userRoutes';
import adminRoutes from './routes/adminRoutes';
import wealthRoutes from './routes/wealthRoutes';

import Message from './models/Message';
import User from './models/User';

dotenv.config();

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});
app.set('io', io); // Bind io to express app

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // --- MATRIMONY CHAT ---
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // --- ADMIN ROOM ---
  socket.on('join_admin_room', () => {
    socket.join('admin_room');
    console.log(`Admin ${socket.id} joined admin_room`);
  });

  socket.on('send_message', async (data) => {
    // data should contain { roomId, senderId, receiverId, text, timestamp }
    try {
      const newMessage = new Message({
        roomId: data.roomId,
        senderId: data.senderId,
        receiverId: data.receiverId,
        text: data.text,
        timestamp: data.timestamp || new Date()
      });
      await newMessage.save();
      
      io.to(data.roomId).emit('receive_message', data);

      // Send global toast notification to receiver
      try {
        const sender = await User.findById(data.senderId);
        const receiver = await User.findById(data.receiverId);
        
        if (sender && receiver && receiver.phone) {
          io.to(`user_${receiver.phone}`).emit('system_notice', {
            message: `New message from ${sender.name}: ${data.text.length > 20 ? data.text.substring(0, 20) + '...' : data.text}`
          });
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

  // --- TRAVELS GPS TRACKING (VIRTUAL DRIVER) ---
  socket.on('start_ride', async (data) => {
    const { rideId, origin, destination, lat: startLat, lng: startLng } = data;
    console.log(`Started tracking ride ${rideId} from ${origin} to ${destination}`);
    
    try {
      const { Client } = require("@googlemaps/google-maps-services-js");
      const client = new Client({});
      const polyline = require("@mapbox/polyline");

      const response = await client.directions({
        params: {
          origin: origin,
          destination: destination,
          key: process.env.GOOGLE_MAPS_API_KEY as string,
        }
      });

      if (response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        const encodedPolyline = route.overview_polyline.points;
        const decodedPoints = polyline.decode(encodedPolyline); // Returns array of [lat, lng]

        let pointIndex = 0;
        const totalPoints = decodedPoints.length;
        
        const intervalId = setInterval(() => {
          if (pointIndex >= totalPoints) {
            clearInterval(intervalId);
            io.emit(`ride_update_${rideId}`, { status: 'arrived' });
            return;
          }

          const [lat, lng] = decodedPoints[pointIndex];
          
          io.emit(`ride_update_${rideId}`, {
            lat,
            lng,
            status: 'en_route',
            timestamp: new Date().toISOString()
          });

          pointIndex++;
        }, 1000); // move to next point every 1 second for simulation speed

        socket.on('disconnect', () => {
          clearInterval(intervalId);
        });
      }
    } catch (err) {
      console.error("Directions API error:", err);
      // Fallback
      let lat = startLat || 17.6868;
      let lng = startLng || 83.2185;
      const intervalId = setInterval(() => {
        lat += (Math.random() - 0.5) * 0.001;
        lng += (Math.random() - 0.5) * 0.001;
        io.emit(`ride_update_${rideId}`, { lat, lng, status: 'en_route', timestamp: new Date().toISOString() });
      }, 2000);
      socket.on('disconnect', () => clearInterval(intervalId));
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/matrimony', matrimonyRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wealth', wealthRoutes);


// Routes Placeholder
app.get('/', (req, res) => {
  res.send('APEX Backend is running');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
