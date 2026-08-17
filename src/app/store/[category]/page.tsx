import React from 'react';
import Link from 'next/link';

export function generateStaticParams() {
    return [
        { category: 'womens' },
        { category: 'cosmetics' },
        { category: 'electronics' },
        { category: 'watches' },
        { category: 'computers' },
        { category: 'gifts' },
        { category: 'courses' },
    ];
}

const categoryDetails: Record<string, { icon: string, gradient: string, color: string }> = {
    'womens': { icon: 'fa-person-dress', gradient: 'from-pink-500 to-rose-600', color: 'text-pink-600' },
    'cosmetics': { icon: 'fa-wand-magic-sparkles', gradient: 'from-rose-500 to-pink-600', color: 'text-rose-600' },
    'electronics': { icon: 'fa-headphones', gradient: 'from-slate-600 to-gray-800', color: 'text-slate-700' },
    'watches': { icon: 'fa-stopwatch', gradient: 'from-emerald-500 to-teal-600', color: 'text-emerald-600' },
    'computers': { icon: 'fa-laptop', gradient: 'from-purple-500 to-indigo-600', color: 'text-purple-600' },
    'gifts': { icon: 'fa-gift', gradient: 'from-amber-500 to-orange-500', color: 'text-amber-600' },
    'courses': { icon: 'fa-graduation-cap', gradient: 'from-indigo-500 to-blue-600', color: 'text-indigo-600' }
};

export default function CategoryPage({ params }: { params: { category: string } }) {
    const categoryKey = params.category;
    
    const formattedCategory = categoryKey 
        ? categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1).replace('-', ' ') 
        : 'Category';

    const details = categoryDetails[categoryKey] || { icon: 'fa-store', gradient: 'from-gray-700 to-gray-900', color: 'text-gray-800' };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* HEADER */}
            <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <Link href="/" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                        <i className="fa-solid fa-arrow-left"></i>
                    </Link>
                    <h1 className="font-black text-lg text-gray-900">{formattedCategory}</h1>
                </div>
                <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100">
                    <i className="fa-solid fa-magnifying-glass"></i>
                </button>
            </div>

            <main className="flex-1 max-w-7xl mx-auto w-full">
                {/* HERO DASHBOARD */}
                <div className="p-4 animate-[fadeIn_0.3s_ease-out]">
                    <div className={`bg-gradient-to-br ${details.gradient} rounded-2xl p-5 md:p-8 text-white shadow-lg relative overflow-hidden flex flex-col items-center text-center mb-6`}>
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                        <div className="relative z-10">
                            <div className={`w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-md ${details.color} text-xl`}>
                                <i className={`fa-solid ${details.icon}`}></i>
                            </div>
                            <h2 className="text-xl font-black mb-1">Premium {formattedCategory}</h2>
                            <p className="text-white/80 text-[10px] mb-4 max-w-[250px] mx-auto leading-relaxed">
                                Explore top-quality {formattedCategory.toLowerCase()} with exclusive offers. Fast delivery & secure checkout.
                            </p>
                            <a 
                                href="https://www.apextradingcompanystore.co.in/" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-block bg-white text-gray-900 text-[10px] font-black px-5 py-2 rounded-full shadow-sm hover:scale-105 active:scale-95 transition-transform"
                            >
                                Shop Now <i className="fa-solid fa-arrow-right ml-1"></i>
                            </a>
                        </div>
                    </div>

                    {/* QUICK FILTERS / CATEGORIES */}
                    <div className="mb-6">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Shop by Category</h3>
                        <div className="grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-6">
                            <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                                <div className={`w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-lg ${details.color}`}>
                                    <i className="fa-solid fa-tag"></i>
                                </div>
                                <span className="text-[9px] font-bold text-gray-600">Offers</span>
                            </button>
                            <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                                <div className={`w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-lg ${details.color}`}>
                                    <i className="fa-solid fa-fire"></i>
                                </div>
                                <span className="text-[9px] font-bold text-gray-600">Trending</span>
                            </button>
                            <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                                <div className={`w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-lg ${details.color}`}>
                                    <i className="fa-solid fa-star"></i>
                                </div>
                                <span className="text-[9px] font-bold text-gray-600">Top Rated</span>
                            </button>
                            <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                                <div className={`w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-lg ${details.color}`}>
                                    <i className="fa-solid fa-box-open"></i>
                                </div>
                                <span className="text-[9px] font-bold text-gray-600">New</span>
                            </button>
                        </div>
                    </div>

                    {/* HORIZONTAL TRACK - RECOMMENDED PRODUCTS */}
                    <div className="mb-5">
                        <div className="flex justify-between items-end mb-3">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Top Sellers</h3>
                            <Link href="#" className={`text-[9px] font-bold ${details.color}`}>View All</Link>
                        </div>
                        <div className="flex gap-3 overflow-x-auto scrollbar-none flex-nowrap pb-2">
                            {/* Dummy Product 1 */}
                            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 min-w-[140px] flex-shrink-0 cursor-pointer hover:border-gray-200 transition-colors">
                                <div className="h-24 bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-gray-400 text-3xl">
                                    <i className="fa-solid fa-image"></i>
                                </div>
                                <h4 className="font-black text-[11px] text-gray-900 truncate">Premium Item 1</h4>
                                <div className="flex items-center gap-1 mb-1">
                                    <i className="fa-solid fa-star text-amber-400 text-[8px]"></i>
                                    <span className="text-[9px] font-bold text-gray-600">4.8</span>
                                </div>
                                <div className="flex items-end justify-between pt-1">
                                    <span className="text-gray-900 font-black text-sm">&#8377;999</span>
                                </div>
                            </div>
                            
                            {/* Dummy Product 2 */}
                            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 min-w-[140px] flex-shrink-0 cursor-pointer hover:border-gray-200 transition-colors">
                                <div className="h-24 bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-gray-400 text-3xl">
                                    <i className="fa-solid fa-image"></i>
                                </div>
                                <h4 className="font-black text-[11px] text-gray-900 truncate">Premium Item 2</h4>
                                <div className="flex items-center gap-1 mb-1">
                                    <i className="fa-solid fa-star text-amber-400 text-[8px]"></i>
                                    <span className="text-[9px] font-bold text-gray-600">4.5</span>
                                </div>
                                <div className="flex items-end justify-between pt-1">
                                    <span className="text-gray-900 font-black text-sm">&#8377;1,499</span>
                                </div>
                            </div>

                            {/* Dummy Product 3 */}
                            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 min-w-[140px] flex-shrink-0 cursor-pointer hover:border-gray-200 transition-colors">
                                <div className="h-24 bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-gray-400 text-3xl">
                                    <i className="fa-solid fa-image"></i>
                                </div>
                                <h4 className="font-black text-[11px] text-gray-900 truncate">Premium Item 3</h4>
                                <div className="flex items-center gap-1 mb-1">
                                    <i className="fa-solid fa-star text-amber-400 text-[8px]"></i>
                                    <span className="text-[9px] font-bold text-gray-600">4.9</span>
                                </div>
                                <div className="flex items-end justify-between pt-1">
                                    <span className="text-gray-900 font-black text-sm">&#8377;2,999</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
