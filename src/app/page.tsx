"use client";
import React from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import CreditCardCarousel from '@/components/CreditCardCarousel';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';
export default function Home() {
    const user = useAppStore((state) => state.user);
    const updateUserProfile = useAppStore((state) => state.updateUserProfile);

    const [isLeadFormOpen, setIsLeadFormOpen] = React.useState(false);
    const [leadServiceType, setLeadServiceType] = React.useState('');
    const [leadName, setLeadName] = React.useState('');
    const [leadMobile, setLeadMobile] = React.useState('');

    const triggerPrimeCheckout = (planName: string, amount: string) => {
        if (!user) {
            window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Please login to upgrade plan.', type: 'error' } }));
            return;
        }
        window.dispatchEvent(new CustomEvent('openModal', { 
            detail: { type: 'checkout', data: { amount, plan: planName } }
        }));
    };

    React.useEffect(() => {
        const handlePaymentSuccess = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail?.type === 'apex_plan') {
                updateUserProfile({ apexPlan: customEvent.detail.plan });
                window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `Successfully upgraded to ${customEvent.detail.plan}!`, type: 'success' } }));
            }
        };

        window.addEventListener('paymentSuccess', handlePaymentSuccess);
        return () => {
            window.removeEventListener('paymentSuccess', handlePaymentSuccess);
        };
    }, [updateUserProfile]);

    const handleOpenLeadForm = (e: React.MouseEvent, type: string) => {
        e.preventDefault();
        setLeadServiceType(type);
        setIsLeadFormOpen(true);
    };

    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leadName.trim() || !leadMobile.trim()) {
            alert('Please enter Name and Mobile Number');
            return;
        }
        if (leadMobile.length < 10) {
            alert('Please enter a valid Mobile Number');
            return;
        }
        
        try {
            await api.post('/leads', {
                name: leadName,
                mobile: leadMobile,
                serviceType: leadServiceType,
                userId: user?.uid || user?._id
            });
        } catch (error) {
            console.error('Failed to post lead', error);
        }

        const message = `Hi APEX, I am interested in ${leadServiceType}.\nName: ${leadName}\nMobile: ${leadMobile}`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/919494273763?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
        if (leadServiceType.includes('PAN')) {
            window.location.href = 'https://religaredigital.in/pan-service/';
        }
        
        setIsLeadFormOpen(false);
        setLeadName('');
        setLeadMobile('');
    };

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


        // 3. Realty & Academy Auto Carousels
        const realtyTrack = document.getElementById('realty-carousel-track');
        const academyTrack = document.getElementById('academy-carousel-track');
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

        let realtyDir = 1;
        const realtyTimer = setInterval(() => {
            if (!realtyTrack) return;
            const maxScroll = realtyTrack.scrollWidth - realtyTrack.clientWidth;
            if (realtyTrack.scrollLeft >= maxScroll - 5) realtyDir = -1;
            else if (realtyTrack.scrollLeft <= 5) realtyDir = 1;

            const card = realtyTrack.querySelector('.carousel-card');
            if (card) {
                const cardWidth = card.getBoundingClientRect().width + 12;
                realtyTrack.scrollBy({ left: cardWidth * realtyDir, behavior: 'smooth' });
            }
        }, 3000);

        let academyDir = 1;
        const academyTimer = setInterval(() => {
            if (!academyTrack) return;
            const maxScroll = academyTrack.scrollWidth - academyTrack.clientWidth;
            if (academyTrack.scrollLeft >= maxScroll - 5) academyDir = -1;
            else if (academyTrack.scrollLeft <= 5) academyDir = 1;

            const card = academyTrack.firstElementChild;
            if (card) {
                const cardWidth = card.getBoundingClientRect().width + 12;
                academyTrack.scrollBy({ left: cardWidth * academyDir, behavior: 'smooth' });
            }
        }, 3000);

        const primeTrack = document.getElementById('prime-carousel-track');
        let primeDir = 1;
        const primeTimer = setInterval(() => {
            if (!primeTrack) return;
            const maxScroll = primeTrack.scrollWidth - primeTrack.clientWidth;
            if (primeTrack.scrollLeft >= maxScroll - 5) primeDir = -1;
            else if (primeTrack.scrollLeft <= 5) primeDir = 1;

            const card = primeTrack.firstElementChild;
            if (card) {
                const cardWidth = card.getBoundingClientRect().width + 12; // gap-3 is 12px
                primeTrack.scrollBy({ left: cardWidth * primeDir, behavior: 'smooth' });
            }
        }, 3000);

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
            if (realtyTimer) clearInterval(realtyTimer);
            if (academyTimer) clearInterval(academyTimer);
            if (primeTimer) clearInterval(primeTimer);
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
                <div className="grid grid-cols-4 md:grid-cols-8 gap-y-3 gap-x-2 md:gap-x-4 px-4 py-3 md:py-5 bg-white shadow-xs border-b border-gray-100 max-w-7xl mx-auto">
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
                <section id="home" className="hero-gradient pt-5 pb-5 px-4 md:px-8 max-w-7xl mx-auto rounded-b-3xl shadow-md">
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


                    {/* Promo Carousel (Compact & Premium) */}
                    <div className="reveal-up delay-200">
                        <div id="promo-viewport" className="rounded-2xl overflow-hidden shadow-md">
                            <div id="promo-track">
                                {/* Slide 1: Build Wealth */}
                                <div className="promo-slide relative flex items-center overflow-hidden bg-gray-900">
                                    <img src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&amp;q=80&amp;auto=format&amp;fit=crop" alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#1E0E4B] via-[#6C3FC5]/75 to-transparent"></div>
                                    <div className="relative p-5 z-10 flex-1 flex flex-col justify-between h-full reveal-up min-w-0 w-full">
                                        <div className="flex flex-col items-start border-l-4 border-yellow-400 pl-3.5 mb-3 shadow-sm">
                                            <h1 className="text-white text-xl sm:text-2xl font-black uppercase tracking-[0.15em] drop-shadow-xl leading-tight">
                                                APEX <span className="text-yellow-400">Trading Company</span>
                                            </h1>
                                        </div>

                                        <div className="mt-auto min-w-0 w-full">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h2 className="text-white text-sm font-bold leading-tight mb-0.5">Build Wealth &amp; Secure Future</h2>
                                                    <p className="text-purple-200 text-[10px]">Make smart Investments today!</p>
                                                </div>
                                                <Link href="/finance" className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 font-black text-[10px] px-4 py-2 rounded-full hover:scale-[1.02] active:scale-95 transition-all shadow-lg whitespace-nowrap">
                                                    Invest Now <i className="fa-solid fa-arrow-right"></i>
                                                </Link>
                                            </div>

                                            {/* Flash Sale Banner */}
                                            <div className="relative mb-5 p-[2px] rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] w-full min-w-0 flex-shrink-0">
                                                {/* Ribbon */}
                                                <div className="absolute -top-2 right-1 sm:right-4 bg-red-600 text-white text-[7px] sm:text-[9px] font-black tracking-wider uppercase px-1 py-1.5 leading-tight text-center z-20 rounded shadow-lg before:content-[''] before:absolute before:bottom-[-4px] before:left-0 before:border-l-[14px] sm:before:border-l-[21px] before:border-l-red-600 before:border-r-[14px] sm:before:border-r-[21px] before:border-r-red-600 before:border-b-[4px] before:border-b-transparent w-[28px] sm:w-[42px] h-[32px] sm:h-[45px] flex items-start justify-center">
                                                    <span className="relative z-10 mt-0.5">New<br />Offers</span>
                                                </div>

                                                <div className="bg-[#0b0429] rounded-xl p-1.5 w-full relative overflow-hidden min-w-0 flex flex-col">
                                                    {/* Lighting bolts background */}
                                                    <i className="fa-solid fa-bolt absolute top-4 right-12 text-yellow-500/80 text-4xl transform -rotate-12 blur-[1px]"></i>
                                                    <i className="fa-solid fa-bolt absolute bottom-6 -right-2 text-yellow-500/60 text-5xl transform rotate-12 blur-[2px]"></i>

                                                    <div className="relative z-10 w-full min-w-0">
                                                        <h3 className="text-white text-[7px] sm:text-[9px] font-black uppercase flex items-center gap-1 mb-0.5"><i className="fa-solid fa-bolt text-yellow-400"></i> Loans up to</h3>
                                                        <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500 text-xl sm:text-2xl font-black italic tracking-tight leading-none mb-1 drop-shadow-md truncate">₹5 CRORE</h2>
                                                        <h4 className="text-white text-[8px] sm:text-[10px] font-black uppercase italic tracking-widest mb-1.5 drop-shadow-sm truncate">Instant Approval</h4>
                                                    </div>

                                                    {/* Features */}
                                                    <div className="flex justify-between items-center mb-1.5 border-b border-white/10 pb-1 relative z-10 w-full">
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-800 flex items-center justify-center text-[7px] text-yellow-200 shrink-0"><i className="fa-solid fa-percent"></i></div>
                                                            <span className="text-white text-[5px] sm:text-[7px] font-bold uppercase leading-[1.1] truncate">Lowest<br />Rates</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <div className="w-4 h-4 rounded flex items-center justify-center text-[10px] text-yellow-400 shrink-0"><i className="fa-solid fa-bolt"></i></div>
                                                            <span className="text-white text-[5px] sm:text-[7px] font-bold uppercase leading-[1.1] truncate">Fast<br />Approval</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <div className="w-4 h-4 rounded flex items-center justify-center text-[10px] text-yellow-400 shrink-0"><i className="fa-regular fa-file-lines"></i></div>
                                                            <span className="text-white text-[5px] sm:text-[7px] font-bold uppercase leading-[1.1] truncate">Minimal<br />Docs</span>
                                                        </div>
                                                    </div>
                                                    {/* Loan Cards */}
                                                    <div className="grid grid-cols-4 gap-0.5 mb-1.5 relative z-10 w-full">
                                                        {/* Home Loan */}
                                                        <div className="bg-gradient-to-b from-blue-600 to-blue-900 rounded-lg p-1 flex flex-col items-center justify-between text-center min-h-[65px] p-0.5 border border-blue-400/30 shadow-inner overflow-hidden relative w-full min-w-0">
                                                            <img src="https://cdn-icons-png.flaticon.com/512/619/619032.png" alt="Home" className="h-4 w-auto object-contain drop-shadow-md mb-0.5 relative z-10 shrink-0" />
                                                            <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10 min-w-0">
                                                                <h5 className="text-white text-[5px] sm:text-[7px] font-black leading-tight mb-0.5 w-full truncate">Home Loan</h5>
                                                                <p className="text-blue-100 text-[4px] font-medium leading-tight px-0.5 mb-0.5 w-full line-clamp-2">Buy your Dream Home</p>
                                                            </div>
                                                            <a href="#" onClick={(e) => handleOpenLeadForm(e, 'Loan')} className="w-full bg-white text-blue-900 text-[5px] font-black py-0.5 rounded flex items-center justify-center gap-0.5 hover:bg-gray-100 uppercase relative z-10 shrink-0">Apply <i className="fa-solid fa-arrow-right text-[4px]"></i></a>
                                                        </div>

                                                        {/* LAP */}
                                                        <div className="bg-gradient-to-b from-emerald-600 to-emerald-900 rounded-lg p-1 flex flex-col items-center justify-between text-center min-h-[65px] p-0.5 border border-emerald-400/30 shadow-inner overflow-hidden relative w-full min-w-0">
                                                            <img src="https://cdn-icons-png.flaticon.com/512/2558/2558055.png" alt="LAP" className="h-4 w-auto object-contain drop-shadow-md mb-0.5 relative z-10 shrink-0" />
                                                            <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10 min-w-0">
                                                                <h5 className="text-white text-[5px] sm:text-[7px] font-black leading-[1.1] mb-0.5 w-full truncate">LAP (Property)</h5>
                                                                <p className="text-emerald-100 text-[4px] font-medium leading-tight px-0.5 mb-0.5 w-full line-clamp-2">Unlock property value</p>
                                                            </div>
                                                            <a href="#" onClick={(e) => handleOpenLeadForm(e, 'Loan')} className="w-full bg-white text-emerald-900 text-[5px] font-black py-0.5 rounded flex items-center justify-center gap-0.5 hover:bg-gray-100 uppercase relative z-10 shrink-0">Apply <i className="fa-solid fa-arrow-right text-[4px]"></i></a>
                                                        </div>

                                                        {/* Business Loan */}
                                                        <div className="bg-gradient-to-b from-orange-500 to-amber-800 rounded-lg p-1 flex flex-col items-center justify-between text-center min-h-[65px] p-0.5 border border-orange-400/30 shadow-inner overflow-hidden relative w-full min-w-0">
                                                            <img src="https://cdn-icons-png.flaticon.com/512/2942/2942258.png" alt="Business" className="h-4 w-auto object-contain drop-shadow-md mb-0.5 relative z-10 shrink-0" />
                                                            <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10 min-w-0">
                                                                <h5 className="text-white text-[5px] sm:text-[7px] font-black leading-tight mb-0.5 w-full truncate">Business Loan</h5>
                                                                <p className="text-orange-100 text-[4px] font-medium leading-tight px-0.5 mb-0.5 w-full line-clamp-2">Grow your Business</p>
                                                            </div>
                                                            <a href="#" onClick={(e) => handleOpenLeadForm(e, 'Loan')} className="w-full bg-white text-orange-900 text-[5px] font-black py-0.5 rounded flex items-center justify-center gap-0.5 hover:bg-gray-100 uppercase relative z-10 shrink-0">Apply <i className="fa-solid fa-arrow-right text-[4px]"></i></a>
                                                        </div>

                                                        {/* Personal Loan */}
                                                        <div className="bg-gradient-to-b from-pink-500 to-rose-800 rounded-lg p-1 flex flex-col items-center justify-between text-center min-h-[65px] p-0.5 border border-pink-400/30 shadow-inner overflow-hidden relative w-full min-w-0">
                                                            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="Personal" className="h-4 w-auto object-contain drop-shadow-md mb-0.5 relative z-10 shrink-0" />
                                                            <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10 min-w-0">
                                                                <h5 className="text-white text-[5px] sm:text-[7px] font-black leading-tight mb-0.5 w-full truncate">Personal Loan</h5>
                                                                <p className="text-pink-100 text-[4px] font-medium leading-tight px-0.5 mb-0.5 w-full line-clamp-2">Fulfill personal needs</p>
                                                            </div>
                                                            <a href="#" onClick={(e) => handleOpenLeadForm(e, 'Loan')} className="w-full bg-white text-pink-900 text-[5px] font-black py-0.5 rounded flex items-center justify-center gap-0.5 hover:bg-gray-100 uppercase relative z-10 shrink-0">Apply <i className="fa-solid fa-arrow-right text-[4px]"></i></a>
                                                        </div>
                                                    </div>

                                                    {/* Footer Features */}
                                                    <div className="flex justify-between items-center px-1 mb-1 pt-0.5 border-t border-white/10 relative z-10 w-full min-w-0">
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <i className="fa-solid fa-building-columns text-yellow-400 text-[6px] shrink-0"></i>
                                                            <span className="text-white text-[4px] sm:text-[6px] font-bold uppercase leading-[1.2] truncate">100+ Banks<br />Partners</span>
                                                        </div>
                                                        <div className="w-px h-4 bg-white/20 shrink-0"></div>
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <i className="fa-solid fa-headset text-yellow-400 text-[6px] shrink-0"></i>
                                                            <span className="text-white text-[4px] sm:text-[6px] font-bold uppercase leading-[1.2] truncate">Expert<br />Help</span>
                                                        </div>
                                                        <div className="w-px h-4 bg-white/20 shrink-0"></div>
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <i className="fa-solid fa-motorcycle text-yellow-400 text-[6px] shrink-0"></i>
                                                            <span className="text-white text-[4px] sm:text-[6px] font-bold uppercase leading-[1.2] truncate">Doorstep<br />Service</span>
                                                        </div>
                                                    </div>

                                                    {/* Bottom CTA */}
                                                    <div className="flex items-center justify-between w-full p-1 bg-gradient-to-r from-red-900/40 via-red-800/40 to-transparent border border-red-500/20 rounded-lg relative z-10 min-w-0">
                                                        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                                                            <span className="text-xs shrink-0">🎉</span>
                                                            <p className="text-white text-[5px] sm:text-[7px] font-medium leading-tight truncate">
                                                                <span className="text-yellow-400 font-bold uppercase">Offer:</span> Check eligibility!
                                                            </p>
                                                        </div>
                                                        <a href="https://wa.me/919494273763" target="_blank" rel="noopener noreferrer" className="bg-yellow-400 text-gray-900 text-[6px] sm:text-[8px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1 hover:scale-105 transition-transform shrink-0 shadow-sm ml-1">
                                                            Check <i className="fa-solid fa-arrow-right text-[5px]"></i>
                                                        </a>
                                                    </div>



                                                </div>
                                            </div>
                                            <CreditCardCarousel />

                                            {/* Mutual Funds Categories */}
                                            <div className="mb-3">
                                                <h3 className="text-white/80 text-[10px] font-bold mb-2 uppercase tracking-wider">Mutual Funds</h3>
                                                <div className="grid grid-cols-4 gap-2">
                                                    <div className="col-span-2 flex flex-col items-center justify-center">
                                                        <div className="flex flex-col items-center justify-center gap-1.5 bg-white/95 backdrop-blur-sm px-1.5 py-2 rounded-xl shadow-lg shadow-white/5 animate-[pulse_3s_ease-in-out_infinite] w-full h-full border border-white/20">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <img src="/amfi-logo.jpg" alt="AMFI" className="h-8 w-auto object-contain mix-blend-multiply" />
                                                                <div className="flex flex-col items-start border-l border-slate-300 pl-1.5">
                                                                    <span className="text-sm font-black text-slate-800 uppercase tracking-widest leading-tight whitespace-nowrap">AMFI</span>
                                                                    <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest leading-tight whitespace-nowrap">Registered</span>
                                                                </div>
                                                            </div>
                                                            <div className="w-full bg-slate-100 rounded text-center py-1 border border-slate-200">
                                                                <span className="text-[9px] font-black text-slate-800 tracking-widest uppercase whitespace-nowrap">ARN NO - 327302</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Link href="/finance/mutual-funds" className="flex flex-col items-center text-center gap-1.5 cursor-pointer hover:scale-105 transition-transform">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-green-400 shadow-inner">
                                                            <i className="fa-solid fa-calendar-check text-lg"></i>
                                                        </div>
                                                        <span className="text-white text-[8px] font-medium leading-tight">Start<br />SIP</span>
                                                    </Link>
                                                    <Link href="/finance/mutual-funds" className="flex flex-col items-center text-center gap-1.5 cursor-pointer hover:scale-105 transition-transform">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-blue-400 shadow-inner">
                                                            <i className="fa-solid fa-sack-dollar text-lg"></i>
                                                        </div>
                                                        <span className="text-white text-[8px] font-medium leading-tight">Lump<br />Sum</span>
                                                    </Link>
                                                </div>
                                            </div>


                                            {/* Investments Grid */}
                                            <div className="mb-3">
                                                <h3 className="text-white/80 text-[10px] font-bold mb-2 uppercase tracking-wider">Investments</h3>
                                                <div className="grid grid-cols-4 gap-2">
                                                    <a href="https://stablemoney.onelink.me/rkWL/reg7ibv8" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center text-center gap-1.5 hover:scale-105 transition-transform">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-amber-400 shadow-inner">
                                                            <i className="fa-solid fa-vault text-lg"></i>
                                                        </div>
                                                        <span className="text-white text-[8px] font-medium leading-tight">Fixed Deposit<br />(FD)</span>
                                                    </a>
                                                    <a href="#" onClick={(e) => handleOpenLeadForm(e, 'NPS')} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 transition-transform">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-cyan-400 shadow-inner">
                                                            <i className="fa-solid fa-landmark text-lg"></i>
                                                        </div>
                                                        <span className="text-white text-[8px] font-medium leading-tight">NPS<br />&nbsp;</span>
                                                    </a>
                                                    <a href="#" onClick={(e) => handleOpenLeadForm(e, 'NFO')} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 transition-transform">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-indigo-400 shadow-inner">
                                                            <i className="fa-solid fa-chart-pie text-lg"></i>
                                                        </div>
                                                        <span className="text-white text-[8px] font-medium leading-tight">NFO<br />&nbsp;</span>
                                                    </a>
                                                    <a href="#" onClick={(e) => handleOpenLeadForm(e, 'Bonds')} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 transition-transform">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-fuchsia-400 shadow-inner">
                                                            <i className="fa-solid fa-file-contract text-lg"></i>
                                                        </div>
                                                        <span className="text-white text-[8px] font-medium leading-tight">Bonds<br />&nbsp;</span>
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Religare Banner */}
                                            <div className="mb-3 px-1">
                                                <a href="https://religare.ref-r.com/c/i/32347/118510707?r=wa" target="_blank" rel="noopener noreferrer" className="relative block bg-white rounded-xl border border-yellow-400 p-2.5 shadow-md hover:scale-[1.02] transition-transform">
                                                    <div className="absolute -top-2 left-2 bg-yellow-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-sm tracking-wide z-10 leading-none">
                                                        NEW
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center flex-1">
                                                            <div className="w-10 h-10 flex-shrink-0 bg-[#1e3a8a] rounded-lg flex items-center justify-center text-emerald-400 text-lg shadow-inner">
                                                                <i className="fa-solid fa-chart-line"></i>
                                                            </div>
                                                            <div className="flex flex-col ml-3">
                                                                <span className="text-gray-900 font-extrabold text-sm leading-tight">Free Demat Account</span>
                                                                <span className="text-gray-500 text-[9px] leading-tight mt-0.5">Open Demat & Trading A/c<br/>with Religare Broking</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                                            <span className="bg-green-700 text-white font-black text-[9px] px-1.5 py-0.5 rounded-sm flex items-center justify-center uppercase">FREE</span>
                                                            <i className="fa-solid fa-chevron-right text-gray-500 text-xs"></i>
                                                        </div>
                                                    </div>
                                                </a>
                                            </div>

                                            {/* Loans Grid */}
                                            <div className="mb-3">
                                                <h3 className="text-white/80 text-[10px] font-bold mb-2 uppercase tracking-wider">Loans</h3>
                                                <div className="grid grid-cols-4 gap-2">
                                                    <a href="#" onClick={(e) => handleOpenLeadForm(e, 'Personal Loan')} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 transition-transform">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-sky-400 shadow-inner">
                                                            <i className="fa-solid fa-user-tag text-lg"></i>
                                                        </div>
                                                        <span className="text-white text-[8px] font-medium leading-tight">Personal<br />Loan</span>
                                                    </a>
                                                    <a href="#" onClick={(e) => handleOpenLeadForm(e, 'Business Loan')} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 transition-transform">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-lime-400 shadow-inner">
                                                            <i className="fa-solid fa-briefcase text-lg"></i>
                                                        </div>
                                                        <span className="text-white text-[8px] font-medium leading-tight">Business<br />Loan</span>
                                                    </a>
                                                    <a href="#" onClick={(e) => handleOpenLeadForm(e, 'Home Loan')} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 transition-transform">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-pink-400 shadow-inner">
                                                            <i className="fa-solid fa-house-chimney text-lg"></i>
                                                        </div>
                                                        <span className="text-white text-[8px] font-medium leading-tight">Home<br />Loan</span>
                                                    </a>
                                                    <a href="#" onClick={(e) => handleOpenLeadForm(e, 'LAP (Property)')} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 transition-transform">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-yellow-400 shadow-inner">
                                                            <i className="fa-solid fa-building-columns text-lg"></i>
                                                        </div>
                                                        <span className="text-white text-[8px] font-medium leading-tight">LAP<br />(Property)</span>
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Insurance Grid */}
                                            <div className="mt-4">
                                                <h3 className="text-white/80 text-[10px] font-bold mb-2 uppercase tracking-wider">Insurance</h3>
                                                <div className="grid grid-cols-4 gap-2">
                                                    <a href="#" onClick={(e) => handleOpenLeadForm(e, 'Health Insurance')} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 transition-transform">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-red-400 shadow-inner">
                                                            <i className="fa-solid fa-heart-pulse text-lg"></i>
                                                        </div>
                                                        <span className="text-white text-[8px] font-medium leading-tight">Health<br />Insurance</span>
                                                    </a>
                                                    <a href="#" onClick={(e) => handleOpenLeadForm(e, 'Life Insurance')} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 transition-transform">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-teal-400 shadow-inner">
                                                            <i className="fa-solid fa-umbrella text-lg"></i>
                                                        </div>
                                                        <span className="text-white text-[8px] font-medium leading-tight">Life<br />Insurance</span>
                                                    </a>
                                                    <a href="#" onClick={(e) => handleOpenLeadForm(e, 'Motor Insurance')} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 transition-transform">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-purple-400 shadow-inner">
                                                            <i className="fa-solid fa-car-burst text-lg"></i>
                                                        </div>
                                                        <span className="text-white text-[8px] font-medium leading-tight">Motor<br />Insurance</span>
                                                    </a>
                                                    <a href="#" onClick={(e) => handleOpenLeadForm(e, 'Travel Insurance')} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 transition-transform">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-blue-400 shadow-inner">
                                                            <i className="fa-solid fa-plane-departure text-lg"></i>
                                                        </div>
                                                        <span className="text-white text-[8px] font-medium leading-tight">Travel<br />Insurance</span>
                                                    </a>
                                                </div>
                                            </div>

                                            {/* PAN Services Grid */}
                                            <div className="mt-4 mb-3">
                                                <h3 className="text-white/80 text-[10px] font-bold mb-2 uppercase tracking-wider">PAN Services</h3>
                                                <div className="grid grid-cols-4 gap-2">
                                                    <a href="#" onClick={(e) => handleOpenLeadForm(e, 'Apply PAN')} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 transition-transform">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-blue-400 shadow-inner">
                                                            <i className="fa-solid fa-id-card text-lg"></i>
                                                        </div>
                                                        <span className="text-white text-[8px] font-medium leading-tight">Apply<br />Now</span>
                                                    </a>
                                                    <a href="#" onClick={(e) => handleOpenLeadForm(e, 'PAN Correction')} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 transition-transform">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-green-400 shadow-inner">
                                                            <i className="fa-solid fa-file-pen text-lg"></i>
                                                        </div>
                                                        <span className="text-white text-[8px] font-medium leading-tight">Update<br />PAN</span>
                                                    </a>
                                                    
                                                    {/* Dummy PAN Card Visual (Image spanning remaining 2 columns) */}
                                                    <div className="col-span-2 flex items-center justify-end pr-1">
                                                        <div className="relative w-[110px] aspect-[1.58] rounded-lg overflow-hidden border border-blue-300/30 shadow-lg">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img 
                                                                src="/images/dummy-pan.jpg" 
                                                                alt="Dummy PAN Card" 
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Payments (BBPS) Section */}
                                            <div className="mt-4 border border-dashed border-white/20 rounded-xl p-3 relative">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="text-white/80 text-[10px] font-bold uppercase tracking-wider">Payments (BBPS)</h3>
                                                    <Link href="/utility" className="text-white/90 text-[9px] font-medium flex items-center gap-1 hover:text-white transition-colors">
                                                        View All <i className="fa-solid fa-arrow-right text-[8px]"></i>
                                                    </Link>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    <Link href="/utility" className="flex flex-col items-center text-center gap-1.5 cursor-pointer hover:scale-105 transition-transform">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-orange-400 shadow-inner">
                                                            <i className="fa-solid fa-bolt text-lg"></i>
                                                        </div>
                                                        <span className="text-white text-[8px] font-medium leading-tight">Electricity</span>
                                                    </Link>
                                                    <Link href="/utility" className="flex flex-col items-center text-center gap-1.5 cursor-pointer hover:scale-105 transition-transform">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-red-400 shadow-inner">
                                                            <i className="fa-solid fa-fire-flame-simple text-lg"></i>
                                                        </div>
                                                        <span className="text-white text-[8px] font-medium leading-tight">Gas</span>
                                                    </Link>
                                                    <Link href="/utility" className="flex flex-col items-center text-center gap-1.5 cursor-pointer hover:scale-105 transition-transform">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-green-400 shadow-inner">
                                                            <i className="fa-solid fa-mobile-screen text-lg"></i>
                                                        </div>
                                                        <span className="text-white text-[8px] font-medium leading-tight">Mobile<br />Recharge</span>
                                                    </Link>
                                                    <Link href="/utility" className="flex flex-col items-center text-center gap-1.5 cursor-pointer hover:scale-105 transition-transform">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-pink-400 shadow-inner">
                                                            <i className="fa-solid fa-satellite-dish text-lg"></i>
                                                        </div>
                                                        <span className="text-white text-[8px] font-medium leading-tight">DTH<br />Recharge</span>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>    </div>
                </section>

                {/* Minimal APEX Store Section */}
                <div className="mx-4 my-5 reveal-up max-w-7xl md:mx-auto">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-extrabold text-[15px] md:text-lg text-gray-900 tracking-tight">APEX Store</h3>
                        <Link href="/store" className="text-apex-purple font-bold text-[10px] hover:underline uppercase tracking-wide">Explore Internal Store</Link>
                    </div>
                    <div className="grid grid-cols-4 gap-2 md:gap-4">
                        {[
                            { name: 'Electronics', icon: 'fa-laptop', color: 'text-blue-500', bg: 'bg-blue-50' },
                            { name: 'Home & Kitchen', icon: 'fa-couch', color: 'text-orange-500', bg: 'bg-orange-50' },
                            { name: 'Fashion', icon: 'fa-shirt', color: 'text-pink-500', bg: 'bg-pink-50' },
                            { name: 'Sports', icon: 'fa-table-tennis-paddle-ball', color: 'text-green-500', bg: 'bg-green-50' },
                            { name: 'Toys', icon: 'fa-gamepad', color: 'text-purple-500', bg: 'bg-purple-50' },
                            { name: 'Stationery', icon: 'fa-pen-ruler', color: 'text-amber-500', bg: 'bg-amber-50' },
                            { name: 'Pet Supplies', icon: 'fa-paw', color: 'text-rose-500', bg: 'bg-rose-50' },
                            { name: 'More Categories', icon: 'fa-box-open', color: 'text-gray-500', bg: 'bg-gray-100' }
                        ].map((cat, idx) => (
                            <Link key={idx} href="https://www.apextradingcompanystore.co.in/" target="_blank" className={`${cat.bg} rounded-xl p-3 flex flex-col items-center justify-center hover:scale-[1.02] transition-transform aspect-square shadow-sm border border-black/5`}>
                                <i className={`fa-solid ${cat.icon} ${cat.color} text-xl md:text-3xl mb-1.5 drop-shadow-sm`}></i>
                                <span className="text-[9px] md:text-xs font-bold text-gray-800 text-center leading-tight">{cat.name}</span>
                            </Link>
                        ))}
                    </div>
                </div>




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
                        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1" id="prime-carousel-track">
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
                                <button onClick={() => triggerPrimeCheckout('APEX Plus', '₹99')} className="w-full bg-apex-purple text-white font-bold py-1.5 rounded-lg text-[10px] hover:bg-purple-700 transition-colors shadow-xs">Upgrade</button>
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
                                <button onClick={() => triggerPrimeCheckout('APEX Prime', '₹299')} className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 font-black py-1.5 rounded-lg text-[10px] hover:from-yellow-300 hover:to-orange-300 transition-colors shadow-xs">Get Prime</button>
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

                                <div className="carousel-card flex-shrink-0 group cursor-pointer w-64 mr-3" onClick={() => window.location.href = '/realty'}>
                                    <div className="relative overflow-hidden rounded-xl mb-2 h-36">
                                        <img src="/property.jpeg" alt="Simplex Property" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                        <div className="absolute top-2 left-2 bg-black text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">Premium</div>
                                    </div>
                                    <div className="p-1">
                                        <h3 className="text-xs font-bold text-gray-800 mb-0.5">Simplex Property</h3>
                                        <p className="text-gray-400 text-[10px] mb-2 flex items-center gap-1"><i className="fa-solid fa-location-dot text-apex-purple"></i>Prime Location</p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-apex-purple font-black text-sm">₹46 Lakhs</span>
                                            <span className="text-[9px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded"><i className="fa-solid fa-vector-square mr-1 text-[8px]"></i>2 BHK</span>
                                        </div>
                                    </div>
                                </div>

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
                        <div id="academy-carousel-track" className="flex gap-3 overflow-x-auto scrollbar-none flex-nowrap pb-1">
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
                                <h3 className="text-white font-black text-sm tracking-wide leading-tight drop-shadow-md">Find Your<br />Perfect Match</h3>
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
                            {user?.role === 'admin' && (
                                <Link href="/admin-dashboard" className="hover:text-apex-purple transition-colors flex items-center gap-1 font-bold text-xs bg-gray-50 px-3 py-1 rounded-full border border-gray-100 mt-1">
                                    <i className="fa-solid fa-lock text-[10px]"></i>Admin Portal
                                </Link>
                            )}
                        </div>
                    </div>
                </footer>

                {/* ═══ JAVASCRIPT ═══ */}


                {/* Replaced with GlobalModals and global BottomNav */}




            
            {/* Lead Form Modal */}
            {isLeadFormOpen && (
                <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-hidden">
                    <div className="bg-white border border-gray-100 rounded-2xl w-full max-w-sm p-5 shadow-2xl relative animate-in fade-in zoom-in duration-200">
                        <button 
                            onClick={() => setIsLeadFormOpen(false)}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                        
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                <i className="fa-solid fa-headset text-xl"></i>
                            </div>
                            <h3 className="text-gray-900 font-black text-xl mb-1">
                                {leadServiceType === 'Apply PAN' ? 'Apply for PAN Card' : 
                                 leadServiceType === 'PAN Correction' ? 'PAN Card Correction' : 
                                 `Apply for ${leadServiceType}`}
                            </h3>
                            <p className="text-gray-500 text-xs">Fill in your details and we will connect you to our expert on WhatsApp.</p>
                        </div>
                        
                        <form onSubmit={handleLeadSubmit} className="space-y-4">
                            <div>
                                <label className="block text-gray-700 text-xs font-bold mb-1.5 ml-1">Full Name</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <i className="fa-regular fa-user text-gray-400"></i>
                                    </div>
                                    <input 
                                        type="text" 
                                        value={leadName}
                                        onChange={(e) => setLeadName(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                                        placeholder="Enter your name"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-gray-700 text-xs font-bold mb-1.5 ml-1">Mobile Number</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <i className="fa-solid fa-mobile-screen text-gray-400"></i>
                                    </div>
                                    <input 
                                        type="tel" 
                                        value={leadMobile}
                                        onChange={(e) => setLeadMobile(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                                        placeholder="Enter 10-digit number"
                                        pattern="[0-9]{10}"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <button 
                                type="submit"
                                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 mt-2"
                            >
                                <i className="fa-brands fa-whatsapp text-lg"></i> Continue on WhatsApp
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </main>
        </>
    );
}
