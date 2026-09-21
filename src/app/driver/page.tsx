'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { api } from '@/services/api';
import Map, { Source, Layer, Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

export default function DriverPortal() {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [incomingRides, setIncomingRides] = useState<any[]>([]);
  const [viewport, setViewport] = useState({
    latitude: 17.3850,
    longitude: 78.4867,
    zoom: 12
  });

  // Authorization check
  if (!user) {
    return <div className="p-8 text-center text-gray-500 font-bold">Please log in to access Driver Portal.</div>;
  }
  if (user.role !== 'driver' && user.role !== 'admin') {
    return <div className="p-8 text-center text-red-500 font-bold">Unauthorized. You must be an approved APEX Driver.</div>;
  }

  // Socket init
  useEffect(() => {
    if (!token) return;
    const s = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000', {
      auth: { token }
    });
    setSocket(s);

    s.on('new_ride_request', (ride) => {
      setIncomingRides(prev => [...prev, ride]);
    });

    s.on('remove_ride_request', (rideId) => {
      setIncomingRides(prev => prev.filter(r => r._id !== rideId));
    });

    return () => { s.disconnect(); };
  }, [token]);

  // Fetch active ride on load
  useEffect(() => {
    const fetchActive = async () => {
      try {
        const res = await api.get(`/travels/rides/active?userId=${user.uid || user._id}`);
        if (res.data?.ride) {
          setActiveRide(res.data.ride);
          setIsOnline(true);
        }
      } catch (err) {}
    };
    fetchActive();
  }, [user]);

  const toggleOnline = async () => {
    try {
      const newStatus = !isOnline;
      await api.put('/travels/driver/status', { isOnline: newStatus, userId: user.uid || user._id });
      setIsOnline(newStatus);
      if (newStatus && socket) {
        socket.emit('driver_online');
      }
    } catch (error) {
      console.error('Failed to toggle status');
    }
  };

  const acceptRide = async (rideId: string) => {
    try {
      const res = await api.put(`/travels/rides/${rideId}/status`, {
        status: 'accepted',
        driverId: user.uid || user._id
      });
      if (res.data.success) {
        setActiveRide(res.data.ride);
        setIncomingRides([]);
      }
    } catch (error) {
      alert('Ride already accepted by another driver or error occurred.');
      setIncomingRides(prev => prev.filter(r => r._id !== rideId));
    }
  };

  const updateRideStatus = async (status: string) => {
    try {
      const res = await api.put(`/travels/rides/${activeRide._id}/status`, { status });
      if (res.data.success) {
        if (status === 'completed' || status === 'cancelled') {
          setActiveRide(null);
        } else {
          setActiveRide(res.data.ride);
        }
      }
    } catch (error) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white p-4 shadow-sm flex justify-between items-center z-10 relative">
        <h1 className="font-black text-xl tracking-tighter">APEX<span className="text-emerald-600">DRIVER</span></h1>
        
        {!activeRide && (
          <button 
            onClick={toggleOnline}
            className={`px-6 py-2 rounded-full font-bold text-sm text-white transition-colors ${isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`}
          >
            {isOnline ? 'ONLINE' : 'GO ONLINE'}
          </button>
        )}
      </header>

      <div className="flex-1 relative">
        {/* Map Background */}
        <Map
          {...viewport}
          onMove={evt => setViewport(evt.viewState)}
          mapStyle="mapbox://styles/mapbox/navigation-day-v1"
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_API_KEY}
          style={{ width: '100%', height: '100%' }}
        >
          {activeRide && (
             <>
               <Marker longitude={activeRide.pickup.lng} latitude={activeRide.pickup.lat} color="blue" />
               <Marker longitude={activeRide.dropoff.lng} latitude={activeRide.dropoff.lat} color="red" />
               {activeRide.path && (
                  <Source id="route" type="geojson" data={activeRide.path}>
                    <Layer
                      id="route-layer"
                      type="line"
                      layout={{ "line-join": "round", "line-cap": "round" }}
                      paint={{ "line-color": "#10b981", "line-width": 6 }}
                    />
                  </Source>
               )}
             </>
          )}
        </Map>

        {/* Incoming Requests Overlay */}
        {isOnline && !activeRide && incomingRides.length > 0 && (
          <div className="absolute top-0 left-0 w-full h-full bg-black/40 z-20 p-4 overflow-y-auto pt-20">
            {incomingRides.map(ride => (
              <div key={ride._id} className="bg-white rounded-2xl p-4 shadow-xl mb-4 border-l-4 border-emerald-500 animate-[slideUp_0.3s_ease-out]">
                <h3 className="text-lg font-black mb-1">New Ride Request</h3>
                <p className="text-gray-500 text-sm mb-4 font-bold">Fare: ₹{ride.fare} • {(ride.distance / 1000).toFixed(1)} km</p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><div className="w-2 h-2 rounded-full bg-blue-600"></div></div>
                    <p className="text-sm font-bold leading-tight">{ride.pickup.address}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0"><div className="w-2 h-2 rounded-full bg-red-600"></div></div>
                    <p className="text-sm font-bold leading-tight">{ride.dropoff.address}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button onClick={() => acceptRide(ride._id)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl">ACCEPT</button>
                  <button onClick={() => setIncomingRides(prev => prev.filter(r => r._id !== ride._id))} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl">IGNORE</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active Ride Overlay */}
        {activeRide && (
          <div className="absolute bottom-0 left-0 w-full bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-30 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl text-gray-900">
                {activeRide.status === 'accepted' && 'En Route to Pickup'}
                {activeRide.status === 'arrived' && 'Waiting for Rider'}
                {activeRide.status === 'in_progress' && 'Driving to Dropoff'}
              </h3>
              <p className="text-emerald-600 font-black text-xl">₹{activeRide.fare}</p>
            </div>
            
            <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-xl">
              <p className="text-sm font-bold text-gray-600"><span className="text-blue-600">PICKUP:</span> {activeRide.pickup.address}</p>
              <p className="text-sm font-bold text-gray-600"><span className="text-red-600">DROP:</span> {activeRide.dropoff.address}</p>
            </div>

            {activeRide.status === 'accepted' && (
              <button onClick={() => updateRideStatus('arrived')} className="w-full py-4 bg-gray-900 text-white font-black rounded-xl">ARRIVED AT PICKUP</button>
            )}
            {activeRide.status === 'arrived' && (
              <button onClick={() => updateRideStatus('in_progress')} className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl">START RIDE</button>
            )}
            {activeRide.status === 'in_progress' && (
              <button onClick={() => updateRideStatus('completed')} className="w-full py-4 bg-red-600 text-white font-black rounded-xl">COMPLETE RIDE</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
