"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const [errorMsg, setErrorMsg] = useState('');

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        if (phone.length === 10) {
            setIsLoading(true);
            try {
                await api.post('/auth/send-otp', { phone });
                setStep('otp');
            } catch (err: any) {
                setErrorMsg(err.response?.data?.error || 'Failed to send OTP');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length <= 1 && /^[0-9]*$/.test(value)) {
            const newOtp = [...otp];
            newOtp[index] = value;
            setOtp(newOtp);
            
            // Auto-focus next input
            if (value !== '' && index < 3) {
                const nextInput = document.getElementById(`otp-${index + 1}`);
                nextInput?.focus();
            }
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        const fullOtp = otp.join('');
        if (fullOtp.length === 4) {
            setIsLoading(true);
            try {
                const response = await api.post('/auth/verify-otp', { phone, otp: fullOtp });
                login(response.data.token, response.data.user);
                router.push('/');
            } catch (err: any) {
                setErrorMsg(err.response?.data?.error || 'Invalid OTP');
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
            {/* Background elements */}
            <div className="absolute top-0 w-full h-64 hero-gradient rounded-b-[40px] shadow-sm pointer-events-none"></div>

            <div className="w-full max-w-sm z-10 bg-white rounded-3xl shadow-xl p-8 animate-[slideUp_0.4s_ease-out]">
                {/* Logo & Brand */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-[#F4F6FB] rounded-2xl mx-auto flex items-center justify-center text-[#6C3FC5] text-3xl font-black mb-4 shadow-sm border border-gray-100">
                        A
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Welcome to APEX</h1>
                    <p className="text-xs text-gray-500 mt-2 font-medium">Your Life. Simplified.</p>
                </div>

                {step === 'phone' ? (
                    <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-5 animate-[slideUp_0.3s_ease-out]">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Mobile Number</label>
                            <div className="relative flex items-center">
                                <span className="absolute left-4 text-gray-500 font-bold text-sm">+91</span>
                                <input 
                                    type="tel" 
                                    maxLength={10}
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="Enter 10-digit number"
                                    className="w-full bg-[#F4F6FB] border-0 rounded-xl py-3.5 pl-14 pr-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6C3FC5]/30 transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {errorMsg && <p className="text-red-500 text-[10px] font-bold text-center">{errorMsg}</p>}

                        <button 
                            type="submit" 
                            disabled={phone.length !== 10 || isLoading}
                            className="w-full bg-[#6C3FC5] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-500/20 hover:bg-[#5a34a8] disabled:opacity-50 disabled:shadow-none transition-all flex justify-center items-center gap-2 mt-2"
                        >
                            {isLoading ? (
                                <><i className="fa-solid fa-circle-notch fa-spin"></i> Sending OTP...</>
                            ) : (
                                'Get OTP'
                            )}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleOtpSubmit} className="flex flex-col gap-6 animate-[slideUp_0.3s_ease-out]">
                        <div className="text-center">
                            <h2 className="text-lg font-black text-gray-900 mb-1">Verify Mobile</h2>
                            <p className="text-xs text-gray-500">OTP sent to +91 {phone}</p>
                        </div>
                        
                        <div className="flex justify-center gap-3">
                            {otp.map((digit, idx) => (
                                <input
                                    key={idx}
                                    id={`otp-${idx}`}
                                    type="tel"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                                    className="w-12 h-14 bg-[#F4F6FB] border-0 rounded-xl text-center text-xl font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6C3FC5]/30 transition-all"
                                    required
                                />
                            ))}
                        </div>

                        {errorMsg && <p className="text-red-500 text-[10px] font-bold text-center mt-2">{errorMsg}</p>}

                        <div className="flex flex-col gap-3 mt-4">
                            <button 
                                type="submit" 
                                disabled={otp.join('').length !== 4 || isLoading}
                                className="w-full bg-[#6C3FC5] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-500/20 hover:bg-[#5a34a8] disabled:opacity-50 disabled:shadow-none transition-all flex justify-center items-center gap-2"
                            >
                                {isLoading ? (
                                    <><i className="fa-solid fa-circle-notch fa-spin"></i> Verifying...</>
                                ) : (
                                    'Verify & Login'
                                )}
                            </button>
                            <button type="button" onClick={() => setStep('phone')} className="text-xs font-bold text-gray-500 hover:text-[#6C3FC5]">
                                Change Number
                            </button>
                        </div>
                    </form>
                )}

                <div className="mt-8 text-center">
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Secure Login</p>
                </div>
            </div>

            <div className="mt-8 text-center z-10">
                <Link href="/admin-login" className="text-xs font-bold text-gray-500 bg-white/50 px-4 py-2 rounded-full hover:bg-white transition-colors flex items-center justify-center gap-2 border border-gray-200 shadow-sm">
                    <i className="fa-solid fa-shield-halved text-[#6C3FC5]"></i> Admin Portal
                </Link>
            </div>
        </div>
    );
}
