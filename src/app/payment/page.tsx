"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function PaymentPage() {
    const { user } = useAuth();
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const handleOnlinePayment = async () => {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Please enter a valid amount', type: 'warning' } }));
            return;
        }

        setLoading(true);
        
        try {
            // Record mock transaction before redirecting to external razorpay.me link
            if (user?._id) {
                await api.post('/payment/record-mock', {
                    amount: Number(amount),
                    userId: user._id
                });
            }
        } catch (error) {
            console.error("Failed to record mock transaction:", error);
        }

        // Fallback to Razorpay Payment Link without amount parameter as it breaks the page
        window.location.href = `https://razorpay.me/@apextradingcompany`;
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
            <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
                <Link href="/" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                    <i className="fa-solid fa-arrow-left"></i>
                </Link>
                <h1 className="font-black text-lg text-gray-900">Secure Payments</h1>
                <div className="w-8"></div>
            </div>

            <div className="flex-1 p-4 max-w-md mx-auto w-full">
                
                {/* Scan & Pay Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5 animate-[fadeIn_0.3s_ease-out]">
                    <div className="text-center mb-5">
                        <h2 className="text-xl font-black text-gray-900">Scan & Pay</h2>
                        <p className="text-xs text-gray-500 mt-1">Scan this QR code using any UPI app (GPay, PhonePe, Paytm, etc.) to make a direct payment.</p>
                    </div>
                    
                    <a href="https://razorpay.me/@apextradingcompany" className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-4 flex justify-center items-center mb-4 cursor-pointer hover:bg-gray-100 transition-colors">
                        <img src="/apex_payment_qr.png" alt="APEX Trading Company QR Code" className="w-48 h-48 object-contain rounded-xl shadow-sm" />
                    </a>
                    
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        <span className="w-8 h-[1px] bg-gray-200"></span> OR <span className="w-8 h-[1px] bg-gray-200"></span>
                    </div>
                </div>

                {/* Online Payment Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-[fadeIn_0.3s_ease-out] delay-100">
                    <div className="text-center mb-5">
                        <h2 className="text-xl font-black text-gray-900">Pay Online</h2>
                        <p className="text-xs text-gray-500 mt-1">Use our secure Razorpay gateway to pay via Credit Card, Debit Card, Netbanking, or UPI.</p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-500">₹</span>
                            <input 
                                type="number" 
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter Amount" 
                                className="w-full pl-8 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl font-black text-lg focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                            />
                        </div>

                        <button 
                            onClick={handleOnlinePayment} 
                            disabled={loading || !amount}
                            className={`w-full py-4 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${loading || !amount ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-violet-600 hover:bg-violet-700 shadow-violet-600/30'}`}
                        >
                            {loading ? (
                                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Processing...</>
                            ) : (
                                <><i className="fa-solid fa-lock"></i> Secure Pay via Razorpay</>
                            )}
                        </button>
                    </div>
                    
                    <div className="mt-4 flex justify-center items-center gap-2">
                        <i className="fa-brands fa-cc-visa text-gray-400 text-xl"></i>
                        <i className="fa-brands fa-cc-mastercard text-gray-400 text-xl"></i>
                        <i className="fa-solid fa-building-columns text-gray-400 text-lg"></i>
                        <img src="https://cdn.razorpay.com/logo.svg" alt="Razorpay" className="h-4 opacity-50 ml-2" />
                    </div>
                </div>

            </div>
        </div>
    );
}
