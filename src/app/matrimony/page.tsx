"use client";
import React, { useState } from 'react';
import Link from 'next/link';

export default function Page() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    profession: '',
    photo: null as File | null,
    idDocument: null as File | null,
  });

  const handlePlanClick = (plan: string) => {
    setSelectedPlan(plan);
    setIsSuccess(false);
  };

  const closeForm = () => {
    setSelectedPlan(null);
    setIsSuccess(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo' | 'idDocument') => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, [field]: e.target.files[0] });
    }
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
                <h1 className="font-black text-lg text-gray-900">Anand Matrimony</h1>
            </div>
            <button className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <i className="fa-solid fa-heart"></i>
            </button>
        </div>

        {/* HERO DASHBOARD */}
        <div className="p-4">
            <div className="bg-gradient-to-br from-rose-600 to-pink-700 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col items-center text-center">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10">
                </div>
                <div className="relative z-10">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-md text-rose-600 text-xl">
                        <i className="fa-solid fa-shield-heart"></i>
                    </div>
                    <h2 className="text-xl font-black mb-1">100% Verified Profiles</h2>
                    <p className="text-rose-100 text-[10px] mb-4">India's most trusted premium matchmaking service. Find
                        your perfect partner today.</p>
                    <div className="flex gap-2 justify-center">
                        <button className="bg-white text-rose-600 text-[10px] font-black px-4 py-1.5 rounded-full shadow-sm">Complete
                            Profile</button>
                        <button className="bg-rose-800/50 backdrop-blur text-white border border-rose-400/50 text-[10px] font-bold px-4 py-1.5 rounded-full">Upgrade</button>
                    </div>
                </div>
            </div>
        </div>

        {/* CATEGORY GRID */}
        <div className="px-4 mb-5">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Browse Profiles</h3>
            <div className="grid grid-cols-4 gap-3">
                <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-rose-600 text-lg">
                        <i className="fa-solid fa-users"></i></div>
                    <span className="text-[9px] font-bold text-gray-600">Community</span>
                </button>
                <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-pink-600 text-lg">
                        <i className="fa-solid fa-hands-praying"></i></div>
                    <span className="text-[9px] font-bold text-gray-600">Religion</span>
                </button>
                <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-purple-600 text-lg">
                        <i className="fa-solid fa-location-dot"></i></div>
                    <span className="text-[9px] font-bold text-gray-600">City</span>
                </button>
                <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-orange-600 text-lg">
                        <i className="fa-solid fa-crown"></i></div>
                    <span className="text-[9px] font-bold text-gray-600">Premium</span>
                </button>
            </div>
        </div>

        {/* PRIME PLANS SCROLLABLE */}
        <div className="mb-5">
            <div className="px-4 flex justify-between items-end mb-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Prime Plans</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 scrollbar-none flex-nowrap pb-2">
                
                {/* Silver */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-w-[160px] flex-shrink-0 p-4 text-center cursor-pointer hover:shadow-md transition-all" onClick={() => handlePlanClick('Silver')}>
                    <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-2xl mb-2">
                        <i className="fa-solid fa-medal"></i>
                    </div>
                    <h4 className="font-black text-gray-900">Silver</h4>
                    <p className="text-[10px] text-gray-500 mb-2">3 Months Access</p>
                    <div className="text-rose-600 font-black text-sm">₹5,000</div>
                </div>

                {/* Gold */}
                <div className="bg-gradient-to-b from-yellow-50 to-yellow-100 rounded-2xl shadow-md border border-yellow-200 min-w-[160px] flex-shrink-0 p-4 text-center cursor-pointer hover:shadow-lg transition-all relative transform scale-105" onClick={() => handlePlanClick('Gold')}>
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">Popular</div>
                    <div className="w-12 h-12 mx-auto bg-yellow-200 rounded-full flex items-center justify-center text-yellow-600 text-2xl mb-2">
                        <i className="fa-solid fa-crown"></i>
                    </div>
                    <h4 className="font-black text-gray-900">Gold</h4>
                    <p className="text-[10px] text-gray-600 mb-2">6 Months Access</p>
                    <div className="text-rose-600 font-black text-sm">₹10,000</div>
                </div>

                {/* Diamond */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-200 min-w-[160px] flex-shrink-0 p-4 text-center cursor-pointer hover:shadow-md transition-all" onClick={() => handlePlanClick('Diamond')}>
                    <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center text-blue-500 text-2xl mb-2">
                        <i className="fa-regular fa-gem"></i>
                    </div>
                    <h4 className="font-black text-gray-900">Diamond</h4>
                    <p className="text-[10px] text-gray-500 mb-2">12 Months Access</p>
                    <div className="text-rose-600 font-black text-sm">₹25,000</div>
                </div>

            </div>
        </div>

        {/* HORIZONTAL TRACK */}
        <div className="mb-5">
            <div className="px-4 flex justify-between items-end mb-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">New Matches</h3>
                <button onClick={() => {}} className="text-[9px] font-bold text-rose-600">View All</button>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 scrollbar-none flex-nowrap pb-2">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-w-[140px] flex-shrink-0 overflow-hidden cursor-pointer relative">
                    <div className="h-32 bg-gray-200 relative">
                        <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&amp;fit=crop&amp;q=80" alt="Profile" className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-black/80 to-transparent"></div>
                        <span className="absolute bottom-2 left-2 text-white font-black text-[10px]">Aanya S. <i className="fa-solid fa-circle-check text-blue-400 ml-0.5"></i></span>
                    </div>
                    <div className="p-3">
                        <p className="text-[9px] text-gray-500 mb-1">26 Yrs, 5'5"</p>
                        <p className="text-[9px] font-bold text-gray-700 truncate">Software Engineer</p>
                        <p className="text-[9px] text-gray-500 mb-2 truncate">Bangalore</p>
                        <button onClick={() => {}} className="w-full bg-rose-50 text-rose-600 font-bold text-[9px] py-1.5 rounded border border-rose-100 hover:bg-rose-100"><i className="fa-solid fa-comment-dots mr-1"></i> Chat Now</button>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-w-[140px] flex-shrink-0 overflow-hidden cursor-pointer relative">
                    <div className="h-32 bg-gray-200 relative">
                        <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&amp;fit=crop&amp;q=80" alt="Profile" className="w-full h-full object-cover blur-sm" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <i className="fa-solid fa-lock text-white/80 text-xl drop-shadow-md"></i>
                        </div>
                        <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-black/80 to-transparent"></div>
                        <span className="absolute bottom-2 left-2 text-white font-black text-[10px]">Rohan P. <i className="fa-solid fa-circle-check text-blue-400 ml-0.5"></i></span>
                    </div>
                    <div className="p-3">
                        <p className="text-[9px] text-gray-500 mb-1">29 Yrs, 5'11"</p>
                        <p className="text-[9px] font-bold text-gray-700 truncate">Business Analyst</p>
                        <p className="text-[9px] text-gray-500 mb-2 truncate">Mumbai</p>
                        <button className="w-full bg-rose-600 text-white font-bold text-[9px] py-1.5 rounded hover:bg-rose-700">Unlock
                            Photo</button>
                    </div>
                </div>
            </div>
        </div>

        {/* MODAL / FORM UI OVERLAY */}
        {selectedPlan && (
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-0 sm:pb-4 transition-all">
                <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-[slideUp_0.3s_ease-out]">
                    {/* Modal Header */}
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                        <div>
                            <h2 className="text-lg font-black text-gray-900">Upgrade to {selectedPlan}</h2>
                            <p className="text-[10px] text-gray-500">Complete your profile to proceed</p>
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
                                <h3 className="text-xl font-black text-gray-900 mb-2">Application Submitted!</h3>
                                <p className="text-sm text-gray-500 max-w-[250px] mx-auto mb-6">
                                    Your profile is under review. Our matchmaking experts will contact you shortly regarding your {selectedPlan} plan.
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
                                    <input required type="text" placeholder="Enter your name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Age</label>
                                        <input required type="number" placeholder="e.g. 26" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Profession</label>
                                        <input required type="text" placeholder="e.g. Engineer" value={formData.profession} onChange={(e) => setFormData({...formData, profession: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
                                    </div>
                                </div>
                                
                                {/* File Uploads */}
                                <div className="mt-2">
                                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Profile Photo</label>
                                    <div className="relative w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 hover:border-rose-400 transition-all cursor-pointer">
                                        <input required type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'photo')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        <div className="flex flex-col items-center pointer-events-none">
                                            <i className="fa-solid fa-cloud-arrow-up text-2xl text-gray-400 mb-2"></i>
                                            <span className="text-xs font-bold text-gray-600">{formData.photo ? formData.photo.name : 'Upload Photo (JPG, PNG)'}</span>
                                            {!formData.photo && <span className="text-[9px] text-gray-400 mt-0.5">Max size: 5MB</span>}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Govt ID Proof (Aadhaar / Passport)</label>
                                    <div className="relative w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 hover:border-rose-400 transition-all cursor-pointer">
                                        <input required type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'idDocument')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        <div className="flex flex-col items-center pointer-events-none">
                                            <i className="fa-regular fa-id-card text-2xl text-gray-400 mb-2"></i>
                                            <span className="text-xs font-bold text-gray-600">{formData.idDocument ? formData.idDocument.name : 'Upload Document'}</span>
                                            {!formData.idDocument && <span className="text-[9px] text-gray-400 mt-0.5">PDF, JPG, PNG allowed</span>}
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" disabled={isSubmitting} className="mt-4 w-full py-3.5 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 hover:bg-rose-700 active:scale-[0.98] transition-all flex justify-center items-center gap-2">
                                    {isSubmitting ? (
                                        <><i className="fa-solid fa-circle-notch fa-spin"></i> Processing...</>
                                    ) : (
                                        'Submit Application'
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
