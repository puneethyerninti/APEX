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
          <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col items-start p-4 bg-white rounded-2xl border border-gray-100 shadow-sm gap-3 hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 text-lg"><i className="fa-solid fa-hand-holding-dollar"></i></div>
                      <span className="text-sm font-bold text-gray-800">Loans</span>
                  </div>
                  <ul className="text-xs text-gray-500 space-y-1.5 w-full pl-2 border-l-2 border-rose-100">
                      <li><a href="https://apextradingcompany.banksupport.in/" target="_blank" rel="noopener noreferrer" className="hover:text-rose-600 font-medium block">Personal Loan</a></li>
                      <li><a href="#" className="hover:text-rose-600 font-medium block">Home Loan</a></li>
                      <li><a href="#" className="hover:text-rose-600 font-medium block">Business Loan</a></li>
                  </ul>
              </div>
              
              <div className="flex flex-col items-start p-4 bg-white rounded-2xl border border-gray-100 shadow-sm gap-3 hover:border-blue-200 transition-all col-span-2">
                  <div className="flex items-center gap-2 mb-1">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-lg"><i className="fa-solid fa-umbrella"></i></div>
                      <span className="text-sm font-bold text-gray-800">Insurance</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full">
                      <Link href="/finance/mutual-funds" className="bg-gray-800 rounded-xl p-3 flex flex-col justify-between aspect-square cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mb-2 overflow-hidden p-1">
                              <img src="/bandhan-small-cap-fund-logo.webp" alt="Bandhan" className="object-contain w-full h-full" />
                          </div>
                          <div>
                              <p className="text-white text-[10px] font-bold leading-tight mb-1">Bandhan Small Cap Fund</p>
                              <div className="flex justify-between items-end">
                                  <span className="text-emerald-400 font-bold text-xs">+27.99%</span>
                                  <span className="text-gray-400 text-[9px]">3Y</span>
                              </div>
                          </div>
                      </Link>
                      
                      <Link href="/finance/mutual-funds" className="bg-gray-800 rounded-xl p-3 flex flex-col justify-between aspect-square cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mb-2 overflow-hidden p-1">
                              <img src="/hdfc-mid-cap-fund-logo.png" alt="HDFC" className="object-contain w-full h-full" />
                          </div>
                          <div>
                              <p className="text-white text-[10px] font-bold leading-tight mb-1">HDFC Mid Cap Fund</p>
                              <div className="flex justify-between items-end">
                                  <span className="text-emerald-400 font-bold text-xs">+19.87%</span>
                                  <span className="text-gray-400 text-[9px]">3Y</span>
                              </div>
                          </div>
                      </Link>
                      
                      <Link href="/finance/mutual-funds" className="bg-gray-800 rounded-xl p-3 flex flex-col justify-between aspect-square cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mb-2 overflow-hidden p-1">
                              <img src="/parag-parikh-mutual-fund-logo.png" alt="Parag Parikh" className="object-contain w-full h-full" />
                          </div>
                          <div>
                              <p className="text-white text-[10px] font-bold leading-tight mb-1">Parag Parikh Flexi Cap Fund</p>
                              <div className="flex justify-between items-end">
                                  <span className="text-emerald-400 font-bold text-xs">+14.30%</span>
                                  <span className="text-gray-400 text-[9px]">3Y</span>
                              </div>
                          </div>
                      </Link>
                      
                      <Link href="/finance/mutual-funds" className="bg-gray-800 rounded-xl p-3 flex flex-col justify-between aspect-square cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mb-2 overflow-hidden p-1">
                              <img src="/nippon-india-large-cap-fund-logo.webp" alt="Nippon" className="object-contain w-full h-full" />
                          </div>
                          <div>
                              <p className="text-white text-[10px] font-bold leading-tight mb-1">Nippon India Large Cap Fund</p>
                              <div className="flex justify-between items-end">
                                  <span className="text-emerald-400 font-bold text-xs">+12.82%</span>
                                  <span className="text-gray-400 text-[9px]">3Y</span>
                              </div>
                          </div>
                      </Link>
                  </div>
              </div>
              
              <div className="flex flex-col items-start p-4 bg-white rounded-2xl border border-gray-100 shadow-sm gap-3 hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 text-lg"><i className="fa-solid fa-shield-halved"></i></div>
                      <span className="text-sm font-bold text-gray-800">Insurance</span>
                  </div>
                  <ul className="text-xs text-gray-500 space-y-1.5 w-full pl-2 border-l-2 border-purple-100">
                      <li><a href="#" className="hover:text-purple-600 font-medium block">Health Insurance</a></li>
                      <li><a href="#" className="hover:text-purple-600 font-medium block">Life Insurance</a></li>
                      <li><a href="#" className="hover:text-purple-600 font-medium block">Motor Insurance</a></li>
                      <li><a href="#" className="hover:text-purple-600 font-medium block">Travel Insurance</a></li>
                  </ul>
              </div>
              
              <div className="flex flex-col items-start p-4 bg-white rounded-2xl border border-gray-100 shadow-sm gap-3 hover:border-blue-200 transition-all justify-start">
                  <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-lg"><i className="fa-solid fa-credit-card"></i></div>
                      <span className="text-sm font-bold text-gray-800">Credit Cards</span>
                  </div>
                  <ul className="text-xs text-gray-500 space-y-1.5 w-full pl-2 border-l-2 border-blue-100">
                      <li><a href="https://apextradingcompany.banksupport.in/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 font-medium block">Apply New</a></li>
                      <li><a href="#" className="hover:text-blue-600 font-medium block">Pay Bill</a></li>
                      <li><a href="#" className="hover:text-blue-600 font-medium block">Offers</a></li>
                  </ul>
              </div>
          </div>
      </div>
    </>
  );
}
