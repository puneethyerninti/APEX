"use client";
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
export default function SupportReviewPage() {
  const role = useAppStore(s => s.user?.role);
  const [items, setItems] = useState<any[]>([]), [error, setError] = useState('');
  const [busy, setBusy] = useState(''), [notes, setNotes] = useState<Record<string, string>>({});
  const refresh = useCallback(async () => { if (role !== 'admin') return; try { const { data } = await api.get('/support/admin'); setItems(data); setError(''); } catch { setError('Support queue could not be refreshed.'); } }, [role]);
  useEffect(() => { void refresh(); const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 15000); return () => clearInterval(timer); }, [refresh]);
  async function review(id: string, status: string) {
    if (busy) return; setBusy(id);
    try { await api.patch('/support/admin/' + id, { status, resolution: notes[id] }); await refresh(); }
    catch (e: any) { setError(e.response?.data?.error || 'Review was not confirmed.'); }
    finally { setBusy(''); }
  }
  async function moderate(id: string, action: string) {
    if (busy || !window.confirm(action === 'disable_member' ? 'Disable this reported member and revoke their sessions?' : 'Hide this reported matrimony profile?')) return;
    setBusy(id);
    try { await api.post('/support/admin/' + id + '/moderate', { action }); await refresh(); }
    catch (e: any) { setError(e.response?.data?.error || 'Moderation was not confirmed.'); }
    finally { setBusy(''); }
  }
  return <main className="mx-auto max-w-4xl px-4 py-6"><Link href="/admin-dashboard" className="text-xs text-purple-700">Back To Dashboard</Link><h1 className="my-4 text-xl font-bold">Support And Safety Requests</h1>{role !== 'admin' ? <p>Admin sign-in required.</p> : <><p className="mb-4 text-xs text-gray-600">Deletion requests require verified ownership, settlement checks, removal of personal data and uploads, Firebase account deletion and session revocation. Mark resolved only after processing; record any legal retention exception and notify the requester. Content reports require investigation and appropriate content removal or account restrictions.</p><button onClick={() => void refresh()} aria-label="Refresh queue" title="Refresh queue"><i className="fas fa-rotate-right" /></button>{error && <p role="alert" className="py-3 text-red-700">{error}</p>}{items.map(item => <article key={item._id} className="border-b border-gray-200 py-4"><h2 className="text-sm font-bold">{item.kind} / {item.status}</h2><p className="text-xs">{item.user?.name} / {item.user?.phone} / {new Date(item.createdAt).toLocaleString()}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.reason}</p>{item.targetUser && <p className="text-xs">Reported member: {item.targetUser}</p>}<div className="my-2 flex flex-wrap gap-2">{item.kind === 'content_report' && item.targetUser && <><button disabled={!!busy} onClick={() => void moderate(item._id, 'hide_profile')} className="rounded-lg border border-rose-200 px-3 py-2 text-xs text-rose-700 disabled:opacity-40">Hide Profile</button><button disabled={!!busy} onClick={() => void moderate(item._id, 'disable_member')} className="rounded-lg border border-rose-200 px-3 py-2 text-xs text-rose-700 disabled:opacity-40">Disable Member</button></>}</div><p className="text-xs">Reference: {item._id}</p>{item.resolution && <p className="mt-2 text-xs">Review: {item.resolution}</p>}{item.status !== 'resolved' && <><label className="mt-3 block text-xs">Review Note<textarea maxLength={2000} value={notes[item._id] || ''} onChange={e => setNotes({ ...notes, [item._id]: e.target.value })} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white p-2" rows={2} /></label><div className="mt-2 flex gap-2"><button disabled={!!busy || !notes[item._id]?.trim()} onClick={() => void review(item._id, 'in_review')} className="rounded-lg bg-purple-700 px-3 py-2 text-xs text-white disabled:opacity-40">Start Review</button><button disabled={!!busy || !notes[item._id]?.trim()} onClick={() => void review(item._id, 'resolved')} className="rounded-lg border border-gray-200 px-3 py-2 text-xs disabled:opacity-40">Mark Processed</button></div></>}</article>)}</>}</main>;
}
