"use client";
import React, { useState } from 'react';
import Link from 'next/link';

export default function Page() {
  const [activeTab, setActiveTab] = useState<'cab' | 'bus' | 'train' | 'flight'>('cab');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<{type: string, message: string} | null>(null);
  const [pickupLocation, setPickupLocation] = useState('');
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const handleLocationFetch = () => {
    setIsFetchingLocation(true);
    setTimeout(() => {
        setPickupLocation('123 APEX Tech Park, New Delhi');
        setIsFetchingLocation(false);
    }, 1000);
  };

  const handleBook = (type: string, e: React.FormEvent | React.MouseEvent) => {
    if ('preventDefault' in e) e.preventDefault();
    setIsBooking(true);
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

    {/* TAB CONTENTS */}
    
    {/* CAB SECTION */}
    {activeTab === 'cab' && (
        <div className="tab-content active h-screen relative">
            <div className="absolute inset-0 map-bg z-0 opacity-80" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80')", backgroundSize: 'cover' }}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 to-transparent z-0"></div>
            
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
                <div className="bg-gray-900 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg mb-1">Pickup Location</div>
                <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-white pulse-dot"></div>
                <div className="w-1 h-8 bg-gray-900"></div>
                <div className="w-2 h-1 bg-gray-900 rounded-full blur-[1px]"></div>
            </div>

            <div className="absolute bottom-0 w-full bg-white rounded-t-3xl shadow-[0_-10px_20px_rgba(0,0,0,0.1)] z-20 overflow-hidden flex flex-col" style={{ maxHeight: "70vh" }}>
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-3"></div>
                
                <div className="px-5 pb-6 overflow-y-auto custom-scrollbar">
                    <h2 className="text-xl font-black text-gray-900 mb-4">Book a Ride</h2>
                    
                    <div className="relative pl-8 mb-5">
                        <div className="absolute left-2 top-3 w-3 h-3 rounded-full bg-green-500"></div>
                        <div className="absolute left-3 top-7 w-0.5 h-6 bg-gray-300"></div>
                        <div className="absolute left-2 top-[52px] w-3 h-3 rounded-sm bg-red-500"></div>

                        <div className="relative">
                            <input type="text" placeholder="Current Location" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} className="w-full bg-gray-100 border-none rounded-lg py-2.5 px-4 mb-3 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-apex-purple pr-10" />
                            <button type="button" onClick={handleLocationFetch} disabled={isFetchingLocation} className="absolute right-2 top-1.5 text-apex-purple bg-white shadow-sm p-1.5 rounded-md hover:bg-purple-50 transition-colors">
                                {isFetchingLocation ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-location-crosshairs"></i>}
                            </button>
                        </div>
                        <input type="text" placeholder="Where to?" className="w-full bg-gray-100 border-none rounded-lg py-2.5 px-4 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-apex-purple" />
                    </div>

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
                                    <div className="text-[9px] text-gray-500">4 mins away • 4 seats</div>
                                </div>
                            </div>
                            <div className="font-black text-lg text-gray-900">₹120</div>
                        </label>
                        <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white cursor-pointer hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                                <img src="https://img.icons8.com/color/48/suv.png" alt="SUV" className="w-10" />
                                <div>
                                    <div className="font-bold text-sm text-gray-900">APEX XL</div>
                                    <div className="text-[9px] text-gray-500">7 mins away • 6 seats</div>
                                </div>
                            </div>
                            <div className="font-black text-lg text-gray-900">₹180</div>
                        </label>
                    </div>

                    <button onClick={(e) => handleBook('APEX Cab Ride', e)} disabled={isBooking} className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-black transition-colors text-sm flex justify-center items-center gap-2">
                        {isBooking ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Booking...</> : 'Book APEX Mini'}
                    </button>
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
