"use client";
import React, { useContext, useEffect, useState } from 'react';
import { SocketContext } from '@/context/SocketContext';
import { useAppStore } from '@/store/useAppStore';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

export default function GlobalToasts() {
  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket;
  const { user, walletBalance, setWalletBalance } = useAppStore();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  useEffect(() => {
    if (socket && user) {
      // Connect to personal user room for targeted notifications
      socket.emit('join_room', `user_${user.phone}`);

      const handleWalletUpdate = (data: { amount: number, type: 'credit'|'debit', message: string, newBalance: number }) => {
        setWalletBalance(data.newBalance);
        addToast(data.message, data.type === 'credit' ? 'success' : 'info');
      };

      const handleSystemNotice = (data: { message: string }) => {
        addToast(data.message, 'info');
      };

      socket.on('wallet_update', handleWalletUpdate);
      socket.on('system_notice', handleSystemNotice);

      return () => {
        socket.off('wallet_update', handleWalletUpdate);
        socket.off('system_notice', handleSystemNotice);
      };
    }
  }, [socket, user, setWalletBalance]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-0 right-0 z-[100] px-4 flex flex-col gap-2 max-w-md mx-auto pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className={`p-4 rounded-xl shadow-lg shadow-black/10 flex items-center gap-3 animate-[slideDown_0.3s_ease-out] ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 
          toast.type === 'warning' ? 'bg-orange-500 text-white' : 
          'bg-gray-900 text-white'
        }`}>
          <i className={`fa-solid ${
            toast.type === 'success' ? 'fa-circle-check' : 
            toast.type === 'warning' ? 'fa-triangle-exclamation' : 
            'fa-bell'
          } text-xl`}></i>
          <p className="font-bold text-sm">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}
