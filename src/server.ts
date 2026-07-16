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
import Message from './models/Message';

dotenv.config();

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // --- MATRIMONY CHAT ---
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
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
    } catch (err) {
      console.error('Error saving message', err);
    }
  });

  socket.on('typing', (data) => {
    socket.to(data.roomId).emit('typing', data);
  });

  // --- TRAVELS GPS TRACKING ---
  socket.on('start_ride', (data) => {
    const { rideId, origin, destination, lat: startLat, lng: startLng } = data;
    console.log(`Started tracking ride ${rideId} from ${origin} to ${destination}`);
    
    // Start from user's location, or fallback to Vizag
    let lat = startLat || 17.6868;
    let lng = startLng || 83.2185;
    
    const intervalId = setInterval(() => {
      lat += (Math.random() - 0.5) * 0.001;
      lng += (Math.random() - 0.5) * 0.001;
      
      io.emit(`ride_update_${rideId}`, {
        lat,
        lng,
        status: 'en_route',
        timestamp: new Date().toISOString()
      });
    }, 2000);

    // Stop tracking when they disconnect (simple cleanup for demo)
    socket.on('disconnect', () => {
      clearInterval(intervalId);
    });
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

// Routes Placeholder
app.get('/', (req, res) => {
  res.send('APEX Backend is running');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
