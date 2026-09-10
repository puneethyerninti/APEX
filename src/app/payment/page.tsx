"use client";

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import { useSocket } from '@/context/SocketContext';

interface ScannedPayee {
    pa: string;
    pn: string;
    am?: string;
    tn?: string;
    cu?: string;
    raw: string;
    isApex?: boolean;
}

interface TransactionItem {
    _id: string;
    amount: number;
    type: 'credit' | 'debit';
    category: string;
    referenceId?: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    createdAt: string;
}

function PaymentContent() {
    const user = useAppStore((state) => state.user);
    const walletBalance = useAppStore((state) => state.walletBalance);
    const setWalletBalance = useAppStore((state) => state.setWalletBalance);
    const { socket } = useSocket();

    const searchParams = useSearchParams();
    const autoScan = searchParams.get('scan') === 'true';

    const [isBalanceVisible, setIsBalanceVisible] = useState(true);
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [txLoading, setTxLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'debit' | 'credit'>('all');

    const [isScannerOpen, setIsScannerOpen] = useState(autoScan);
    const [scannerError, setScannerError] = useState<string | null>(null);
    const scannerRef = useRef<any>(null);

    const [scannedPayee, setScannedPayee] = useState<ScannedPayee | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [payNote, setPayNote] = useState('');
    const [payLoading, setPayLoading] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState<any | null>(null);

    const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
    const [addAmount, setAddAmount] = useState('500');
    const [addLoading, setAddLoading] = useState(false);

    const [isSendMoneyOpen, setIsSendMoneyOpen] = useState(false);
    const [sendPhone, setSendPhone] = useState('');
    const [sendAmount, setSendAmount] = useState('');
    const [sendNote, setSendNote] = useState('');
    const [sendLoading, setSendLoading] = useState(false);

    const [isMyQrOpen, setIsMyQrOpen] = useState(false);
    const [myQrUpi, setMyQrUpi] = useState('');

    const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('showToast', { detail: { message, type } }));
        }
    };

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

    const parseScannedText = (decodedText: string) => {
        const trimmed = decodedText.trim();
        
        let url: URL;
        try {
            url = new URL(trimmed.replace('upi://pay', 'http://upi.pay'));
        } catch {
            showToast('Invalid QR Code format', 'error');
            return;
        }

        if (trimmed.toLowerCase().startsWith('upi://pay') || url.searchParams.has('pa')) {
            const pa = url.searchParams.get('pa') || '';
            const pn = decodeURIComponent(url.searchParams.get('pn') || 'Merchant').replace(/\+/g, ' ');
            const am = url.searchParams.get('am') || '';
            const tn = decodeURIComponent(url.searchParams.get('tn') || '').replace(/\+/g, ' ');
            const cu = url.searchParams.get('cu') || 'INR';

            setScannedPayee({ pa, pn, am, tn, cu, raw: trimmed });
            setPayAmount(am || '');
            setPayNote(tn || '');
            return;
        }

        if (trimmed.toLowerCase().startsWith('apex://pay')) {
            const phone = url.searchParams.get('phone') || '';
            const name = decodeURIComponent(url.searchParams.get('name') || 'APEX User');
            setScannedPayee({ pa: phone, pn: name, isApex: true, raw: trimmed });
            return;
        }

        // If it's just a website link (like apextradingcompany.com) without payment parameters
        showToast('Please scan a valid Payment QR code. Scanned a website link instead.', 'warning');
    };

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
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        stopScanner(html5QrCode);
                        parseScannedText(decodedText);
                    },
                    () => {}
                );
            } catch (err: any) {
                console.error("Scanner access error:", err);
                setScannerError('Unable to access device camera. Please grant camera permission.');
            }
        }, 50); // Reduced timeout to fix delay issue
    };

    const stopScanner = async (instance?: any) => {
        const qrCode = instance || scannerRef.current;
        if (qrCode) {
            try {
                await qrCode.stop();
                qrCode.clear();
            } catch (err) {}
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

    const handlePayWithWallet = async () => {
        const amountNum = Number(payAmount);
        if (!amountNum || amountNum <= 0) {
            showToast('Please enter a valid payment amount', 'warning');
            return;
        }
        if (walletBalance < amountNum) {
            showToast(`Insufficient balance (₹${walletBalance.toFixed(2)}).`, 'error');
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
            showToast(error.response?.data?.error || 'Failed to complete payment', 'error');
        } finally {
            setPayLoading(false);
        }
    };

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

    const handlePayWithRazorpay = async () => {
        const amountNum = Number(payAmount);
        if (!amountNum || amountNum <= 0) {
            showToast('Please enter a valid amount', 'warning');
            return;
        }
        setPayLoading(true);
        try {
            const orderRes = await api.post('/finance/razorpay/order', {
                amount: amountNum,
                userId: user?.uid || user?._id,
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
                            userId: user?.uid || user?._id
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
                        showToast('Verification failed after payment capture', 'error');
                    } finally {
                        setPayLoading(false);
                    }
                },
                prefill: {
                    name: user?.name || "APEX User",
                    contact: user?.phone || ""
                },
                theme: { color: "#059669" }, // emerald-600
                modal: {
                    ondismiss: () => setPayLoading(false)
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Failed to initiate gateway payment', 'error');
            setPayLoading(false);
        }
    };

    const handleAddMoneySubmit = async () => {
        const amountNum = Number(addAmount);
        if (!amountNum || amountNum < 1) {
            showToast('Enter an amount of at least ₹1', 'warning');
            return;
        }

        setAddLoading(true);
        try {
            const orderRes = await api.post('/finance/razorpay/order', {
                amount: amountNum,
                userId: user?.uid || user?._id,
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
                            userId: user?.uid || user?._id
                        });

                        if (verifyRes.data?.success) {
                            showToast(`₹${amountNum} added to your wallet!`, 'success');
                            setIsAddMoneyOpen(false);
                            fetchBalance();
                            fetchTransactions();
                        }
                    } catch (e) {
                        showToast('Verification failed.', 'error');
                    } finally {
                        setAddLoading(false);
                    }
                },
                prefill: {
                    name: user?.name || "APEX User",
                    contact: user?.phone || ""
                },
                theme: { color: "#059669" },
                modal: {
                    ondismiss: () => setAddLoading(false)
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Failed to start wallet recharge', 'error');
            setAddLoading(false);
        }
    };

    const handleP2pTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = Number(sendAmount);
        const cleanPhone = sendPhone.replace(/[^\d]/g, '').slice(-10);

        if (cleanPhone.length !== 10 || !amountNum || amountNum <= 0) {
            showToast('Please enter a valid phone and amount', 'warning');
            return;
        }
        if (walletBalance < amountNum) {
            showToast(`Insufficient wallet balance`, 'error');
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
                showToast(`₹${amountNum} transferred successfully!`, 'success');
                setIsSendMoneyOpen(false);
                setSendPhone('');
                setSendAmount('');
                setSendNote('');
                fetchBalance();
                fetchTransactions();
            } else {
                showToast(res.data?.error || 'Transfer failed', 'error');
            }
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Failed to transfer funds', 'error');
        } finally {
            setSendLoading(false);
        }
    };

    const handleOpenMyQr = async () => {
        setIsMyQrOpen(true);
        const phone = user?.phone?.replace(/[^\d]/g, '').slice(-10) || '9494273763';
        setMyQrUpi(`upi://pay?pa=${phone}@apex&pn=${encodeURIComponent(user?.name || 'APEX User')}&cu=INR`);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-24 text-gray-900">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />

            {/* HEADER */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <Link href="/" className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors">
                        <i className="fa-solid fa-arrow-left text-sm"></i>
                    </Link>
                    <h1 className="font-black text-lg text-gray-900">APEX Pay</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleOpenMyQr} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-700">
                        <i className="fa-solid fa-qrcode"></i>
                    </button>
                    <button onClick={startScanner} className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <i className="fa-solid fa-camera text-sm"></i>
                    </button>
                </div>
            </div>

            <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-5">
                
                {/* WALLET CARD */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Available Balance</span>
                        <button onClick={() => setIsBalanceVisible(!isBalanceVisible)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">
                            {isBalanceVisible ? 'Hide' : 'Show'}
                        </button>
                    </div>
                    <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-xl font-black text-gray-400">₹</span>
                        <span className="text-3xl font-black text-gray-900">
                            {isBalanceVisible ? walletBalance.toFixed(2) : '••••••'}
                        </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        <button onClick={startScanner} className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-gray-700">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                                <i className="fa-solid fa-qrcode text-emerald-600"></i>
                            </div>
                            <span className="text-[10px] font-bold">Scan</span>
                        </button>
                        <button onClick={() => setIsAddMoneyOpen(true)} className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-gray-700">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                                <i className="fa-solid fa-plus text-emerald-600"></i>
                            </div>
                            <span className="text-[10px] font-bold">Topup</span>
                        </button>
                        <button onClick={() => setIsSendMoneyOpen(true)} className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-gray-700">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                                <i className="fa-solid fa-paper-plane text-emerald-600"></i>
                            </div>
                            <span className="text-[10px] font-bold">Send</span>
                        </button>
                        <button onClick={handleOpenMyQr} className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-gray-700">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                                <i className="fa-solid fa-arrow-down-to-bracket text-emerald-600"></i>
                            </div>
                            <span className="text-[10px] font-bold">Receive</span>
                        </button>
                    </div>
                </div>

                {/* TRANSACTIONS */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xs font-black uppercase tracking-wider text-gray-400">Recent Transactions</h2>
                        <button onClick={fetchTransactions} className="text-gray-400 hover:text-gray-600 text-xs"><i className="fa-solid fa-rotate-right"></i></button>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                        <button onClick={() => setActiveTab('all')} className={`text-xs px-3 py-1.5 rounded-lg font-bold ${activeTab === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>All</button>
                        <button onClick={() => setActiveTab('debit')} className={`text-xs px-3 py-1.5 rounded-lg font-bold ${activeTab === 'debit' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>Paid</button>
                        <button onClick={() => setActiveTab('credit')} className={`text-xs px-3 py-1.5 rounded-lg font-bold ${activeTab === 'credit' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>Received</button>
                    </div>

                    <div className="flex flex-col divide-y divide-gray-50 min-h-[200px]">
                        {transactions.length > 0 ? transactions.map((tx) => (
                            <div key={tx._id} className="py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm ${tx.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        <i className={`fa-solid ${tx.type === 'credit' ? 'fa-arrow-down' : 'fa-arrow-up'}`}></i>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-gray-900 truncate max-w-[150px]">{tx.referenceId || 'Transaction'}</h4>
                                        <p className="text-[10px] text-gray-400 font-semibold">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-black ${tx.type === 'credit' ? 'text-emerald-600' : 'text-gray-900'}`}>
                                        {tx.type === 'credit' ? '+' : '-'} ₹{tx.amount.toFixed(2)}
                                    </p>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase">{tx.status}</span>
                                </div>
                            </div>
                        )) : (
                            <div className="py-8 text-center text-gray-400 text-xs font-bold">No transactions found</div>
                        )}
                    </div>
                </div>

            </div>

            {/* SCANNER OVERLAY */}
            {isScannerOpen && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-[fadeIn_0.2s_ease-out]">
                    <div className="p-4 flex justify-between items-center bg-black/50 absolute top-0 w-full z-50">
                        <button onClick={() => stopScanner()} className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center">
                            <i className="fa-solid fa-xmark text-lg"></i>
                        </button>
                        <h2 className="text-white font-black text-sm">Scan QR Code</h2>
                        <div className="w-10"></div>
                    </div>
                    <div className="flex-1 w-full h-full relative flex items-center justify-center">
                        <div id="reader" className="w-full max-w-sm h-96 bg-black flex items-center justify-center"></div>
                        {scannerError && (
                            <div className="absolute p-4 bg-white text-red-600 rounded-xl max-w-xs text-center mx-4 text-xs font-bold">
                                {scannerError}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PAYMENT SHEET */}
            {scannedPayee && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-end justify-center animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-white w-full max-w-md rounded-t-3xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto pb-8 animate-[slideUp_0.3s_ease-out]">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-emerald-600 text-xl font-black">
                                    {scannedPayee.pn.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 text-base line-clamp-1">{scannedPayee.pn}</h3>
                                    <p className="text-xs text-gray-500 font-mono truncate max-w-[200px]">{scannedPayee.pa}</p>
                                </div>
                            </div>
                            <button onClick={() => setScannedPayee(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Amount</label>
                            <div className="relative flex items-center">
                                <span className="absolute left-0 text-2xl font-black text-gray-400">₹</span>
                                <input
                                    type="number"
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full pl-8 py-2 bg-transparent text-3xl font-black text-gray-900 focus:outline-none"
                                />
                            </div>
                        </div>

                        <input
                            type="text"
                            value={payNote}
                            onChange={(e) => setPayNote(e.target.value)}
                            placeholder="Add a note (optional)"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                        />

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handlePayWithWallet}
                                disabled={payLoading || !payAmount || Number(payAmount) <= 0 || walletBalance < Number(payAmount)}
                                className={`w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all ${walletBalance >= Number(payAmount || 0) && Number(payAmount || 0) > 0 ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                            >
                                {payLoading ? 'Processing...' : 'Pay with Wallet'}
                            </button>

                            <button
                                onClick={handlePayWithUpiIntent}
                                disabled={payLoading || !payAmount || Number(payAmount) <= 0}
                                className={`w-full py-4 rounded-xl border-2 font-black flex items-center justify-center gap-2 transition-all ${!payAmount || Number(payAmount) <= 0 ? 'border-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-100 text-gray-700 hover:bg-gray-50 active:scale-[0.98]'}`}
                            >
                                Pay with UPI App (GPay/PhonePe)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TOPUP MODAL */}
            {isAddMoneyOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-end justify-center animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-white w-full max-w-md rounded-t-3xl p-6 flex flex-col gap-4 pb-8 animate-[slideUp_0.3s_ease-out]">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-black text-gray-900 text-lg">Topup Wallet</h3>
                            <button onClick={() => setIsAddMoneyOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="relative flex items-center">
                                <span className="absolute left-0 text-2xl font-black text-gray-400">₹</span>
                                <input
                                    type="number"
                                    value={addAmount}
                                    onChange={(e) => setAddAmount(e.target.value)}
                                    placeholder="500"
                                    className="w-full pl-8 py-2 bg-transparent text-3xl font-black text-gray-900 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {[100, 500, 1000].map(amt => (
                                <button key={amt} onClick={() => setAddAmount(String(amt))} className="flex-1 py-2 rounded-xl bg-gray-50 text-gray-600 font-bold border border-gray-100 hover:bg-gray-100 active:scale-[0.98] transition-transform">+₹{amt}</button>
                            ))}
                        </div>
                        <button
                            onClick={handleAddMoneySubmit}
                            disabled={addLoading || !addAmount || Number(addAmount) <= 0}
                            className="w-full py-4 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                            {addLoading ? 'Loading Gateway...' : 'Proceed to Add'}
                        </button>
                    </div>
                </div>
            )}

            {/* SEND MODAL */}
            {isSendMoneyOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-end justify-center animate-[fadeIn_0.2s_ease-out]">
                    <form onSubmit={handleP2pTransfer} className="bg-white w-full max-w-md rounded-t-3xl p-6 flex flex-col gap-4 pb-8 animate-[slideUp_0.3s_ease-out]">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-black text-gray-900 text-lg">Send Money</h3>
                            <button type="button" onClick={() => setIsSendMoneyOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <input
                            type="tel"
                            maxLength={10}
                            value={sendPhone}
                            onChange={(e) => setSendPhone(e.target.value)}
                            placeholder="Mobile Number"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-emerald-500 font-bold"
                            required
                        />
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="relative flex items-center">
                                <span className="absolute left-0 text-xl font-black text-gray-400">₹</span>
                                <input
                                    type="number"
                                    value={sendAmount}
                                    onChange={(e) => setSendAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full pl-6 py-1 bg-transparent text-2xl font-black text-gray-900 focus:outline-none"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={sendLoading || !sendPhone || !sendAmount || Number(sendAmount) <= 0}
                            className="w-full py-4 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                            {sendLoading ? 'Processing...' : 'Send Money'}
                        </button>
                    </form>
                </div>
            )}

            {/* MY QR MODAL */}
            {isMyQrOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center flex flex-col items-center animate-[scaleUp_0.3s_ease-out]">
                        <div className="flex justify-between items-center w-full mb-4">
                            <h3 className="font-black text-gray-900 text-lg">My QR Code</h3>
                            <button onClick={() => setIsMyQrOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 mb-4 inline-block shadow-sm">
                            {myQrUpi ? (
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(myQrUpi)}`} alt="QR" className="w-48 h-48" />
                            ) : (
                                <div className="w-48 h-48 bg-gray-50 rounded-xl animate-pulse"></div>
                            )}
                        </div>
                        <h4 className="font-black text-gray-900">{user?.name || 'APEX User'}</h4>
                        <p className="text-sm text-gray-500 font-mono mb-4">{user?.phone || ''}</p>
                    </div>
                </div>
            )}

            {/* SUCCESS MODAL */}
            {paymentSuccess && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center flex flex-col items-center animate-[scaleUp_0.3s_ease-out]">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mb-4">
                            <i className="fa-solid fa-check"></i>
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mb-1">Payment Successful</h2>
                        <p className="text-xs text-gray-500 font-bold mb-6">₹{paymentSuccess.amount.toFixed(2)} to {paymentSuccess.payeeName}</p>
                        <button
                            onClick={() => { setPaymentSuccess(null); fetchBalance(); fetchTransactions(); }}
                            className="w-full py-4 bg-gray-900 text-white font-black rounded-xl hover:bg-black active:scale-[0.98] transition-transform"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PaymentPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50"></div>}>
            <PaymentContent />
        </Suspense>
    );
}
