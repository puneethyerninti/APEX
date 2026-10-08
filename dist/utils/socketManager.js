"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const authSession_1 = require("../services/authSession");
const allowedOrigins_1 = require("../services/allowedOrigins");
let io;
const initSocket = (server) => {
    // Strict CORS for Production Fintech App
    const origins = (0, allowedOrigins_1.allowedOrigins)();
    io = new socket_io_1.Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin || origins.includes(origin)) {
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
                return next(new Error('Authentication Error: Missing Token'));
            }
            const identity = await (0, authSession_1.validateApplicationSession)(token);
            // Attach secure user payload to the socket object
            socket.user = {
                uid: identity.id,
                dbId: identity.id,
                isAdmin: identity.role === 'admin',
                role: identity.role
            };
            // SERVER-AUTHORITATIVE ROOM JOINING
            // Prevent client spoofing by forcing room joins here
            socket.join(`user_${socket.user.dbId}`);
            socket.join(`session_${identity.tokenId}`);
            if (socket.user.isAdmin) {
                socket.join('admin_room');
            }
            const revalidate = async () => {
                const current = await (0, authSession_1.validateApplicationSession)(token);
                if (!socket.user)
                    throw new Error('Session unavailable');
                socket.user.role = current.role;
                socket.user.isAdmin = current.role === 'admin';
                if (!socket.user.isAdmin)
                    await socket.leave('admin_room');
                return current;
            };
            socket.use((_packet, done) => {
                void revalidate().then(() => done()).catch(() => { done(new Error('Session expired.')); socket.disconnect(true); });
            });
            const timer = setInterval(() => { void revalidate().catch(() => socket.disconnect(true)); }, 30000);
            const expiry = setTimeout(() => socket.disconnect(true), Math.max(1, identity.exp * 1000 - Date.now()));
            socket.once('disconnect', () => { clearInterval(timer); clearTimeout(expiry); });
            next();
        }
        catch (err) {
            console.error('Socket authentication rejected');
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
