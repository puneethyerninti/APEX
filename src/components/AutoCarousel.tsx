"use client";

import React, { useState, useEffect } from "react";

export default function AutoCarousel({ children, interval = 3000 }: { children: React.ReactNode[], interval?: number }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const count = React.Children.count(children);

    useEffect(() => {
        if (count <= 1) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % count);
        }, interval);
        return () => clearInterval(timer);
    }, [count, interval]);

    return (
        <div className="relative w-full overflow-hidden rounded-xl shadow-sm">
            <div 
                className="flex transition-transform duration-700 ease-in-out" 
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {React.Children.map(children, (child, index) => (
                    <div key={index} className="w-full flex-shrink-0">
                        {child}
                    </div>
                ))}
            </div>
            
            {/* Dots indicator */}
            {count > 1 && (
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
                    {Array.from({ length: count }).map((_, idx) => (
                        <div 
                            key={idx} 
                            className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-4 bg-white/90' : 'w-1.5 bg-white/40'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
