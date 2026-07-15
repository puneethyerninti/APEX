
"use client";
import React from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { useAppStore } from '@/store/useAppStore';

export default function Home() {
  const user = useAppStore((state) => state.user);
  React.useEffect(() => {
    // 1. Deals of the day countdown
    const countdownEl = document.getElementById('countdown-timer');
    let countdownInterval: NodeJS.Timeout | null = null;
    if (countdownEl) {
        let timeLeft = 23 * 3600 + 42 * 60 + 15; // 23h 42m 15s
        countdownInterval = setInterval(() => {
            if (timeLeft <= 0) return;
            timeLeft--;
            const h = Math.floor(timeLeft / 3600);
            const m = Math.floor((timeLeft % 3600) / 60);
            const s = timeLeft % 60;
            countdownEl.innerText = `${String(h).padStart(2, '0')}h : ${String(m).padStart(2, '0')}m : ${String(s).padStart(2, '0')}s left`;
        }, 1000);
    }

    // 2. Promo Carousel auto-slide and dots click listeners
    const promoTrack = document.getElementById('promo-track');
    const promoDots = document.querySelectorAll('.promo-dot');
    let promoIndex = 0;
    let promoTimer: NodeJS.Timeout | null = null;
    const totalPromo = 3;

    const goPromo = (idx: number) => {
        if (!promoTrack) return;
        promoIndex = ((idx % totalPromo) + totalPromo) % totalPromo;
        promoTrack.style.transform = `translateX(-${promoIndex * 100}%)`;
        promoDots.forEach((d, i) => d.classList.toggle('active', i === promoIndex));
    };

    const startPromo = () => {
        stopPromo();
        promoTimer = setInterval(() => goPromo(promoIndex + 1), 4200);
    };

    const stopPromo = () => {
        if (promoTimer) clearInterval(promoTimer);
    };

    if (promoDots.length > 0) {
        promoDots.forEach(dot => {
            dot.addEventListener('click', () => {
                stopPromo();
                const indexAttr = dot.getAttribute('data-index');
                if (indexAttr) {
                    goPromo(parseInt(indexAttr, 10));
                }
                startPromo();
            });
        });
        const promoViewport = document.getElementById('promo-viewport');
        if (promoViewport) {
            promoViewport.addEventListener('mouseenter', stopPromo);
            promoViewport.addEventListener('mouseleave', startPromo);
        }
        startPromo();
    }

    // 3. Realty Carousel prev/next buttons
    const realtyTrack = document.getElementById('realty-carousel-track');
    const realtyPrev = document.getElementById('realty-prev');
    const realtyNext = document.getElementById('realty-next');

    const handlePrev = () => {
        if (realtyTrack) {
            const card = realtyTrack.querySelector('.carousel-card');
            if (card) {
                const cardWidth = card.getBoundingClientRect().width + 12; // width + mr-3 gap
                realtyTrack.scrollBy({ left: -cardWidth, behavior: 'smooth' });
            }
        }
    };

    const handleNext = () => {
        if (realtyTrack) {
            const card = realtyTrack.querySelector('.carousel-card');
            if (card) {
                const cardWidth = card.getBoundingClientRect().width + 12; // width + mr-3 gap
                realtyTrack.scrollBy({ left: cardWidth, behavior: 'smooth' });
            }
        }
    };

    if (realtyPrev) realtyPrev.addEventListener('click', handlePrev);
    if (realtyNext) realtyNext.addEventListener('click', handleNext);

    // 4. Scroll Reveal
    const revealEls = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-zoom');
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-active');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.07, rootMargin: '0px 0px -30px 0px' });
    revealEls.forEach(el => observer.observe(el));

    // Cleanup
    return () => {
        if (countdownInterval) clearInterval(countdownInterval);
        stopPromo();
        if (realtyPrev) realtyPrev.removeEventListener('click', handlePrev);
        if (realtyNext) realtyNext.removeEventListener('click', handleNext);
        observer.disconnect();
    };
  }, []);

  return (
    <>
    <Header />
    <main className="w-full">
      

{/* Loader */}


{/* ═══════════════════════════════ STICKY HEADER & SEARCH ═══════════════════════════════ */}


{/* Flipkart-style Categories Compact Grid */}
<div className="grid grid-cols-4 gap-y-3 gap-x-2 px-4 py-3 bg-white shadow-xs border-b border-gray-100">
    {/* Priority 1: Financial Services */}
    <Link href="/finance" className="flex flex-col items-center flex-shrink-0 text-center gap-1 group">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm shadow-sm hover:scale-105 active:scale-95 transition-transform">
            <i className="fa-solid fa-chart-line"></i>
        </div>
        <span className="text-[9px] font-bold text-gray-600 tracking-tight text-center leading-tight">Financial<br />Services</span>
    </Link>
    {/* Priority 2: Store */}
    <Link href="https://www.apextradingcompanystore.co.in/" target="_blank" className="flex flex-col items-center flex-shrink-0 text-center gap-1 group">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-sm shadow-sm hover:scale-105 active:scale-95 transition-transform">
            <i className="fa-solid fa-store"></i>
        </div>
        <span className="text-[9px] font-bold text-gray-600 tracking-tight">Store</span>
    </Link>
    {/* Priority 3: Cab Booking (Travels) */}
    <Link href="/travels" className="flex flex-col items-center flex-shrink-0 text-center gap-1 group">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white flex items-center justify-center text-sm shadow-sm hover:scale-105 active:scale-95 transition-transform">
            <i className="fa-solid fa-taxi"></i>
        </div>
        <span className="text-[9px] font-bold text-gray-600 tracking-tight text-center leading-tight">Cab<br />Booking</span>
    </Link>
    {/* 4: Realty */}
    <Link href="/realty" className="flex flex-col items-center flex-shrink-0 text-center gap-1 group">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-sm shadow-sm hover:scale-105 active:scale-95 transition-transform">
            <i className="fa-solid fa-house-chimney"></i>
        </div>
        <span className="text-[9px] font-bold text-gray-600 tracking-tight">Realty</span>
    </Link>
    {/* 5: Academy */}
    <Link href="/academy" className="flex flex-col items-center flex-shrink-0 text-center gap-1 group">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white flex items-center justify-center text-sm shadow-sm hover:scale-105 active:scale-95 transition-transform">
            <i className="fa-solid fa-user-graduate"></i>
        </div>
        <span className="text-[9px] font-bold text-gray-600 tracking-tight">Academy</span>
    </Link>
    {/* 6: Matrimony */}
    <Link href="/matrimony" className="flex flex-col items-center flex-shrink-0 text-center gap-1 group">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center text-sm shadow-sm hover:scale-105 active:scale-95 transition-transform">
            <i className="fa-solid fa-ring"></i>
        </div>
        <span className="text-[9px] font-bold text-gray-600 tracking-tight">Matrimony</span>
    </Link>
    {/* 7: Jobs */}
    <Link href="/jobs" className="flex flex-col items-center flex-shrink-0 text-center gap-1 group">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center text-sm shadow-sm hover:scale-105 active:scale-95 transition-transform">
            <i className="fa-solid fa-briefcase"></i>
        </div>
        <span className="text-[9px] font-bold text-gray-600 tracking-tight">Jobs</span>
    </Link>
    {/* 8: Utility */}
    <Link href="/utility" className="flex flex-col items-center flex-shrink-0 text-center gap-1 group">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center text-sm shadow-sm hover:scale-105 active:scale-95 transition-transform">
            <i className="fa-solid fa-bolt"></i>
        </div>
        <span className="text-[9px] font-bold text-gray-600 tracking-tight">Utility</span>
    </Link>
</div>

{/* ═══ 1. HERO — Welcome + Wallet + Promo Carousel ═══ */}
<section id="home" className="hero-gradient pt-5 pb-5 px-4">
    {/* Welcome Row */}
    <div className="flex items-center justify-between mb-4 reveal-up">
        <div>
            <p className="text-purple-200 text-[10px] font-bold uppercase tracking-wider">Welcome back,</p>
            <div className="flex items-center gap-2 mt-0.5">
                <h1 className="text-white text-lg font-black">{user?.name || user?.phone || 'Guest'}</h1>
                {user?.isPremium && <span className="prime-badge">★ PRIME</span>}
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { type: 'checkout', data: { amount: '₹ 0.00', plan: 'Scan & Pay' } } }))} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs shadow-sm transition-all" aria-label="QR">
                <i className="fa-solid fa-qrcode"></i>
            </button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: 'account' }))} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs shadow-sm transition-all" aria-label="Account">
                <i className="fa-solid fa-user-gear"></i>
            </button>
        </div>
    </div>

    {/* Payments (Flipkart Deck Style Compact) */}
    <div onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { type: 'checkout', data: { amount: '₹ 0.00', plan: 'Scan & Pay' } } }))} className="bg-white rounded-2xl p-4 mb-4 shadow-md reveal-up delay-100 cursor-pointer hover:scale-[1.01] transition-transform overflow-visible">
        <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-apex-purple flex items-center justify-center shadow-inner flex-shrink-0">
                    <i className="fa-solid fa-indian-rupee-sign text-base"></i>
                </div>
                <div className="flex flex-col justify-center gap-1">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider leading-none">Payments</span>
                    <span className="text-sm font-black text-gray-900 leading-none">Scan &amp; Pay</span>
                </div>
            </div>
            
            <div className="w-px h-8 bg-gray-200"></div>
            
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center shadow-inner flex-shrink-0">
                    <i className="fa-solid fa-coins text-base"></i>
                </div>
                <div className="flex flex-col justify-center gap-1">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider leading-none">APEX Coins</span>
                    <span className="text-sm font-black text-gray-900 leading-none flex items-center gap-0.5">2,560</span>
                </div>
            </div>
            
            <i className="fa-solid fa-chevron-right text-gray-300 text-sm pl-1 flex-shrink-0"></i>
        </div>
    </div>

    {/* Promo Carousel (Compact & Premium) */}
    <div className="reveal-up delay-200">
        <div id="promo-viewport" className="rounded-2xl overflow-hidden shadow-md">
            <div id="promo-track">
                {/* Slide 1: Build Wealth */}
                <div className="promo-slide relative flex items-center overflow-hidden bg-gray-900">
                    <img src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&amp;q=80&amp;auto=format&amp;fit=crop" alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#1E0E4B] via-[#6C3FC5]/75 to-transparent"></div>
                    <div className="relative p-5 z-10 flex-1 flex flex-col justify-between h-full reveal-up">
                        <div className="flex flex-col items-start border-l-4 border-yellow-400 pl-3.5 mb-3 shadow-sm">
                            <h1 className="text-white text-xl sm:text-2xl font-black uppercase tracking-[0.15em] drop-shadow-xl leading-tight">
                                APEX <span className="text-yellow-400">Trading Company</span>
                            </h1>
                            <p className="text-white/90 text-[9px] font-bold tracking-[0.2em] mt-1.5 bg-black/30 px-2.5 py-1 rounded shadow-inner backdrop-blur-sm">AMFI - ARN NO - 327302</p>
                        </div>
                        
                        <div className="mt-auto">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-white text-sm font-bold leading-tight mb-0.5">Build Wealth &amp; Secures SIP</h2>
                                    <p className="text-purple-200 text-[10px]">Make smart Investments today!</p>
                                </div>
                                <Link href="/finance" className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 font-black text-[10px] px-4 py-2 rounded-full hover:scale-[1.02] active:scale-95 transition-all shadow-lg whitespace-nowrap">
                                    Invest Now <i className="fa-solid fa-arrow-right"></i>
                                </Link>
                            </div>

                            {/* Investment Grid */}
                            <div className="mb-3">
                                <h3 className="text-white/80 text-[10px] font-bold mb-2 uppercase tracking-wider">Investment</h3>
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
                                        <span className="text-white text-[8px] font-medium leading-tight">Top<br/>SIPs</span>
                                    </div>
                                </div>
                            </div>

                            {/* Insurance Grid */}
                            <div>
                                <h3 className="text-white/80 text-[10px] font-bold mb-2 uppercase tracking-wider">Insurance</h3>
                                <div className="grid grid-cols-4 gap-2">
                                    <div className="flex flex-col items-center text-center gap-1.5 cursor-pointer hover:scale-105 transition-transform">
                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-red-400 shadow-inner">
                                            <i className="fa-solid fa-heart-pulse text-lg"></i>
                                        </div>
                                        <span className="text-white text-[8px] font-medium leading-tight">Health<br/>Insurance</span>
                                    </div>
                                    <div className="flex flex-col items-center text-center gap-1.5 cursor-pointer hover:scale-105 transition-transform">
                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-teal-400 shadow-inner">
                                            <i className="fa-solid fa-umbrella text-lg"></i>
                                        </div>
                                        <span className="text-white text-[8px] font-medium leading-tight">Life<br/>Insurance</span>
                                    </div>
                                    <div className="flex flex-col items-center text-center gap-1.5 cursor-pointer hover:scale-105 transition-transform">
                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-purple-400 shadow-inner">
                                            <i className="fa-solid fa-car-burst text-lg"></i>
                                        </div>
                                        <span className="text-white text-[8px] font-medium leading-tight">Motor<br/>Insurance</span>
                                    </div>
                                    <div className="flex flex-col items-center text-center gap-1.5 cursor-pointer hover:scale-105 transition-transform">
                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-blue-400 shadow-inner">
                                            <i className="fa-solid fa-plane-departure text-lg"></i>
                                        </div>
                                        <span className="text-white text-[8px] font-medium leading-tight">Travel<br/>Insurance</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Slide 2: Real Estate */}
                <div className="promo-slide relative flex items-center overflow-hidden bg-emerald-900">
                    <img src="./APEX%20Hero(APEX%20Store).jpeg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#064e3b] via-[#047857]/75 to-transparent"></div>
                    <div className="relative p-4 z-10 flex-1">
                        <p className="text-emerald-200 text-[8px] font-extrabold uppercase tracking-widest mb-0.5">Dream Home</p>
                        <h2 className="text-white text-base font-black leading-tight mb-0.5">Find Your Perfect Home</h2>
                        <p className="text-emerald-100 text-[9px] mb-2">Premium properties across India</p>
                        <Link href="/realty" className="inline-block bg-white text-emerald-700 font-black text-[9px] px-3.5 py-1.5 rounded-full hover:bg-emerald-50 transition-colors shadow">Explore Now</Link>
                    </div>
                </div>
                {/* Slide 3: Matrimony */}
                <div className="promo-slide relative flex items-center overflow-hidden bg-rose-900">
                    <img src="./Matrimony%20Hero.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#7f1d1d] via-[#be123c]/75 to-transparent"></div>
                    <div className="relative p-4 z-10 flex-1">
                        <p className="text-rose-200 text-[8px] font-extrabold uppercase tracking-widest mb-0.5">Find Your Match</p>
                        <h2 className="text-white text-base font-black leading-tight mb-0.5">Anand Matrimony</h2>
                        <p className="text-rose-100 text-[9px] mb-2">Premium verified profiles</p>
                        <Link href="/matrimony" className="inline-block bg-white text-rose-600 font-black text-[9px] px-3.5 py-1.5 rounded-full hover:bg-rose-50 transition-colors shadow">View Profiles</Link>
                    </div>
                </div>
            </div>
        </div>
        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-2" id="promo-dots">
            <button className="promo-dot active" data-index="0" aria-label="Slide 1"></button>
            <button className="promo-dot" data-index="1" aria-label="Slide 2"></button>
            <button className="promo-dot" data-index="2" aria-label="Slide 3"></button>
        </div>
    </div>
</section>

{/* Deals of the Day Deck */}
<div className="mx-4 my-3 bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 reveal-up">
    {/* Header with Countdown */}
    <div className="flex items-center justify-between pb-2 border-b border-gray-50 mb-3">
        <div className="flex items-center gap-1.5">
            <i className="fa-solid fa-fire text-orange-500 animate-pulse text-sm"></i>
            <span className="font-extrabold text-xs text-gray-800 uppercase tracking-wider">Deals of the Day</span>
        </div>
        <div className="flex items-center gap-1 bg-red-50 text-red-600 font-mono text-[9px] font-black px-2 py-0.5 rounded border border-red-100" id="countdown-timer">
            23h : 42m : 15s left
        </div>
    </div>
    
    {/* Swipeable Cards */}
    <div className="flex gap-3 overflow-x-auto scrollbar-none flex-nowrap pb-1">
        {/* Deal 1 */}
        <Link href="https://www.apextradingcompanystore.co.in/" className="w-24 flex-shrink-0 bg-gray-50 rounded-xl p-2 flex flex-col hover:scale-[1.01] transition-transform">
            <div className="h-16 w-full rounded-lg overflow-hidden mb-1 relative bg-white">
                <img src="https://images.unsplash.com/photo-1589810635657-232948472d98?w=300&amp;q=80&amp;auto=format&amp;fit=crop" className="w-full h-full object-cover" />
                <span className="absolute top-1 left-1 bg-red-500 text-white text-[7px] font-extrabold px-1 rounded-sm">50% OFF</span>
            </div>
            <span className="text-[9px] font-bold text-gray-700 truncate">Premium Chunni</span>
            <span className="text-[10px] font-black text-apex-purple mt-0.5">₹100 <span className="text-[8px] text-gray-400 line-through font-normal">₹200</span></span>
            <div className="mt-1">
                <div className="flex justify-between text-[7px] text-gray-400 mb-0.5"><span>Remaining</span><span>12 left</span></div>
                <div className="w-full bg-gray-200 h-0.5 rounded-full"><div className="bg-red-500 h-0.5 rounded-full" style={{ width: "30%" }}></div></div>
            </div>
        </Link>
        {/* Deal 2 */}
        <Link href="https://www.apextradingcompanystore.co.in/" className="w-24 flex-shrink-0 bg-gray-50 rounded-xl p-2 flex flex-col hover:scale-[1.01] transition-transform">
            <div className="h-16 w-full rounded-lg overflow-hidden mb-1 relative bg-white">
                <img src="https://images.unsplash.com/photo-1603487742131-4160ec999306?w=300&amp;q=80&amp;auto=format&amp;fit=crop" className="w-full h-full object-cover" />
                <span className="absolute top-1 left-1 bg-red-500 text-white text-[7px] font-extrabold px-1 rounded-sm">40% OFF</span>
            </div>
            <span className="text-[9px] font-bold text-gray-700 truncate">Cotton Blouse</span>
            <span className="text-[10px] font-black text-apex-purple mt-0.5">₹60 <span className="text-[8px] text-gray-400 line-through font-normal">₹100</span></span>
            <div className="mt-1">
                <div className="flex justify-between text-[7px] text-gray-400 mb-0.5"><span>Remaining</span><span>5 left</span></div>
                <div className="w-full bg-gray-200 h-0.5 rounded-full"><div className="bg-red-500 h-0.5 rounded-full" style={{ width: "15%" }}></div></div>
            </div>
        </Link>
        {/* Deal 3 */}
        <Link href="/realty" className="w-24 flex-shrink-0 bg-gray-50 rounded-xl p-2 flex flex-col hover:scale-[1.01] transition-transform">
            <div className="h-16 w-full rounded-lg overflow-hidden mb-1 relative bg-white">
                <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=300&amp;q=80&amp;auto=format&amp;fit=crop" className="w-full h-full object-cover" />
                <span className="absolute top-1 left-1 bg-emerald-500 text-white text-[7px] font-extrabold px-1 rounded-sm">SAVE ₹5L</span>
            </div>
            <span className="text-[9px] font-bold text-gray-700 truncate">Skyline Penthouse</span>
            <span className="text-[10px] font-black text-apex-purple mt-0.5">₹8.2 Cr <span className="text-[7px] text-gray-400 font-normal">Pre-Launch</span></span>
            <div className="mt-1">
                <div className="flex justify-between text-[7px] text-gray-400 mb-0.5"><span>Remaining</span><span>1 unit</span></div>
                <div className="w-full bg-gray-200 h-0.5 rounded-full"><div className="bg-emerald-500 h-0.5 rounded-full" style={{ width: "80%" }}></div></div>
            </div>
        </Link>
        {/* Deal 4 */}
        <Link href="/academy" className="w-24 flex-shrink-0 bg-gray-50 rounded-xl p-2 flex flex-col hover:scale-[1.01] transition-transform">
            <div className="h-16 w-full rounded-lg overflow-hidden mb-1 relative bg-white">
                <img src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=300&amp;q=80&amp;auto=format&amp;fit=crop" className="w-full h-full object-cover" />
                <span className="absolute top-1 left-1 bg-red-500 text-white text-[7px] font-extrabold px-1 rounded-sm">30% OFF</span>
            </div>
            <span className="text-[9px] font-bold text-gray-700 truncate">React Mastery</span>
            <span className="text-[10px] font-black text-apex-purple mt-0.5">₹1,299 <span className="text-[8px] text-gray-400 line-through font-normal">₹1,999</span></span>
            <div className="mt-1">
                <div className="flex justify-between text-[7px] text-gray-400 mb-0.5"><span>Remaining</span><span>24 left</span></div>
                <div className="w-full bg-gray-200 h-0.5 rounded-full"><div className="bg-red-500 h-0.5 rounded-full" style={{ width: "48%" }}></div></div>
            </div>
        </Link>
    </div>
</div>



{/* ═══ 3. QUICK ACTIONS ═══ */}
<section id="quick-actions" className="py-5 bg-white border-b border-gray-100">
    <div className="px-4">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4.5 reveal-up">Quick Payments</h2>
        <div className="grid grid-cols-5 gap-1.5 reveal-up delay-100">
            <Link href="/utility" className="quick-action group">
                <div className="quick-action-icon hover:scale-105 active:scale-95 transition-transform" style={{ background: "linear-gradient(135deg,#e0edff,#c7d9ff)", color: "#2563eb" }}>
                    <i className="fa-solid fa-receipt"></i></div>
                <span>Pay Bills</span>
            </Link>
            <Link href="/utility" className="quick-action group">
                <div className="quick-action-icon hover:scale-105 active:scale-95 transition-transform" style={{ background: "linear-gradient(135deg,#d1fae5,#a7f3d0)", color: "#059669" }}>
                    <i className="fa-solid fa-mobile-screen-button"></i></div>
                <span>Recharge</span>
            </Link>
            <Link href="/utility" className="quick-action group">
                <div className="quick-action-icon hover:scale-105 active:scale-95 transition-transform" style={{ background: "linear-gradient(135deg,#fef3c7,#fde68a)", color: "#d97706" }}>
                    <i className="fa-solid fa-paper-plane"></i></div>
                <span>Send</span>
            </Link>
            <div onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { type: 'checkout', data: { amount: '₹ 0.00', plan: 'Scan & Pay' } } }))} className="quick-action group cursor-pointer">
                <div className="quick-action-icon hover:scale-105 active:scale-95 transition-transform" style={{ background: "linear-gradient(135deg,#ede9ff,#ddd6fe)", color: "#7c3aed" }}>
                    <i className="fa-solid fa-qrcode"></i>
                </div>
                <span>Scan QR</span>
            </div>
            <Link href="/utility" className="quick-action group">
                <div className="quick-action-icon hover:scale-105 active:scale-95 transition-transform" style={{ background: "linear-gradient(135deg,#fce7f3,#fbcfe8)", color: "#db2777" }}>
                    <i className="fa-solid fa-ellipsis"></i>
                </div>
                <span>More</span>
            </Link>
        </div>
    </div>
</section>

{/* ═══ TRAVELS ═══ */}
<section id="travels" className="py-5 bg-white border-b border-gray-100">
    <div className="px-4">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4.5 reveal-up">Travels</h2>
        <div className="grid grid-cols-4 gap-2 reveal-up delay-100">
            <Link href="/travels" className="quick-action group">
                <div className="quick-action-icon hover:scale-105 active:scale-95 transition-transform shadow-sm border border-rose-50" style={{ background: "linear-gradient(135deg,#fff1f2,#ffe4e6)", color: "#e11d48" }}>
                    <i className="fa-solid fa-taxi text-lg"></i></div>
                <span className="text-[9px] font-bold text-gray-700 mt-1.5">Cab</span>
            </Link>
            <Link href="/travels" className="quick-action group">
                <div className="quick-action-icon hover:scale-105 active:scale-95 transition-transform shadow-sm border border-indigo-50" style={{ background: "linear-gradient(135deg,#eef2ff,#e0e7ff)", color: "#4f46e5" }}>
                    <i className="fa-solid fa-bus-simple text-lg"></i></div>
                <span className="text-[9px] font-bold text-gray-700 mt-1.5">Bus</span>
            </Link>
            <Link href="/travels" className="quick-action group">
                <div className="quick-action-icon hover:scale-105 active:scale-95 transition-transform shadow-sm border border-emerald-50" style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", color: "#16a34a" }}>
                    <i className="fa-solid fa-train text-lg"></i></div>
                <span className="text-[9px] font-bold text-gray-700 mt-1.5">Train</span>
            </Link>
            <Link href="/travels" className="quick-action group">
                <div className="quick-action-icon hover:scale-105 active:scale-95 transition-transform shadow-sm border border-purple-50" style={{ background: "linear-gradient(135deg,#faf5ff,#f3e8ff)", color: "#9333ea" }}>
                    <i className="fa-solid fa-plane-departure text-lg"></i>
                </div>
                <span className="text-[9px] font-bold text-gray-700 mt-1.5">Flight</span>
            </Link>
        </div>
    </div>
</section>

{/* ═══ 4. APEX PRIME SUBSCRIPTION ═══ */}
<section id="prime" className="py-6 bg-[#F4F6FB] border-b border-gray-100">
    <div className="px-4">
        <div className="flex items-center justify-between mb-4.5 reveal-up">
            <div>
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider">Prime Plans</h2>
            </div>
            <Link href="#" className="text-apex-purple font-bold text-[10px] hover:underline uppercase tracking-wide">Compare</Link>
        </div>
        
        {/* Swipeable Cards */}
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
            {/* FREE */}
            <div className="plan-card bg-white p-4 w-48 flex-shrink-0 flex flex-col shadow-xs reveal-zoom delay-100">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Free</span>
                <div className="text-xl font-black text-gray-900">₹0 <span className="text-[9px] text-gray-400 font-normal">Forever</span></div>
                <ul className="space-y-1.5 my-3 flex-1">
                    <li className="flex items-center gap-1.5 text-[10px] text-gray-600"><i className="fa-solid fa-check text-green-500 w-3 text-center"></i>Basic services</li>
                    <li className="flex items-center gap-1.5 text-[10px] text-gray-600"><i className="fa-solid fa-check text-green-500 w-3 text-center"></i>Standard Support</li>
                </ul>
                <button className="w-full border border-gray-200 text-gray-500 font-bold py-1.5 rounded-lg text-[10px] transition-colors bg-gray-50">Current Plan</button>
            </div>
            {/* APEX PLUS */}
            <div className="plan-card bg-white p-4 w-48 flex-shrink-0 flex flex-col shadow-xs reveal-zoom delay-200">
                <span className="text-[9px] font-black text-apex-purple uppercase tracking-widest mb-1 block">APEX Plus</span>
                <div className="text-xl font-black text-gray-900">₹99 <span className="text-[9px] text-gray-400 font-normal">/month</span></div>
                <ul className="space-y-1.5 my-3 flex-1">
                    <li className="flex items-center gap-1.5 text-[10px] text-gray-600"><i className="fa-solid fa-check text-apex-purple w-3 text-center"></i>Priority Support</li>
                    <li className="flex items-center gap-1.5 text-[10px] text-gray-600"><i className="fa-solid fa-check text-apex-purple w-3 text-center"></i>Exclusive Offers</li>
                </ul>
                <button className="w-full bg-apex-purple text-white font-bold py-1.5 rounded-lg text-[10px] hover:bg-purple-700 transition-colors shadow-xs">Upgrade</button>
            </div>
            {/* APEX PRIME */}
            <div className="plan-card popular p-4 w-48 flex-shrink-0 flex flex-col text-white reveal-zoom delay-300" style={{ background: "linear-gradient(135deg,#1E0E4B,#3B1E8E)" }}>
                <div className="flex justify-between items-start mb-0.5">
                    <div>
                        <span className="text-[9px] font-black text-yellow-300 uppercase tracking-widest block">APEX Prime</span>
                        <div className="text-xl font-black text-white">₹299 <span className="text-[9px] text-purple-300 font-normal">/month</span></div>
                    </div>
                    <i className="fa-solid fa-crown text-yellow-400 text-base"></i>
                </div>
                <ul className="space-y-1.5 my-3 flex-1">
                    <li className="flex items-center gap-1.5 text-[10px] text-white/95"><i className="fa-solid fa-check text-yellow-300 w-3 text-center"></i>VIP Support</li>
                    <li className="flex items-center gap-1.5 text-[10px] text-white/95"><i className="fa-solid fa-check text-yellow-300 w-3 text-center"></i>Highest Rewards</li>
                </ul>
                <button className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 font-black py-1.5 rounded-lg text-[10px] hover:from-yellow-300 hover:to-orange-300 transition-colors shadow-xs">Get Prime</button>
            </div>
        </div>
    </div>
</section>

{/* ═══ 7. REAL ESTATE CAROUSEL ═══ */}
<section id="realty" className="py-6 bg-white border-b border-gray-100">
    <div className="px-4">
        <div className="flex items-center justify-between mb-4.5 reveal-up">
            <div>
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider">Premium Real Estate</h2>
            </div>
            <div className="flex items-center gap-1.5">
                <button id="realty-prev" type="button" className="w-7 h-7 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:border-apex-purple hover:text-apex-purple transition-colors" aria-label="Prev"><i className="fa-solid fa-chevron-left text-xs"></i></button>
                <button id="realty-next" type="button" className="w-7 h-7 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:border-apex-purple hover:text-apex-purple transition-colors" aria-label="Next"><i className="fa-solid fa-chevron-right text-xs"></i></button>
            </div>
        </div>
        <div className="carousel-viewport reveal-zoom delay-100">
            <div className="carousel-track scrollbar-none overflow-x-auto flex flex-nowrap pb-1" id="realty-carousel-track">

                <div className="carousel-card flex-shrink-0 group cursor-pointer w-64 mr-3">
                    <div className="relative overflow-hidden rounded-xl mb-2 h-36">
                        <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&amp;q=80&amp;auto=format&amp;fit=crop" alt="The Crown Villas" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute top-2 left-2 bg-black text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">For Sale</div>
                    </div>
                    <div className="p-1">
                        <h3 className="text-xs font-bold text-gray-800 mb-0.5">The Crown Villas</h3>
                        <p className="text-gray-400 text-[10px] mb-2 flex items-center gap-1"><i className="fa-solid fa-location-dot text-apex-purple"></i>Banjara Hills, Hyderabad</p>
                        <div className="flex justify-between items-center">
                            <span className="text-apex-purple font-black text-sm">₹15.5 Cr</span>
                            <span className="text-[9px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded"><i className="fa-solid fa-vector-square mr-1 text-[8px]"></i>8500 sqft</span>
                        </div>
                    </div>
                </div>

                <div className="carousel-card flex-shrink-0 group cursor-pointer w-64 mr-3">
                    <div className="relative overflow-hidden rounded-xl mb-2 h-36">
                        <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&amp;q=80&amp;auto=format&amp;fit=crop" alt="Skyline Penthouses" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">Pre-Launch</div>
                    </div>
                    <div className="p-1">
                        <h3 className="text-xs font-bold text-gray-800 mb-0.5">Skyline Penthouses</h3>
                        <p className="text-gray-400 text-[10px] mb-2 flex items-center gap-1"><i className="fa-solid fa-location-dot text-apex-purple"></i>Worli Sea Face, Mumbai</p>
                        <div className="flex justify-between items-center">
                            <span className="text-apex-purple font-black text-sm">₹8.2 Cr</span>
                            <span className="text-[9px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded"><i className="fa-solid fa-vector-square mr-1 text-[8px]"></i>4200 sqft</span>
                        </div>
                    </div>
                </div>

                <div className="carousel-card flex-shrink-0 group cursor-pointer w-64 mr-3">
                    <div className="relative overflow-hidden rounded-xl mb-2 h-36">
                        <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&amp;q=80&amp;auto=format&amp;fit=crop" alt="APEX Tech Park" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute top-2 left-2 bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">Commercial</div>
                    </div>
                    <div className="p-1">
                        <h3 className="text-xs font-bold text-gray-800 mb-0.5">APEX Tech Park</h3>
                        <p className="text-gray-400 text-[10px] mb-2 flex items-center gap-1"><i className="fa-solid fa-location-dot text-apex-purple"></i>Whitefield, Bangalore</p>
                        <div className="flex justify-between items-center">
                            <span className="text-apex-purple font-black text-sm">Lease</span>
                            <span className="text-[9px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded"><i className="fa-solid fa-vector-square mr-1 text-[8px]"></i>1M+ sqft</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
</section>

{/* ═══ 8. APEX ACADEMY ═══ */}
<section id="academy" className="py-6 bg-[#F4F6FB] border-b border-gray-100">
    <div className="px-4">
        <div className="flex items-center justify-between mb-4.5 reveal-up">
            <div>
            </div>
            <Link href="#" className="text-apex-purple font-bold text-[10px] hover:underline uppercase tracking-wide">View All</Link>
        </div>
        
        {/* Horizontal Scroll Academy Deck */}
        <div className="flex gap-3 overflow-x-auto scrollbar-none flex-nowrap pb-1">
            <div className="section-card p-4 flex flex-col w-56 flex-shrink-0 hover:scale-[1.01] transition-transform reveal-zoom delay-100">
                <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-base flex-shrink-0"><i className="fa-solid fa-chalkboard-user"></i></div>
                    <h3 className="font-extrabold text-gray-900 text-xs truncate">Academic Courses</h3>
                </div>
                <p className="text-[10px] text-gray-500 mb-3 leading-relaxed flex-1">Access premium classes from certified international instructors.</p>
                <div className="flex items-center justify-between mt-auto">
                    <span className="inline-block text-[8px] font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">50+ Open</span>
                    <i className="fa-solid fa-arrow-right text-gray-300 text-xs"></i>
                </div>
            </div>
            
            <div className="section-card p-4 flex flex-col w-56 flex-shrink-0 hover:scale-[1.01] transition-transform reveal-zoom delay-200">
                <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white text-base flex-shrink-0"><i className="fa-solid fa-medal"></i></div>
                    <h3 className="font-extrabold text-gray-900 text-xs truncate">Skill Certifications</h3>
                </div>
                <p className="text-[10px] text-gray-500 mb-3 leading-relaxed flex-1">Get government-recognized certifications for job applications.</p>
                <div className="flex items-center justify-between mt-auto">
                    <span className="inline-block text-[8px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Certified</span>
                    <i className="fa-solid fa-arrow-right text-gray-300 text-xs"></i>
                </div>
            </div>
            
            <div className="section-card p-4 flex flex-col w-56 flex-shrink-0 hover:scale-[1.01] transition-transform reveal-zoom delay-300">
                <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-base flex-shrink-0"><i className="fa-solid fa-briefcase"></i></div>
                    <h3 className="font-extrabold text-gray-900 text-xs truncate">Jobs &amp; Placement</h3>
                </div>
                <p className="text-[10px] text-gray-500 mb-3 leading-relaxed flex-1">Apply for direct placement opportunities with partner companies.</p>
                <div className="flex items-center justify-between mt-auto">
                    <span className="inline-block text-[8px] font-black text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full">120+ Openings</span>
                    <i className="fa-solid fa-arrow-right text-gray-300 text-xs"></i>
                </div>
            </div>
        </div>
    </div>
</section>

{/* ═══ 5. TOP OFFERS FOR YOU ═══ */}
<section id="offers" className="py-6 bg-white border-b border-gray-100">
    <div className="px-4">
        <div className="flex items-center justify-between mb-4.5 reveal-up">
            <div>
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider">Top Offers For You</h2>
            </div>
            <Link href="#" className="text-apex-purple font-bold text-[10px] hover:underline uppercase tracking-wide">View All</Link>
        </div>
        
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
            <div className="offer-card w-44 flex-shrink-0 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-3 flex items-center gap-3 reveal-zoom delay-100">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-base shadow-sm flex-shrink-0"><i className="fa-solid fa-store text-xs"></i></div>
                <div className="min-w-0">
                    <span className="text-[8px] font-bold text-orange-600 uppercase tracking-wider block">APEX Store</span>
                    <h3 className="font-extrabold text-gray-900 text-xs truncate">Flat ₹200 Off</h3>
                    <p className="text-[9px] text-gray-400 truncate">Min ₹999 order</p>
                </div>
            </div>
            <div className="offer-card w-44 flex-shrink-0 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3 reveal-zoom delay-200">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-base shadow-sm flex-shrink-0"><i className="fa-solid fa-chart-line text-xs"></i></div>
                <div className="min-w-0">
                    <span className="text-[8px] font-bold text-blue-600 uppercase tracking-wider block">Finance</span>
                    <h3 className="font-extrabold text-gray-900 text-xs truncate">Zero Brokerage</h3>
                    <p className="text-[9px] text-gray-400 truncate">On Investments</p>
                </div>
            </div>
            <div className="offer-card w-44 flex-shrink-0 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-xl p-3 flex items-center gap-3 reveal-zoom delay-300">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-base shadow-sm flex-shrink-0"><i className="fa-solid fa-user-graduate text-xs"></i></div>
                <div className="min-w-0">
                    <span className="text-[8px] font-bold text-violet-600 uppercase tracking-wider block">Academy</span>
                    <h3 className="font-extrabold text-gray-900 text-xs truncate">Upto 30% Off</h3>
                    <p className="text-[9px] text-gray-400 truncate">Selected Courses</p>
                </div>
            </div>
        </div>
    </div>
</section>






{/* ═══ 10. MATRIMONY ═══ */}
<section id="matrimony" className="py-4 px-4">
    <div className="relative rounded-2xl overflow-hidden shadow-lg border border-rose-100 group">
        <div className="h-48 relative">
            <img src="./Matrimony%20Hero.png" alt="Matrimony" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-rose-900/90 via-rose-900/30 to-transparent"></div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between z-10 reveal-up">
            <div className="flex flex-col">
                <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-lg inline-block mb-2 border border-white/30 shadow-sm self-start">
                    <img src="Anand%20Matrimony%20logo.jpeg" alt="Anand Matrimony" className="h-8 object-contain rounded-md" />
                </div>
                <h3 className="text-white font-black text-sm tracking-wide leading-tight drop-shadow-md">Find Your<br/>Perfect Match</h3>
            </div>
            
            <Link href="/matrimony" className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-[10px] py-2 px-4 rounded-full shadow-md transition-colors flex items-center gap-1.5 mb-1 shrink-0 backdrop-blur-md">
                Explore <i className="fa-solid fa-arrow-right text-[8px]"></i>
            </Link>
        </div>
    </div>
</section>

{/* ═══ FOOTER / FOUNDATION ═══ */}
<footer id="foundation" className="bg-white border-t border-gray-100 pt-14 pb-8">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Foundation CTA */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-5 sm:p-6 mb-12 flex flex-col sm:flex-row items-center justify-between gap-4 reveal-up">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white text-2xl"><i className="fa-solid fa-seedling"></i></div>
                <div>
                    <h3 className="text-white font-bold text-lg">APEX Foundation</h3>
                    <p className="text-orange-100 text-sm">Donate, Sponsor Education, Medical Help, Volunteer, CSR Activities</p>
                </div>
            </div>
            <Link href="/charity" className="bg-white text-red-600 font-bold text-sm px-6 py-2.5 rounded-full hover:bg-red-50 transition-colors shadow-md whitespace-nowrap">Get Involved</Link>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 reveal-up">
                <div className="flex items-center gap-3 mb-3">
                    <img src="./APEX%20logo.jpeg" alt="APEX" className="h-9 w-9 object-contain rounded-lg" />
                    <div>
                        <span className="font-black text-gray-900 uppercase tracking-wider block text-xs">APEX</span>
                    </div>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed mb-4">One App, Unlimited Possibilities. Your Life. Simplified.</p>
                <div className="flex gap-3">
                    <Link href="https://wa.me/919494273763" className="text-apex-green text-lg hover:scale-110 transition-transform" aria-label="WhatsApp"><i className="fa-brands fa-whatsapp"></i></Link>
                    <Link href="#" className="text-blue-600 text-lg hover:scale-110 transition-transform" aria-label="LinkedIn"><i className="fa-brands fa-linkedin"></i></Link>
                    <Link href="#" className="text-pink-600 text-lg hover:scale-110 transition-transform" aria-label="Instagram"><i className="fa-brands fa-instagram"></i></Link>
                    <Link href="#" className="text-sky-400 text-lg hover:scale-110 transition-transform" aria-label="Twitter"><i className="fa-brands fa-twitter"></i></Link>
                </div>
            </div>
            {/* Ecosystem */}
            <div className="reveal-up delay-100">
                <h4 className="font-black text-gray-900 mb-3 uppercase text-[10px] tracking-wider">Ecosystem</h4>
                <ul className="space-y-2">
                    <li><Link href="/utility" className="text-gray-500 hover:text-apex-purple text-xs transition-colors flex items-center gap-1.5"><i className="fa-solid fa-chart-line text-[10px] text-apex-purple"></i>Finance</Link></li>
                    <li><Link href="/realty" className="text-gray-500 hover:text-apex-purple text-xs transition-colors flex items-center gap-1.5"><i className="fa-solid fa-house-chimney text-[10px] text-apex-purple"></i>Realty</Link></li>
                    <li><Link href="/academy" className="text-gray-500 hover:text-apex-purple text-xs transition-colors flex items-center gap-1.5"><i className="fa-solid fa-user-graduate text-[10px] text-apex-purple"></i>Academy</Link></li>
                    <li><Link href="/store" className="text-gray-500 hover:text-apex-purple text-xs transition-colors flex items-center gap-1.5"><i className="fa-solid fa-store text-[10px] text-apex-purple"></i>Store</Link></li>
                    <li><Link href="/matrimony" className="text-gray-500 hover:text-apex-purple text-xs transition-colors flex items-center gap-1.5"><i className="fa-solid fa-ring text-[10px] text-apex-purple"></i>Matrimony</Link></li>
                    <li><Link href="/utility" className="text-gray-500 hover:text-apex-purple text-xs transition-colors flex items-center gap-1.5"><i className="fa-solid fa-bolt text-[10px] text-apex-purple"></i>Utility</Link></li>
                </ul>
            </div>
            {/* Foundation */}
            <div className="reveal-up delay-200">
                <h4 className="font-black text-gray-900 mb-3 uppercase text-[10px] tracking-wider">Foundation</h4>
                <ul className="space-y-2">
                    <li><Link href="#" className="text-gray-500 hover:text-apex-purple text-xs transition-colors">Our Mission</Link></li>
                    <li><Link href="#" className="text-gray-500 hover:text-apex-purple text-xs transition-colors">Project Vidya</Link></li>
                    <li><Link href="#" className="text-gray-500 hover:text-apex-purple text-xs transition-colors">Volunteer</Link></li>
                    <li><Link href="#" className="text-gray-500 hover:text-apex-purple text-xs transition-colors">Donate</Link></li>
                    <li><Link href="#" className="text-gray-500 hover:text-apex-purple text-xs transition-colors">CSR Activities</Link></li>
                </ul>
            </div>
            {/* Contact */}
            <div className="col-span-2 reveal-up delay-300 border-t border-gray-50 pt-4">
                <h4 className="font-black text-gray-900 mb-3 uppercase text-[10px] tracking-wider">Contact &amp; Legal</h4>
                <div className="grid grid-cols-2 gap-2">
                    <Link href="tel:9494273763" className="col-span-2 text-apex-purple font-black text-sm bg-apex-purplelight p-2 rounded-lg flex items-center justify-center mb-1 hover:bg-purple-100 transition-colors">
                        <i className="fa-solid fa-headset mr-2"></i>9494273763 
                        <span className="text-[9px] text-apex-purple ml-1 font-bold uppercase tracking-widest">(24/7 Support)</span>
                    </Link>
                    <Link href="#" className="text-gray-500 hover:text-apex-purple text-xs transition-colors mt-1">Terms of Service</Link>
                    <Link href="#" className="text-gray-500 hover:text-apex-purple text-xs transition-colors mt-1">Privacy Policy</Link>
                    <Link href="#" className="text-gray-500 hover:text-apex-purple text-xs transition-colors">Refund Policy</Link>
                    <Link href="#" className="text-gray-500 hover:text-apex-purple text-xs transition-colors">Help Center</Link>
                </div>
            </div>
        </div>

        <div className="border-t border-gray-100 pt-5 flex flex-col items-center gap-2.5 text-center text-xs text-gray-400">
            <div className="flex items-center gap-1.5 justify-center">
                <i className="fa-solid fa-shield-halved text-apex-purple text-xs"></i>
                <span className="font-bold">APEX · Simplified.</span>
            </div>
            <p className="leading-relaxed">© 2026 APEX Group of Companies.<br />All rights reserved.</p>
            <Link href="/admin-dashboard" className="hover:text-apex-purple transition-colors flex items-center gap-1 font-bold text-xs bg-gray-50 px-3 py-1 rounded-full border border-gray-100 mt-1">
                <i className="fa-solid fa-lock text-[10px]"></i>Admin Portal
            </Link>
        </div>
    </div>
</footer>

{/* ═══ JAVASCRIPT ═══ */}


{/* Replaced with GlobalModals and global BottomNav */}




    </main>
    </>
  );
}
