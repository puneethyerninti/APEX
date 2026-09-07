"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '@/store/useAppStore';
import { auth } from '@/firebase.config';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

export const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const user = useAppStore(state => state.user);

  useEffect(() => {
    let socketInstance: Socket | null = null;

    const connectWithAuth = async () => {
      if (!user) return; // Don't connect if not logged in

      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
      if (!socketUrl) {
        console.warn('Socket URL not provided. Real-time features disabled.');
        return;
      }

      try {
        // Wait for firebase to settle and get the token
        await auth.authStateReady();
        const token = await auth.currentUser?.getIdToken(true);

        if (!token) {
          console.warn('No Firebase token found for Socket.io connection.');
          return;
        }

        socketInstance = io(socketUrl, {
          transports: ['websocket'],
          autoConnect: true,
          auth: { token } // Transmit token for backend verification
        });

        socketInstance.on('connect', () => {
          console.log('Connected to APEX Real-time Server (Authenticated)');
          setIsConnected(true);
        });

        socketInstance.on('connect_error', (err) => {
          console.error('Socket Connection Error:', err.message);
          setIsConnected(false);
        });

        socketInstance.on('disconnect', () => {
          console.log('Disconnected from APEX Real-time Server');
          setIsConnected(false);
        });

        setSocket(socketInstance);
      } catch (error) {
        console.error('Error initializing authenticated socket:', error);
      }
    };

    connectWithAuth();

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [user]); // Re-run connection logic if the user logs in or out

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
