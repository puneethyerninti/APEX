"use client";
import React, { useState, useContext, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { SocketContext } from '@/context/SocketContext';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

// Dynamically import the map
const TravelsMap = dynamic(() => import('@/components/TravelsMap'), { ssr: false });

const libraries: any = ['places'];

export default function Page() {
  const [activeTab, setActiveTab] = useState<'cab' | 'bus' | 'train' | 'flight'>('cab');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<{type: string, message: string} | null>(null);
  
  const [pickupLocation, setPickupLocation] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');
  
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  
  // Real-time tracking state
  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket;
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [cabLocation, setCabLocation] = useState<{lat: number, lng: number} | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const [routeDirections, setRouteDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [distanceText, setDistanceText] = useState('');
  const [durationText, setDurationText] = useState('');
  const [estimatedFare, setEstimatedFare] = useState<{mini: number, xl: number}>({mini: 120, xl: 180});

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries,
  });

  const pickupAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (activeRideId && socket) {
      const handleRideUpdate = (data: any) => {
        setCabLocation({ lat: data.lat, lng: data.lng });
      };
      
      socket.on(`ride_update_${activeRideId}`, handleRideUpdate);
      return () => {
        socket.off(`ride_update_${activeRideId}`, handleRideUpdate);
      };
    }
  }, [activeRideId, socket]);

  const calculateRouteAndFare = (origin: string | google.maps.LatLngLiteral, destination: string) => {
    if (!isLoaded || !window.google) return;
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setRouteDirections(result);
          const leg = result.routes[0].legs[0];
          setDistanceText(leg.distance?.text || '');
          setDurationText(leg.duration?.text || '');
          
          if (leg.distance?.value) {
             const distanceKm = leg.distance.value / 1000;
             // Base fare 50, + 15 per km for mini, + 25 per km for XL
             setEstimatedFare({
                 mini: Math.round(50 + (distanceKm * 15)),
                 xl: Math.round(80 + (distanceKm * 25))
             });
          }
        }
      }
    );
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
            
            if (isLoaded && window.google) {
                const geocoder = new window.google.maps.Geocoder();
                geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
                    if (status === 'OK' && results && results[0]) {
                        setPickupLocation(results[0].formatted_address);
                        if (destinationLocation) {
                            calculateRouteAndFare({lat: latitude, lng: longitude}, destinationLocation);
                        }
                    } else {
                        setPickupLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                    }
                    setIsFetchingLocation(false);
                });
            } else {
                setPickupLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                setIsFetchingLocation(false);
            }
        },
        (error) => {
            console.error("Error getting location", error);
            alert("Unable to retrieve your location. Please check browser permissions.");
            setIsFetchingLocation(false);
        }
    );
  };

  const onPickupPlaceChanged = () => {
    if (pickupAutocompleteRef.current) {
      const place = pickupAutocompleteRef.current.getPlace();
      if (place && place.formatted_address) {
          setPickupLocation(place.formatted_address);
          if (place.geometry?.location) {
              setUserLocation({lat: place.geometry.location.lat(), lng: place.geometry.location.lng()});
          }
          if (destinationLocation) {
              calculateRouteAndFare(place.formatted_address, destinationLocation);
          }
      }
    }
  };

  const onDestPlaceChanged = () => {
    if (destAutocompleteRef.current) {
      const place = destAutocompleteRef.current.getPlace();
      if (place && place.formatted_address) {
          setDestinationLocation(place.formatted_address);
          if (pickupLocation) {
              calculateRouteAndFare(pickupLocation, place.formatted_address);
          }
      }
    }
  };

  const handleBook = (type: string, e: React.FormEvent | React.MouseEvent) => {
    if ('preventDefault' in e) e.preventDefault();
    setIsBooking(true);
    
    // If it's a cab, we trigger real-time tracking
    if (type === 'APEX Cab Ride' && socket) {
        const rideId = `ride_${Date.now()}`;
        socket.emit('start_ride', {
            rideId,
            origin: pickupLocation || 'Current Location',
            destination: destinationLocation || 'Selected Destination',
            lat: userLocation?.lat,
            lng: userLocation?.lng
        });
        setActiveRideId(rideId);
    }

    setTimeout(() => {
        setIsBooking(false);
        setBookingSuccess({
            type,
            message: `Your ${type} has been successfully booked!`
        });
    }, 1500);
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
        <button className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
            <i className="fa-solid fa-clock-rotate-left"></i>
        </button>
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
            <div className="absolute inset-0 z-0 bg-gray-100 flex items-center justify-center">
                {isLoaded ? (
                    <TravelsMap cabLocation={cabLocation} userLocation={userLocation} routeDirections={routeDirections} />
                ) : (
                    <div className="text-gray-400 font-semibold"><i className="fa-solid fa-circle-notch fa-spin mr-2"></i>Loading Map...</div>
                )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent z-0 pointer-events-none"></div>
            
            {!activeRideId && !routeDirections && (
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
                            {isLoaded ? (
                                <Autocomplete onLoad={(ref) => pickupAutocompleteRef.current = ref} onPlaceChanged={onPickupPlaceChanged}>
                                    <input type="text" placeholder="Current Location" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} className="w-full bg-gray-100 border-none rounded-lg py-2.5 px-4 mb-3 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-apex-purple pr-10" />
                                </Autocomplete>
                            ) : (
                                <input type="text" placeholder="Loading..." disabled className="w-full bg-gray-100 border-none rounded-lg py-2.5 px-4 mb-3 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-apex-purple pr-10" />
                            )}
                            <button type="button" onClick={handleLocationFetch} disabled={isFetchingLocation} className="absolute right-2 top-1.5 text-apex-purple bg-white shadow-sm p-1.5 rounded-md hover:bg-purple-50 transition-colors z-10">
                                {isFetchingLocation ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-location-crosshairs"></i>}
                            </button>
                        </div>
                        {isLoaded ? (
                            <Autocomplete onLoad={(ref) => destAutocompleteRef.current = ref} onPlaceChanged={onDestPlaceChanged}>
                                <input type="text" placeholder="Where to?" value={destinationLocation} onChange={(e) => setDestinationLocation(e.target.value)} className="w-full bg-gray-100 border-none rounded-lg py-2.5 px-4 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-apex-purple" />
                            </Autocomplete>
                        ) : (
                             <input type="text" placeholder="Where to?" disabled className="w-full bg-gray-100 border-none rounded-lg py-2.5 px-4 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-apex-purple" />
                        )}
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
                        <label className="flex items-center justify-between p-3 rounded-xl border-2 border-apex-purple bg-purple-50 cursor-pointer">
                            <div className="flex items-center gap-3">
                                <img src="https://img.icons8.com/color/48/sedan.png" alt="Sedan" className="w-10" />
                                <div>
                                    <div className="font-bold text-sm text-gray-900">APEX Mini</div>
                                    <div className="text-[9px] text-gray-500">{durationText ? durationText : '4 mins'} away • 4 seats</div>
                                </div>
                            </div>
                            <div className="font-black text-lg text-gray-900">₹{estimatedFare.mini}</div>
                        </label>
                        <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white cursor-pointer hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                                <img src="https://img.icons8.com/color/48/suv.png" alt="SUV" className="w-10" />
                                <div>
                                    <div className="font-bold text-sm text-gray-900">APEX XL</div>
                                    <div className="text-[9px] text-gray-500">{durationText ? durationText : '7 mins'} away • 6 seats</div>
                                </div>
                            </div>
                            <div className="font-black text-lg text-gray-900">₹{estimatedFare.xl}</div>
                        </label>
                    </div>

                    {activeRideId ? (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-green-700 text-lg">Driver is on the way!</h3>
                                <p className="text-xs text-green-600">APEX Mini • AP 31 X 9999</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-green-500 shadow-sm border border-green-100 text-xl">
                                <i className="fa-solid fa-car-side"></i>
                            </div>
                        </div>
                    ) : (
                        <button onClick={(e) => handleBook('APEX Cab Ride', e)} disabled={isBooking || !pickupLocation || !destinationLocation} className={`w-full text-white font-bold py-3.5 rounded-xl shadow-lg transition-colors text-sm flex justify-center items-center gap-2 ${!pickupLocation || !destinationLocation ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-black'}`}>
                            {isBooking ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Booking...</> : 'Book APEX Mini'}
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
                            <i className="fa-solid fa-location-dot absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input required type="text" placeholder="From City" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Destination</label>
                        <div className="relative">
                            <i className="fa-solid fa-location-crosshairs absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
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
                            <i className="fa-solid fa-train-subway absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input required type="text" placeholder="From Station" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Destination Station</label>
                        <div className="relative">
                            <i className="fa-solid fa-location-crosshairs absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
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
                            <i className="fa-solid fa-plane-departure absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input required type="text" placeholder="DEL - New Delhi" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">To Airport</label>
                        <div className="relative">
                            <i className="fa-solid fa-plane-arrival absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
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
