"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Simulate admin authentication
        setTimeout(() => {
            if (email === 'admin@apex.com' && password === 'admin') {
                router.push('/admin-dashboard');
            } else {
                setIsLoading(false);
                setError('Invalid credentials. Use admin@apex.com / admin');
            }
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-teal-600/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="w-full max-w-sm z-10 animate-[fadeIn_0.5s_ease-out]">
                {/* Logo & Brand */}
                <div className="text-center mb-8">
                    <div className="flex justify-center items-center gap-2 mb-2">
                        <i className="fa-solid fa-shield-halved text-[#6C3FC5] text-3xl"></i>
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">APEX Admin Portal</h1>
                    <p className="text-sm text-gray-400 mt-2">Secure access for authorized personnel</p>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl">
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold p-3 rounded-lg text-center">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Email Address</label>
                            <div className="relative">
                                <i className="fa-solid fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@apex.com"
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-white focus:outline-none focus:border-[#6C3FC5] focus:ring-1 focus:ring-[#6C3FC5] transition-all placeholder:font-normal placeholder:text-gray-600"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Password</label>
                                <Link href="#" className="text-[10px] font-bold text-[#6C3FC5] hover:text-[#5a34a8] transition-colors">Forgot?</Link>
                            </div>
                            <div className="relative">
                                <i className="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-white focus:outline-none focus:border-[#6C3FC5] focus:ring-1 focus:ring-[#6C3FC5] transition-all placeholder:text-gray-600"
                                    required
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading || !email || !password}
                            className="w-full bg-[#6C3FC5] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-500/20 hover:bg-[#5a34a8] disabled:opacity-50 disabled:shadow-none transition-all flex justify-center items-center gap-2 mt-2"
                        >
                            {isLoading ? (
                                <><i className="fa-solid fa-circle-notch fa-spin"></i> Authenticating...</>
                            ) : (
                                'Sign In to Dashboard'
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-6 text-center">
                    <Link href="/login" className="text-xs font-bold text-gray-500 hover:text-gray-300 flex items-center justify-center gap-1.5 transition-colors">
                        <i className="fa-solid fa-arrow-left text-[10px]"></i> Back to User App
                    </Link>
                </div>
            </div>
        </div>
    );
}
