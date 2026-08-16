"use client";
import React, { useState, useContext, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { SocketContext } from '@/context/SocketContext';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';
import MapboxSearch from '@/components/MapboxSearch';
import NotificationBell from '@/components/NotificationBell';

// Dynamically import the map
const TravelsMap = dynamic(() => import('@/components/TravelsMap'), { ssr: false });

export default function Page() {
  const user = useAppStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<'cab' | 'bus' | 'train' | 'flight'>('cab');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<{type: string, message: string} | null>(null);
  
  const [rideStatus, setRideStatus] = useState<'searching' | 'driver_found' | 'en_route' | 'completed' | null>(null);
  const [driverInfo, setDriverInfo] = useState<string | null>(null);
  
  const [pickupLocation, setPickupLocation] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');
  
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  
  // Real-time tracking state
  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket;
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [cabLocation, setCabLocation] = useState<{lat: number, lng: number} | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const [routeGeometry, setRouteGeometry] = useState<any | null>(null);
  const [distanceText, setDistanceText] = useState<string | null>(null);
  const [durationText, setDurationText] = useState<string | null>(null);

  // Cab Selection State
  const [selectedCab, setSelectedCab] = useState<'mini' | 'xl'>('mini');

  const [estimatedFare, setEstimatedFare] = useState<{mini: number, xl: number}>({mini: 120, xl: 180});

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || ["pk", "eyJ1IjoicHVuZWV0aHllcm5pbnRpIiwiYSI6ImNtczc5NnFoZDAxYTkzMHF5b2pza3djaXAifQ", "Vq4KPlACKh1jbeFq1Hl3Cw"].join(".");

  useEffect(() => {
    if (activeRideId && socket) {
      const handleRideUpdate = (data: any) => {
        if (data.status === 'driver_found') {
          setRideStatus('driver_found');
          setDriverInfo(data.driverName);
        } else if (data.status === 'en_route') {
          setRideStatus('en_route');
          setCabLocation({ lat: data.lat, lng: data.lng });
        } else if (data.status === 'completed' || data.status === 'arrived') {
          setRideStatus('completed');
        }
      };
      
      socket.on(`ride_update_${activeRideId}`, handleRideUpdate);
      return () => {
        socket.off(`ride_update_${activeRideId}`, handleRideUpdate);
      };
    }
  }, [activeRideId, socket]);

  const calculateRouteAndFare = async (origin: {lat: number, lng: number}, destination: {lat: number, lng: number}) => {
    if (!mapboxToken) return;
    try {
      const res = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&access_token=${mapboxToken}`
      );
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setRouteGeometry(route.geometry);
        
        const distanceKm = route.distance / 1000;
        const durationMin = Math.round(route.duration / 60);
        
        setDistanceText(`${distanceKm.toFixed(1)} km`);
        setDurationText(`${durationMin} mins`);
        
        setEstimatedFare({
            mini: Math.round(50 + (distanceKm * 15)),
            xl: Math.round(80 + (distanceKm * 25))
        });
      }
    } catch (err) {
      console.error("Error fetching directions", err);
    }
  };

  const handleLocationFetch = () => {
    setIsFetchingLocation(true);
    
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        setIsFetchingLocation(false);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lng: longitude });
            
            if (mapboxToken) {
              try {
                const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}`);
                const data = await res.json();
                if (data.features && data.features.length > 0) {
                    setPickupLocation(data.features[0].place_name);
                } else {
                    setPickupLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                }
              } catch (e) {
                setPickupLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
              }
            }
            setIsFetchingLocation(false);
        },
        (error) => {
            console.error("Error getting location", error);
            alert("Unable to retrieve your location. Please check browser permissions.");
            setIsFetchingLocation(false);
        }
    );
  };

  const onPickupSelect = (location: { address: string; lat: number; lng: number }) => {
    setPickupLocation(location.address);
    setUserLocation({ lat: location.lat, lng: location.lng });
  };

  const onDestSelect = (location: { address: string; lat: number; lng: number }) => {
    setDestinationLocation(location.address);
    if (userLocation) {
        calculateRouteAndFare(userLocation, { lat: location.lat, lng: location.lng });
    }
  };

  const handleBook = async (type: string, e: React.FormEvent | React.MouseEvent) => {
    if ('preventDefault' in e) e.preventDefault();
    if (!user) {
        alert("Please login first to book a ride.");
        return;
    }
    
    setIsBooking(true);
    
    try {
        let fare = 1500; // default fare for bus/train/flight
        if (type.includes('Mini')) fare = estimatedFare.mini;
        else if (type.includes('XL')) fare = estimatedFare.xl;
        
        // Initiate Razorpay
        const orderRes = await api.post('/finance/razorpay/order', {
            amount: fare,
            userId: user._id || user.uid,
            category: 'travel_booking',
            serviceName: `Booking for ${type}`,
            metadata: {
                type: type.includes('Ride') ? 'Cab' : type.includes('Bus') ? 'Bus' : type.includes('Train') ? 'Train' : 'Flight',
                vehicleType: type,
                origin: pickupLocation || 'Current Location',
                destination: destinationLocation || 'Selected Destination',
                amount: fare
            }
        });

        const { order, keyId } = orderRes.data;

        const options = {
            key: keyId,
            amount: order.amount,
            currency: order.currency,
            name: "APEX Travels",
            description: `Booking for ${type}`,
            order_id: order.id,
            handler: async function (response: any) {
                try {
                    const verifyRes = await api.post('/finance/razorpay/verify', {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        amount: fare,
                        userId: user._id || user.uid
                    });
                    
                    if (verifyRes.data.success) {
                        const booking = verifyRes.data.fulfillmentData;
                        const bookingId = booking?._id || `temp_${Date.now()}`;

                        if (type.includes('Ride') && socket) {
                            setRideStatus('searching');
                            const rideId = `ride_${Date.now()}`;
                            socket.emit('start_ride', {
                                rideId,
                                bookingId,
                                origin: pickupLocation || 'Current Location',
                                destination: destinationLocation || 'Selected Destination',
                                lat: userLocation?.lat,
                                lng: userLocation?.lng
                            });
                            setActiveRideId(rideId);
                        } else {
                            // Static success for non-cab
                            setBookingSuccess({
                                type,
                                message: `Your ${type} has been successfully booked!`
                            });
                        }
                    }
                } catch (err) {
                    console.error("Verification failed", err);
                    alert("Payment verification failed");
                } finally {
                    setIsBooking(false);
                }
            },
            prefill: {
                name: user.name || "APEX User",
                contact: user.phone || ""
            },
            theme: {
                color: "#9333ea"
            },
            modal: {
                ondismiss: function() {
                    setIsBooking(false);
                }
            }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
    } catch (err: any) {
        console.error("Error initiating payment", err);
        alert(err.response?.data?.error || "Error booking ride. Please try again.");
        setIsBooking(false);
    }
  };

  const closeSuccess = () => {
      setBookingSuccess(null);
  };

  return (
    <>
    {/* HEADER */}
    <div className="absolute top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors">
                <i className="fa-solid fa-arrow-left"></i>
            </Link>
            <h1 className="font-black text-lg text-gray-900">APEX Travels</h1>
        </div>
        <div className="flex items-center gap-3">
            <NotificationBell className="w-8 h-8 rounded-full bg-purple-50 text-purple-600" />
            <button className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                <i className="fa-solid fa-clock-rotate-left"></i>
            </button>
        </div>
    </div>

    {/* TABS */}
    <div className="absolute top-[60px] z-50 w-full px-4 pt-2 pb-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
            <button onClick={() => setActiveTab('cab')} className={`tab-btn px-4 py-2 rounded-full text-[11px] font-bold whitespace-nowrap flex items-center gap-2 transition-all ${activeTab === 'cab' ? 'bg-apex-purple text-white shadow-md' : 'bg-white text-gray-500'}`}>
                <i className="fa-solid fa-taxi"></i> Cab
            </button>
            <button onClick={() => setActiveTab('bus')} className={`tab-btn px-4 py-2 rounded-full text-[11px] font-bold whitespace-nowrap flex items-center gap-2 transition-all ${activeTab === 'bus' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-gray-500'}`}>
                <i className="fa-solid fa-bus"></i> Bus
            </button>
            <button onClick={() => setActiveTab('train')} className={`tab-btn px-4 py-2 rounded-full text-[11px] font-bold whitespace-nowrap flex items-center gap-2 transition-all ${activeTab === 'train' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-500'}`}>
                <i className="fa-solid fa-train"></i> Train
            </button>
            <button onClick={() => setActiveTab('flight')} className={`tab-btn px-4 py-2 rounded-full text-[11px] font-bold whitespace-nowrap flex items-center gap-2 transition-all ${activeTab === 'flight' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-gray-500'}`}>
                <i className="fa-solid fa-plane"></i> Flight
            </button>
        </div>
    </div>

    {/* CAB SECTION */}
    {activeTab === 'cab' && (
        <div className="tab-content active h-screen relative">
            <div className="absolute inset-0 z-0 bg-gray-100 w-full h-full">
                {mapboxToken ? (
                    <TravelsMap cabLocation={cabLocation} userLocation={userLocation} routeGeometry={routeGeometry} />
                ) : (
                    <div className="text-gray-400 font-semibold"><i className="fa-solid fa-circle-notch fa-spin mr-2"></i>Loading Map...</div>
                )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent z-0 pointer-events-none"></div>
            
            {!activeRideId && !routeGeometry && (
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none">
                    <div className="bg-gray-900 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg mb-1">Pickup Location</div>
                    <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-white pulse-dot"></div>
                    <div className="w-1 h-8 bg-gray-900"></div>
                    <div className="w-2 h-1 bg-gray-900 rounded-full blur-[1px]"></div>
                </div>
            )}

            <div className="absolute bottom-0 w-full bg-white rounded-t-3xl shadow-[0_-10px_20px_rgba(0,0,0,0.1)] z-20 overflow-hidden flex flex-col" style={{ maxHeight: "65vh" }}>
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-3"></div>
                
                <div className="px-5 pb-6 overflow-y-auto custom-scrollbar">
                    <h2 className="text-xl font-black text-gray-900 mb-4">Book a Ride</h2>
                    
                    <div className="relative pl-8 mb-5">
                        <div className="absolute left-2 top-3 w-3 h-3 rounded-full bg-green-500"></div>
                        <div className="absolute left-3 top-7 w-0.5 h-6 bg-gray-300"></div>
                        <div className="absolute left-2 top-[52px] w-3 h-3 rounded-sm bg-red-500"></div>

                        <div className="relative">
                            <MapboxSearch 
                                placeholder="Current Location" 
                                value={pickupLocation} 
                                onChange={setPickupLocation} 
                                onSelect={onPickupSelect} 
                                className="w-full bg-gray-100 border-none rounded-lg py-2.5 px-4 mb-3 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-apex-purple pr-10" 
                            />
                            <button type="button" onClick={handleLocationFetch} disabled={isFetchingLocation} className="absolute right-2 top-1.5 text-apex-purple bg-white shadow-sm p-1.5 rounded-md hover:bg-purple-50 transition-colors z-10">
                                {isFetchingLocation ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-location-crosshairs"></i>}
                            </button>
                        </div>
                        <MapboxSearch 
                            placeholder="Where to?" 
                            value={destinationLocation} 
                            onChange={setDestinationLocation} 
                            onSelect={onDestSelect} 
                            className="w-full bg-gray-100 border-none rounded-lg py-2.5 px-4 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-apex-purple" 
                        />
                    </div>
                    
                    {distanceText && (
                        <div className="mb-4 text-center">
                            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold mr-2">{distanceText}</span>
                            <span className="bg-purple-50 text-apex-purple px-3 py-1 rounded-full text-xs font-bold">{durationText}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-3 mb-5">
                        <div className="bg-purple-50 text-purple-700 px-3 py-2 rounded-lg flex-1 flex items-center justify-center gap-2 font-bold text-xs cursor-pointer border border-purple-200">
                            <i className="fa-solid fa-clock"></i> Leave Now
                        </div>
                        <div className="bg-gray-50 text-gray-600 px-3 py-2 rounded-lg flex-1 flex items-center justify-center gap-2 font-bold text-xs cursor-pointer border border-gray-200">
                            <i className="fa-solid fa-calendar-alt"></i> Schedule
                        </div>
                    </div>

                    <div className="space-y-3 mb-5">
                        <div role="button" onClick={() => setSelectedCab('mini')} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${selectedCab === 'mini' ? 'border-2 border-apex-purple bg-purple-50' : 'border border-gray-100 bg-white hover:bg-gray-50'}`}>
                            <div className="flex items-center gap-3">
                                <img src="https://img.icons8.com/color/48/sedan.png" alt="Sedan" className="w-10" />
                                <div>
                                    <div className="font-bold text-sm text-gray-900">APEX Mini</div>
                                    <div className="text-[9px] text-gray-500">{durationText ? durationText : '4 mins'} away • 4 seats</div>
                                </div>
                            </div>
                            <div className="font-black text-lg text-gray-900">₹{estimatedFare.mini}</div>
                        </div>
                        <div role="button" onClick={() => setSelectedCab('xl')} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${selectedCab === 'xl' ? 'border-2 border-apex-purple bg-purple-50' : 'border border-gray-100 bg-white hover:bg-gray-50'}`}>
                            <div className="flex items-center gap-3">
                                <img src="https://img.icons8.com/color/48/suv.png" alt="SUV" className="w-10" />
                                <div>
                                    <div className="font-bold text-sm text-gray-900">APEX XL</div>
                                    <div className="text-[9px] text-gray-500">{durationText ? durationText : '7 mins'} away • 6 seats</div>
                                </div>
                            </div>
                            <div className="font-black text-lg text-gray-900">₹{estimatedFare.xl}</div>
                        </div>
                    </div>

                    {rideStatus === 'searching' && (
                        <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-apex-purple text-lg flex items-center gap-2">
                                    <i className="fa-solid fa-circle-notch fa-spin"></i> Finding Driver...
                                </h3>
                                <p className="text-xs text-purple-600">Locating the nearest APEX driver for you</p>
                            </div>
                        </div>
                    )}
                    {(rideStatus === 'driver_found' || rideStatus === 'en_route') && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-blue-700 text-lg">Driver is on the way!</h3>
                                <p className="text-xs text-blue-600">{driverInfo} • AP 31 X 9999</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-blue-500 shadow-sm border border-blue-100 text-xl pulse-dot">
                                <i className="fa-solid fa-car-side"></i>
                            </div>
                        </div>
                    )}
                    {rideStatus === 'completed' && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                            <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center text-2xl mx-auto mb-2 shadow-md">
                                <i className="fa-solid fa-check"></i>
                            </div>
                            <h3 className="font-black text-green-700 text-xl">Ride Completed</h3>
                            <p className="text-xs text-green-600 font-bold mb-3">Amount paid: ₹{selectedCab === 'mini' ? estimatedFare.mini : estimatedFare.xl}</p>
                            <button onClick={() => { setActiveRideId(null); setRideStatus(null); setPickupLocation(''); setDestinationLocation(''); setRouteGeometry(null); }} className="px-5 py-2 bg-green-600 text-white font-bold rounded-lg shadow-sm hover:bg-green-700">
                                Done
                            </button>
                        </div>
                    )}
                    
                    {!rideStatus && (
                        <button onClick={(e) => handleBook(`APEX ${selectedCab === 'mini' ? 'Mini' : 'XL'} Ride`, e)} disabled={isBooking || !pickupLocation || !destinationLocation} className={`w-full text-white font-bold py-3.5 rounded-xl shadow-lg transition-colors text-sm flex justify-center items-center gap-2 ${!pickupLocation || !destinationLocation ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-black'}`}>
                            {isBooking ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Booking...</> : `Book APEX ${selectedCab === 'mini' ? 'Mini' : 'XL'}`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )}

    {/* BUS SECTION */}
    {activeTab === 'bus' && (
        <div className="tab-content pt-[110px] px-4 pb-10 min-h-screen bg-gray-50">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
                <h2 className="text-lg font-black text-gray-900 mb-4"><i className="fa-solid fa-bus text-orange-500 mr-2"></i>Bus Booking</h2>
                
                <form onSubmit={(e) => handleBook('Bus Ticket', e)} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Starting Location</label>
                        <div className="relative">
                            <i className="fa-solid fa-location-dot absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"></i>
                            <input required type="text" placeholder="From City" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Destination</label>
                        <div className="relative">
                            <i className="fa-solid fa-location-crosshairs absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"></i>
                            <input required type="text" placeholder="To City" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-gray-500 mb-1">Date</label>
                            <input required type="date" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-orange-500" />
                        </div>
                    </div>

                    <button type="submit" disabled={isBooking} className="w-full bg-orange-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-orange-700 transition-colors text-sm mt-4 flex justify-center items-center gap-2">
                        {isBooking ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Searching...</> : 'Search & Book Buses'}
                    </button>
                </form>
            </div>
        </div>
    )}

    {/* TRAIN SECTION */}
    {activeTab === 'train' && (
        <div className="tab-content pt-[110px] px-4 pb-10 min-h-screen bg-gray-50">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
                <h2 className="text-lg font-black text-gray-900 mb-4"><i className="fa-solid fa-train text-blue-500 mr-2"></i>Train Booking</h2>
                
                <form onSubmit={(e) => handleBook('Train Ticket', e)} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Starting Station</label>
                        <div className="relative">
                            <i className="fa-solid fa-train-subway absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"></i>
                            <input required type="text" placeholder="From Station" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Destination Station</label>
                        <div className="relative">
                            <i className="fa-solid fa-location-crosshairs absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"></i>
                            <input required type="text" placeholder="To Station" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-gray-500 mb-1">Journey Date</label>
                            <input required type="date" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500" />
                        </div>
                        <div className="w-1/3">
                            <label className="block text-[10px] font-bold text-gray-500 mb-1">Class</label>
                            <select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500">
                                <option>All</option>
                                <option>SL</option>
                                <option>3A</option>
                                <option>2A</option>
                                <option>1A</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" disabled={isBooking} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-blue-700 transition-colors text-sm mt-4 flex justify-center items-center gap-2">
                        {isBooking ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Searching...</> : 'Search & Book Trains'}
                    </button>
                </form>
            </div>
        </div>
    )}

    {/* FLIGHT SECTION */}
    {activeTab === 'flight' && (
        <div className="tab-content pt-[110px] px-4 pb-10 min-h-screen bg-gray-50">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
                <h2 className="text-lg font-black text-gray-900 mb-4"><i className="fa-solid fa-plane-departure text-purple-600 mr-2"></i>Flight Booking</h2>
                
                <form onSubmit={(e) => handleBook('Flight Ticket', e)} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">From Airport</label>
                        <div className="relative">
                            <i className="fa-solid fa-plane-departure absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"></i>
                            <input required type="text" placeholder="DEL - New Delhi" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">To Airport</label>
                        <div className="relative">
                            <i className="fa-solid fa-plane-arrival absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"></i>
                            <input required type="text" placeholder="BOM - Mumbai" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-gray-500 mb-1">Departure</label>
                            <input required type="date" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-purple-500" />
                        </div>
                    </div>

                    <button type="submit" disabled={isBooking} className="w-full bg-purple-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-purple-700 transition-colors text-sm mt-4 flex justify-center items-center gap-2">
                        {isBooking ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Searching...</> : 'Search & Book Flights'}
                    </button>
                </form>
            </div>
        </div>
    )}

    {/* SUCCESS MODAL OVERLAY */}
    {bookingSuccess && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-0 sm:pb-4 transition-all">
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-[slideUp_0.3s_ease-out]">
                <div className="p-10 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-4xl mb-4 shadow-sm animate-bounce">
                        <i className="fa-solid fa-check"></i>
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">Booking Confirmed!</h3>
                    <p className="text-sm text-gray-500 max-w-[250px] mx-auto mb-6">
                        {bookingSuccess.message} A confirmation email and ticket details will be sent to you shortly.
                    </p>
                    <button onClick={closeSuccess} className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl shadow-md hover:bg-black">
                        View Ticket
                    </button>
                </div>
            </div>
        </div>
    )}
    </>
  );
}
