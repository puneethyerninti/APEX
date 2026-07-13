
"use client";
import React from 'react';
import Link from 'next/link';

export default function Page() {
  return (
    <>
      
    
    {/* HEADER */}
    <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                <i className="fa-solid fa-arrow-left"></i>
            </Link>
            <h1 className="font-black text-lg text-gray-900">Financial Services</h1>
        </div>
        <button className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <i className="fa-solid fa-bell"></i>
        </button>
    </div>

    {/* HERO DASHBOARD */}
    <div className="p-4">
        <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider mb-1">Total Portfolio Value</p>
            <div className="flex items-end gap-2 mb-3">
                <h2 className="text-3xl font-black tracking-tight">₹12,45,600</h2>
                <span className="text-green-300 text-xs font-bold mb-1 flex items-center gap-1"><i className="fa-solid fa-arrow-trend-up"></i> +4.2%</span>
            </div>
            <div className="flex gap-4 border-t border-white/20 pt-3 mt-1">
                <div>
                    <p className="text-blue-100 text-[9px] uppercase">Invested</p>
                    <p className="font-bold text-sm">₹10,00,000</p>
                </div>
                <div>
                    <p className="text-blue-100 text-[9px] uppercase">Returns</p>
                    <p className="font-bold text-sm text-green-300">₹2,45,600</p>
                </div>
            </div>
        </div>
    </div>

    {/* QUICK ACTIONS GRID */}
    <div className="px-4 mb-5">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Wealth &amp; Planning</h3>
        <div className="grid grid-cols-4 gap-3">
            <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-rose-600 text-lg"><i className="fa-solid fa-hand-holding-dollar"></i></div>
                <span className="text-[9px] font-bold text-gray-600">Loans</span>
            </button>
            <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-emerald-600 text-lg"><i className="fa-solid fa-arrow-trend-up"></i></div>
                <span className="text-[9px] font-bold text-gray-600">Investments</span>
            </button>
            <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-purple-600 text-lg"><i className="fa-solid fa-shield-halved"></i></div>
                <span className="text-[9px] font-bold text-gray-600">Insurance</span>
            </button>
            <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-blue-600 text-lg"><i className="fa-solid fa-credit-card"></i></div>
                <span className="text-[9px] font-bold text-gray-600">Credit Cards</span>
            </button>
        </div>
    </div>

    {/* HORIZONTAL TRACK */}
    <div className="mb-5">
        <div className="px-4 flex justify-between items-end mb-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Trending Assets</h3>
            <Link href="#" className="text-[9px] font-bold text-blue-600">View All</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 scrollbar-none flex-nowrap pb-2">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 min-w-[140px] flex-shrink-0">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded bg-orange-100 text-orange-600 flex items-center justify-center text-[10px]"><i className="fa-brands fa-bitcoin"></i></div>
                    <span className="text-[10px] font-bold text-gray-800">Bitcoin</span>
                </div>
                <p className="font-black text-sm">₹54,30,200</p>
                <p className="text-[9px] font-bold text-green-500 mt-0.5"><i className="fa-solid fa-caret-up"></i> 5.2%</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 min-w-[140px] flex-shrink-0">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]"><i className="fa-solid fa-car"></i></div>
                    <span className="text-[10px] font-bold text-gray-800">Tata Motors</span>
                </div>
                <p className="font-black text-sm">₹984.50</p>
                <p className="text-[9px] font-bold text-green-500 mt-0.5"><i className="fa-solid fa-caret-up"></i> 2.1%</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 min-w-[140px] flex-shrink-0">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded bg-green-100 text-green-600 flex items-center justify-center text-[10px]"><i className="fa-solid fa-leaf"></i></div>
                    <span className="text-[10px] font-bold text-gray-800">APEX Green Fund</span>
                </div>
                <p className="font-black text-sm">NAV ₹145.2</p>
                <p className="text-[9px] font-bold text-red-500 mt-0.5"><i className="fa-solid fa-caret-down"></i> 0.8%</p>
            </div>
        </div>
    </div>

    {/* STICKY BOTTOM ACTION */}
    


    </>
  );
}
