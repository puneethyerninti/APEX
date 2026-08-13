"use client";
import React, { useState } from 'react';

export default function PanCardServices() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [serviceType, setServiceType] = useState('Apply PAN');
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');

    const handleOpenForm = (type: string) => {
        setServiceType(type);
        setIsFormOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !mobile.trim()) {
            alert('Please enter Name and Mobile Number');
            return;
        }
        if (mobile.length < 10) {
            alert('Please enter a valid Mobile Number');
            return;
        }
        
        try {
            await fetch('http://localhost:5000/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, mobile, serviceType })
            });
        } catch (error) {
            console.error('Failed to post lead', error);
        }

        const message = `Hi APEX, I am interested in ${serviceType}.\nName: ${name}\nMobile: ${mobile}`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/919494273763?text=${encodedMessage}`;
        
        // Open WhatsApp in a new tab/window
        window.open(whatsappUrl, '_blank');
        
        // Redirect the current window to Religare
        window.location.href = 'https://religaredigital.in/pan-service/';
        
        setIsFormOpen(false);
        setName('');
        setMobile('');
    };

    return (
        <div className="mt-4 mb-2 w-full min-w-0 max-w-full">
            <div className="border border-dashed border-yellow-500/50 rounded-xl p-3 relative bg-gray-900/30">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                        <span className="bg-yellow-400 text-gray-900 font-black text-[6px] px-1.5 py-0.5 rounded-sm tracking-wide">NEW</span>
                        <h3 className="text-white text-[10px] font-bold uppercase tracking-wider">PAN Card Services</h3>
                    </div>
                    <span className="text-white/70 text-[8px] font-medium flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
                        View All <i className="fa-solid fa-arrow-right text-[7px]"></i>
                    </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    {/* Apply PAN */}
                    <div onClick={() => handleOpenForm('Apply PAN')} className="flex items-center gap-2 p-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                            <i className="fa-solid fa-id-card text-sm"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-white text-[9px] font-bold truncate">Apply PAN</h4>
                            <p className="text-white/50 text-[6px] truncate">Apply for a new PAN card</p>
                        </div>
                    </div>
                    
                    {/* PAN Correction */}
                    <div onClick={() => handleOpenForm('PAN Correction')} className="flex items-center gap-2 p-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                        <div className="w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 shrink-0">
                            <i className="fa-solid fa-file-pen text-sm"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-white text-[9px] font-bold truncate">PAN Correction</h4>
                            <p className="text-white/50 text-[6px] truncate">Update / Correct PAN details</p>
                        </div>
                    </div>
                </div>

                {/* Dummy PAN Card Visual (Image) */}
                <div className="mt-3 relative w-full aspect-[1.58] rounded-lg overflow-hidden border border-blue-300/50 shadow-inner bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                        src="/images/dummy-pan.jpg" 
                        alt="Dummy PAN Card" 
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>

            {/* Modal Form */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-sm p-5 shadow-2xl relative animate-in fade-in zoom-in duration-200">
                        <button 
                            onClick={() => setIsFormOpen(false)}
                            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                        >
                            <i className="fa-solid fa-xmark text-lg"></i>
                        </button>
                        
                        <div className="text-center mb-5">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-400">
                                <i className="fa-solid fa-id-card text-xl"></i>
                            </div>
                            <h2 className="text-white text-lg font-bold">PAN Services</h2>
                            <p className="text-white/50 text-xs mt-1">Please enter your details to proceed</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-white/70 text-xs font-medium mb-1">Full Name</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                                        <i className="fa-solid fa-user text-xs"></i>
                                    </div>
                                    <input 
                                        type="text" 
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-9 pr-3 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-white/20"
                                        placeholder="Enter your name"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-white/70 text-xs font-medium mb-1">Mobile Number</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                                        <i className="fa-solid fa-phone text-xs"></i>
                                    </div>
                                    <input 
                                        type="tel" 
                                        required
                                        pattern="[0-9]{10}"
                                        maxLength={10}
                                        value={mobile}
                                        onChange={(e) => setMobile(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-9 pr-3 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-white/20"
                                        placeholder="10-digit mobile number"
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit"
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 mt-2"
                            >
                                Continue <i className="fa-solid fa-arrow-right"></i>
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
