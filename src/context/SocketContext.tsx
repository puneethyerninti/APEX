"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

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
    let retry: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const recoverSession = () => {
      clearTimeout(retry);
      retry = setTimeout(() => {
        void api.get('/user/profile').then(() => { if (!disposed) socketInstance?.connect(); }).catch(() => { if (!disposed) recoverSession(); });
      }, 10000);
    };

    const connectWithAuth = async () => {
      if (!user) return; // Don't connect if not logged in

      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
      if (!socketUrl) {
        console.warn('Socket URL not provided. Real-time features disabled.');
        return;
      }

      try {
        // Get custom backend JWT token
        const token = localStorage.getItem('apex_token');

        if (!token) {
          console.warn('No authentication token found for Socket.io connection.');
          return;
        }

        socketInstance = io(socketUrl, {
          transports: ['polling', 'websocket'],
          autoConnect: true,
          auth: callback => callback({ token: localStorage.getItem('apex_token') })
        });

        socketInstance.on('connect', () => {
          setIsConnected(true);
        });

        socketInstance.on('connect_error', (err) => {
          // Suppress verbose connection timeout errors in console
          setIsConnected(false);
          // Authentication rejection stops Socket.IO's automatic retries. A refreshed
          // HTTP session may provide a new JWT while polling keeps the UI current.
          if (socketInstance && !socketInstance.active) {
            recoverSession();
          }
        });

        socketInstance.on('disconnect', reason => {
          setIsConnected(false);
          if (reason === 'io server disconnect' && !disposed) recoverSession();
        });

        setSocket(socketInstance);
        } catch (error) {
        // Suppress init errors
      }
    };

    connectWithAuth();

    return () => {
      disposed = true;
      clearTimeout(retry);
      if (socketInstance) {
        socketInstance.disconnect();
      }
      setSocket(null); setIsConnected(false);
    };
  }, [user?._id, user?.uid]);

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
