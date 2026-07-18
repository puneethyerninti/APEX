"use client";
import React, { useState } from 'react';
import Link from 'next/link';

export default function KYCPage() {
    const [step, setStep] = useState(1);

    const handleNext = () => {
        if (step < 3) setStep(step + 1);
        else {
            window.dispatchEvent(new CustomEvent('showToast', { detail: 'KYC Submitted Successfully' }));
            setTimeout(() => {
                window.location.href = "/";
            }, 1000);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
                <Link href="/" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                    <i className="fa-solid fa-arrow-left"></i>
                </Link>
                <h1 className="font-black text-lg text-gray-900">KYC Verification</h1>
                <div className="w-8"></div>
            </div>

            <div className="flex-1 p-4 max-w-md mx-auto w-full">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
                    <div className="flex justify-between items-center mb-6 relative">
                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -z-10 -translate-y-1/2 rounded-full"></div>
                        <div className="absolute top-1/2 left-0 h-1 bg-violet-600 -z-10 -translate-y-1/2 rounded-full transition-all duration-300" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>
                        
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 1 ? 'bg-violet-600 text-white shadow-md shadow-violet-200' : 'bg-gray-200 text-gray-500'}`}>1</div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 2 ? 'bg-violet-600 text-white shadow-md shadow-violet-200' : 'bg-gray-200 text-gray-500'}`}>2</div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 3 ? 'bg-violet-600 text-white shadow-md shadow-violet-200' : 'bg-gray-200 text-gray-500'}`}>3</div>
                    </div>

                    {step === 1 && (
                        <div className="animate-[fadeIn_0.3s_ease-out]">
                            <h2 className="text-lg font-black text-gray-900 mb-1">Identity Proof</h2>
                            <p className="text-xs text-gray-500 mb-4">Please upload a valid government ID (Aadhaar/PAN).</p>
                            
                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors mb-4">
                                <div className="w-12 h-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xl mb-3">
                                    <i className="fa-solid fa-id-card"></i>
                                </div>
                                <h3 className="font-bold text-sm text-gray-800">Upload Front Side</h3>
                                <p className="text-[10px] text-gray-500 mt-1">JPEG, PNG up to 5MB</p>
                            </div>

                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors">
                                <div className="w-12 h-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xl mb-3">
                                    <i className="fa-solid fa-id-card"></i>
                                </div>
                                <h3 className="font-bold text-sm text-gray-800">Upload Back Side</h3>
                                <p className="text-[10px] text-gray-500 mt-1">JPEG, PNG up to 5MB</p>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-[fadeIn_0.3s_ease-out]">
                            <h2 className="text-lg font-black text-gray-900 mb-1">Personal Details</h2>
                            <p className="text-xs text-gray-500 mb-4">Ensure details match your ID proof exactly.</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Full Legal Name</label>
                                    <input type="text" placeholder="As per ID Proof" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">ID Number (Aadhaar/PAN)</label>
                                    <input type="text" placeholder="XXXX-XXXX-XXXX" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Date of Birth</label>
                                    <input type="date" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-[fadeIn_0.3s_ease-out]">
                            <h2 className="text-lg font-black text-gray-900 mb-1">Take a Selfie</h2>
                            <p className="text-xs text-gray-500 mb-4">We need a clear photo of your face for verification.</p>
                            
                            <div className="aspect-square bg-gray-100 rounded-2xl border-4 border-gray-200 flex flex-col items-center justify-center relative overflow-hidden mb-4">
                                <div className="absolute inset-4 border-2 border-dashed border-gray-300 rounded-full opacity-50 pointer-events-none"></div>
                                <i className="fa-solid fa-camera text-4xl text-gray-400 mb-3"></i>
                                <span className="font-bold text-sm text-gray-500">Tap to open camera</span>
                            </div>

                            <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex gap-3 items-start">
                                <i className="fa-solid fa-circle-exclamation text-orange-500 mt-0.5"></i>
                                <div>
                                    <h4 className="font-bold text-xs text-orange-800">Selfie Tips</h4>
                                    <ul className="text-[10px] text-orange-700 mt-1 list-disc pl-3">
                                        <li>Ensure good lighting on your face</li>
                                        <li>Remove glasses and hats</li>
                                        <li>Look directly at the camera</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
                        {step > 1 && (
                            <button onClick={() => setStep(step - 1)} className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-200 transition-colors">
                                Back
                            </button>
                        )}
                        <button onClick={handleNext} className="flex-1 py-3 bg-violet-600 text-white font-bold rounded-xl shadow-lg shadow-violet-600/30 hover:bg-violet-700 transition-colors flex items-center justify-center gap-2">
                            {step === 3 ? 'Submit Verification' : 'Next Step'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
