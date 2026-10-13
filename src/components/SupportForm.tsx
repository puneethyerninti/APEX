"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
export default function SupportForm({ deletion = false }: { deletion?: boolean }) {
  const { isAuthenticated } = useAuth();
  const ownerId = useAppStore(s => s.user?._id || s.user?.uid);
  const [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [receipt, setReceipt] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => { setReason(''); setReceipt(''); setConfirmed(false); setError(''); }, [ownerId]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy || (deletion && !confirmed)) return;
    setBusy(true); setError('');
    try { const { data } = await api.post('/support/requests', { kind: deletion ? 'account_deletion' : 'support', reason: reason.trim() || 'Please delete my APEX account and associated personal data.' }); setReceipt(data._id); }
    catch (e: any) { setError(e.response?.data?.error || 'Request not confirmed. Please contact support.'); }
    finally { setBusy(false); }
  }
  if (!isAuthenticated) return <p><Link href="/login" className="text-purple-700 underline">Sign in</Link> to submit a verified request, or <a href="https://wa.me/919494273763" className="text-purple-700 underline">contact support</a> if you cannot sign in.</p>;
  return <form onSubmit={submit} className="space-y-3">{receipt ? <p role="status">Request received. Reference: <strong className="break-all">{receipt}</strong>. {deletion && 'Support must process it before your account is deleted.'}</p> : <><label className="block">{deletion ? 'Notes (optional)' : 'How can we help?'}<textarea maxLength={2000} required={!deletion} value={reason} onChange={e => setReason(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white p-3 text-sm" rows={4} /></label>{deletion && <label className="flex items-start gap-2"><input required type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1" />I request deletion of my APEX account and associated personal data, subject to outstanding payments and lawful retention.</label>}<button disabled={busy || (deletion && !confirmed)} className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{busy ? 'Submitting...' : deletion ? 'Request Account Deletion' : 'Send Request'}</button></>}{error && <p role="alert" className="text-red-700">{error}</p>}</form>;
}
