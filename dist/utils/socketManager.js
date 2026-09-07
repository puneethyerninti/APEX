"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const auth_1 = require("firebase-admin/auth");
const User_1 = __importDefault(require("../models/User"));
let io;
const initSocket = (server) => {
    // Strict CORS for Production Fintech App
    const allowedOrigins = [
        'http://localhost:3000',
        'https://apextc.shop',
        'https://www.apextc.shop'
    ];
    io = new socket_io_1.Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                }
                else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            credentials: true
        },
    });
    // Strict Authentication Middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) {
                return next(new Error('Authentication Error: Missing Firebase Token'));
            }
            // Verify token
            const decodedToken = await (0, auth_1.getAuth)().verifyIdToken(token);
            // Fetch user from DB to get the MongoDB _id and roles
            const dbUser = await User_1.default.findOne({ firebaseUid: decodedToken.uid });
            if (!dbUser) {
                return next(new Error('Authentication Error: User not found in database'));
            }
            // Attach secure user payload to the socket object
            socket.user = {
                uid: decodedToken.uid,
                dbId: dbUser._id.toString(),
                isAdmin: dbUser.role === 'admin'
            };
            // SERVER-AUTHORITATIVE ROOM JOINING
            // Prevent client spoofing by forcing room joins here
            socket.join(`user_${socket.user.dbId}`);
            if (socket.user.isAdmin) {
                socket.join('admin_room');
            }
            next();
        }
        catch (error) {
            console.error('[Socket Auth] Error:', error);
            next(new Error('Authentication Error: Invalid Token'));
        }
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io is not initialized');
    }
    return io;
};
exports.getIO = getIO;
