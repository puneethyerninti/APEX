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

const categoryImages: Record<string, string> = {
    'womens': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80',
    'cosmetics': 'https://images.unsplash.com/photo-1522337360788-8b13fee7a3af?auto=format&fit=crop&q=80',
    'electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&q=80',
    'watches': 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&q=80',
    'computers': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80',
    'gifts': 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80',
    'courses': 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80'
};

const categoryIcons: Record<string, string> = {
    'womens': 'fa-person-dress',
    'cosmetics': 'fa-wand-magic-sparkles',
    'electronics': 'fa-headphones',
    'watches': 'fa-stopwatch',
    'computers': 'fa-laptop',
    'gifts': 'fa-gift',
    'courses': 'fa-graduation-cap'
};

export default function CategoryPage({ params }: { params: { category: string } }) {
    const categoryKey = params.category;
    
    // Capitalize and format category name
    const formattedCategory = categoryKey 
        ? categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1).replace('-', ' ') 
        : 'Category';

    const imageUrl = categoryImages[categoryKey] || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80';
    const icon = categoryIcons[categoryKey] || 'fa-store';

    return (
        <div className="min-h-screen bg-[#0f172a] text-white relative overflow-hidden font-sans">
            {/* Custom Animations - PPT Style Transitions */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes slideInLeft {
                    0% { transform: translateX(-100px); opacity: 0; }
                    100% { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideInRight {
                    0% { transform: translateX(100px); opacity: 0; }
                    100% { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideInUp {
                    0% { transform: translateY(50px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                @keyframes zoomIn {
                    0% { transform: scale(0.8); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes floatObj {
                    0% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(5deg); }
                    100% { transform: translateY(0px) rotate(0deg); }
                }
                
                .anim-slide-left { animation: slideInLeft 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
                .anim-slide-right { animation: slideInRight 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
                .anim-slide-up { animation: slideInUp 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards; opacity: 0; }
                .anim-zoom { animation: zoomIn 1s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
                .anim-float { animation: floatObj 6s ease-in-out infinite; }
                
                .delay-100 { animation-delay: 100ms; }
                .delay-200 { animation-delay: 200ms; }
                .delay-300 { animation-delay: 300ms; }
                .delay-400 { animation-delay: 400ms; }
                .delay-500 { animation-delay: 500ms; }
                
                .glass-panel {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
            `}} />

            {/* Dynamic Background Elements */}
            <div className="absolute inset-0 z-0 opacity-40">
                <div className="absolute top-[-10%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-purple-600/30 mix-blend-screen filter blur-[100px] anim-float"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-amber-500/20 mix-blend-screen filter blur-[120px] anim-float" style={{ animationDelay: '-3s' }}></div>
            </div>

            {/* Header */}
            <header className="absolute top-0 w-full z-50 px-6 py-5 flex items-center justify-between anim-slide-up">
                <Link href="/" className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-white hover:bg-white/20 transition-colors shadow-lg group">
                    <i className="fa-solid fa-arrow-left group-hover:-translate-x-1 transition-transform"></i>
                </Link>
                <div className="glass-panel px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                    APEX Store
                </div>
            </header>

            <main className="relative z-10 flex flex-col md:flex-row min-h-screen">
                
                {/* Left Content Column */}
                <div className="w-full md:w-1/2 flex flex-col justify-center px-8 md:px-16 pt-24 md:pt-0">
                    <div className="max-w-lg">
                        
                        {/* Category Icon */}
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white text-2xl shadow-xl shadow-orange-500/30 mb-8 anim-zoom">
                            <i className={`fa-solid ${icon}`}></i>
                        </div>
                        
                        {/* Title Sequence */}
                        <div className="overflow-hidden mb-2">
                            <h2 className="text-amber-400 font-bold tracking-wider uppercase text-sm mb-2 anim-slide-up delay-100">Premium Collection</h2>
                        </div>
                        <div className="overflow-hidden mb-6">
                            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 anim-slide-up delay-200 leading-tight">
                                {formattedCategory}
                            </h1>
                        </div>
                        
                        {/* Description */}
                        <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-10 anim-slide-up delay-300 max-w-md">
                            Immerse yourself in our curated selection of high-quality {formattedCategory.toLowerCase()} products. Designed to elevate your lifestyle and deliver unparalleled value.
                        </p>
                        
                        {/* CTA and Features */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 anim-slide-up delay-400">
                            <a 
                                href="https://www.apextradingcompanystore.co.in/" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="group relative overflow-hidden bg-white text-gray-900 font-bold py-4 px-8 rounded-full shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transition-all"
                            >
                                <span className="relative z-10 flex items-center gap-3">
                                    Explore Now
                                    <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </a>
                            
                            <div className="flex items-center gap-4 text-xs font-bold text-gray-300">
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-bolt text-amber-400"></i> Fast Delivery
                                </div>
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-shield text-emerald-400"></i> Secure
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Image Column */}
                <div className="w-full md:w-1/2 h-[50vh] md:h-screen p-4 md:p-8 flex items-center justify-center anim-slide-right delay-200">
                    <div className="w-full h-full relative rounded-3xl overflow-hidden shadow-2xl group">
                        {/* Image */}
                        <img 
                            src={imageUrl} 
                            alt={formattedCategory} 
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[20s] ease-out group-hover:scale-110" 
                        />
                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/20 to-transparent opacity-80 md:opacity-40"></div>
                        
                        {/* Floating Stats Panel */}
                        <div className="absolute bottom-8 right-8 glass-panel rounded-2xl p-4 md:p-6 flex gap-6 anim-slide-up delay-500 shadow-2xl">
                            <div>
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Products</p>
                                <p className="text-2xl font-black text-white">2.4k+</p>
                            </div>
                            <div className="w-px bg-white/20"></div>
                            <div>
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Satisfaction</p>
                                <p className="text-2xl font-black text-white">99%</p>
                            </div>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}
