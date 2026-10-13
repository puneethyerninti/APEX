"use client";
import { useState } from 'react';
import { api } from '@/services/api';
export default function MemberSafety({ userId, onBlocked }: { userId: string; onBlocked: () => void }) {
  const [open, setOpen] = useState(false), [reason, setReason] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [receipt, setReceipt] = useState('');
  async function action(block: boolean) {
    if (busy) return; setBusy(true); setError('');
    try {
      if (block) { await api.post('/support/blocks/' + userId); onBlocked(); setOpen(false); }
      else { const { data } = await api.post('/support/requests', { kind: 'content_report', targetUser: userId, reason }); setReceipt(data._id); }
    } catch (e: any) { setError(e.response?.data?.error || 'Action was not confirmed. Please retry.'); }
    finally { setBusy(false); }
  }
  return <><button title="Report or block member" aria-label="Report or block member" onClick={() => setOpen(true)} className="h-9 w-9 text-gray-500"><i className="fas fa-shield-halved" /></button>{open && <div role="dialog" aria-modal="true" aria-label="Member safety" className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-sm rounded-lg bg-white p-4 text-left"><h2 className="text-sm font-bold">Report Or Block</h2>{receipt ? <p role="status" className="mt-3 break-words text-xs">Report received for review. Reference: {receipt}</p> : <><label className="mt-3 block text-xs">Reason<textarea maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 p-2 text-sm" rows={3} /></label><button disabled={busy || !reason.trim()} onClick={() => void action(false)} className="mt-3 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Report Member</button></>}<button disabled={busy} onClick={() => void action(true)} className="ml-2 mt-3 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold">Block Member</button>{error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}<button disabled={busy} onClick={() => setOpen(false)} className="mt-3 block text-xs font-bold text-gray-500">Close</button></div></div>}</>;
}
