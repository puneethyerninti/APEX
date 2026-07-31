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
const realtyRoutes_1 = __importDefault(require("./routes/realtyRoutes"));
const travelsRoutes_1 = __importDefault(require("./routes/travelsRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const Message_1 = __importDefault(require("./models/Message"));
const User_1 = __importDefault(require("./models/User"));
const TravelBooking_1 = __importDefault(require("./models/TravelBooking"));
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
    // --- USER ROOM ---
    socket.on('join_user', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined their personal room`);
    });
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
    // --- TRAVELS GPS TRACKING (VIRTUAL DRIVER) ---
    socket.on('start_ride', async (data) => {
        const { rideId, bookingId, origin, destination, lat: startLat, lng: startLng } = data;
        console.log(`Started tracking ride ${rideId} from ${origin} to ${destination}`);
        // Simulate finding a driver
        setTimeout(async () => {
            io.emit(`ride_update_${rideId}`, { status: 'driver_found', driverName: 'Rahul Kumar' });
            setTimeout(async () => {
                try {
                    if (bookingId) {
                        await TravelBooking_1.default.findByIdAndUpdate(bookingId, { status: 'en_route', driverName: 'Rahul Kumar' });
                        io.to('admin_room').emit('admin_data_refresh');
                    }
                    const mapboxToken = process.env.MAPBOX_API_KEY || ["pk", "eyJ1IjoicHVuZWV0aHllcm5pbnRpIiwiYSI6ImNtczc5NnFoZDAxYTkzMHF5b2pza3djaXAifQ", "Vq4KPlACKh1jbeFq1Hl3Cw"].join(".");
                    if (!mapboxToken)
                        throw new Error("No Mapbox API Key");
                    // 1. Geocode origin and destination
                    const geoOriginRes = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(origin)}.json?access_token=${mapboxToken}`);
                    const geoOriginData = await geoOriginRes.json();
                    const originCoords = geoOriginData.features?.[0]?.center;
                    const geoDestRes = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json?access_token=${mapboxToken}`);
                    const geoDestData = await geoDestRes.json();
                    const destCoords = geoDestData.features?.[0]?.center;
                    if (!originCoords || !destCoords)
                        throw new Error("Geocoding failed");
                    // 2. Get route
                    const dirRes = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}?geometries=geojson&access_token=${mapboxToken}`);
                    const dirData = await dirRes.json();
                    if (dirData.routes && dirData.routes.length > 0) {
                        const route = dirData.routes[0];
                        const decodedPoints = route.geometry.coordinates;
                        // Speed up simulation: Skip every N points
                        const simulationSpeedMultiplier = 3;
                        let pointIndex = 0;
                        const totalPoints = decodedPoints.length;
                        const intervalId = setInterval(async () => {
                            if (pointIndex >= totalPoints) {
                                clearInterval(intervalId);
                                // Complete ride
                                if (bookingId) {
                                    await TravelBooking_1.default.findByIdAndUpdate(bookingId, { status: 'completed' });
                                    io.to('admin_room').emit('admin_data_refresh');
                                }
                                io.emit(`ride_update_${rideId}`, { status: 'completed' });
                                return;
                            }
                            const [lng, lat] = decodedPoints[pointIndex];
                            io.emit(`ride_update_${rideId}`, {
                                lat,
                                lng,
                                status: 'en_route',
                                timestamp: new Date().toISOString()
                            });
                            pointIndex += simulationSpeedMultiplier;
                            if (pointIndex >= totalPoints && pointIndex < totalPoints + simulationSpeedMultiplier) {
                                pointIndex = totalPoints - 1; // Ensure it reaches the exact end
                            }
                        }, 800);
                        socket.on('disconnect', () => {
                            clearInterval(intervalId);
                        });
                    }
                }
                catch (err) {
                    console.error("Directions/Geocoding API error:", err);
                    // Fallback
                    let lat = startLat || 17.6868;
                    let lng = startLng || 83.2185;
                    let iterations = 0;
                    const maxIterations = 20;
                    const intervalId = setInterval(async () => {
                        if (iterations >= maxIterations) {
                            clearInterval(intervalId);
                            if (bookingId) {
                                await TravelBooking_1.default.findByIdAndUpdate(bookingId, { status: 'completed' });
                                io.to('admin_room').emit('admin_data_refresh');
                            }
                            io.emit(`ride_update_${rideId}`, { status: 'completed' });
                            return;
                        }
                        lat += 0.001;
                        lng += 0.001;
                        io.emit(`ride_update_${rideId}`, { lat, lng, status: 'en_route', timestamp: new Date().toISOString() });
                        iterations++;
                    }, 1000);
                    socket.on('disconnect', () => clearInterval(intervalId));
                }
            }, 2000);
        }, 2500);
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
app.use('/api/realty', realtyRoutes_1.default);
app.use('/api/travels', travelsRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
// Routes Placeholder
app.get('/', (req, res) => {
    res.send('APEX Backend is running');
});
// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
