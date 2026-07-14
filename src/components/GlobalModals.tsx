"use client";

import React, { useState, useEffect } from 'react';

export default function GlobalModals() {
    const [modal, setModal] = useState<string | null>(null);
    const [modalData, setModalData] = useState<any>(null);
    const [checkoutStep, setCheckoutStep] = useState<'methods' | 'qr' | 'processing'>('methods');

    useEffect(() => {
        const handleOpenModal = (e: any) => {
            if (typeof e.detail === 'string') {
                setModal(e.detail);
                setModalData(null);
                setCheckoutStep('methods');
            } else if (e.detail && typeof e.detail === 'object') {
                setModal(e.detail.type);
                setModalData(e.detail.data);
                setCheckoutStep('methods');
            }
        };
        window.addEventListener('openModal', handleOpenModal);
        return () => window.removeEventListener('openModal', handleOpenModal);
    }, []);

    if (!modal) return null;

    const handleCheckout = () => {
        setCheckoutStep('processing');
        setTimeout(() => {
            setCheckoutStep('methods');
            setModal(null);
            // Dispatch a generic payment success event that the caller can listen to
            window.dispatchEvent(new CustomEvent('paymentSuccess'));
        }, 2000);
    };

    const handleUPISelection = () => {
        setCheckoutStep('qr');
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center">
            <div className="bg-white w-full max-w-md max-h-[80vh] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col animate-[slideUp_0.3s_ease-out]">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 sm:rounded-t-3xl rounded-t-3xl">
                    <h2 className="text-lg font-black text-gray-900">
                        {modal === 'payment' ? 'APEX Wallet' : modal === 'checkout' ? 'Secure Checkout' : 'My Account'}
                    </h2>
                    <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                    {/* CHECKOUT MODAL */}
                    {modal === 'checkout' && (
                        <div className="flex flex-col gap-4">
                            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Amount to Pay</p>
                                <h3 className="text-3xl font-black text-gray-900">{modalData?.amount || '₹ 0.00'}</h3>
                                <p className="text-xs text-gray-600 mt-1">{modalData?.plan || 'Service Payment'}</p>
                            </div>

                            {checkoutStep === 'methods' && (
                                <div className="space-y-3 mt-2 animate-[fadeIn_0.3s_ease-out]">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Payment Method</h4>
                                    
                                    <button onClick={handleUPISelection} className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-violet-500 hover:bg-violet-50 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-violet-200 group-hover:text-violet-700 transition-colors">
                                                <i className="fa-brands fa-google-pay text-xl"></i>
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-gray-900 text-sm">UPI / QR Code</p>
                                                <p className="text-[10px] text-gray-500">Scan via GPay, PhonePe, Paytm</p>
                                            </div>
                                        </div>
                                        <i className="fa-solid fa-chevron-right text-gray-400 group-hover:text-violet-500"></i>
                                    </button>

                                    <button onClick={handleCheckout} className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-violet-500 hover:bg-violet-50 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-violet-200 group-hover:text-violet-700 transition-colors">
                                                <i className="fa-regular fa-credit-card"></i>
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-gray-900 text-sm">Credit / Debit Card</p>
                                                <p className="text-[10px] text-gray-500">Visa, Mastercard, RuPay</p>
                                            </div>
                                        </div>
                                        <i className="fa-solid fa-chevron-right text-gray-400 group-hover:text-violet-500"></i>
                                    </button>

                                    <button onClick={handleCheckout} className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-violet-500 hover:bg-violet-50 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center group-hover:bg-violet-200 group-hover:text-violet-700 transition-colors">
                                                <i className="fa-solid fa-building-columns"></i>
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-gray-900 text-sm">Netbanking</p>
                                                <p className="text-[10px] text-gray-500">All Indian banks supported</p>
                                            </div>
                                        </div>
                                        <i className="fa-solid fa-chevron-right text-gray-400 group-hover:text-violet-500"></i>
                                    </button>
                                </div>
                            )}

                            {checkoutStep === 'qr' && (
                                <div className="mt-2 text-center animate-[fadeIn_0.3s_ease-out]">
                                    <h4 className="text-sm font-black text-gray-900 mb-1">Scan to Pay</h4>
                                    <p className="text-[10px] text-gray-500 mb-4">Use any UPI app to scan and complete the payment.</p>
                                    
                                    <div className="w-48 h-48 mx-auto bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center p-2 mb-6">
                                        <img src="/apex_payment_qr.png" alt="Payment QR Code" className="w-full h-full object-contain rounded-xl" />
                                    </div>

                                    <div className="flex gap-2">
                                        <button onClick={() => setCheckoutStep('methods')} className="w-1/3 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-xl shadow-sm hover:bg-gray-200 transition-all">
                                            Back
                                        </button>
                                        <button onClick={handleCheckout} className="flex-1 py-3.5 bg-violet-600 text-white font-bold rounded-xl shadow-lg shadow-violet-600/30 hover:bg-violet-700 transition-all">
                                            I have paid
                                        </button>
                                    </div>
                                </div>
                            )}

                            {checkoutStep === 'processing' && (
                                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-b-3xl">
                                    <div className="w-12 h-12 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin mb-4"></div>
                                    <h3 className="text-lg font-black text-gray-900">Verifying Payment...</h3>
                                    <p className="text-xs text-gray-500 mt-1">Please do not close this window</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* APEX WALLET MODAL */}
                    {modal === 'payment' && (
                        <div className="flex flex-col gap-4">
                            <div className="bg-gradient-to-br from-violet-600 to-purple-800 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-20">
                                    <i className="fa-solid fa-wallet text-6xl"></i>
                                </div>
                                <p className="text-[10px] text-violet-200 uppercase tracking-wider mb-1">Available Balance</p>
                                <h3 className="text-3xl font-black mb-4">₹ 4,250.00</h3>
                                <div className="flex gap-2">
                                    <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-[10px] font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
                                        <i className="fa-solid fa-plus"></i> Add Money
                                    </button>
                                    <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-[10px] font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
                                        <i className="fa-solid fa-paper-plane"></i> Send
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-sm font-bold text-gray-800 mt-2">Recent Transactions</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center">
                                            <i className="fa-solid fa-bolt"></i>
                                        </div>
                                        <div>
                                            <p className="font-bold text-xs">Electricity Bill</p>
                                            <p className="text-[9px] text-gray-500">Today, 10:45 AM</p>
                                        </div>
                                    </div>
                                    <span className="font-black text-xs text-gray-900">-₹ 1,240</span>
                                </div>
                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-500 flex items-center justify-center">
                                            <i className="fa-solid fa-arrow-down"></i>
                                        </div>
                                        <div>
                                            <p className="font-bold text-xs">Money Added</p>
                                            <p className="text-[9px] text-gray-500">Yesterday</p>
                                        </div>
                                    </div>
                                    <span className="font-black text-xs text-green-600">+₹ 5,000</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* ACCOUNT MODAL */}
                    {modal === 'account' && (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="w-16 h-16 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xl font-black">
                                    RS
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-gray-900">Rohan Sharma</h3>
                                    <p className="text-[10px] text-gray-500">+91 98765 43210</p>
                                    <span className="mt-1 inline-block bg-green-100 text-green-700 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Premium Member</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <button className="flex flex-col items-center justify-center gap-2 bg-white border border-gray-100 shadow-sm p-4 rounded-xl hover:shadow-md transition-all">
                                    <i className="fa-solid fa-box text-violet-500 text-xl"></i>
                                    <span className="text-[10px] font-bold text-gray-700">My Orders</span>
                                </button>
                                <button className="flex flex-col items-center justify-center gap-2 bg-white border border-gray-100 shadow-sm p-4 rounded-xl hover:shadow-md transition-all">
                                    <i className="fa-solid fa-heart text-rose-500 text-xl"></i>
                                    <span className="text-[10px] font-bold text-gray-700">Saved Matches</span>
                                </button>
                                <button className="flex flex-col items-center justify-center gap-2 bg-white border border-gray-100 shadow-sm p-4 rounded-xl hover:shadow-md transition-all">
                                    <i className="fa-solid fa-graduation-cap text-blue-500 text-xl"></i>
                                    <span className="text-[10px] font-bold text-gray-700">My Courses</span>
                                </button>
                                <button className="flex flex-col items-center justify-center gap-2 bg-white border border-gray-100 shadow-sm p-4 rounded-xl hover:shadow-md transition-all">
                                    <i className="fa-solid fa-gear text-gray-500 text-xl"></i>
                                    <span className="text-[10px] font-bold text-gray-700">Settings</span>
                                </button>
                            </div>
                            
                            <button onClick={() => window.location.href='/login'} className="w-full mt-2 py-3 bg-red-50 text-red-600 font-bold text-sm rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                                <i className="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
