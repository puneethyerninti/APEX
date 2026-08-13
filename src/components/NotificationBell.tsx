"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useSocket } from '@/context/SocketContext';
import { api } from '@/services/api';

interface Notification {
    _id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
}

export default function NotificationBell({ className = "text-violet-100 hover:text-white" }: { className?: string }) {
    const user = useAppStore((state) => state.user);
    const { socket } = useSocket();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const userId = user?._id || user?.uid;
        if (userId) {
            fetchNotifications();
        }
    }, [user]);

    useEffect(() => {
        const userId = user?._id || user?.uid;
        if (socket && userId) {
            socket.emit('join_user', userId);

            const handleNewNotification = (notification: any) => {
                setNotifications(prev => {
                    if (prev.some(n => n._id === notification._id)) return prev;
                    return [notification, ...prev];
                });
                
                // Show standard browser notification if supported
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(notification.title, {
                        body: notification.message,
                        icon: '/icon.jpeg'
                    });
                }
            };

            socket.on('new_notification', handleNewNotification);
            socket.on('global_notification', handleNewNotification);

            return () => {
                socket.off('new_notification', handleNewNotification);
                socket.off('global_notification', handleNewNotification);
            };
        }
    }, [socket, user]);

    // Update notifications if GlobalToasts broadcasts a new one
    useEffect(() => {
        const handleUpdate = (e: any) => {
            const notif = e.detail;
            setNotifications(prev => {
                if (prev.some(n => n._id === notif._id)) return prev;
                return [notif, ...prev];
            });
        };
        window.addEventListener('update_notifications', handleUpdate);
        return () => window.removeEventListener('update_notifications', handleUpdate);
    }, []);

    const fetchNotifications = async () => {
        const userId = user?._id || user?.uid;
        if (!userId) return;
        try {
            const res = await api.get(`/notifications/user/${userId}`);
            setNotifications(res.data.notifications || []);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (err) {
            console.error('Failed to mark read', err);
        }
    };

    const markAllAsRead = async () => {
        const userId = user?._id || user?.uid;
        if (!userId) return;
        try {
            await api.put(`/notifications/mark-all-read`, { userId });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (err) {
            console.error('Failed to mark all read', err);
        }
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="relative" ref={popupRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`transition-colors text-lg relative flex items-center justify-center outline-none ${className}`}
                aria-label="Notifications"
            >
                <i className="fa-solid fa-bell"></i>
                {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>
            {isOpen && (
                <div className="absolute top-[120%] right-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-[fadeIn_0.2s_ease-out]">
                    <div className="p-3 border-b border-gray-50 flex items-center justify-between">
                        <h4 className="font-black text-gray-900 text-sm">Notifications</h4>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-xs font-bold text-violet-600 hover:underline">Mark all read</button>
                        )}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-5 flex flex-col items-center justify-center gap-2 text-center text-gray-500">
                                <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center text-violet-300 text-xl mb-1 shadow-inner">
                                    <i className="fa-regular fa-bell"></i>
                                </div>
                                <p className="text-xs font-bold text-gray-700">No Notifications</p>
                                <p className="text-[10px] leading-relaxed">You're all caught up!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map(notif => (
                                    <div
                                        key={notif._id}
                                        className={`p-3 text-left transition-colors ${notif.isRead ? 'bg-white' : 'bg-violet-50/50'} hover:bg-gray-50 cursor-pointer`}
                                        onClick={() => { if (!notif.isRead) markAsRead(notif._id); }}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white ${notif.type === 'success' ? 'bg-green-500' : notif.type === 'warning' ? 'bg-orange-500' : notif.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}>
                                                <i className={`fa-solid ${notif.type === 'success' ? 'fa-check' : notif.type === 'warning' ? 'fa-exclamation-triangle' : notif.type === 'error' ? 'fa-times' : 'fa-info'}`}></i>
                                            </div>
                                            <div>
                                                <h5 className={`text-xs font-bold ${notif.isRead ? 'text-gray-700' : 'text-gray-900'}`}>{notif.title}</h5>
                                                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{notif.message}</p>
                                                <p className="text-[9px] text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
