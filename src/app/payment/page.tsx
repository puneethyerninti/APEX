"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import { PaymentPayee, parsePaymentPayload, makeUpiIntent, makeReceiveQr, validAmount } from '@/services/paymentPayload';
import { openUpiApp } from '@/services/upiLauncher';
import { pendingWalletTransfer, transferWallet } from '@/services/walletTransfer';
import { useAppStore } from '@/store/useAppStore';
import { useSocket } from '@/context/SocketContext';
import PaymentQr from '@/components/PaymentQr';
import ApexTv from '@/components/ApexTv';
import { APEX_PAY_ENABLED } from '@/config/apexPay';

interface TransactionItem {
  _id: string; amount: number; type: 'credit' | 'debit'; category: string;
  referenceId?: string; status: string; createdAt: string;
}
function toast(message: string, type = 'info') {
  window.dispatchEvent(new CustomEvent('showToast', { detail: { message, type } }));
}
const inputStyle = 'h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200';

export default function PaymentPage() {
  return APEX_PAY_ENABLED ? <ApexPay /> : <ApexTv />;
}

function ApexPay() {
  const user = useAppStore(state => state.user);
  const uid = user?.uid || user?._id;
  const { socket } = useSocket();
  const [balance, setBalance] = useState<number | null>(null);
  const [visible, setVisible] = useState(true);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState<'all' | 'debit' | 'credit'>('all');
  const [loading, setLoading] = useState(false);
  const [balanceError, setBalanceError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [pending, setPending] = useState<ReturnType<typeof pendingWalletTransfer>>(null);
  const [checking, setChecking] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [manualId, setManualId] = useState('');
  const [entryOpen, setEntryOpen] = useState(false);
  const [payee, setPayee] = useState<PaymentPayee | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [payError, setPayError] = useState('');
  const [launching, setLaunching] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [canLaunch, setCanLaunch] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveId, setReceiveId] = useState('');
  const [receiveConfirmed, setReceiveConfirmed] = useState(false);
  const [receiveQr, setReceiveQr] = useState('');
  const [receiveError, setReceiveError] = useState('');
  const account = useRef(uid);
  account.current = uid;
  const syncGeneration = useRef(0);
  const launchLock = useRef(false);

  const refresh = useCallback(async () => {
    const generation = ++syncGeneration.current;
    if (!uid) return;
    setLoading(true);
    const current = () => generation === syncGeneration.current && account.current === uid;
    await Promise.all([
      api.get('/finance/wallet').then(({ data }) => {
        if (!data.success || typeof data.balance !== 'number' || !Number.isFinite(data.balance)) throw new Error();
        if (current()) { setBalance(data.balance); setBalanceError(''); }
      }).catch(() => { if (current()) setBalanceError('Balance unavailable. Your stored balance has not been changed.'); }),
      api.get('/finance/transactions', { params: { page, limit: 20, ...(filter === 'all' ? {} : { type: filter }) } }).then(({ data }) => {
        if (!data.success || !Array.isArray(data.transactions)) throw new Error();
        if (current()) { setTransactions(data.transactions); setPages(Math.max(1, data.pagination?.totalPages || 1)); setHistoryError(''); }
      }).catch(() => { if (current()) setHistoryError('APEX history could not be refreshed.'); })
    ]);
    if (current()) setLoading(false);
  }, [uid, page, filter]);

  useEffect(() => {
    setBalance(null); setTransactions([]); setPage(1); setPages(1); setPending(null);
    setBalanceError(''); setHistoryError(''); setLoading(false); setChecking(false);
    setPayee(null); setScannerOpen(false); setEntryOpen(false); setReceiveOpen(false);
    setManualId(''); setReceiveId(''); setReceiveQr(''); setReceiveConfirmed(false);
    if (uid) try { setPending(pendingWalletTransfer(uid)); } catch { setHistoryError('An earlier transfer needs support review.'); }
    return () => { ++syncGeneration.current; };
  }, [uid]);

  useEffect(() => {
    setCanLaunch(/Android/i.test(navigator.userAgent));
    if (new URLSearchParams(window.location.search).get('scan') === 'true') setScannerOpen(true);
  }, []);

  useEffect(() => {
    void refresh();
    const update = () => { if (!document.hidden) void refresh(); };
    const timer = setInterval(update, 10000);
    document.addEventListener('visibilitychange', update);
    socket?.on('wallet_update', update); socket?.on('connect', update);
    return () => { ++syncGeneration.current; clearInterval(timer); document.removeEventListener('visibilitychange', update); socket?.off('wallet_update', update); socket?.off('connect', update); };
  }, [refresh, socket]);

  function review(raw: string) {
    const destination = parsePaymentPayload(raw);
    setPayee(destination); setAmount(destination.am || ''); setNote(destination.tn || '');
    setPayError(''); setHandoff(false); setEntryOpen(false); setScannerOpen(false);
  }

  useEffect(() => {
    if (!scannerOpen) return;
    let active = true, scanner: any;
    setScannerError('');
    void import('html5-qrcode').then(async ({ Html5Qrcode }) => {
      if (!active) return;
      scanner = new Html5Qrcode('payment-reader');
      await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } }, (raw: string) => {
        if (!active) return;
        try { review(raw); active = false; } catch (e: any) { setScannerError(e.message); }
      }, () => {});
      if (!active) { await scanner.stop().catch(() => {}); scanner.clear(); }
    }).catch(() => { if (active) setScannerError('Camera unavailable. Allow camera access or enter a UPI ID.'); });
    return () => { active = false; if (scanner?.isScanning) void scanner.stop().then(() => scanner.clear()).catch(() => {}); };
  }, [scannerOpen]);

  let paymentUri = '';
  if (payee && validAmount(amount)) try { paymentUri = makeUpiIntent(payee, amount, note); } catch { /* Conflicting QR requirements keep the pay button unavailable. */ }
  async function launch() {
    if (!paymentUri || launchLock.current) return;
    launchLock.current = true; setLaunching(true); setPayError('');
    try { await openUpiApp(paymentUri); setHandoff(true); }
    catch (e: any) { setPayError(e.message || 'Unable to open a UPI app. No payment has been confirmed.'); }
    finally { launchLock.current = false; setLaunching(false); }
  }
  async function checkOldTransfer() {
    if (!uid || checking || !pending?.payload) return;
    setChecking(true);
    try {
      const { data } = await transferWallet(pending.payload);
      if (account.current !== uid) return;
      if (data.success) { setPending(null); toast('Earlier APEX transfer confirmed from the stored receipt.'); void refresh(); }
    } catch (e: any) { if (account.current === uid) toast(e.response?.data?.error || 'Unable to check the earlier transfer. Contact support.', 'warning'); }
    finally { if (account.current === uid) setChecking(false); }
  }
  const close = (label: string, action: () => void) => <button type="button" title={label} aria-label={label} onClick={action} className="h-9 w-9 shrink-0 rounded-full bg-gray-100 text-gray-600"><i className="fas fa-times" /></button>;

  return <div className="min-h-screen bg-gray-50 pb-24 text-gray-900">
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3"><Link href="/" aria-label="Home" className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50"><i className="fas fa-arrow-left" /></Link><h1 className="text-lg font-black">APEX Pay</h1></div>
      <button title="Scan UPI QR" aria-label="Scan UPI QR" onClick={() => setScannerOpen(true)} className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600"><i className="fas fa-camera" /></button>
    </header>
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 p-4">
      <section className="py-2">
        <h2 className="mb-3 text-sm font-bold">UPI Payments</h2>
        <div className="grid grid-cols-3 gap-3">
          {[{ label: 'Scan & Pay', icon: 'fa-qrcode', action: () => setScannerOpen(true) }, { label: 'Pay UPI ID', icon: 'fa-paper-plane', action: () => { setEntryOpen(true); setPayError(''); } }, { label: 'Receive', icon: 'fa-arrow-down', action: () => { setReceiveOpen(true); setReceiveQr(''); setReceiveError(''); } }].map(item => <button key={item.label} onClick={item.action} className="flex min-h-24 min-w-0 flex-col items-center justify-center gap-2 rounded-lg border border-gray-100 bg-white p-2 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><i className={'fas ' + item.icon} /></span><span className="text-xs font-bold">{item.label}</span></button>)}
        </div>
        <p className="mt-3 text-xs text-gray-500">Pay from your bank in a UPI app. No APEX top-up required.</p>
      </section>
      <section className="border-y border-gray-200 py-4">
        <div className="flex items-center justify-between"><h2 className="text-xs font-bold text-gray-500">Previous APEX Balance</h2><button title={visible ? 'Hide balance' : 'Show balance'} aria-label={visible ? 'Hide balance' : 'Show balance'} onClick={() => setVisible(!visible)} className="h-8 w-8 text-gray-500"><i className={'fas ' + (visible ? 'fa-eye-slash' : 'fa-eye')} /></button></div>
        <p className="mt-1 text-2xl font-black">{!uid ? '--' : !visible ? '****' : balance === null ? '--' : 'INR ' + balance.toFixed(2)}</p>
        <p className="mt-2 text-xs text-gray-500">Not your bank balance. New top-ups and wallet transfers are paused. Existing funds remain recorded.</p>
        {balanceError && <p role="alert" className="mt-2 text-xs text-red-700">{balanceError}</p>}
        <a href="https://wa.me/919494273763" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-emerald-700"><i className="fab fa-whatsapp" />Balance support</a>
        {pending && <div className="mt-3 border-t border-amber-200 pt-3 text-xs text-amber-800"><p>Earlier transfer reference: <span className="break-all">{pending.key}</span></p><button disabled={checking} onClick={() => void checkOldTransfer()} className="mt-2 font-bold disabled:opacity-40">{checking ? 'Checking...' : 'Check saved transfer'}</button></div>}
      </section>
      <section>
        <div className="flex items-center justify-between"><h2 className="text-sm font-bold">APEX History</h2><button title="Refresh APEX history" aria-label="Refresh APEX history" disabled={loading} onClick={() => void refresh()} className="h-9 w-9 text-gray-500 disabled:opacity-40"><i className="fas fa-rotate-right" /></button></div>
        <p className="mb-3 text-xs text-gray-500">Bank-to-bank UPI receipts are in your UPI app.</p>
        <div role="tablist" aria-label="APEX transaction filter" className="mb-3 flex gap-2">{(['all', 'debit', 'credit'] as const).map(type => <button key={type} role="tab" aria-selected={filter === type} onClick={() => { setFilter(type); setPage(1); }} className={'rounded-lg px-3 py-1.5 text-xs font-bold ' + (filter === type ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500')}>{type === 'all' ? 'All' : type === 'debit' ? 'Debits' : 'Credits'}</button>)}</div>
        {historyError && <p role="alert" className="py-2 text-xs text-red-700">{historyError}</p>}
        {!uid ? <Link href="/login" className="text-sm text-emerald-700">Sign in to view APEX history</Link> : <div className="divide-y divide-gray-200">{transactions.map(tx => <div key={tx._id} className="flex items-start justify-between gap-3 py-3"><div className="min-w-0"><p className="break-words text-xs font-bold">{tx.referenceId || tx.category}</p><p className="mt-1 text-[10px] text-gray-500">{new Date(tx.createdAt).toLocaleString()}</p></div><div className="shrink-0 text-right"><p className="text-sm font-bold">{tx.type === 'credit' ? '+' : '-'} INR {tx.amount.toFixed(2)}</p><p className="text-[10px] text-gray-500">{tx.status}</p></div></div>)}{!transactions.length && !historyError && <p className="py-8 text-center text-xs text-gray-500">{loading ? 'Refreshing history...' : 'No APEX transactions'}</p>}</div>}
        {pages > 1 && <div className="mt-3 flex items-center justify-between"><button title="Previous page" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)} className="h-9 w-9 disabled:opacity-30"><i className="fas fa-chevron-left" /></button><span className="text-xs">{page} / {pages}</span><button title="Next page" aria-label="Next page" disabled={page >= pages || loading} onClick={() => setPage(page + 1)} className="h-9 w-9 disabled:opacity-30"><i className="fas fa-chevron-right" /></button></div>}
      </section>
    </main>

    {scannerOpen && <div role="dialog" aria-modal="true" aria-label="Scan bank UPI QR" className="fixed inset-0 z-[110] flex flex-col bg-black p-4 text-white"><div className="flex items-center justify-between"><h2 className="text-sm font-bold">Scan bank UPI QR</h2>{close('Close scanner', () => setScannerOpen(false))}</div><div id="payment-reader" className="mx-auto mt-8 w-full max-w-sm overflow-hidden" />{scannerError && <p role="alert" className="mt-4 text-center text-sm text-red-300">{scannerError}</p>}<button className="mx-auto mt-5 text-sm font-bold" onClick={() => { setScannerOpen(false); setEntryOpen(true); setPayError(''); }}>Enter UPI ID instead</button></div>}

    {entryOpen && <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-3 sm:items-center"><form role="dialog" aria-modal="true" aria-label="Pay a UPI ID" onSubmit={e => { e.preventDefault(); try { review(makeReceiveQr(manualId)); } catch (err: any) { setPayError(err.message); } }} className="w-full max-w-md rounded-lg bg-white p-4"><div className="mb-4 flex items-center justify-between"><h2 className="text-base font-bold">Pay a UPI ID</h2>{close('Close UPI entry', () => setEntryOpen(false))}</div><label className="mb-1 block text-xs font-bold" htmlFor="recipient-upi">Recipient UPI ID</label><input id="recipient-upi" autoComplete="off" autoCapitalize="none" spellCheck={false} required value={manualId} onChange={e => setManualId(e.target.value)} placeholder="name@bank" className={inputStyle} /><p className="mt-2 text-xs text-gray-500">Use the recipient's bank-issued UPI ID, not just their mobile number.</p>{payError && <p role="alert" className="mt-2 text-xs text-red-700">{payError}</p>}<button className="mt-4 h-11 w-full rounded-lg bg-emerald-600 text-sm font-bold text-white">Review recipient</button></form></div>}

    {payee && <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-3 sm:items-center"><div role="dialog" aria-modal="true" aria-label="Review UPI payment" className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-4"><div className="mb-4 flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-base font-bold">Review UPI payment</h2><p className="mt-2 break-all text-sm font-bold">{payee.pa}</p>{payee.pn !== payee.pa && <p className="break-words text-xs text-gray-500">QR label: {payee.pn}</p>}<p className="mt-1 text-xs text-gray-500">Verify the account holder in your UPI app.</p></div>{close('Close payment review', () => setPayee(null))}</div><label htmlFor="upi-amount" className="mb-1 block text-xs font-bold">Amount (INR)</label><input id="upi-amount" inputMode="decimal" type="text" readOnly={!!payee.am || handoff} value={amount} onChange={e => { setAmount(e.target.value); setHandoff(false); }} placeholder="0.00" className={inputStyle} /><label htmlFor="upi-note" className="mb-1 mt-3 block text-xs font-bold">Note (optional)</label><input id="upi-note" value={note} onChange={e => setNote(e.target.value)} maxLength={100} className={inputStyle} />{!canLaunch && paymentUri && <div className="mt-4"><PaymentQr value={paymentUri} label="Bank UPI payment QR" /><p className="mt-2 text-center text-xs text-gray-500">Scan directly with your bank app on another device.</p></div>}{canLaunch && <button disabled={!paymentUri || launching || handoff} onClick={() => void launch()} className="mt-4 h-11 w-full rounded-lg bg-emerald-600 text-sm font-bold text-white disabled:opacity-40">{launching ? 'Opening UPI app...' : handoff ? 'Check your UPI app' : 'Continue in UPI app'}</button>}<p className="mt-3 text-xs text-gray-500">Paid from your bank, not your previous APEX balance. APEX cannot confirm this bank payment.</p>{handoff && <p role="status" className="mt-3 border-t border-gray-200 pt-3 text-sm">Complete or check payment in your UPI app. No payment success is recorded in APEX.</p>}{payError && <p role="alert" className="mt-3 text-xs text-red-700">{payError}</p>}{!paymentUri && amount && <p role="alert" className="mt-2 text-xs text-red-700">Enter a valid amount that matches the QR requirements.</p>}</div></div>}

    {receiveOpen && <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-3 sm:items-center"><form role="dialog" aria-modal="true" aria-label="Receive to your bank" onSubmit={e => { e.preventDefault(); try { if (!receiveConfirmed) throw new Error('Confirm this UPI ID belongs to you.'); setReceiveQr(makeReceiveQr(receiveId)); setReceiveError(''); } catch (err: any) { setReceiveError(err.message); } }} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-4"><div className="mb-4 flex items-center justify-between"><h2 className="text-base font-bold">Receive to your bank</h2>{close('Close receive QR', () => setReceiveOpen(false))}</div><label htmlFor="receive-upi" className="mb-1 block text-xs font-bold">Your UPI ID</label><input id="receive-upi" required autoComplete="off" autoCapitalize="none" spellCheck={false} value={receiveId} onChange={e => { setReceiveId(e.target.value); setReceiveQr(''); setReceiveConfirmed(false); }} placeholder="Your ID from your bank or UPI app" className={inputStyle} /><label className="mt-3 flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={receiveConfirmed} onChange={e => { setReceiveConfirmed(e.target.checked); setReceiveQr(''); }} />I checked this UPI ID belongs to my bank account.</label><button disabled={!receiveConfirmed} className="mt-4 h-11 w-full rounded-lg bg-emerald-600 text-sm font-bold text-white disabled:opacity-40">Show receive QR</button>{receiveError && <p role="alert" className="mt-2 text-xs text-red-700">{receiveError}</p>}{receiveQr && <div className="mt-4"><PaymentQr value={receiveQr} label="Your bank UPI receive QR" /><p className="mt-2 break-all text-center text-sm font-bold">{receiveId.trim()}</p></div>}<p className="mt-3 text-xs text-gray-500">UPI ID entered by you, not verified by APEX. Check incoming payments in your bank app.</p></form></div>}
  </div>;
}
