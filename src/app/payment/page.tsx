"use client";

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import { useSocket } from '@/context/SocketContext';

interface ScannedPayee {
    pa: string;        // VPA / UPI ID or phone
    pn: string;        // Payee Name
    am?: string;       // Pre-filled Amount if dynamic QR
    tn?: string;       // Transaction note
    cu?: string;       // Currency
    raw: string;       // Raw text
    isApex?: boolean;  // APEX user P2P
    isUrl?: boolean;   // Web URL
}

interface TransactionItem {
    _id: string;
    amount: number;
    type: 'credit' | 'debit';
    category: string;
    referenceId?: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    createdAt: string;
    metadata?: any;
}

function PaymentContent() {
    const user = useAppStore((state) => state.user);
    const walletBalance = useAppStore((state) => state.walletBalance);
    const setWalletBalance = useAppStore((state) => state.setWalletBalance);
    const { socket } = useSocket();

    const searchParams = useSearchParams();
    const autoScan = searchParams.get('scan') === 'true';

    // Core States
    const [isBalanceVisible, setIsBalanceVisible] = useState(true);
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [txLoading, setTxLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'debit' | 'credit'>('all');

    // QR Scanner States
    const [isScannerOpen, setIsScannerOpen] = useState(autoScan);
    const [scannerError, setScannerError] = useState<string | null>(null);
    const scannerRef = useRef<any>(null);

    // Scanned Payment Sheet States
    const [scannedPayee, setScannedPayee] = useState<ScannedPayee | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [payNote, setPayNote] = useState('');
    const [payLoading, setPayLoading] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState<any | null>(null);

    // Add Money Modal States
    const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
    const [addAmount, setAddAmount] = useState('500');
    const [addLoading, setAddLoading] = useState(false);

    // Send Money (P2P) Modal States
    const [isSendMoneyOpen, setIsSendMoneyOpen] = useState(false);
    const [sendPhone, setSendPhone] = useState('');
    const [sendAmount, setSendAmount] = useState('');
    const [sendNote, setSendNote] = useState('');
    const [sendLoading, setSendLoading] = useState(false);

    // My QR Modal States
    const [isMyQrOpen, setIsMyQrOpen] = useState(false);
    const [myQrUpi, setMyQrUpi] = useState('');

    // Toast Dispatcher Helper
    const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('showToast', { detail: { message, type } }));
        }
    };

    // 1. Fetch Real-time Wallet Balance
    const fetchBalance = useCallback(async () => {
        if (!user) return;
        try {
            const res = await api.get(`/finance/wallet?userId=${user.uid || user._id}`);
            if (res.data?.success && typeof res.data.balance === 'number') {
                setWalletBalance(res.data.balance);
            }
        } catch (err) {
            console.error('Failed to sync wallet balance:', err);
        }
    }, [user, setWalletBalance]);

    // 2. Fetch User Passbook / Transactions
    const fetchTransactions = useCallback(async () => {
        if (!user) return;
        setTxLoading(true);
        try {
            const queryType = activeTab === 'all' ? '' : `&type=${activeTab}`;
            const res = await api.get(`/finance/transactions?userId=${user.uid || user._id}&limit=20${queryType}`);
            if (res.data?.success) {
                setTransactions(res.data.transactions || []);
            }
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
        } finally {
            setTxLoading(false);
        }
    }, [user, activeTab]);

    useEffect(() => {
        fetchBalance();
        fetchTransactions();
    }, [fetchBalance, fetchTransactions]);

    // 3. Socket Listener for Live Balance & Transaction Updates
    useEffect(() => {
        if (!socket) return;
        const onWalletUpdate = (data: any) => {
            if (typeof data.newBalance === 'number') {
                setWalletBalance(data.newBalance);
            }
            if (data.message) {
                showToast(data.message, 'success');
            }
            fetchTransactions();
        };

        socket.on('wallet_update', onWalletUpdate);
        return () => {
            socket.off('wallet_update', onWalletUpdate);
        };
    }, [socket, setWalletBalance, fetchTransactions]);

    // 4. Intelligent QR Code Parser
    const parseScannedText = (decodedText: string) => {
        const trimmed = decodedText.trim();

        // Check A: Standard NPCI UPI URI format
        if (trimmed.toLowerCase().startsWith('upi://pay')) {
            try {
                let url: URL;
                try {
                    url = new URL(trimmed);
                } catch {
                    url = new URL(trimmed.replace('upi://pay', 'http://upi.pay'));
                }
                const pa = url.searchParams.get('pa') || '';
                const rawPn = url.searchParams.get('pn') || 'UPI Merchant';
                const pn = decodeURIComponent(rawPn).replace(/\+/g, ' ');
                const am = url.searchParams.get('am') || '';
                const rawTn = url.searchParams.get('tn') || '';
                const tn = decodeURIComponent(rawTn).replace(/\+/g, ' ');
                const cu = url.searchParams.get('cu') || 'INR';

                setScannedPayee({ pa, pn, am, tn, cu, raw: trimmed });
                setPayAmount(am || '');
                setPayNote(tn || '');
                return;
            } catch (err) {
                console.error('UPI URL parse error fallback:', err);
                const paMatch = trimmed.match(/pa=([^&]+)/);
                const pnMatch = trimmed.match(/pn=([^&]+)/);
                const amMatch = trimmed.match(/am=([^&]+)/);
                const pa = paMatch ? decodeURIComponent(paMatch[1]) : 'Merchant';
                const pn = pnMatch ? decodeURIComponent(pnMatch[1]).replace(/\+/g, ' ') : 'Verified UPI Merchant';
                const am = amMatch ? amMatch[1] : '';
                setScannedPayee({ pa, pn, am, raw: trimmed });
                setPayAmount(am);
                return;
            }
        }

        // Check B: APEX Internal P2P QR
        if (trimmed.toLowerCase().startsWith('apex://pay')) {
            try {
                const url = new URL(trimmed.replace('apex://pay', 'http://apex.pay'));
                const phone = url.searchParams.get('phone') || '';
                const name = decodeURIComponent(url.searchParams.get('name') || 'APEX User');
                setScannedPayee({ pa: phone, pn: name, isApex: true, raw: trimmed });
                return;
            } catch {
                // fall through
            }
        }

        // Check C: Web URL
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            setScannedPayee({ pa: trimmed, pn: 'External Payment Link', isUrl: true, raw: trimmed });
            return;
        }

        // Fallback: Raw string
        setScannedPayee({ pa: trimmed, pn: 'Scanned Recipient', raw: trimmed });
    };

    // 5. Camera Scanner Controls
    const startScanner = async () => {
        setIsScannerOpen(true);
        setScannerError(null);

        setTimeout(async () => {
            try {
                const { Html5Qrcode } = await import('html5-qrcode');
                const html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;

                await html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 15 },
                    (decodedText) => {
                        stopScanner(html5QrCode);
                        parseScannedText(decodedText);
                    },
                    () => {}
                );

                const videoEl = document.querySelector('#reader video') as HTMLVideoElement;
                if (videoEl) {
                    videoEl.style.objectFit = 'cover';
                    videoEl.style.width = '100%';
                    videoEl.style.height = '100%';
                    videoEl.style.position = 'absolute';
                    videoEl.style.top = '0';
                    videoEl.style.left = '0';
                }
            } catch (err: any) {
                console.error("Scanner access error:", err);
                setScannerError(err.message || 'Unable to access device camera. Please grant camera permission.');
            }
        }, 150);
    };

    const stopScanner = async (instance?: any) => {
        const qrCode = instance || scannerRef.current;
        if (qrCode) {
            try {
                await qrCode.stop();
                qrCode.clear();
            } catch (err) {
                console.error("Scanner stop error", err);
            }
        }
        setIsScannerOpen(false);
    };

    useEffect(() => {
        if (autoScan) {
            startScanner();
        }
    }, [autoScan]);

    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
            }
        };
    }, []);

    // 6. Action: Pay Scanned Payee via APEX Wallet
    const handlePayWithWallet = async () => {
        const amountNum = Number(payAmount);
        if (!amountNum || amountNum <= 0) {
            showToast('Please enter a valid payment amount', 'warning');
            return;
        }
        if (walletBalance < amountNum) {
            showToast(`Insufficient balance (₹${walletBalance.toFixed(2)}). Please top up or pay via UPI intent.`, 'error');
            return;
        }

        setPayLoading(true);
        try {
            const res = await api.post('/finance/wallet/pay-merchant', {
                amount: amountNum,
                payeeVpa: scannedPayee?.pa,
                payeeName: scannedPayee?.pn,
                note: payNote,
                userId: user?.uid || user?._id
            });

            if (res.data?.success) {
                setWalletBalance(res.data.balance);
                setPaymentSuccess({
                    amount: amountNum,
                    payeeName: scannedPayee?.pn,
                    payeeVpa: scannedPayee?.pa,
                    txId: res.data.transaction?._id || `TXN${Date.now()}`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
                setScannedPayee(null);
                fetchTransactions();
            } else {
                showToast(res.data?.error || 'Payment failed', 'error');
            }
        } catch (error: any) {
            console.error('Wallet payment error:', error);
            showToast(error.response?.data?.error || 'Failed to complete payment', 'error');
        } finally {
            setPayLoading(false);
        }
    };

    // 7. Action: Pay Scanned Payee via Direct UPI Intent (PhonePe/GPay/Paytm)
    const handlePayWithUpiIntent = () => {
        const amountNum = Number(payAmount);
        if (!amountNum || amountNum <= 0) {
            showToast('Please enter a valid payment amount', 'warning');
            return;
        }
        if (!scannedPayee?.pa) {
            showToast('Invalid payee UPI address', 'error');
            return;
        }

        const upiUri = `upi://pay?pa=${encodeURIComponent(scannedPayee.pa)}&pn=${encodeURIComponent(scannedPayee.pn)}&am=${amountNum}&cu=INR&tn=${encodeURIComponent(payNote || 'APEX Pay')}`;
        window.location.href = upiUri;
    };

    // 8. Action: Pay Scanned Payee via Online Razorpay Gateway
    const handlePayWithRazorpay = async () => {
        const amountNum = Number(payAmount);
        if (!amountNum || amountNum <= 0) {
            showToast('Please enter a valid amount', 'warning');
            return;
        }
        if (!user?.uid && !user?._id) {
            showToast('Please login to continue', 'error');
            return;
        }

        setPayLoading(true);
        try {
            const orderRes = await api.post('/finance/razorpay/order', {
                amount: amountNum,
                userId: user.uid || user._id,
                category: 'qr_payment',
                serviceName: `Pay ${scannedPayee?.pn || 'Merchant'}`,
                metadata: {
                    payeeVpa: scannedPayee?.pa,
                    payeeName: scannedPayee?.pn,
                    note: payNote
                }
            });

            const { order, keyId } = orderRes.data;

            const options = {
                key: keyId,
                amount: order.amount,
                currency: order.currency,
                name: "APEX Pay",
                description: `Payment to ${scannedPayee?.pn}`,
                order_id: order.id,
                handler: async function (response: any) {
                    try {
                        const verifyRes = await api.post('/finance/razorpay/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            amount: amountNum,
                            userId: user.uid || user._id
                        });

                        if (verifyRes.data?.success) {
                            setPaymentSuccess({
                                amount: amountNum,
                                payeeName: scannedPayee?.pn,
                                payeeVpa: scannedPayee?.pa,
                                txId: response.razorpay_payment_id,
                                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            });
                            setScannedPayee(null);
                            fetchTransactions();
                        }
                    } catch (e) {
                        console.error("Verification failed", e);
                        showToast('Verification failed after payment capture', 'error');
                    } finally {
                        setPayLoading(false);
                    }
                },
                prefill: {
                    name: user.name || "APEX User",
                    contact: user.phone || ""
                },
                theme: { color: "#4A1D96" },
                modal: {
                    ondismiss: () => setPayLoading(false)
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (err: any) {
            console.error('Razorpay payment error:', err);
            showToast(err.response?.data?.error || 'Failed to initiate gateway payment', 'error');
            setPayLoading(false);
        }
    };

    // 9. Action: Add Money to Wallet via Razorpay
    const handleAddMoneySubmit = async () => {
        const amountNum = Number(addAmount);
        if (!amountNum || amountNum < 1) {
            showToast('Enter an amount of at least ₹1', 'warning');
            return;
        }
        if (!user?.uid && !user?._id) {
            showToast('Please login to recharge wallet', 'error');
            return;
        }

        setAddLoading(true);
        try {
            const orderRes = await api.post('/finance/razorpay/order', {
                amount: amountNum,
                userId: user.uid || user._id,
                category: 'add_money',
                serviceName: 'Wallet Top-up'
            });

            const { order, keyId } = orderRes.data;

            const options = {
                key: keyId,
                amount: order.amount,
                currency: order.currency,
                name: "APEX Cash Wallet",
                description: "Wallet Balance Recharge",
                order_id: order.id,
                handler: async function (response: any) {
                    try {
                        const verifyRes = await api.post('/finance/razorpay/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            amount: amountNum,
                            userId: user.uid || user._id
                        });

                        if (verifyRes.data?.success) {
                            showToast(`₹${amountNum} added to your wallet!`, 'success');
                            setIsAddMoneyOpen(false);
                            fetchBalance();
                            fetchTransactions();
                        }
                    } catch (e) {
                        console.error("Top-up verification error", e);
                        showToast('Verification failed. If deducted, your balance will sync automatically.', 'error');
                    } finally {
                        setAddLoading(false);
                    }
                },
                prefill: {
                    name: user.name || "APEX User",
                    contact: user.phone || ""
                },
                theme: { color: "#4A1D96" },
                modal: {
                    ondismiss: () => setAddLoading(false)
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (err: any) {
            console.error('Wallet recharge error:', err);
            showToast(err.response?.data?.error || 'Failed to start wallet recharge', 'error');
            setAddLoading(false);
        }
    };

    // 10. Action: P2P Wallet Transfer to another phone number
    const handleP2pTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = Number(sendAmount);
        const cleanPhone = sendPhone.replace(/[^\d]/g, '').slice(-10);

        if (cleanPhone.length !== 10) {
            showToast('Please enter a valid 10-digit phone number', 'warning');
            return;
        }
        if (!amountNum || amountNum <= 0) {
            showToast('Please enter a valid transfer amount', 'warning');
            return;
        }
        if (walletBalance < amountNum) {
            showToast(`Insufficient wallet balance (₹${walletBalance.toFixed(2)})`, 'error');
            return;
        }

        setSendLoading(true);
        try {
            const res = await api.post('/finance/wallet/transfer', {
                recipientPhone: cleanPhone,
                amount: amountNum,
                note: sendNote,
                userId: user?.uid || user?._id
            });

            if (res.data?.success) {
                showToast(res.data.message || `₹${amountNum} transferred successfully!`, 'success');
                setIsSendMoneyOpen(false);
                setSendPhone('');
                setSendAmount('');
                setSendNote('');
                setWalletBalance(res.data.newBalance);
                fetchTransactions();
            } else {
                showToast(res.data?.error || 'Transfer failed', 'error');
            }
        } catch (err: any) {
            console.error('P2P Transfer error:', err);
            showToast(err.response?.data?.error || 'Failed to transfer funds', 'error');
        } finally {
            setSendLoading(false);
        }
    };

    // 11. Open My QR Code
    const handleOpenMyQr = async () => {
        setIsMyQrOpen(true);
        try {
            const res = await api.get(`/finance/my-qr?userId=${user?.uid || user?._id}`);
            if (res.data?.success && res.data.upiUri) {
                setMyQrUpi(res.data.upiUri);
            } else {
                const phone = user?.phone?.replace(/[^\d]/g, '').slice(-10) || '9494273763';
                setMyQrUpi(`upi://pay?pa=${phone}@apex&pn=${encodeURIComponent(user?.name || 'APEX User')}&cu=INR`);
            }
        } catch {
            const phone = user?.phone?.replace(/[^\d]/g, '').slice(-10) || '9494273763';
            setMyQrUpi(`upi://pay?pa=${phone}@apex&pn=${encodeURIComponent(user?.name || 'APEX User')}&cu=INR`);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pb-24 font-sans antialiased text-slate-900">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />

            {/* TOP APP BAR */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/" className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors">
                        <i className="fa-solid fa-arrow-left text-sm"></i>
                    </Link>
                    <div>
                        <h1 className="font-black text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                            APEX Pay <i className="fa-solid fa-shield-halved text-emerald-600 text-xs"></i>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time Wallet & UPI</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleOpenMyQr}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-all"
                        title="My QR Code"
                    >
                        <i className="fa-solid fa-qrcode"></i>
                        <span>My QR</span>
                    </button>
                    <button
                        onClick={startScanner}
                        className="w-9 h-9 rounded-full bg-violet-700 hover:bg-violet-800 text-white flex items-center justify-center shadow-md shadow-violet-700/20 active:scale-95 transition-all"
                        title="Scan any QR"
                    >
                        <i className="fa-solid fa-camera text-sm"></i>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 max-w-md mx-auto w-full p-4 flex flex-col gap-5">

                {/* 1. EXECUTIVE WALLET CARD */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A0B2E] via-[#2D124D] to-[#431474] text-white p-6 shadow-xl shadow-purple-950/20 border border-purple-800/30">
                    <div className="absolute -right-8 -top-8 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="absolute right-6 bottom-6 opacity-10 text-white pointer-events-none">
                        <i className="fa-solid fa-wallet text-8xl"></i>
                    </div>

                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span className="text-[11px] font-black uppercase tracking-widest text-purple-200">APEX Cash Wallet</span>
                        </div>
                        <button
                            onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                            className="text-purple-300 hover:text-white text-xs font-bold transition-colors"
                        >
                            <i className={`fa-solid ${isBalanceVisible ? 'fa-eye-slash' : 'fa-eye'} mr-1`}></i>
                            {isBalanceVisible ? 'Hide' : 'Show'}
                        </button>
                    </div>

                    {/* Balance Display */}
                    <div className="mb-6 relative z-10">
                        <p className="text-[10px] uppercase font-bold text-purple-300/80 tracking-wider mb-1">Available Balance</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-amber-400">₹</span>
                            <span className="text-4xl font-black tracking-tight">
                                {isBalanceVisible ? walletBalance.toFixed(2) : '••••••'}
                            </span>
                        </div>
                    </div>

                    {/* Quick Wallet Action Pills */}
                    <div className="grid grid-cols-4 gap-2 relative z-10 pt-2 border-t border-white/10">
                        <button
                            onClick={startScanner}
                            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md text-white transition-all active:scale-95"
                        >
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300">
                                <i className="fa-solid fa-qrcode text-sm"></i>
                            </div>
                            <span className="text-[10px] font-black">Scan</span>
                        </button>

                        <button
                            onClick={() => setIsAddMoneyOpen(true)}
                            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md text-white transition-all active:scale-95"
                        >
                            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300">
                                <i className="fa-solid fa-plus text-sm"></i>
                            </div>
                            <span className="text-[10px] font-black">Add</span>
                        </button>

                        <button
                            onClick={() => setIsSendMoneyOpen(true)}
                            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md text-white transition-all active:scale-95"
                        >
                            <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-300">
                                <i className="fa-solid fa-paper-plane text-sm"></i>
                            </div>
                            <span className="text-[10px] font-black">Send</span>
                        </button>

                        <button
                            onClick={handleOpenMyQr}
                            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md text-white transition-all active:scale-95"
                        >
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300">
                                <i className="fa-solid fa-arrow-down-to-bracket text-sm"></i>
                            </div>
                            <span className="text-[10px] font-black">Receive</span>
                        </button>
                    </div>
                </div>

                {/* 2. INSTANT SERVICES GRID */}
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">Quick Utilities & Bills</h2>
                        <Link href="/utility" className="text-[11px] font-bold text-violet-700 hover:underline">
                            View All <i className="fa-solid fa-chevron-right text-[9px]"></i>
                        </Link>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                        <Link href="/utility?type=mobile" className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-base group-hover:scale-105 transition-transform">
                                <i className="fa-solid fa-mobile-screen"></i>
                            </div>
                            <span className="text-[10px] font-bold text-slate-600">Recharge</span>
                        </Link>

                        <Link href="/utility?type=electricity" className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-base group-hover:scale-105 transition-transform">
                                <i className="fa-solid fa-bolt"></i>
                            </div>
                            <span className="text-[10px] font-bold text-slate-600">Electricity</span>
                        </Link>

                        <Link href="/utility?type=dth" className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-base group-hover:scale-105 transition-transform">
                                <i className="fa-solid fa-tv"></i>
                            </div>
                            <span className="text-[10px] font-bold text-slate-600">DTH</span>
                        </Link>

                        <button onClick={() => setIsSendMoneyOpen(true)} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base group-hover:scale-105 transition-transform">
                                <i className="fa-solid fa-users"></i>
                            </div>
                            <span className="text-[10px] font-bold text-slate-600">To Mobile</span>
                        </button>
                    </div>
                </div>

                {/* 3. PASSBOOK & TRANSACTION HISTORY */}
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">Passbook Ledger</h2>
                            {txLoading && <div className="w-3.5 h-3.5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>}
                        </div>
                        <button
                            onClick={() => { fetchBalance(); fetchTransactions(); }}
                            className="text-slate-400 hover:text-slate-600 text-xs transition-colors"
                            title="Refresh Transactions"
                        >
                            <i className="fa-solid fa-arrows-rotate"></i>
                        </button>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setActiveTab('debit')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'debit' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Paid
                        </button>
                        <button
                            onClick={() => setActiveTab('credit')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'credit' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Received
                        </button>
                    </div>

                    {/* Transaction List */}
                    <div className="flex flex-col divide-y divide-slate-100 min-h-[220px]">
                        {transactions.length > 0 ? (
                            transactions.map((tx) => {
                                const isCredit = tx.type === 'credit';
                                const dateStr = new Date(tx.createdAt).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });

                                return (
                                    <div key={tx._id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 px-1 rounded-xl transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                <i className={`fa-solid ${isCredit ? 'fa-arrow-down-left' : 'fa-arrow-up-right'}`}></i>
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black text-slate-900 line-clamp-1">
                                                    {tx.referenceId || (isCredit ? 'Money Received' : 'Payment Made')}
                                                </h4>
                                                <p className="text-[10px] text-slate-400 font-semibold">{dateStr}</p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className={`text-sm font-black ${isCredit ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                {isCredit ? '+' : '-'} ₹{tx.amount.toFixed(2)}
                                            </p>
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block uppercase tracking-wider ${
                                                tx.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                                                tx.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                                            }`}>
                                                {tx.status}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-2xl mb-3">
                                    <i className="fa-solid fa-receipt"></i>
                                </div>
                                <h3 className="text-xs font-black text-slate-700">No transactions recorded</h3>
                                <p className="text-[10px] text-slate-400 max-w-[200px] mt-0.5">Top up your wallet or scan a QR code to make your first transaction.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* FULL-SCREEN CAMERA SCANNER MODAL */}
            {isScannerOpen && (
                <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-[fadeIn_0.2s_ease-out]">
                    {/* Scanner Top Bar */}
                    <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-50">
                        <button
                            onClick={() => stopScanner()}
                            className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-md active:scale-95 transition-transform"
                        >
                            <i className="fa-solid fa-xmark text-lg"></i>
                        </button>
                        <div className="text-center">
                            <h2 className="text-white font-black tracking-wider text-xs uppercase">Scan any QR Code</h2>
                            <p className="text-[10px] text-emerald-300 font-bold">UPI • BharatQR • APEX Pay</p>
                        </div>
                        <div className="w-10"></div>
                    </div>

                    {/* Camera Feed & Targeting Frame */}
                    <div className="flex-1 w-full h-full relative flex items-center justify-center overflow-hidden bg-black">
                        <div id="reader" className="absolute inset-0 w-full h-full flex items-center justify-center [&>div]:hidden bg-black"></div>

                        {/* PhonePe Style Overlay Cutout */}
                        <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center">
                            <div className="relative w-64 h-64 border border-white/30 rounded-2xl overflow-hidden shadow-[0_0_0_4000px_rgba(0,0,0,0.65)]">
                                {/* Corner Brackets */}
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl"></div>
                                {/* Laser Scan Line */}
                                <div className="qr-scan-line"></div>
                            </div>
                        </div>

                        {scannerError ? (
                            <div className="absolute z-50 p-6 bg-red-950/90 text-white rounded-2xl max-w-xs text-center border border-red-800">
                                <i className="fa-solid fa-triangle-exclamation text-3xl text-red-400 mb-2"></i>
                                <h3 className="text-sm font-black mb-1">Camera Access Required</h3>
                                <p className="text-xs text-red-200 mb-4">{scannerError}</p>
                                <button
                                    onClick={() => stopScanner()}
                                    className="px-4 py-2 bg-white text-red-950 text-xs font-black rounded-xl"
                                >
                                    Close Scanner
                                </button>
                            </div>
                        ) : (
                            <p className="absolute bottom-12 left-1/2 -translate-x-1/2 w-max text-white font-bold text-xs z-50 bg-black/60 px-5 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
                                <i className="fa-solid fa-expand text-emerald-400 mr-2"></i> Align QR inside the frame
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* SCANNED BENEFICIARY PAYMENT SHEET MODAL */}
            {scannedPayee && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-[slideUp_0.3s_ease-out] flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
                        {/* Header with Beneficiary Avatar */}
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 text-white flex items-center justify-center text-xl font-black shadow-md shadow-violet-600/20">
                                    {scannedPayee.pn.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-black text-base text-slate-900 line-clamp-1">{scannedPayee.pn}</h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <i className="fa-solid fa-circle-check text-[9px]"></i>
                                            {scannedPayee.isApex ? 'APEX Verified User' : 'NPCI UPI Merchant'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-mono mt-0.5 line-clamp-1">{scannedPayee.pa}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setScannedPayee(null)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        {/* Amount Section */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Enter Amount to Pay</label>
                            <div className="relative flex items-center">
                                <span className="absolute left-3 text-2xl font-black text-slate-500">₹</span>
                                <input
                                    type="number"
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full pl-9 pr-3 py-2 bg-transparent text-3xl font-black text-slate-900 focus:outline-none"
                                />
                            </div>

                            {/* Preset Amount Chips */}
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200/60">
                                {[100, 200, 500, 1000].map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => setPayAmount(String(preset))}
                                        className="flex-1 py-1 text-xs font-black bg-white hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 shadow-2xs transition-all active:scale-95"
                                    >
                                        +₹{preset}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Note Input */}
                        <div>
                            <input
                                type="text"
                                value={payNote}
                                onChange={(e) => setPayNote(e.target.value)}
                                placeholder="Add a note (e.g. Groceries, Dinner)"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-violet-600 transition-colors"
                            />
                        </div>

                        {/* Payment Method Selector */}
                        <div className="flex flex-col gap-2.5">
                            {/* Option 1: APEX Cash Wallet */}
                            <button
                                onClick={handlePayWithWallet}
                                disabled={payLoading || !payAmount || Number(payAmount) <= 0 || walletBalance < Number(payAmount)}
                                className={`w-full p-3.5 rounded-2xl flex items-center justify-between border transition-all ${
                                    walletBalance >= Number(payAmount || 0) && Number(payAmount || 0) > 0
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-lg shadow-emerald-600/20 active:scale-[0.98]'
                                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-80'
                                }`}
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                                        <i className="fa-solid fa-wallet"></i>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black">Pay via APEX Wallet</h4>
                                        <p className="text-[10px] opacity-80 font-bold">Balance: ₹{walletBalance.toFixed(2)}</p>
                                    </div>
                                </div>
                                <span className="text-xs font-black">
                                    {payLoading ? 'Processing...' : 'Instant 1-Tap'}
                                </span>
                            </button>

                            {/* Option 2: Direct UPI Intent (PhonePe, GPay, Paytm) */}
                            {!scannedPayee.isApex && !scannedPayee.isUrl && (
                                <button
                                    onClick={handlePayWithUpiIntent}
                                    disabled={payLoading || !payAmount || Number(payAmount) <= 0}
                                    className="w-full p-3.5 rounded-2xl bg-violet-700 hover:bg-violet-800 text-white flex items-center justify-between border border-violet-600 shadow-md shadow-violet-700/20 active:scale-[0.98] transition-all"
                                >
                                    <div className="flex items-center gap-3 text-left">
                                        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                                            <i className="fa-solid fa-mobile-screen"></i>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black">Pay via UPI Apps</h4>
                                            <p className="text-[10px] text-violet-200 font-bold">GPay • PhonePe • Paytm • BHIM</p>
                                        </div>
                                    </div>
                                    <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                                </button>
                            )}

                            {/* Option 3: Online Gateway Fallback */}
                            <button
                                onClick={handlePayWithRazorpay}
                                disabled={payLoading || !payAmount || Number(payAmount) <= 0}
                                className="w-full py-2.5 text-center text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                            >
                                Pay with Cards / Netbanking / Other UPI
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PAYMENT SUCCESS RECEIPT MODAL */}
            {paymentSuccess && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl animate-[scaleUp_0.3s_ease-out] flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mb-4 animate-[bounce_1s_ease-in-out]">
                            <i className="fa-solid fa-check"></i>
                        </div>
                        <h2 className="text-xl font-black text-slate-900 mb-0.5">Payment Successful!</h2>
                        <p className="text-xs text-slate-400 font-semibold mb-5">Transaction verified & settled</p>

                        {/* Receipt Box */}
                        <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 text-left flex flex-col gap-2.5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-bold">Amount Paid</span>
                                <span className="text-base font-black text-slate-900">₹{paymentSuccess.amount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-bold">Paid To</span>
                                <span className="font-black text-slate-800 line-clamp-1">{paymentSuccess.payeeName}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-bold">Transaction ID</span>
                                <span className="font-mono text-[11px] text-slate-600">{paymentSuccess.txId.slice(-8)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-bold">Time</span>
                                <span className="font-bold text-slate-600">{paymentSuccess.timestamp}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => { setPaymentSuccess(null); fetchBalance(); fetchTransactions(); }}
                            className="w-full py-3.5 bg-slate-900 hover:bg-black text-white font-black rounded-xl text-sm shadow-lg transition-all"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* ADD MONEY MODAL */}
            {isAddMoneyOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-[slideUp_0.3s_ease-out] flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                                    <i className="fa-solid fa-plus"></i>
                                </div>
                                <h3 className="text-base font-black text-slate-900">Add Money to Wallet</h3>
                            </div>
                            <button onClick={() => setIsAddMoneyOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        {/* Amount Input */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Enter Top-up Amount</label>
                            <div className="relative flex items-center">
                                <span className="absolute left-3 text-2xl font-black text-slate-500">₹</span>
                                <input
                                    type="number"
                                    value={addAmount}
                                    onChange={(e) => setAddAmount(e.target.value)}
                                    placeholder="500"
                                    className="w-full pl-9 pr-3 py-2 bg-transparent text-3xl font-black text-slate-900 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="grid grid-cols-4 gap-2">
                            {[100, 500, 1000, 2000].map((preset) => (
                                <button
                                    key={preset}
                                    onClick={() => setAddAmount(String(preset))}
                                    className={`py-2 text-xs font-black rounded-xl border transition-all ${
                                        addAmount === String(preset)
                                            ? 'bg-violet-700 text-white border-violet-700 shadow-sm'
                                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                                    }`}
                                >
                                    +₹{preset}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleAddMoneySubmit}
                            disabled={addLoading || !addAmount || Number(addAmount) <= 0}
                            className="w-full py-4 bg-violet-700 hover:bg-violet-800 disabled:bg-slate-300 text-white font-black rounded-2xl shadow-lg shadow-violet-700/30 transition-all flex items-center justify-center gap-2 mt-2"
                        >
                            {addLoading ? (
                                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Loading Gateway...</>
                            ) : (
                                <>Proceed to Add ₹{Number(addAmount || 0).toFixed(2)}</>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* SEND MONEY (P2P) MODAL */}
            {isSendMoneyOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-[fadeIn_0.2s_ease-out]">
                    <form onSubmit={handleP2pTransfer} className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-[slideUp_0.3s_ease-out] flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-black">
                                    <i className="fa-solid fa-paper-plane"></i>
                                </div>
                                <h3 className="text-base font-black text-slate-900">Transfer to APEX User</h3>
                            </div>
                            <button type="button" onClick={() => setIsSendMoneyOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        {/* Recipient Phone */}
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Recipient Mobile Number</label>
                            <div className="relative flex items-center">
                                <span className="absolute left-3 text-xs font-bold text-slate-400">+91</span>
                                <input
                                    type="tel"
                                    maxLength={10}
                                    value={sendPhone}
                                    onChange={(e) => setSendPhone(e.target.value)}
                                    placeholder="Enter 10-digit mobile"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black focus:outline-none focus:border-sky-500"
                                    required
                                />
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Transfer Amount</label>
                            <div className="relative flex items-center">
                                <span className="absolute left-3 text-xl font-black text-slate-500">₹</span>
                                <input
                                    type="number"
                                    value={sendAmount}
                                    onChange={(e) => setSendAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full pl-8 pr-3 py-1 bg-transparent text-2xl font-black text-slate-900 focus:outline-none"
                                    required
                                />
                            </div>
                        </div>

                        {/* Optional Note */}
                        <div>
                            <input
                                type="text"
                                value={sendNote}
                                onChange={(e) => setSendNote(e.target.value)}
                                placeholder="Note (e.g. Rent, Lunch, Gift)"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-sky-500"
                            />
                        </div>

                        <div className="flex items-center justify-between text-xs px-1">
                            <span className="text-slate-400 font-bold">Your Wallet Balance:</span>
                            <span className="font-black text-slate-800">₹{walletBalance.toFixed(2)}</span>
                        </div>

                        <button
                            type="submit"
                            disabled={sendLoading || !sendPhone || !sendAmount || Number(sendAmount) <= 0}
                            className="w-full py-4 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-black rounded-2xl shadow-lg shadow-sky-600/30 transition-all flex items-center justify-center gap-2 mt-2"
                        >
                            {sendLoading ? 'Transferring Funds...' : `Send ₹${Number(sendAmount || 0).toFixed(2)} Now`}
                        </button>
                    </form>
                </div>
            )}

            {/* MY QR CODE MODAL */}
            {isMyQrOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl animate-[scaleUp_0.3s_ease-out] flex flex-col items-center">
                        <div className="flex items-center justify-between w-full mb-4">
                            <span className="text-xs font-black uppercase text-purple-700 tracking-wider">Accept Payments</span>
                            <button onClick={() => setIsMyQrOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-black mb-2">
                            {(user?.name || 'APEX').charAt(0).toUpperCase()}
                        </div>
                        <h3 className="font-black text-base text-slate-900">{user?.name || 'APEX User'}</h3>
                        <p className="text-xs text-slate-500 font-mono mb-4">{user?.phone || 'APEX Account'}</p>

                        {/* Real Dynamic QR Code Generator */}
                        <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-md mb-4 flex items-center justify-center">
                            {myQrUpi ? (
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(myQrUpi)}`}
                                    alt="My QR Code"
                                    className="w-48 h-48 object-contain"
                                />
                            ) : (
                                <div className="w-48 h-48 flex items-center justify-center">
                                    <div className="w-8 h-8 border-3 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>

                        <p className="text-[10px] text-slate-400 font-bold max-w-[220px] mb-4">
                            Scan with PhonePe, Google Pay, Paytm, or any UPI app to pay directly.
                        </p>

                        <button
                            onClick={() => {
                                if (navigator.share && myQrUpi) {
                                    navigator.share({
                                        title: 'Pay me on APEX',
                                        text: `Pay ${user?.name || 'me'} using UPI: ${myQrUpi}`,
                                        url: myQrUpi
                                    }).catch(() => {});
                                } else {
                                    navigator.clipboard.writeText(myQrUpi);
                                    showToast('UPI Link copied to clipboard!', 'success');
                                }
                            }}
                            className="w-full py-3 bg-violet-50 hover:bg-violet-100 text-violet-700 font-black rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                        >
                            <i className="fa-solid fa-share-nodes"></i> Share Payment Link
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PaymentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-9 h-9 border-4 border-violet-700 border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <PaymentContent />
        </Suspense>
    );
}
