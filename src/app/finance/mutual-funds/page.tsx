"use client";
import React, { useState } from 'react';
import Link from 'next/link';

type AMC = {
    id: number;
    name: string;
    description: string;
    link?: string;
    logo?: string;
};

export default function MutualFundsPage() {
    const [selectedAmc, setSelectedAmc] = useState<AMC | null>(null);

    const popularAMCs: AMC[] = [
        { 
            id: 1, 
            name: "SBI Mutual Fund", 
            description: "India's largest AMC with a wide range of equity, debt, and hybrid funds.",
            link: "https://sbimf.app/2DC34DWG4h7P",
            logo: "/SBI-Mutual-Fund-Logo.webp"
        },
        { 
            id: 2, 
            name: "ICICI Prudential Mutual Fund", 
            description: "Popular for balanced and equity funds with a strong long-term track record.",
            logo: "/icici-mutual-fund.webp"
        },
        { 
            id: 3, 
            name: "HDFC Mutual Fund", 
            description: "One of the most trusted AMCs with consistent performance.",
            link: "https://investor-web.hdfcfund.com/RT/21072026044319",
            logo: "/hdfc-mutual-fund-logo.png"
        },
        { 
            id: 4, 
            name: "Nippon India Mutual Fund", 
            description: "Well known for small-cap, index, and ETF offerings.",
            link: "https://s.ni-mf.in/nimfnd/81360c0da3",
            logo: "/nippon-india-mutual-fund-logo.png"
        },
        { 
            id: 5, 
            name: "Kotak Mahindra Mutual Fund", 
            description: "Strong across debt and equity categories.",
            logo: "/kotak-mutual-fund-logo.png"
        },
        { 
            id: 6, 
            name: "Aditya Birla Sun Life Mutual Fund", 
            description: "Popular for diversified equity.",
            logo: "/aditya_birla_sun_life_mutual_fund_logo.jpg"
        },
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
                    <h3 className="text-white/80 text-[10px] font-bold mb-2 uppercase tracking-wider">Top Funds</h3>
                    <div className="grid grid-cols-4 gap-2">
                        <div className="flex flex-col items-center text-center gap-1.5 cursor-pointer hover:scale-105 transition-transform" onClick={() => window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Link coming soon', type: 'info' } }))}>
                            <div className="w-10 h-10 rounded-lg bg-white overflow-hidden flex items-center justify-center shadow-inner p-1">
                                <img src="/bandhan-small-cap-fund-logo.webp" alt="Bandhan" className="object-contain w-full h-full" />
                            </div>
                            <span className="text-white text-[8px] font-medium leading-tight">Bandhan<br/>Small Cap</span>
                        </div>
                        <div className="flex flex-col items-center text-center gap-1.5 cursor-pointer hover:scale-105 transition-transform" onClick={() => window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Link coming soon', type: 'info' } }))}>
                            <div className="w-10 h-10 rounded-lg bg-white overflow-hidden flex items-center justify-center shadow-inner p-1">
                                <img src="/hdfc-mid-cap-fund-logo.png" alt="HDFC" className="object-contain w-full h-full" />
                            </div>
                            <span className="text-white text-[8px] font-medium leading-tight">HDFC<br/>Mid Cap</span>
                        </div>
                        <div className="flex flex-col items-center text-center gap-1.5 cursor-pointer hover:scale-105 transition-transform" onClick={() => window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Link coming soon', type: 'info' } }))}>
                            <div className="w-10 h-10 rounded-lg bg-white overflow-hidden flex items-center justify-center shadow-inner p-1">
                                <img src="/parag-parikh-mutual-fund-logo.png" alt="Parag Parikh" className="object-contain w-full h-full" />
                            </div>
                            <span className="text-white text-[8px] font-medium leading-tight">Parag Parikh<br/>Flexi Cap</span>
                        </div>
                        <div className="flex flex-col items-center text-center gap-1.5 cursor-pointer hover:scale-105 transition-transform" onClick={() => window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Link coming soon', type: 'info' } }))}>
                            <div className="w-10 h-10 rounded-lg bg-white overflow-hidden flex items-center justify-center shadow-inner p-1">
                                <img src="/nippon-india-large-cap-fund-logo.webp" alt="Nippon" className="object-contain w-full h-full" />
                            </div>
                            <span className="text-white text-[8px] font-medium leading-tight">Nippon India<br/>Large Cap</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* POPULAR AMCs LIST */}
            <div className="p-4 mt-2">
                <h2 className="font-black text-gray-900 mb-3 uppercase tracking-wide text-sm border-l-4 border-emerald-500 pl-2">Popular AMCs</h2>
                <div className="flex flex-col gap-3">
                    {popularAMCs.map((amc) => (
                        <div 
                            key={amc.id} 
                            className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 hover:border-emerald-200 transition-all"
                        >
                            <div className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm flex-shrink-0 flex items-center justify-center p-1 overflow-hidden">
                                {amc.logo ? (
                                    <img src={amc.logo} alt={amc.name} className="object-contain w-full h-full" />
                                ) : (
                                    <i className="fa-solid fa-building-columns text-emerald-600"></i>
                                )}
                            </div>
                            <h3 className="font-bold text-gray-800 text-sm flex-1">{amc.name}</h3>
                            
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (amc.link) {
                                        window.open(amc.link, '_blank');
                                    } else {
                                        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Link coming soon for this AMC', type: 'info' } }));
                                    }
                                }}
                                className="px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center whitespace-nowrap"
                            >
                                Invest
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* REDIRECT MODAL */}
            {selectedAmc !== null && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity" onClick={() => setSelectedAmc(null)}>
                    <div 
                        className="bg-white w-full max-w-sm rounded-2xl p-6 flex flex-col items-center text-center shadow-2xl transform scale-100 transition-transform"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-black text-gray-900 mb-2">Proceed to Partner</h2>
                        <p className="text-sm text-gray-500 mb-6">You will be securely redirected to {selectedAmc.name} to complete your investment.</p>
                        
                        <a 
                            href={selectedAmc.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block p-4 rounded-xl border-2 border-blue-100 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group w-full mb-4"
                            onClick={() => setSelectedAmc(null)}
                        >
                            {selectedAmc.logo ? (
                                <img 
                                    src={selectedAmc.logo} 
                                    alt={selectedAmc.name} 
                                    className="h-16 mx-auto object-contain group-hover:scale-110 transition-transform" 
                                />
                            ) : (
                                <div className="h-16 flex items-center justify-center text-xl font-black text-blue-600 group-hover:scale-110 transition-transform">
                                    {selectedAmc.name}
                                </div>
                            )}
                        </a>
                        
                        <button 
                            onClick={() => setSelectedAmc(null)}
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
