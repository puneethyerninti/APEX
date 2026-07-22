"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const financeRoutes_1 = __importDefault(require("./routes/financeRoutes"));
const jobsRoutes_1 = __importDefault(require("./routes/jobsRoutes"));
const matrimonyRoutes_1 = __importDefault(require("./routes/matrimonyRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const wealthRoutes_1 = __importDefault(require("./routes/wealthRoutes"));
const Message_1 = __importDefault(require("./models/Message"));
const User_1 = __importDefault(require("./models/User"));
dotenv_1.default.config();
// Connect to Database
(0, db_1.connectDB)();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
// Socket.io setup
const io = new socket_io_1.Server(server, {
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
            const newMessage = new Message_1.default({
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
                const sender = await User_1.default.findById(data.senderId);
                const receiver = await User_1.default.findById(data.receiverId);
                if (sender && receiver && receiver.phone) {
                    io.to(`user_${receiver.phone}`).emit('system_notice', {
                        message: `New message from ${sender.name}: ${data.text.length > 20 ? data.text.substring(0, 20) + '...' : data.text}`
                    });
                }
            }
            catch (err) {
                console.error('Error fetching users for notification', err);
            }
        }
        catch (err) {
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
app.use('/api/auth', authRoutes_1.default);
app.use('/api/finance', financeRoutes_1.default);
app.use('/api/jobs', jobsRoutes_1.default);
app.use('/api/matrimony', matrimonyRoutes_1.default);
app.use('/api/user', userRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/wealth', wealthRoutes_1.default);
// Routes Placeholder
app.get('/', (req, res) => {
    res.send('APEX Backend is running');
});
// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
