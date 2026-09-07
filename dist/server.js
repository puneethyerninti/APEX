"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socketManager_1 = require("./utils/socketManager");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const db_1 = require("./config/db");
const financeRoutes_1 = __importDefault(require("./routes/financeRoutes"));
const jobsRoutes_1 = __importDefault(require("./routes/jobsRoutes"));
const matrimonyRoutes_1 = __importDefault(require("./routes/matrimonyRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const wealthRoutes_1 = __importDefault(require("./routes/wealthRoutes"));
const realtyRoutes_1 = __importDefault(require("./routes/realtyRoutes"));
const travelsRoutes_1 = __importDefault(require("./routes/travelsRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const leadRoutes_1 = __importDefault(require("./routes/leadRoutes"));
const academyRoutes_1 = __importDefault(require("./routes/academyRoutes"));
const utilityRoutes_1 = __importDefault(require("./routes/utilityRoutes"));
const Message_1 = __importDefault(require("./models/Message"));
const User_1 = __importDefault(require("./models/User"));
const TravelBooking_1 = __importDefault(require("./models/TravelBooking"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const notificationController_1 = require("./controllers/notificationController");
dotenv_1.default.config();
// Connect to Database
(0, db_1.connectDB)();
// Initialize Firebase Admin for Push Notifications
(0, firebaseAdmin_1.initFirebaseAdmin)();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Global Security Middleware
app.use((0, helmet_1.default)());
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use(globalLimiter);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
        if (req.originalUrl?.includes('/api/finance/razorpay/webhook')) {
            req.rawBody = buf;
        }
    }
}));
// Socket.io setup
const io = (0, socketManager_1.initSocket)(server);
app.set('io', io); // Bind io to express app
io.on('connection', (socket) => {
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
        if (!senderId)
            return;
        try {
            const newMessage = new Message_1.default({
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
                const sender = await User_1.default.findById(senderId);
                const receiver = await User_1.default.findById(data.receiverId);
                if (sender && receiver) {
                    io.to(`user_${receiver._id}`).emit('system_notice', {
                        message: `New message from ${sender.name}: ${data.text.length > 20 ? data.text.substring(0, 20) + '...' : data.text}`
                    });
                    await (0, notificationController_1.createNotification)(receiver._id.toString(), `Message from ${sender.name}`, data.text.length > 30 ? data.text.substring(0, 30) + '...' : data.text, 'info');
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
    // --- TRAVELS REAL-TIME CAB DRIVER SYSTEM ---
    socket.on('driver_online', (data) => {
        // SECURITY: Ideally, we should verify the user is a registered driver in DB.
        socket.join('driver_room');
        console.log(`Driver ${socket.user?.dbId} is online`);
    });
    socket.on('request_ride', async (data) => {
        const riderId = socket.user?.dbId;
        if (!riderId)
            return;
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
            await TravelBooking_1.default.findByIdAndUpdate(rideId, {
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
        }
        catch (err) {
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
            await TravelBooking_1.default.findByIdAndUpdate(rideId, { status });
            io.to('admin_room').emit('admin_data_refresh');
            io.to(`user_${riderId}`).emit(`ride_update_${rideId}`, {
                status,
                timestamp: new Date().toISOString()
            });
        }
        catch (err) {
            console.error(err);
        }
    });
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});
// Routes
app.use('/api/finance', financeRoutes_1.default);
app.use('/api/jobs', jobsRoutes_1.default);
app.use('/api/matrimony', matrimonyRoutes_1.default);
app.use('/api/user', userRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/wealth', wealthRoutes_1.default);
app.use('/api/realty', realtyRoutes_1.default);
app.use('/api/travels', travelsRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.use('/api/leads', leadRoutes_1.default);
app.use('/api/academy', academyRoutes_1.default);
app.use('/api/utility', utilityRoutes_1.default);
// Routes Placeholder
app.get('/', (req, res) => {
    res.send('APEX Backend is running');
});
// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
