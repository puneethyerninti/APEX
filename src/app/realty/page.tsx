"use client";
import React, { useState } from 'react';
import Link from 'next/link';

export default function Page() {
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: ''
  });

  const openInquiry = (property: string) => {
    setSelectedProperty(property);
    setIsSuccess(false);
  };

  const closeForm = () => {
    setSelectedProperty(null);
    setIsSuccess(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate network request
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1500);
  };

  return (
    <>
    {/* HEADER */}
    <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                <i className="fa-solid fa-arrow-left"></i>
            </Link>
            <h1 className="font-black text-lg text-gray-900">APEX Realty</h1>
        </div>
        <button className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <i className="fa-solid fa-heart"></i>
        </button>
    </div>

    {/* HERO SEARCH */}
    <div className="relative bg-emerald-900 pt-8 pb-12 px-4 overflow-hidden rounded-b-3xl shadow-md">
        {/* Background Image overlay */}
        <div className="absolute inset-0 z-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&amp;fit=crop&amp;q=80')" }}></div>
        
        <div className="relative z-10">
            <h2 className="text-white text-xl font-black mb-1">Find your dream home</h2>
            <p className="text-emerald-100 text-xs mb-4">Over 10,000+ premium properties.</p>
            
            <div className="bg-white p-2 rounded-2xl shadow-lg">
                <div className="flex border-b border-gray-100 mb-2">
                    <button className="flex-1 py-1.5 text-xs font-bold text-emerald-600 border-b-2 border-emerald-600">Buy</button>
                    <button className="flex-1 py-1.5 text-xs font-bold text-gray-400 hover:text-emerald-600">Rent</button>
                    <button className="flex-1 py-1.5 text-xs font-bold text-gray-400 hover:text-emerald-600">Projects</button>
                </div>
                <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                    <input type="text" onChange={() => {}} placeholder="Search City, Locality or Landmark" className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-8 pr-4 py-2 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                </div>
            </div>
        </div>
    </div>

    {/* CATEGORY GRID */}
    <div className="px-4 mt-6 mb-6">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Explore Properties</h3>
        <div className="grid grid-cols-4 gap-3">
            <button onClick={() => {}} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-emerald-600 text-lg"><i className="fa-solid fa-building"></i></div>
                <span className="text-[9px] font-bold text-gray-600">Apartments</span>
            </button>
            <button onClick={() => {}} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-teal-600 text-lg"><i className="fa-solid fa-house-user"></i></div>
                <span className="text-[9px] font-bold text-gray-600">Villas</span>
            </button>
            <button onClick={() => {}} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-emerald-600 text-lg"><i className="fa-solid fa-map-location-dot"></i></div>
                <span className="text-[9px] font-bold text-gray-600">Plots</span>
            </button>
            <button onClick={() => {}} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-teal-600 text-lg"><i className="fa-solid fa-city"></i></div>
                <span className="text-[9px] font-bold text-gray-600">Commercial</span>
            </button>
        </div>
    </div>

    {/* FEATURED TRACK */}
    <div className="mb-5">
        <div className="px-4 flex justify-between items-end mb-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Premium Collections</h3>
            <Link href="#" className="text-[9px] font-bold text-emerald-600">View All</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 scrollbar-none flex-nowrap pb-2">
            <div className="realty-card bg-white rounded-xl shadow-sm border border-gray-100 min-w-[200px] flex-shrink-0 overflow-hidden group cursor-pointer" data-category="villas hyderabad skyline" onClick={() => openInquiry('Skyline Penthouses (₹12.5 Cr)')}>
                <div className="h-28 w-full bg-gray-200 overflow-hidden relative">
                    <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&amp;fit=crop&amp;q=80" alt="Villa" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <span className="absolute top-2 left-2 bg-black/60 text-white text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Verified</span>
                </div>
                <div className="p-3">
                    <h4 className="font-black text-xs text-gray-900 truncate mb-1">Skyline Penthouses</h4>
                    <p className="text-[10px] text-gray-500 mb-2 truncate"><i className="fa-solid fa-location-dot text-gray-400 mr-1"></i>Banjara Hills, Hyderabad</p>
                    <div className="flex items-end justify-between">
                        <span className="text-emerald-600 font-black text-sm">₹12.5 Cr</span>
                        <span className="text-[9px] text-gray-400 font-bold">4 BHK</span>
                    </div>
                </div>
            </div>
            <div className="realty-card bg-white rounded-xl shadow-sm border border-gray-100 min-w-[200px] flex-shrink-0 overflow-hidden group cursor-pointer" data-category="apartments bangalore prestige" onClick={() => openInquiry('Prestige Oasis (₹4.2 Cr)')}>
                <div className="h-28 w-full bg-gray-200 overflow-hidden relative">
                    <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&amp;fit=crop&amp;q=80" alt="Apartment" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="p-3">
                    <h4 className="font-black text-xs text-gray-900 truncate mb-1">Prestige Oasis</h4>
                    <p className="text-[10px] text-gray-500 mb-2 truncate"><i className="fa-solid fa-location-dot text-gray-400 mr-1"></i>Whitefield, Bangalore</p>
                    <div className="flex items-end justify-between">
                        <span className="text-emerald-600 font-black text-sm">₹4.2 Cr</span>
                        <span className="text-[9px] text-gray-400 font-bold">3 BHK</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    {/* MODAL / FORM UI OVERLAY */}
    {selectedProperty && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-0 sm:pb-4 transition-all">
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-[slideUp_0.3s_ease-out]">
                {/* Modal Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-lg font-black text-gray-900">Inquire Property</h2>
                        <p className="text-[10px] text-gray-500 truncate max-w-[200px]">{selectedProperty}</p>
                    </div>
                    <button onClick={closeForm} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 overflow-y-auto custom-scrollbar">
                    {isSuccess ? (
                        <div className="py-10 flex flex-col items-center text-center animate-[fadeIn_0.5s_ease-out]">
                            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-4xl mb-4 shadow-sm">
                                <i className="fa-solid fa-check"></i>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">Inquiry Sent!</h3>
                            <p className="text-sm text-gray-500 max-w-[250px] mx-auto mb-6">
                                An APEX Realty agent will contact you shortly regarding '{selectedProperty}'.
                            </p>
                            <button onClick={closeForm} className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl shadow-md">
                                Done
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-6">
                            {/* Inputs */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">Full Name</label>
                                <input required type="text" placeholder="Enter your name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">Phone Number</label>
                                <input required type="tel" placeholder="Enter mobile number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">Message (Optional)</label>
                                <textarea placeholder="I am interested in this property..." value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none h-20" />
                            </div>

                            <button type="submit" disabled={isSubmitting} className="mt-4 w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 active:scale-[0.98] transition-all flex justify-center items-center gap-2">
                                {isSubmitting ? (
                                    <><i className="fa-solid fa-circle-notch fa-spin"></i> Sending...</>
                                ) : (
                                    'Contact Agent'
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )}
    </>
  );
}
