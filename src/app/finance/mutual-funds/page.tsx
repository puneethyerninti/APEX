"use client";
import React, { useState } from 'react';
import Link from 'next/link';

export default function MutualFundsPage() {
    const [selectedFund, setSelectedFund] = useState<number | null>(null);

    const dummyFunds = [
        { id: 1, name: "SBI Small Cap Fund", return: "24.5%", risk: "High Risk" },
        { id: 2, name: "SBI Bluechip Fund", return: "18.2%", risk: "Low Risk" },
        { id: 3, name: "SBI Flexi Cap Fund", return: "21.1%", risk: "Moderate Risk" },
        { id: 4, name: "SBI Magnum Midcap", return: "26.8%", risk: "High Risk" },
        { id: 5, name: "SBI Focused Equity", return: "19.5%", risk: "High Risk" },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* HEADER */}
            <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/finance" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                        <i className="fa-solid fa-arrow-left"></i>
                    </Link>
                    <h1 className="font-black text-lg text-gray-900">Mutual Funds</h1>
                </div>
            </div>

            {/* HERO / OVERVIEW */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white">
                <div className="mb-4">
                    <h3 className="text-white/80 text-[10px] font-bold mb-2 uppercase tracking-wider">Investment Categories</h3>
                    <div className="grid grid-cols-4 gap-2">
                        <div className="flex flex-col items-center text-center gap-1.5 cursor-pointer hover:scale-105 transition-transform">
                            <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-rose-400 shadow-inner">
                                <i className="fa-solid fa-calendar-day text-lg"></i>
                            </div>
                            <span className="text-white text-[8px] font-medium leading-tight">Daily SIP<br/>₹100</span>
                        </div>
                        <div className="flex flex-col items-center text-center gap-1.5 cursor-pointer hover:scale-105 transition-transform">
                            <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-blue-400 shadow-inner">
                                <i className="fa-solid fa-calendar-days text-lg"></i>
                            </div>
                            <span className="text-white text-[8px] font-medium leading-tight">Monthly SIP<br/>₹2,000</span>
                        </div>
                        <div className="flex flex-col items-center text-center gap-1.5 cursor-pointer hover:scale-105 transition-transform">
                            <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-orange-400 shadow-inner">
                                <i className="fa-solid fa-piggy-bank text-lg"></i>
                            </div>
                            <span className="text-white text-[8px] font-medium leading-tight">Small SIP<br/>₹50</span>
                        </div>
                        <div className="flex flex-col items-center text-center gap-1.5 cursor-pointer hover:scale-105 transition-transform">
                            <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-emerald-400 shadow-inner">
                                <i className="fa-solid fa-arrow-trend-up text-lg"></i>
                            </div>
                            <span className="text-white text-[8px] font-medium leading-tight">Popular<br/>Funds</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* POPULAR FUNDS LIST */}
            <div className="p-4 mt-2">
                <h2 className="font-black text-gray-900 mb-3 uppercase tracking-wide text-sm border-l-4 border-emerald-500 pl-2">Top 5 Popular Funds</h2>
                <div className="flex flex-col gap-3">
                    {dummyFunds.map((fund) => (
                        <div 
                            key={fund.id} 
                            onClick={() => setSelectedFund(fund.id)}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:border-emerald-200 transition-all active:scale-95"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                    <i className="fa-solid fa-chart-line"></i>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-sm">{fund.name}</h3>
                                    <span className="text-xs text-gray-400">{fund.risk}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-emerald-600 text-sm">{fund.return}</p>
                                <p className="text-[9px] text-gray-400 uppercase">3Y Return</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SBI MODAL */}
            {selectedFund !== null && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity" onClick={() => setSelectedFund(null)}>
                    <div 
                        className="bg-white w-full max-w-sm rounded-2xl p-6 flex flex-col items-center text-center shadow-2xl transform scale-100 transition-transform"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-black text-gray-900 mb-2">Proceed to Partner</h2>
                        <p className="text-sm text-gray-500 mb-6">You will be securely redirected to our partner platform to complete your investment.</p>
                        
                        <a 
                            href="https://sbimf.app/2DC34DWG4h7P" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block p-4 rounded-xl border-2 border-blue-100 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group w-full mb-4"
                            onClick={() => setSelectedFund(null)}
                        >
                            <img 
                                src="/SBI-Mutual-Fund-Logo.webp" 
                                alt="SBI Mutual Fund" 
                                className="h-16 mx-auto object-contain group-hover:scale-110 transition-transform" 
                            />
                        </a>
                        
                        <button 
                            onClick={() => setSelectedFund(null)}
                            className="text-gray-400 text-sm font-bold hover:text-gray-600 uppercase tracking-wider"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
