"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';

export default function PaymentPage() {
    const user = useAppStore((state) => state.user);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    
    // QR Scanner State
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const scannerRef = useRef<any>(null);

    const handleOnlinePayment = async (overrideAmount?: number) => {
        const finalAmount = overrideAmount || Number(amount);
        if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
            window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Please enter a valid amount', type: 'warning' } }));
            return;
        }

        if (!user?.uid) {
            window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Please login to continue', type: 'error' } }));
            return;
        }

        setLoading(true);
        
        try {
            await api.post('/finance/razorpay/record-mock', {
                amount: finalAmount,
                userId: user.uid,
                category: scanResult ? 'qr_payment' : 'wallet_recharge',
                serviceName: scanResult ? 'Scan & Pay' : 'Wallet Top-up'
            });
            
            window.location.href = `https://razorpay.me/@apextradingcompany`;
            
        } catch (error: any) {
            console.error("Payment error:", error);
            window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Failed to initiate payment', type: 'error' } }));
            setLoading(false);
        }
    };

    const startScanner = async () => {
        setIsScannerOpen(true);
        setScanResult(null);
        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            await html5QrCode.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText) => {
                    // Success callback
                    setScanResult(decodedText);
                    stopScanner(html5QrCode);
                },
                (errorMessage) => {
                    // Ignore errors (happens constantly while scanning)
                }
            );
        } catch (err) {
            console.error(err);
            window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Failed to access camera', type: 'error' } }));
            setIsScannerOpen(false);
        }
    };

    const stopScanner = async (instance?: any) => {
        const qrCode = instance || scannerRef.current;
        if (qrCode) {
            try {
                await qrCode.stop();
                qrCode.clear();
            } catch (err) {
                console.error("Failed to stop scanner", err);
            }
        }
        if (!scanResult) {
            setIsScannerOpen(false);
        }
    };

    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />
            <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
                <Link href="/" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                    <i className="fa-solid fa-arrow-left"></i>
                </Link>
                <h1 className="font-black text-lg text-gray-900">Secure Payments</h1>
                <div className="w-8"></div>
            </div>

            <div className="flex-1 p-4 max-w-md mx-auto w-full">
                
                {/* NEW: Camera Scan & Pay Button */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5 animate-[fadeIn_0.3s_ease-out]">
                    <div className="text-center mb-4">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                            <i className="fa-solid fa-qrcode"></i>
                        </div>
                        <h2 className="text-xl font-black text-gray-900">Scan any QR Code</h2>
                        <p className="text-xs text-gray-500 mt-1">Pay merchants directly by scanning their UPI QR codes using your device camera.</p>
                    </div>
                    
                    <button 
                        onClick={startScanner}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
                    >
                        <i className="fa-solid fa-camera"></i> Open Scanner
                    </button>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">
                    <span className="w-8 h-[1px] bg-gray-200"></span> OR <span className="w-8 h-[1px] bg-gray-200"></span>
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
                            onClick={() => handleOnlinePayment()} 
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

            {/* FULL SCREEN SCANNER MODAL */}
            {isScannerOpen && (
                <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-[fadeIn_0.2s_ease-out]">
                    <div className="p-4 flex justify-between items-center bg-black/50 absolute top-0 w-full z-10">
                        <button onClick={() => stopScanner()} className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-md">
                            <i className="fa-solid fa-xmark text-xl"></i>
                        </button>
                        <h2 className="text-white font-bold tracking-widest text-sm uppercase">Scan QR Code</h2>
                        <div className="w-10"></div>
                    </div>

                    {!scanResult ? (
                        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
                            {/* The DOM element html5-qrcode attaches to */}
                            <div id="reader" className="w-full h-full max-w-full"></div>
                        </div>
                    ) : (
                        <div className="flex-1 bg-white p-6 flex flex-col items-center justify-center animate-[slideUp_0.3s_ease-out] rounded-t-3xl mt-16">
                            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center text-3xl mb-4">
                                <i className="fa-solid fa-check"></i>
                            </div>
                            <h2 className="text-xl font-black text-gray-900 mb-2">QR Scanned!</h2>
                            <p className="text-sm text-gray-500 text-center mb-6 break-all max-w-sm px-4">
                                {scanResult.length > 50 ? scanResult.substring(0, 50) + '...' : scanResult}
                            </p>

                            <div className="w-full max-w-xs relative mb-6">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-500 text-xl">₹</span>
                                <input 
                                    type="number" 
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Amount" 
                                    className="w-full pl-9 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-2xl focus:outline-none focus:border-green-500 transition-all text-center"
                                />
                            </div>

                            <button 
                                onClick={() => handleOnlinePayment(Number(amount))} 
                                disabled={loading || !amount}
                                className={`w-full max-w-xs py-4 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${loading || !amount ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-green-600 hover:bg-green-700 shadow-green-600/30'}`}
                            >
                                {loading ? 'Processing...' : 'Pay Now'}
                            </button>
                            
                            <button onClick={() => { setIsScannerOpen(false); setScanResult(null); }} className="mt-4 text-gray-400 font-bold text-sm hover:text-gray-600">
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
