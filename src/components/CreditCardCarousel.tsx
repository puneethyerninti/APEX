"use client";
import React, { useEffect, useRef } from 'react';

const creditCards = [
    {
        name: "ZET FD Credit Card",
        bank: "ZET",
        badge: "NEW",
        subtitle: "FD Se Card",
        features: ["Starts ₹2,000", "Lifetime Free"],
        applyLink: "https://wee.bnking.in/c/ZWI1YjlkZ",
        cardColor: "from-purple-500 to-purple-800",
        network: "RuPay"
    },
    {
        name: "Axis Bank Credit Card",
        bank: "Axis Bank",
        badge: "HOT",
        subtitle: "Rewards & Offers",
        features: ["Amazon Vouchers", "Fast Processing"],
        applyLink: "https://wee.bnking.in/c/ZTliODUwO",
        cardColor: "from-rose-600 to-rose-900",
        network: "Visa"
    },
    {
        name: "HDFC PIXEL Card",
        bank: "HDFC Bank",
        badge: "5% CB",
        subtitle: "Unlimited Cashback",
        features: ["5% on Top Brands", "100% Online"],
        applyLink: "https://wee.bnking.in/c/ZTkzYzAzZ",
        cardColor: "from-blue-600 to-indigo-900",
        network: "Visa"
    },
    {
        name: "Kiwi Credit Card",
        bank: "Kiwi",
        badge: "FREE",
        subtitle: "Lifetime Free",
        features: ["1% CB on Scan & Pay", "UPI-enabled"],
        applyLink: "https://wee.bnking.in/c/MDZkY2E4M",
        cardColor: "from-emerald-500 to-emerald-800",
        network: "RuPay"
    },
    {
        name: "Roarbank Credit Card",
        bank: "Roarbank",
        badge: "2-in-1",
        subtitle: "Savings & Cashback",
        features: ["Up to 20% CB", "62 days interest-free"],
        applyLink: "https://wee.bnking.in/c/MDg0MmVjZ",
        cardColor: "from-amber-500 to-orange-700",
        network: "RuPay"
    }
];

export default function CreditCardCarousel() {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
                
                if (scrollLeft + clientWidth >= scrollWidth - 10) {
                    scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    scrollRef.current.scrollBy({ left: clientWidth, behavior: 'smooth' });
                }
            }
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="mb-4 bg-white rounded-lg shadow-sm border border-purple-100 overflow-hidden relative w-full min-w-0 max-w-full">
            <div className="p-1.5 sm:p-2 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-white">
                <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-purple-600 flex items-center justify-center text-white shadow-sm">
                        <i className="fa-regular fa-credit-card text-[8px] sm:text-[10px]"></i>
                    </div>
                    <h3 className="text-gray-900 font-extrabold text-[8px] sm:text-[10px] uppercase tracking-wider">Credit Cards</h3>
                </div>
                <span className="text-purple-600 font-bold text-[6px] sm:text-[8px]">View All <i className="fa-solid fa-chevron-right text-[5px]"></i></span>
            </div>
            
            <div ref={scrollRef} className="p-1.5 flex flex-row gap-2 bg-[#FCFAFF] overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                
                {creditCards.map((card, index) => (
                    <div key={index} className="snap-center min-w-[85%] md:min-w-[45%] lg:min-w-[30%] bg-[#0b0429] rounded-lg p-1.5 relative overflow-hidden flex shadow-sm shrink-0">
                        <div className="absolute top-0 left-0 bg-purple-600 text-white font-black text-[5px] px-1.5 py-0.5 transform -rotate-45 -translate-x-3 translate-y-0.5 shadow-sm tracking-wide z-10">{card.badge}</div>
                        
                        <div className={`w-16 bg-gradient-to-br ${card.cardColor} rounded p-1 flex flex-col justify-between shrink-0 shadow-sm border border-white/20 relative min-h-[50px] z-10`}>
                            <div className="flex justify-between items-start">
                                <span className="text-white font-black text-[5px] tracking-tight truncate w-3/4">{card.bank}</span>
                                <i className="fa-solid fa-wifi text-white/50 text-[6px] transform rotate-90"></i>
                            </div>
                            <div className="w-4 h-2.5 bg-yellow-200/80 rounded-[2px] mt-1 mb-1"></div>
                            <div className="flex justify-between items-end">
                                <span className="text-white font-bold text-[4px]">{card.network}</span>
                                {card.network === 'RuPay' ? <span className="text-white font-bold text-[3px]">SELECT</span> : <span className="text-white font-bold text-[3px]">PLATINUM</span>}
                            </div>
                        </div>

                        <div className="flex-1 ml-1.5 flex flex-col justify-center min-w-0 z-10">
                            <h4 className="text-white font-black text-[8px] sm:text-[9px] mb-0.5 leading-tight truncate">{card.name}</h4>
                            <p className="text-yellow-400 font-bold text-[6px] sm:text-[7px] mb-1 leading-tight truncate">{card.subtitle}</p>
                            <ul className="text-white/80 text-[5px] sm:text-[6px] space-y-0.5 mb-1 font-medium">
                                {card.features.map((feature, fIndex) => (
                                    <li key={fIndex} className="flex items-center gap-0.5 truncate"><i className="fa-solid fa-circle-check text-purple-400 text-[5px]"></i> {feature}</li>
                                ))}
                            </ul>
                            <a href={card.applyLink} target="_blank" rel="noopener noreferrer" className="bg-purple-600 text-white font-bold text-[6px] sm:text-[7px] py-0.5 px-1.5 rounded text-center shadow hover:bg-purple-700 uppercase w-max flex items-center gap-0.5 mt-auto">Apply Now <i className="fa-solid fa-chevron-right text-[4px]"></i></a>
                        </div>
                    </div>
                ))}

                <div className="snap-center min-w-[85%] md:min-w-[45%] lg:min-w-[30%] bg-white rounded-lg p-1.5 border border-gray-100 shadow-sm flex flex-col justify-between shrink-0">
                    <div className="text-center mb-1">
                        <h4 className="text-purple-700 font-black text-[10px] sm:text-xs mb-0.5 tracking-tight">APEX</h4>
                        <p className="text-gray-900 font-extrabold text-[7px] sm:text-[8px] leading-tight">Explore More Credit Cards</p>
                    </div>
                    
                    <div className="flex justify-around items-start my-1 px-0.5">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 mb-0.5 shadow-sm bg-gray-50">
                                <i className="fa-regular fa-credit-card text-[6px]"></i>
                            </div>
                            <span className="text-gray-600 text-[5px] font-bold leading-[1.1]">Multiple Cards</span>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 mb-0.5 shadow-sm bg-gray-50">
                                <i className="fa-solid fa-percent text-[6px]"></i>
                            </div>
                            <span className="text-gray-600 text-[5px] font-bold leading-[1.1]">Best Offers</span>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 mb-0.5 shadow-sm bg-gray-50">
                                <i className="fa-solid fa-bolt text-[6px]"></i>
                            </div>
                            <span className="text-gray-600 text-[5px] font-bold leading-[1.1]">Fast Approval</span>
                        </div>
                    </div>

                    <a href="https://wee.bnking.in/c/ZWI1YjlkZ" target="_blank" rel="noopener noreferrer" className="bg-purple-700 text-white font-bold text-[6px] sm:text-[7px] py-1 w-full rounded text-center shadow-sm hover:bg-purple-800 uppercase flex items-center justify-center gap-1 mt-0.5">Explore Now <i className="fa-solid fa-chevron-right text-[5px]"></i></a>
                </div>
            </div>
        </div>
    );
}
