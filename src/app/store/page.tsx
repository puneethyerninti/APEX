
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
            <h1 className="font-black text-lg text-gray-900">APEX Store</h1>
        </div>
        <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center relative">
                <i className="fa-solid fa-cart-shopping"></i>
                <span id="cart-badge" className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white text-[6px] text-white flex items-center justify-center font-bold">0</span>
            </button>
        </div>
    </div>

    {/* HERO PROMO CAROUSEL */}
    <div className="p-4">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex items-center justify-between">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10 w-2/3">
                <p className="text-amber-100 text-[9px] font-bold uppercase tracking-widest mb-1">Big Billion Sale</p>
                <h2 className="text-2xl font-black leading-tight mb-2">Up to 80% Off</h2>
                <button className="bg-white text-orange-600 text-[10px] font-black px-4 py-1.5 rounded-full shadow-sm">Shop Now</button>
            </div>
            <div className="relative z-10 w-1/3 flex justify-end">
                <i className="fa-solid fa-gift text-5xl text-white/90 drop-shadow-md"></i>
            </div>
        </div>
    </div>

    {/* STORE SEARCH */}
    <div className="px-4 mb-5">
        <div className="relative">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input type="text" onChange={() => {}} placeholder="Search for products, brands..." className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-sm" />
        </div>
    </div>

    {/* CATEGORY GRID */}
    <div className="px-4 mb-5">
        <div className="grid grid-cols-4 gap-3">
            <button onClick={() => {}} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-full bg-blue-100 shadow-sm flex items-center justify-center text-blue-600 text-lg"><i className="fa-solid fa-mobile-screen"></i></div>
                <span className="text-[9px] font-bold text-gray-600">Mobiles</span>
            </button>
            <button onClick={() => {}} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-full bg-pink-100 shadow-sm flex items-center justify-center text-pink-600 text-lg"><i className="fa-solid fa-shirt"></i></div>
                <span className="text-[9px] font-bold text-gray-600">Fashion</span>
            </button>
            <button onClick={() => {}} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-full bg-emerald-100 shadow-sm flex items-center justify-center text-emerald-600 text-lg"><i className="fa-solid fa-couch"></i></div>
                <span className="text-[9px] font-bold text-gray-600">Home</span>
            </button>
            <button onClick={() => {}} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-full bg-amber-100 shadow-sm flex items-center justify-center text-amber-600 text-lg"><i className="fa-solid fa-basket-shopping"></i></div>
                <span className="text-[9px] font-bold text-gray-600">Grocery</span>
            </button>
        </div>
    </div>

    {/* HORIZONTAL TRACK */}
    <div className="mb-5">
        <div className="px-4 flex justify-between items-end mb-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Deals of the Day</h3>
            <Link href="#" className="text-[9px] font-bold text-amber-600">View All</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 scrollbar-none flex-nowrap pb-2">
            <div className="product-card bg-white rounded-xl p-3 shadow-sm border border-gray-100 w-[140px] flex-shrink-0 cursor-pointer" data-category="electronics mobiles sony headphones audio">
                <div className="h-24 w-full flex items-center justify-center mb-2">
                    <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&amp;fit=crop&amp;q=80" alt="Product" className="h-full object-contain rounded" />
                </div>
                <h4 className="font-bold text-[10px] text-gray-900 truncate mb-1">Sony WH-1000XM4</h4>
                <div className="flex items-end gap-1.5 mb-2">
                    <span className="text-gray-900 font-black text-sm">₹24,990</span>
                    <span className="text-[8px] text-gray-400 line-through">₹29,990</span>
                </div>
                <button onClick={() => {}} className="w-full bg-amber-100 text-amber-700 font-bold text-[9px] py-1.5 rounded-lg hover:bg-amber-200 transition-colors">Add to Cart</button>
            </div>
            <div className="product-card bg-white rounded-xl p-3 shadow-sm border border-gray-100 w-[140px] flex-shrink-0 cursor-pointer" data-category="fashion nike shoes sneakers footwear">
                <div className="h-24 w-full flex items-center justify-center mb-2">
                    <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&amp;fit=crop&amp;q=80" alt="Product" className="h-full object-contain rounded" />
                </div>
                <h4 className="font-bold text-[10px] text-gray-900 truncate mb-1">Nike Air Max</h4>
                <div className="flex items-end gap-1.5 mb-2">
                    <span className="text-gray-900 font-black text-sm">₹8,495</span>
                    <span className="text-[8px] text-gray-400 line-through">₹12,995</span>
                </div>
                <button onClick={() => {}} className="w-full bg-amber-100 text-amber-700 font-bold text-[9px] py-1.5 rounded-lg hover:bg-amber-200 transition-colors">Add to Cart</button>
            </div>
        </div>
    </div>


    </>
  );
}
