"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase.config';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

export default function AdminLoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']); // Firebase OTP is 6 digits
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [resendTimer, setResendTimer] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    useEffect(() => {
        // Initialize RecaptchaVerifier
        if (!(window as any).recaptchaVerifier) {
            const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                size: 'invisible',
            });
            (window as any).recaptchaVerifier = verifier;
            verifier.render(); // Pre-warm recaptcha
        }
    }, []);

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        if (phone.length === 10) {
            setIsLoading(true);
            try {
                const phoneNumber = `+91${phone}`;
                const appVerifier = (window as any).recaptchaVerifier;
                const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
                setConfirmationResult(confirmation);
                setStep('otp');
                setResendTimer(30);
            } catch (err: any) {
                console.error("SMS Error:", err);
                setErrorMsg(err.message || 'Failed to send OTP. Try again.');
                // Reset recaptcha if error
                if ((window as any).recaptchaVerifier) {
                    (window as any).recaptchaVerifier.render().then((widgetId: any) => {
                        (window as any).grecaptcha.reset(widgetId);
                    });
                }
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
            if (value !== '' && index < 5) {
                const nextInput = document.getElementById(`otp-${index + 1}`);
                nextInput?.focus();
            }
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        } else if (e.key === 'ArrowLeft' && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
            setTimeout(() => (prevInput as HTMLInputElement)?.setSelectionRange(1, 1), 0);
        } else if (e.key === 'ArrowRight' && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
            setTimeout(() => (nextInput as HTMLInputElement)?.setSelectionRange(1, 1), 0);
        }
    };

    const handleResendOtp = async () => {
        if (resendTimer > 0 || phone.length !== 10) return;
        setIsLoading(true);
        setErrorMsg('');
        try {
            const phoneNumber = `+91${phone}`;
            const appVerifier = (window as any).recaptchaVerifier;
            const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
            setConfirmationResult(confirmation);
            setResendTimer(30);
        } catch (err: any) {
            console.error("Resend SMS Error:", err);
            setErrorMsg(err.message || 'Failed to resend OTP.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        const fullOtp = otp.join('');
        if (fullOtp.length === 6 && confirmationResult) {
            setIsLoading(true);
            try {
                await confirmationResult.confirm(fullOtp);
                // AuthContext will automatically catch this and redirect to '/'
            } catch (err: any) {
                console.error("OTP Error:", err);
                setErrorMsg(err.message || 'Invalid OTP. Please try again.');
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 relative">
            <div id="recaptcha-container"></div>
            {/* Background elements */}
            <div className="absolute top-0 w-full h-64 hero-gradient rounded-b-[40px] shadow-sm pointer-events-none"></div>

            <div className="w-full max-w-sm z-10 bg-white rounded-3xl shadow-xl p-6 sm:p-8 animate-[slideUp_0.4s_ease-out]">
                {/* Logo & Brand */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-[#F4F6FB] rounded-2xl mx-auto flex items-center justify-center text-[#6C3FC5] text-3xl font-black mb-4 shadow-sm border border-gray-100 overflow-hidden">
                        <img src="/icon.jpeg" alt="APEX Logo" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">APEX Admin Portal</h1>
                    <p className="text-xs text-gray-500 mt-2 font-medium">Secure Access Only.</p>
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
                        
                        <div className="flex justify-center gap-1.5 sm:gap-2">
                            {otp.map((digit, idx) => (
                                <input
                                    key={idx}
                                    id={`otp-${idx}`}
                                    type="tel"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                    className="w-[2.3rem] h-11 sm:w-10 sm:h-12 shrink-0 bg-gray-50 border border-gray-300 rounded-xl text-center text-lg font-black text-gray-900 focus:outline-none focus:border-[#6C3FC5] focus:ring-1 focus:ring-[#6C3FC5] transition-all px-0"
                                    required
                                />
                            ))}
                        </div>

                        {errorMsg && <p className="text-red-500 text-[10px] font-bold text-center mt-2">{errorMsg}</p>}

                        <div className="flex flex-col gap-3 mt-4">
                            <button 
                                type="submit" 
                                disabled={otp.join('').length !== 6 || isLoading}
                                className="w-full bg-[#6C3FC5] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-500/20 hover:bg-[#5a34a8] disabled:opacity-50 disabled:shadow-none transition-all flex justify-center items-center gap-2"
                            >
                                {isLoading ? (
                                    <><i className="fa-solid fa-circle-notch fa-spin"></i> Verifying...</>
                                ) : (
                                    'Verify & Login'
                                )}
                            </button>
                            
                            <div className="flex items-center justify-between mt-1 px-1">
                                <button type="button" onClick={() => setStep('phone')} className="text-xs font-bold text-gray-500 hover:text-[#6C3FC5]">
                                    Change Number
                                </button>
                                {resendTimer > 0 ? (
                                    <span className="text-xs font-medium text-gray-400">Resend in {resendTimer}s</span>
                                ) : (
                                    <button type="button" onClick={handleResendOtp} disabled={isLoading} className="text-xs font-bold text-[#6C3FC5] hover:underline disabled:opacity-50">
                                        Resend OTP
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                )}

                <div className="mt-8 text-center">
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Secure Firebase Login</p>
                </div>
            </div>

            <div className="mt-8 text-center z-10">
                <Link href="/" className="text-xs font-bold text-gray-500 bg-white/50 px-4 py-2 rounded-full hover:bg-white transition-colors flex items-center justify-center gap-2 border border-gray-200 shadow-sm">
                    <i className="fa-solid fa-arrow-left text-[#6C3FC5]"></i> Back to User App
                </Link>
            </div>
        </div>
    );
}
