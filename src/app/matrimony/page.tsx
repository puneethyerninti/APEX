"use client";
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import { loadRazorpay } from '@/services/razorpay';
import { useAppStore } from '@/store/useAppStore';
import { SocketContext } from '@/context/SocketContext';

const plans = [{ name: 'Silver', amount: 5000, months: 3 }, { name: 'Gold', amount: 10000, months: 6 }, { name: 'Diamond', amount: 20000, months: 12 }];
const empty = { age: '', height: '', religion: '', community: '', profession: '', location: '', bio: '' };
const errorText = (e: any) => e.response?.data?.error || e.message || 'Unable to connect. Please retry.';
const accountId = (p: any) => String(p?.user?._id || p?.user || '');

export default function MatrimonyPage() {
  const user = useAppStore(s => s.user);
  const uid = user?._id || user?.uid;
  const socket = useContext(SocketContext)?.socket;
  const [profile, setProfile] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(empty);
  const [photos, setPhotos] = useState<File[]>([]);
  const [filters, setFilters] = useState({ community: '', religion: '', location: '', premium: false });
  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const pending = useRef<{ key: string; text: string; room: string } | null>(null);
  const [inbox, setInbox] = useState<any[] | null>(null);
  const room = chat && uid ? 'match_' + [uid, accountId(chat)].sort().join('_') : '';
  const refresh = useCallback(async () => {
    if (!uid) return;
    const own = await api.get('/matrimony/profiles/me');
    const all = await api.get('/matrimony/profiles');
    setProfile(own.data); setMatches(all.data); setLoaded(true);
  }, [uid]);
  useEffect(() => {
    setLoaded(false); setProfile(null); setMatches([]); setChat(null); setInbox(null);
    if (!uid) return;
    const run = () => refresh().catch(e => setError(errorText(e)));
    void run();
    const timer = setInterval(() => { if (!document.hidden) void run(); }, 15000);
    return () => clearInterval(timer);
  }, [uid, refresh]);
  useEffect(() => {
    setMessages([]);
    if (!room) return;
    let alive = true;
    const sync = async () => {
      try {
        const res = await api.get('/matrimony/messages/' + room);
        if (alive) setMessages(res.data);
        await api.put('/matrimony/messages/' + room + '/read');
      } catch (e) { if (alive) setError(errorText(e)); }
    };
    const onMessage = (m: any) => { if (m.roomId === room) void sync(); };
    void sync(); socket?.on('receive_message', onMessage);
    const timer = setInterval(() => { if (!document.hidden) void sync(); }, 5000);
    return () => { alive = false; clearInterval(timer); socket?.off('receive_message', onMessage); };
  }, [room, socket]);
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      photos.forEach(photo => body.append('images', photo));
      const res = await api.post('/matrimony/profile', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(res.data); setEditing(false); setNotice('Your APEX profile is pending review.');
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  async function checkout(plan: typeof plans[number]) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const Razorpay = await loadRazorpay();
      const res = await api.post('/finance/razorpay/order', { category: 'matrimony', amount: plan.amount, serviceName: 'APEX Matrimony ' + plan.name, metadata: { plan: plan.name } });
      const { order, keyId } = res.data;
      const checkout = new Razorpay({ key: keyId, order_id: order.id, amount: order.amount, currency: order.currency, name: 'APEX Matrimony',
        handler: async (payment: any) => {
          try { await api.post('/finance/razorpay/verify', payment); await refresh(); setNotice('Payment verified. Membership status is shown below.'); }
          catch (e) { setError(errorText(e)); setNotice('Do not pay again while your payment is being reconciled.'); }
          finally { setBusy(false); }
        }, modal: { ondismiss: () => setBusy(false) } });
      checkout.on('payment.failed', (event: any) => { setBusy(false); setError(event.error?.description || 'Payment failed.'); });
      checkout.open();
    } catch (e) { setError(errorText(e)); setBusy(false); }
  }
  async function send(e: React.FormEvent) {
    e.preventDefault(); if (!text.trim() || sending) return;
    setSending(true); setError('');
    const item = pending.current || { key: crypto.randomUUID(), text: text.trim(), room };
    pending.current = item;
    try {
      const res = await api.post('/matrimony/messages/' + item.room, { text: item.text, clientMessageId: item.key });
      if (item.room === room) setMessages(old => old.some(m => m._id === res.data._id) ? old : [...old, res.data]);
      pending.current = null; setText('');
    } catch (e) { setError(errorText(e)); } finally { setSending(false); }
  }
  const filtered = matches.filter(p => ['community', 'religion', 'location'].every(key => !(filters as any)[key] || p[key] === (filters as any)[key]) && (!filters.premium || p.subscription?.isActive));
  return <main className="mx-auto max-w-5xl p-4 pb-28 text-gray-900">
    <header className="flex items-center justify-between gap-3 border-b py-4"><Link href="/" aria-label="Home"><i className="fas fa-arrow-left" /></Link><h1 className="text-2xl font-bold">Anand Matrimony</h1><button title="Refresh" onClick={() => { setError(''); void refresh().catch(e => setError(errorText(e))); }} className="h-10 w-10"><i className="fas fa-sync-alt" /></button></header>
    <div className="flex flex-wrap gap-3 py-5"><a href="https://anandmatrimony.co.in/" target="_blank" rel="noopener noreferrer" className="rounded-lg bg-pink-700 px-5 py-3 font-semibold text-white">Complete Profile <i className="fas fa-external-link-alt ml-2" /></a><button disabled={!uid || !profile?.subscription?.isActive} onClick={async () => { try { setInbox((await api.get('/matrimony/inbox/' + uid)).data); } catch (e) { setError(errorText(e)); } }} className="rounded-lg border px-5 py-3 disabled:opacity-40">Messages</button></div>
    {error && <p role="alert" className="my-3 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}{notice && <p role="status" className="my-3 bg-green-50 p-3 text-green-800">{notice}</p>}
    {!uid ? <p><Link href="/login" className="text-pink-700 underline">Sign in</Link> to view APEX profiles.</p> : <>
      <section className="border-y py-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">My APEX Profile</h2><p>{!loaded ? 'Loading...' : profile ? 'Review: ' + profile.status : 'Not submitted'}</p>{profile?.subscription?.isActive && <p>{profile.subscription.plan} until {new Date(profile.subscription.expiresAt).toLocaleDateString()}</p>}</div><button disabled={!loaded || busy} onClick={() => { setForm(Object.fromEntries(Object.keys(empty).map(key => [key, String(profile?.[key] || '')])) as typeof empty); setPhotos([]); setEditing(!editing); }} className="rounded-lg border px-4 py-2">{editing ? 'Cancel' : 'Edit APEX Profile'}</button></div>
        {editing && <form onSubmit={saveProfile} className="mt-4 grid gap-4 sm:grid-cols-2">{Object.keys(empty).filter(k => k !== 'bio').map(key => <label key={key} className="capitalize">{key === 'location' ? 'City' : key}<input className="mt-1 block w-full rounded-lg border p-3" required={['age','religion','profession','location'].includes(key)} type={key === 'age' ? 'number' : 'text'} min={key === 'age' ? 18 : undefined} max={key === 'age' ? 100 : undefined} maxLength={120} value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}<label className="sm:col-span-2">About Me<textarea className="block w-full rounded-lg border p-3" maxLength={2000} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} /></label><label>Photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => setPhotos(Array.from(e.target.files || []).slice(0,5))} /></label><button disabled={busy} className="rounded-lg bg-pink-700 p-3 text-white">{busy ? 'Saving...' : 'Submit for Review'}</button></form>}
      </section>
      <section className="py-5"><h2 className="mb-3 text-lg font-bold">APEX Membership</h2><div className="grid gap-3 sm:grid-cols-3">{plans.map(plan => <div key={plan.name} className="rounded-lg border p-4"><h3 className="font-bold">{plan.name}</h3><p>{plan.months} months</p><p className="my-3 text-xl font-bold">INR {plan.amount.toLocaleString('en-IN')}</p><button disabled={busy || profile?.status !== 'approved' || !loaded} onClick={() => void checkout(plan)} className="w-full rounded-lg bg-pink-700 p-3 text-white disabled:opacity-40">{busy ? 'Processing...' : 'Purchase'}</button></div>)}</div></section>
      <section className="border-t py-5"><h2 className="text-lg font-bold">Browse APEX Profiles</h2><div className="my-4 flex flex-wrap gap-3">{['community','religion','location'].map(key => <select key={key} aria-label={key} className="max-w-full rounded-lg border p-2" value={(filters as any)[key]} onChange={e => setFilters({ ...filters, [key]: e.target.value })}><option value="">All {key === 'location' ? 'cities' : key}</option>{[...new Set(matches.map(p => p[key]).filter(Boolean))].sort().map(value => <option key={value} value={value}>{value}</option>)}</select>)}<label className="flex items-center gap-2"><input type="checkbox" checked={filters.premium} onChange={e => setFilters({ ...filters, premium: e.target.checked })} />Active members</label></div>{loaded && !filtered.length && <p>No approved profiles match your filters.</p>}<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(p => <article key={p._id} className="overflow-hidden rounded-lg border">{p.images?.[0] && <img alt={p.user?.name || 'Profile'} src={p.images[0]} className="aspect-[4/3] w-full object-cover" />}<div className="p-4"><h3 className="font-bold">{p.user?.name || 'APEX Member'}</h3><p>{p.age} years, {p.location}</p><p>{p.profession} | {p.religion}</p><p className="my-2 break-words">{p.bio}</p><button disabled={!profile?.subscription?.isActive} onClick={() => { if (pending.current) { setError('Retry the pending message before switching conversations.'); return; } setError(''); setText(''); setChat(p); }} className="rounded-lg border px-4 py-2 disabled:opacity-40">Message</button></div></article>)}</div></section>
    </>}
    {inbox && <div role="dialog" aria-label="Inbox" aria-modal="true" className="fixed inset-0 z-50 overflow-auto bg-white p-5"><div className="mx-auto max-w-xl"><button onClick={() => setInbox(null)} className="float-right h-10 w-10" aria-label="Close inbox"><i className="fas fa-times" /></button><h2 className="text-xl font-bold">Messages</h2>{!inbox.length && <p className="py-5">No conversations yet.</p>}{inbox.map(item => <button key={item.latestMessage.roomId} onClick={() => { setInbox(null); setChat(item.profile); }} className="block w-full border-b p-4 text-left"><strong>{item.profile.user?.name || 'APEX Member'}</strong><p className="break-words">{item.latestMessage.text}</p></button>)}</div></div>}
    {chat && <div role="dialog" aria-label="Conversation" aria-modal="true" className="fixed inset-0 z-50 flex flex-col bg-white p-4"><header className="mx-auto flex w-full max-w-xl items-center justify-between border-b py-3"><h2 className="font-bold">{chat.user?.name || 'APEX Member'}</h2><button disabled={sending} onClick={() => { setChat(null); setText(''); pending.current = null; }} aria-label="Close chat" className="h-10 w-10"><i className="fas fa-times" /></button></header>{error && <p role="alert" className="mx-auto w-full max-w-xl p-2 text-red-700">{error}</p>}<div className="mx-auto w-full max-w-xl flex-1 overflow-auto py-3">{messages.map(m => <div key={m._id} className={'mb-3 max-w-[85%] rounded-lg p-3 ' + (m.senderId === uid ? 'ml-auto bg-pink-100' : 'bg-gray-100')}><p className="whitespace-pre-wrap break-words">{m.text}</p><small>{new Date(m.timestamp).toLocaleString()}</small></div>)}</div><form onSubmit={send} className="mx-auto flex w-full max-w-xl gap-2 border-t pt-3"><input aria-label="Message" className="min-w-0 flex-1 rounded-lg border p-3" maxLength={2000} value={text} disabled={sending || !!pending.current} onChange={e => setText(e.target.value)} /><button disabled={sending || !text.trim()} className="rounded-lg bg-pink-700 px-4 text-white">{sending ? 'Sending...' : pending.current ? 'Retry' : 'Send'}</button></form></div>}
  </main>;
}
