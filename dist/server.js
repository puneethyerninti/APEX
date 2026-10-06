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
const travelsController_1 = require("./controllers/travelsController");
const Ride_1 = __importDefault(require("./models/Ride"));
const CabQuote_1 = __importDefault(require("./models/CabQuote"));
const RideSlot_1 = __importDefault(require("./models/RideSlot"));
const WalletTransfer_1 = __importDefault(require("./models/WalletTransfer"));
const MatrimonyProfile_1 = __importDefault(require("./models/MatrimonyProfile"));
const cabPolicy_1 = require("./services/cabPolicy");
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const leadRoutes_1 = __importDefault(require("./routes/leadRoutes"));
const academyRoutes_1 = __importDefault(require("./routes/academyRoutes"));
const utilityRoutes_1 = __importDefault(require("./routes/utilityRoutes"));
const Message_1 = __importDefault(require("./models/Message"));
const matrimonyPolicy_1 = require("./services/matrimonyPolicy");
const paymentRecovery_1 = require("./services/paymentRecovery");
const User_1 = __importDefault(require("./models/User"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const notificationController_1 = require("./controllers/notificationController");
dotenv_1.default.config();
// Connect to Database
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
    socket.on('join_room', async (roomId, acknowledge) => {
        try {
            await (0, matrimonyPolicy_1.authorizeChat)(String(socket.user?.dbId), roomId);
            await socket.join(roomId);
            if (typeof acknowledge === 'function')
                acknowledge({ success: true });
        }
        catch {
            if (typeof acknowledge === 'function')
                acknowledge({ error: 'Chat access denied.' });
        }
    });
    socket.on('send_message', async (data) => {
        // SECURITY: Enforce senderId to be the authenticated socket user
        const senderId = socket.user?.dbId;
        if (!senderId)
            return;
        try {
            const receiverId = await (0, matrimonyPolicy_1.authorizeChat)(senderId, data?.roomId);
            if (typeof data?.text !== 'string' || !data.text.trim() || data.text.length > 2000 ||
                typeof data.clientMessageId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(data.clientMessageId))
                return;
            const newMessage = await Message_1.default.findOneAndUpdate({ senderId, clientMessageId: data.clientMessageId }, { $setOnInsert: {
                    roomId: data.roomId,
                    senderId: senderId, // Server authoritative!
                    receiverId,
                    text: data.text.trim(),
                    timestamp: new Date()
                } }, { upsert: true, new: true });
            if (newMessage.roomId !== data.roomId || newMessage.text !== data.text.trim())
                return;
            io.to('user_' + senderId).emit('receive_message', newMessage.toObject());
            io.to('user_' + receiverId).emit('receive_message', newMessage.toObject());
            // Send global toast notification to receiver
            try {
                const sender = await User_1.default.findById(senderId);
                const receiver = await User_1.default.findById(receiverId);
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
    socket.on('typing', async (data) => {
        try {
            const receiver = await (0, matrimonyPolicy_1.authorizeChat)(String(socket.user?.dbId), data?.roomId);
            io.to('user_' + receiver).emit('typing', { roomId: data.roomId, isTyping: data.isTyping === true });
        }
        catch { /* Unauthorized rooms receive no events. */ }
    });
    // --- TRAVELS REAL-TIME CAB DRIVER SYSTEM ---
    // Requests are fetched through the authenticated driver API; no public driver room.
    socket.on('driver_location_update', async (data) => {
        try {
            if (socket.user?.role !== 'driver' || !(0, cabPolicy_1.validLocation)(data))
                return;
            const ride = await Ride_1.default.findOne({ _id: data.rideId, driverId: socket.user.dbId, status: { $in: ['accepted', 'arrived', 'in_progress'] } });
            if (!ride)
                return;
            io.to(`user_${ride.userId}`).emit('ride_location_update', {
                rideId: ride._id, lat: data.lat, lng: data.lng,
                heading: Number.isFinite(data.heading) ? data.heading : 0
            });
        }
        catch { /* Invalid or stale GPS updates are ignored. */ }
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
const start = async () => {
    await (0, db_1.connectDB)();
    await Promise.all([Ride_1.default.init(), CabQuote_1.default.init(), RideSlot_1.default.init(), User_1.default.init(), WalletTransfer_1.default.init(), MatrimonyProfile_1.default.init(), Message_1.default.init()]);
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};
start().catch(() => { console.error('Backend startup failed. Check database configuration and indexes.'); process.exit(1); });
let expiring = false;
setInterval(async () => {
    if (expiring || Ride_1.default.db.readyState !== 1)
        return;
    expiring = true;
    try {
        await (0, travelsController_1.expireSearches)();
        await (0, travelsController_1.reconcileCabPayments)(io);
        await (0, paymentRecovery_1.reconcileWalletAndMembershipPayments)(io);
    }
    catch (error) {
        console.error('Payment/trip recovery failed', error);
    }
    finally {
        expiring = false;
    }
}, 30000).unref();
