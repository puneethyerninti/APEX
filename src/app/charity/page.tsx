"use client";
import React, { useState } from 'react';
import Link from 'next/link';

export default function Page() {
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const openDonation = (campaign: string) => {
    setSelectedCampaign(campaign);
    setIsSuccess(false);
  };

  const closeForm = () => {
    setSelectedCampaign(null);
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
            <h1 className="font-black text-lg text-gray-900">APEX Foundation</h1>
        </div>
        <button className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
            <i className="fa-solid fa-share-nodes"></i>
        </button>
    </div>

    {/* HERO DASHBOARD */}
    <div className="p-4">
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden text-center">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10">
                <p className="text-orange-100 text-[10px] font-bold uppercase tracking-widest mb-2">APEX Community Impact</p>
                <h2 className="text-4xl font-black mb-1">2.4M+</h2>
                <p className="text-[11px] font-bold text-white mb-4">Lives touched this year.</p>
                <p className="text-[9px] text-orange-100 px-4">100% of your donations go directly to the causes you care about. We cover all platform fees.</p>
            </div>
        </div>
    </div>

    {/* CATEGORY GRID */}
    <div className="px-4 mb-5">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Support a Cause</h3>
        <div className="grid grid-cols-4 gap-3">
            <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-blue-500 text-lg"><i className="fa-solid fa-book-open"></i></div>
                <span className="text-[9px] font-bold text-gray-600">Education</span>
            </button>
            <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-rose-500 text-lg"><i className="fa-solid fa-notes-medical"></i></div>
                <span className="text-[9px] font-bold text-gray-600">Healthcare</span>
            </button>
            <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-green-500 text-lg"><i className="fa-solid fa-tree"></i></div>
                <span className="text-[9px] font-bold text-gray-600">Environment</span>
            </button>
            <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-orange-500 text-lg"><i className="fa-solid fa-bowl-food"></i></div>
                <span className="text-[9px] font-bold text-gray-600">Hunger</span>
            </button>
        </div>
    </div>

    {/* DONATE NOW SECTION */}
    <div className="px-4 mb-8">
        <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-50 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-red-50 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-xl mx-auto mb-3 shadow-sm">
                    <i className="fa-solid fa-hand-holding-heart"></i>
                </div>
                <h3 className="font-black text-xl text-gray-900 mb-1">Donate Now</h3>
                <p className="text-[10px] font-bold text-gray-500 mb-5">Scan this QR code with any UPI app to donate.</p>
                
                <div className="inline-block p-3 bg-white border-2 border-dashed border-gray-300 rounded-2xl mb-4 shadow-sm cursor-pointer hover:border-orange-400 transition-colors" onClick={() => openDonation('APEX Foundation General Fund')}>
                    <img src="apex_payment_qr.png" alt="Donate QR Code" className="w-48 h-48 object-contain rounded-xl" />
                </div>
                
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-2">APEX Foundation Trust</p>
                <p className="text-[8px] text-gray-400 mt-1">100% Tax Deductible under Section 80G</p>
                
                <button onClick={() => openDonation('APEX Foundation General Fund')} className="mt-4 w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-500/30">Donate Instantly</button>
            </div>
        </div>
    </div>

    {/* HORIZONTAL TRACK */}
    <div className="mb-5">
        <div className="px-4 flex justify-between items-end mb-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Urgent Campaigns</h3>
            <Link href="#" className="text-[9px] font-bold text-orange-600">View All</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 scrollbar-none flex-nowrap pb-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 w-[220px] flex-shrink-0 overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDonation('Help Build a Rural School')}>
                <div className="h-28 bg-gray-200 relative">
                    <img src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&amp;fit=crop&amp;q=80" alt="Charity" className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow">Urgent</span>
                </div>
                <div className="p-3">
                    <h4 className="font-black text-xs text-gray-900 truncate mb-1">Help Build a Rural School</h4>
                    <p className="text-[9px] text-gray-500 mb-3 truncate">APEX Education Initiative</p>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                        <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: "75%" }}></div>
                    </div>
                    <div className="flex items-end justify-between">
                        <span className="text-gray-900 font-bold text-[10px]">₹7.5L <span className="font-normal text-gray-400">raised</span></span>
                        <span className="text-[9px] text-gray-400 font-bold">75%</span>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 w-[220px] flex-shrink-0 overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDonation('Assam Flood Relief Fund')}>
                <div className="h-28 bg-gray-200 relative">
                    <img src="https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&amp;fit=crop&amp;q=80" alt="Charity" className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                    <h4 className="font-black text-xs text-gray-900 truncate mb-1">Assam Flood Relief Fund</h4>
                    <p className="text-[9px] text-gray-500 mb-3 truncate">Disaster Management Team</p>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                        <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: "40%" }}></div>
                    </div>
                    <div className="flex items-end justify-between">
                        <span className="text-gray-900 font-bold text-[10px]">₹4.0L <span className="font-normal text-gray-400">raised</span></span>
                        <span className="text-[9px] text-gray-400 font-bold">40%</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    {/* MODAL / FORM UI OVERLAY */}
    {selectedCampaign && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-0 sm:pb-4 transition-all">
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-[slideUp_0.3s_ease-out]">
                {/* Modal Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-lg font-black text-gray-900">Make a Donation</h2>
                        <p className="text-[10px] text-gray-500 truncate max-w-[200px]">{selectedCampaign}</p>
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
                                <i className="fa-solid fa-heart"></i>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">Thank You!</h3>
                            <p className="text-sm text-gray-500 max-w-[250px] mx-auto mb-6">
                                Your generous donation of ₹{amount} to &apos;{selectedCampaign}&apos; was successful. A receipt has been sent to your email.
                            </p>
                            <button onClick={closeForm} className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl shadow-md">
                                Done
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-6">
                            {/* Inputs */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">Donation Amount (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                    <input required type="number" placeholder="1000" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-lg font-black focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" />
                                </div>
                                <div className="flex gap-2 mt-2">
                                    {['500', '1000', '2000', '5000'].map(val => (
                                        <button key={val} type="button" onClick={() => setAmount(val)} className="flex-1 bg-orange-50 text-orange-600 border border-orange-100 font-bold text-xs py-1.5 rounded-md hover:bg-orange-100 transition-colors">
                                            ₹{val}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">Full Name (For 80G Receipt)</label>
                                <input required type="text" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" />
                            </div>
                            
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">Message (Optional)</label>
                                <textarea placeholder="Leave a message of support..." value={message} onChange={(e) => setMessage(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none h-20" />
                            </div>

                            <button type="submit" disabled={isSubmitting} className="mt-4 w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 hover:opacity-90 active:scale-[0.98] transition-all flex justify-center items-center gap-2">
                                {isSubmitting ? (
                                    <><i className="fa-solid fa-circle-notch fa-spin"></i> Processing...</>
                                ) : (
                                    <>Donate ₹{amount || '0'} Securely</>
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
