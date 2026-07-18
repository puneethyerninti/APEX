"use client";
import React from 'react';
import Link from 'next/link';

export default function UtilityPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center animate-[fadeIn_0.3s_ease-out]">
      <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center text-teal-500 mb-6 shadow-sm">
        <i className="fa-solid fa-bolt text-4xl"></i>
      </div>
      <h1 className="text-2xl font-black text-gray-900 mb-2">Utility Payments</h1>
      <h2 className="text-sm font-bold text-teal-600 uppercase tracking-widest mb-4">Coming Soon</h2>
      <p className="text-gray-500 text-sm max-w-sm mb-8 leading-relaxed">
        We are currently upgrading our payment infrastructure to bring you a seamless bill payment experience. Please check back later!
      </p>
      <Link href="/" className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-gray-800 transition-colors flex items-center gap-2">
        <i className="fa-solid fa-arrow-left"></i> Back to Home
      </Link>
    </div>
  );
}
