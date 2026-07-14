"use client";
import React from 'react';
import Link from 'next/link';

export default function FinancePage() {
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

      {/* SERVICES GRID */}
      <div className="px-4 mb-5">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Our Services</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm gap-2 hover:border-blue-200 hover:shadow-md transition-all">
                  <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 text-xl"><i className="fa-solid fa-hand-holding-dollar"></i></div>
                  <span className="text-xs font-bold text-gray-800">Loans</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm gap-2 hover:border-blue-200 hover:shadow-md transition-all">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-xl"><i className="fa-solid fa-arrow-trend-up"></i></div>
                  <span className="text-xs font-bold text-gray-800">Investment</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm gap-2 hover:border-blue-200 hover:shadow-md transition-all">
                  <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 text-xl"><i className="fa-solid fa-shield-halved"></i></div>
                  <span className="text-xs font-bold text-gray-800">Insurance</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm gap-2 hover:border-blue-200 hover:shadow-md transition-all">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xl"><i className="fa-solid fa-credit-card"></i></div>
                  <span className="text-xs font-bold text-gray-800">Credit Cards</span>
              </button>
          </div>
      </div>
    </>
  );
}
