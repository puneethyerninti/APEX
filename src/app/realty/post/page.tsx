"use client";
import React, { useState } from 'react';
import Link from 'next/link';

export default function PostPropertyPage() {
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSuccess(true);
        setTimeout(() => {
            window.location.href = '/realty';
        }, 3000);
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* HEADER */}
            <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <Link href="/realty" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                        <i className="fa-solid fa-arrow-left"></i>
                    </Link>
                    <h1 className="font-black text-lg text-gray-900">Post Property</h1>
                </div>
            </div>

            <div className="p-4 max-w-lg mx-auto mt-4">
                {isSuccess ? (
                    <div className="bg-emerald-50 text-emerald-800 p-8 rounded-2xl text-center border border-emerald-100 shadow-sm animate-[fadeIn_0.3s_ease-out]">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fa-solid fa-check text-3xl text-emerald-600"></i>
                        </div>
                        <h2 className="text-xl font-black mb-2">Property Posted!</h2>
                        <p className="text-sm font-medium text-emerald-700">Your classified has been successfully submitted and will be reviewed shortly.</p>
                        <p className="text-xs mt-4 text-emerald-600">Redirecting back to Realty...</p>
                    </div>
                ) : (
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-xl font-black text-gray-900 mb-1">Sell or Rent your Property</h2>
                        <p className="text-xs text-gray-500 mb-6 font-medium">Post your classified for free and reach thousands of buyers.</p>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Listing Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="flex items-center justify-center p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 transition-colors">
                                        <input type="radio" name="listing_type" value="sell" className="mr-2 accent-emerald-600" required defaultChecked />
                                        <span className="text-sm font-bold text-gray-800">For Sale</span>
                                    </label>
                                    <label className="flex items-center justify-center p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 transition-colors">
                                        <input type="radio" name="listing_type" value="rent" className="mr-2 accent-emerald-600" required />
                                        <span className="text-sm font-bold text-gray-800">For Rent</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Property Type</label>
                                <select required className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-gray-800 font-medium">
                                    <option value="">Select Type</option>
                                    <option value="apartment">Apartment</option>
                                    <option value="villa">Villa / Independent House</option>
                                    <option value="plot">Plot / Land</option>
                                    <option value="commercial">Commercial Space</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Property Title</label>
                                <input type="text" required placeholder="e.g. 2 BHK Fully Furnished in Madhapur" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium text-gray-900" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Price / Rent (₹)</label>
                                <input type="number" required placeholder="Enter amount" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium text-gray-900" />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
                                <textarea required rows={4} placeholder="Describe the key features, amenities, and location advantages..." className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium text-gray-900 resize-none"></textarea>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Your Contact Number</label>
                                <input type="tel" required pattern="[0-9]{10}" placeholder="10-digit mobile number" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium text-gray-900" />
                            </div>

                            <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all mt-4 text-sm">
                                Post Classified
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
