"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useAppStore } from '@/store/useAppStore';
import { Geolocation } from '@capacitor/geolocation';
import { api } from '@/services/api';
import Header from '@/components/Header';
import { motion, AnimatePresence } from 'framer-motion';

export default function DriverDashboard() {
  const { user } = useAppStore();
  const { socket, isConnected } = useSocket();
  const [isOnline, setIsOnline] = useState(false);
  const [incomingRide, setIncomingRide] = useState<any>(null);
  const [currentRide, setCurrentRide] = useState<any>(null);
  const watchId = useRef<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'driver' && user?.role !== 'admin') {
      // Basic protection, redirect or show error in real app
      // window.location.href = '/'; 
    }
  }, [user]);

  useEffect(() => {
    if (!socket || !isOnline) return;

    socket.emit('driver_online', { driverId: user?._id });

    const handleNewRide = (data: any) => {
      console.log('Incoming ride:', data);
      setIncomingRide(data);
    };

    socket.on('new_ride_request', handleNewRide);

    return () => {
      socket.off('new_ride_request', handleNewRide);
    };
  }, [socket, isOnline, user]);

  const startTracking = async () => {
    try {
      const id = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000 },
        (position, err) => {
          if (err) {
            console.error('Error watching position', err);
            return;
          }
          if (position && currentRide && socket) {
            // Stream to backend
            socket.emit('driver_location_update', {
              rideId: currentRide.rideId,
              riderId: currentRide.riderId,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              bearing: position.coords.heading || 0
            });
          }
        }
      );
      watchId.current = id;
    } catch (error) {
      console.error('Error starting tracking:', error);
    }
  };

  const stopTracking = async () => {
    if (watchId.current) {
      await Geolocation.clearWatch({ id: watchId.current });
      watchId.current = null;
    }
  };

  useEffect(() => {
    if (currentRide) {
      startTracking();
    } else {
      stopTracking();
    }
    return () => { stopTracking(); };
  }, [currentRide]);

  const acceptRide = () => {
    if (!incomingRide || !socket) return;
    
    socket.emit('accept_ride', {
      rideId: incomingRide.rideId,
      driverId: user?._id,
      driverName: user?.name,
      riderId: incomingRide.riderId
    });
    
    setCurrentRide({ ...incomingRide, status: 'en_route_to_pickup' });
    setIncomingRide(null);
  };

  const rejectRide = () => {
    setIncomingRide(null);
  };

  const updateRideStatus = (status: string) => {
    if (!currentRide || !socket) return;
    
    socket.emit('update_ride_status', {
      rideId: currentRide.rideId,
      riderId: currentRide.riderId,
      status
    });

    if (status === 'completed') {
      setCurrentRide(null);
    } else {
      setCurrentRide({ ...currentRide, status });
    }
  };

  if (!user || (user.role !== 'driver' && user.role !== 'admin')) {
    return <div className="p-8 text-center mt-20 font-bold text-xl text-red-500">Unauthorized. Driver Access Only.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <div className="flex-1 p-4 flex flex-col items-center mt-20">
        
        {/* ONLINE TOGGLE */}
        <div className="bg-white p-6 rounded-2xl shadow-sm w-full max-w-md text-center mb-6">
          <h2 className="text-xl font-bold mb-4">Status: {isOnline ? <span className="text-green-500">Online</span> : <span className="text-gray-500">Offline</span>}</h2>
          <button 
            onClick={() => setIsOnline(!isOnline)}
            className={`w-full py-3 rounded-xl font-bold text-white transition-all ${isOnline ? 'bg-red-500' : 'bg-green-500'}`}
          >
            {isOnline ? 'GO OFFLINE' : 'GO ONLINE'}
          </button>
        </div>

        {/* INCOMING RIDE REQUEST */}
        <AnimatePresence>
          {incomingRide && !currentRide && (
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="bg-blue-600 text-white p-6 rounded-2xl shadow-xl w-full max-w-md border-4 border-blue-400 mb-6"
            >
              <h3 className="text-2xl font-bold mb-2 animate-pulse">NEW RIDE REQUEST!</h3>
              <p className="text-lg opacity-90">{incomingRide.riderName}</p>
              <div className="my-4 bg-white/20 p-3 rounded-lg">
                <p><strong>From:</strong> {incomingRide.origin}</p>
                <p><strong>To:</strong> {incomingRide.destination}</p>
                <p className="text-xl font-bold mt-2">Fare: ₹{incomingRide.fare}</p>
              </div>
              <div className="flex gap-4">
                <button onClick={rejectRide} className="flex-1 bg-white/20 py-3 rounded-xl font-bold">Reject</button>
                <button onClick={acceptRide} className="flex-1 bg-white text-blue-600 py-3 rounded-xl font-bold">ACCEPT</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ACTIVE RIDE CONTROLS */}
        {currentRide && (
          <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-md border-t-4 border-yellow-500">
            <h3 className="text-xl font-bold mb-2 text-gray-800">Active Ride</h3>
            <p className="text-sm text-gray-500 mb-4">{currentRide.riderName} • {currentRide.phone}</p>
            
            <div className="bg-gray-50 p-4 rounded-xl mb-4 border">
              <p className="text-sm"><strong>Pickup:</strong> {currentRide.origin}</p>
              <p className="text-sm mt-2"><strong>Dropoff:</strong> {currentRide.destination}</p>
            </div>

            <div className="flex flex-col gap-3">
              {currentRide.status === 'en_route_to_pickup' && (
                <button 
                  onClick={() => updateRideStatus('arrived')}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold"
                >
                  I'VE ARRIVED AT PICKUP
                </button>
              )}
              {currentRide.status === 'arrived' && (
                <button 
                  onClick={() => updateRideStatus('en_route')}
                  className="w-full bg-yellow-500 text-white py-4 rounded-xl font-bold"
                >
                  START TRIP
                </button>
              )}
              {currentRide.status === 'en_route' && (
                <button 
                  onClick={() => updateRideStatus('completed')}
                  className="w-full bg-green-500 text-white py-4 rounded-xl font-bold"
                >
                  COMPLETE TRIP & COLLECT ₹{currentRide.fare}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
