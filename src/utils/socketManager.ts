import { Server, Socket } from 'socket.io';
import http from 'http';
import { validateApplicationSession } from '../services/authSession';
import { allowedOrigins } from '../services/allowedOrigins';

export interface AuthenticatedSocket extends Socket {
  user?: {
    uid: string;
    dbId: string;
    isAdmin: boolean;
    role: string;
  };
}

let io: Server;

export const initSocket = (server: http.Server) => {
  // Strict CORS for Production Fintech App
  const origins = allowedOrigins();

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || origins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    },
  });

  // Strict Authentication Middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication Error: Missing Token'));
      }

      const identity = await validateApplicationSession(token);

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
        const current = await validateApplicationSession(token);
        if (!socket.user) throw new Error('Session unavailable');
        socket.user.role = current.role;
        socket.user.isAdmin = current.role === 'admin';
        if (!socket.user.isAdmin) await socket.leave('admin_room');
        return current;
      };
      socket.use((_packet, done) => {
        void revalidate().then(() => done()).catch(() => { done(new Error('Session expired.')); socket.disconnect(true); });
      });
      const timer = setInterval(() => { void revalidate().catch(() => socket.disconnect(true)); }, 30000);
      const expiry = setTimeout(() => socket.disconnect(true), Math.max(1, identity.exp * 1000 - Date.now()));
      socket.once('disconnect', () => { clearInterval(timer); clearTimeout(expiry); });
      next();
    } catch (err: any) {
      console.error('Socket authentication rejected');
      next(new Error('Authentication Error: Invalid Token'));
    }
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized');
  }
  return io;
};
