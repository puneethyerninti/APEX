"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

interface UtilityHistory {
    _id: string;
    type: string;
    amount: number;
    operator: string;
    mobileOrAccountNumber: string;
    status: string;
    createdAt: string;
    planDescription?: string;
    failureReason?: string;
}

export default function UtilityHistoryPage() {
    const user = useAppStore(state => state.user);
    const [history, setHistory] = useState<UtilityHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!user) return;
            try {
                const userId = user._id || user.uid;
                const res = await api.get(`/utility/history/${userId}`);
                setHistory(res.data.data || []);
            } catch (err: any) {
                console.error(err);
                setError('Failed to fetch history');
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchHistory();
    }, [user]);

    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes('success')) return 'bg-green-100 text-green-700 border-green-200';
        if (s.includes('fail') || s.includes('error')) return 'bg-red-100 text-red-700 border-red-200';
        if (s.includes('refund')) return 'bg-orange-100 text-orange-700 border-orange-200';
        return 'bg-blue-100 text-blue-700 border-blue-200';
    };

    const getStatusText = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes('success')) return 'Successful';
        if (s.includes('fail')) return 'Failed';
        if (s === 'refunded') return 'Refunded';
        if (s === 'refund_pending') return 'Refund Pending';
        if (s === 'manual_review') return 'Under Review';
        return 'Processing';
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-[#2D1B69] text-white p-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
                <Link href="/utility" className="text-white hover:text-gray-200 transition-colors p-2 -ml-2">
                    <i className="fa-solid fa-arrow-left text-lg"></i>
                </Link>
                <h1 className="text-[17px] font-bold truncate px-4">
                    Recharge History
                </h1>
                <Link href="/" className="text-white hover:text-gray-200 transition-colors p-2 -mr-2 flex items-center justify-center">
                    <i className="fa-solid fa-house text-[17px]"></i>
                </Link>
            </div>

            <div className="p-4 max-w-lg mx-auto">
                {loading ? (
                    <div className="flex flex-col gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 animate-pulse h-24"></div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center p-8 bg-white rounded-2xl border border-red-100 mt-4">
                        <i className="fa-solid fa-circle-exclamation text-3xl text-red-400 mb-3"></i>
                        <p className="text-gray-600 font-medium">{error}</p>
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center p-10 bg-white rounded-2xl border border-gray-100 mt-4 shadow-sm">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fa-solid fa-receipt text-2xl text-gray-400"></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">No History Yet</h3>
                        <p className="text-sm text-gray-500">You haven't made any utility payments or recharges yet.</p>
                        <Link href="/utility" className="inline-block mt-5 px-6 py-2.5 bg-[#A0684A] text-white font-bold rounded-xl shadow-sm">
                            Make a Payment
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {history.map((tx) => (
                            <div key={tx._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 relative overflow-hidden">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center text-violet-600">
                                            <i className={`fa-solid ${tx.type.toLowerCase().includes('mobile') ? 'fa-mobile-screen' : 'fa-file-invoice-dollar'} text-lg`}></i>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-[15px] leading-tight">{tx.operator}</h3>
                                            <p className="text-xs text-gray-500 mt-0.5 font-medium">{tx.mobileOrAccountNumber}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-gray-900 text-base">₹{tx.amount}</div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                                    <span className="text-[11px] font-semibold text-gray-400">
                                        {new Date(tx.createdAt).toLocaleString('en-IN', {
                                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusColor(tx.status)}`}>
                                        {getStatusText(tx.status)}
                                    </span>
                                </div>
                                
                                {tx.failureReason && (
                                    <div className="mt-2 text-[11px] text-red-600 bg-red-50 p-2 rounded-lg font-medium border border-red-100">
                                        {tx.failureReason}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
