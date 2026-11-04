"use client";
import React from 'react';
import Link from 'next/link';
import CreditCardCarousel from '@/components/CreditCardCarousel';
import { useAppStore } from '@/store/useAppStore';

export default function CreditCardsPage() {
    const user = useAppStore(state => state.user);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* HEADER */}
            <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <Link href="/finance" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                        <i className="fa-solid fa-arrow-left"></i>
                    </Link>
                    <h1 className="font-black text-lg text-gray-900">Credit Cards</h1>
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto pb-20">
                <div className="px-4 py-6 text-center">
                    <h2 className="text-xl font-black text-gray-900 mb-1">Find Your Perfect Card</h2>
                    <p className="text-sm text-gray-500 mb-6">Explore top credit cards curated just for you.</p>
                </div>
                
                <CreditCardCarousel />
            </div>
        </div>
    );
}
