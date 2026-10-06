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
  const [filterPanel, setFilterPanel] = useState('');
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
    const active = useAppStore.getState().user;
    if ((active?._id || active?.uid) !== uid) return;
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
  return <main className="pb-28 text-gray-900">
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-gray-100 bg-white px-4 py-4 md:px-8">
      <Link href="/" aria-label="Home" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50"><i className="fas fa-arrow-left" /></Link>
      <h1 className="text-center text-lg font-black md:text-2xl">Anand Matrimony</h1>
      <button title="Messages" aria-label="Messages" disabled={!uid || !profile?.subscription?.isActive} onClick={async () => { try { setInbox((await api.get('/matrimony/inbox/' + uid)).data); } catch (e) { setError(errorText(e)); } }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 disabled:opacity-40"><i className="fas fa-comment-alt" /></button>
    </header>
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <section className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-rose-600 to-pink-700 px-4 py-7 text-center text-white shadow-lg md:py-10">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl text-rose-600 md:h-20 md:w-20"><i aria-hidden="true" className="fas fa-heart" /></div>
        <h2 className="text-2xl font-black md:text-4xl">Find Your Perfect Partner</h2>
        <p className="mt-3 max-w-xl text-sm text-rose-100 md:text-base">Begin your journey with Anand Matrimony.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href="https://anandmatrimony.co.in/" target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-5 py-3 text-sm font-extrabold text-rose-600 md:px-8">Complete Profile</a>
          <button onClick={() => document.getElementById('prime-plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="rounded-full border border-white/40 px-5 py-3 text-sm font-bold md:px-8">Upgrade</button>
        </div>
      </section>
    </div>
    {error && <p role="alert" className="mx-4 my-3 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}{notice && <p role="status" className="mx-4 my-3 bg-green-50 p-3 text-green-800">{notice}</p>}
    <section className="mx-auto mb-6 max-w-7xl px-4 md:px-6">
      <h2 className="mb-4 text-sm font-extrabold uppercase text-gray-400">Browse Profiles</h2>
      <div className="grid grid-cols-4 gap-3 md:max-w-lg md:gap-6">{[
        { key: 'community', label: 'Community', icon: 'fa-users', color: 'text-rose-600' },
        { key: 'religion', label: 'Religion', icon: 'fa-hands-praying', color: 'text-pink-600' },
        { key: 'location', label: 'City', icon: 'fa-location-dot', color: 'text-purple-600' },
        { key: 'premium', label: 'Premium', icon: 'fa-crown', color: 'text-orange-600' }
      ].map(item => <button key={item.key} aria-pressed={item.key === 'premium' ? filters.premium : filterPanel === item.key} onClick={() => { if (item.key === 'premium') setFilters({ ...filters, premium: !filters.premium }); else setFilterPanel(filterPanel === item.key ? '' : item.key); }} className="flex min-w-0 flex-col items-center gap-2 text-xs font-bold text-gray-600"><span className={'flex h-14 w-14 items-center justify-center rounded-xl border bg-white text-2xl shadow-sm ' + item.color + ((item.key === 'premium' ? filters.premium : filterPanel === item.key) ? ' border-rose-400' : ' border-gray-100')}><i aria-hidden="true" className={'fas ' + item.icon} /></span>{item.label}</button>)}</div>
      {filterPanel && <label className="mt-4 block max-w-sm text-sm font-semibold">{filterPanel === 'location' ? 'City' : filterPanel === 'religion' ? 'Religion' : 'Community'}<select aria-label={filterPanel} className="mt-2 block w-full rounded-lg border border-gray-200 bg-white p-3" value={(filters as any)[filterPanel]} onChange={e => setFilters({ ...filters, [filterPanel]: e.target.value })}><option value="">All {filterPanel === 'location' ? 'cities' : filterPanel}</option>{[...new Set(matches.map(p => p[filterPanel]).filter(Boolean))].sort().map(value => <option key={value} value={value}>{value}</option>)}</select></label>}
      {(filters.community || filters.religion || filters.location || filters.premium) && <button onClick={() => { setFilters({ community: '', religion: '', location: '', premium: false }); setFilterPanel(''); }} className="mt-3 text-sm font-semibold text-rose-600">Clear filters</button>}
    </section>
    <section id="prime-plans" className="mx-auto max-w-7xl scroll-mt-24 pb-6">
      <h2 className="mb-4 px-4 text-sm font-extrabold uppercase text-gray-400 md:px-6">Prime Plans</h2>
      <div className="flex gap-4 overflow-x-auto px-4 pb-3 md:grid md:grid-cols-3 md:px-6">{plans.map((plan, index) => <div key={plan.name} className={'relative flex w-52 shrink-0 flex-col rounded-2xl border p-5 shadow-sm md:w-auto md:p-7 ' + (index === 1 ? 'border-yellow-200 bg-gradient-to-b from-yellow-50 to-yellow-100' : index === 2 ? 'border-sky-100 bg-gradient-to-b from-white to-sky-50' : 'border-gray-100 bg-white')}>
        {index === 1 && <span className="absolute right-4 top-0 rounded-b-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white">Popular</span>}
        <div className={'mb-4 mt-3 flex h-16 w-16 items-center justify-center rounded-full text-3xl ' + (index === 1 ? 'bg-yellow-200 text-yellow-600' : index === 2 ? 'bg-sky-100 text-sky-500' : 'bg-gray-100 text-gray-400')}><i aria-hidden="true" className={'fas ' + (index === 1 ? 'fa-crown' : index === 2 ? 'fa-gem' : 'fa-medal')} /></div>
        <h3 className="text-2xl font-black">{plan.name}</h3><p className="mt-1 text-sm text-gray-500">{plan.months} Months Access</p><p className="my-5 text-2xl font-black text-rose-600">{'\u20b9'}{plan.amount.toLocaleString('en-IN')}</p>
        <button disabled={busy || profile?.status !== 'approved' || !loaded} onClick={() => void checkout(plan)} className="mt-auto w-full rounded-full bg-rose-600 py-3 text-sm font-bold text-white disabled:opacity-40">{busy ? 'Processing...' : 'Purchase'}</button>
      </div>)}</div>
    </section>
    {!uid ? <p className="mx-auto max-w-7xl px-4"><Link href="/login" className="text-pink-700 underline">Sign in</Link> to view APEX profiles.</p> : <div className="mx-auto max-w-7xl px-4 md:px-6">
      <section className="border-y border-gray-200 py-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-bold">My APEX Profile</h2><p className="mt-1 text-sm text-gray-500">{!loaded ? 'Updating profile' : profile ? 'Review: ' + profile.status : 'Not submitted'}</p>{profile?.subscription?.isActive && <p className="text-sm text-rose-600">{profile.subscription.plan} until {new Date(profile.subscription.expiresAt).toLocaleDateString()}</p>}</div><button disabled={!loaded || busy} onClick={() => { setForm(Object.fromEntries(Object.keys(empty).map(key => [key, String(profile?.[key] || '')])) as typeof empty); setPhotos([]); setEditing(!editing); }} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-rose-600 shadow-sm disabled:opacity-40">{editing ? 'Cancel' : 'Edit APEX Profile'}</button></div>
        {editing && <form onSubmit={saveProfile} className="mt-4 grid gap-4 sm:grid-cols-2">{Object.keys(empty).filter(k => k !== 'bio').map(key => <label key={key} className="capitalize">{key === 'location' ? 'City' : key}<input className="mt-1 block w-full rounded-lg border p-3" required={['age','religion','profession','location'].includes(key)} type={key === 'age' ? 'number' : 'text'} min={key === 'age' ? 18 : undefined} max={key === 'age' ? 100 : undefined} maxLength={120} value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}<label className="sm:col-span-2">About Me<textarea className="block w-full rounded-lg border p-3" maxLength={2000} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} /></label><label>Photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => setPhotos(Array.from(e.target.files || []).slice(0,5))} /></label><button disabled={busy} className="rounded-lg bg-pink-700 p-3 text-white">{busy ? 'Saving...' : 'Submit for Review'}</button></form>}
      </section>
      <section className="py-6"><h2 className="mb-4 text-sm font-extrabold uppercase text-gray-400">New Matches</h2>{loaded && !filtered.length && <p className="text-sm text-gray-500">No approved profiles match your filters.</p>}<div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">{filtered.map(p => <article key={p._id} className="min-w-0 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">{p.images?.[0] ? <img alt={p.user?.name || 'Profile'} src={p.images[0]} className="aspect-[4/5] w-full object-cover" /> : <div className="flex aspect-[4/5] items-center justify-center bg-rose-50 text-4xl text-rose-300"><i aria-hidden="true" className="fas fa-user" /></div>}<div className="p-3"><h3 className="break-words text-sm font-extrabold">{p.user?.name || 'APEX Member'}</h3><p className="mt-1 break-words text-xs text-gray-500">{p.age} years, {p.location}</p><p className="mt-1 break-words text-xs text-gray-500">{p.profession}</p><button disabled={!profile?.subscription?.isActive} onClick={() => { if (pending.current) { setError('Retry the pending message before switching conversations.'); return; } setError(''); setText(''); setChat(p); }} className="mt-3 w-full rounded-full bg-rose-50 py-2 text-xs font-bold text-rose-600 disabled:opacity-40">Message</button></div></article>)}</div></section>
    </div>}
    {inbox && <div role="dialog" aria-label="Inbox" aria-modal="true" className="fixed inset-0 z-50 overflow-auto bg-white p-5"><div className="mx-auto max-w-xl"><button onClick={() => setInbox(null)} className="float-right h-10 w-10" aria-label="Close inbox"><i className="fas fa-times" /></button><h2 className="text-xl font-bold">Messages</h2>{!inbox.length && <p className="py-5">No conversations yet.</p>}{inbox.map(item => <button key={item.latestMessage.roomId} onClick={() => { setInbox(null); setChat(item.profile); }} className="block w-full border-b p-4 text-left"><strong>{item.profile.user?.name || 'APEX Member'}</strong><p className="break-words">{item.latestMessage.text}</p></button>)}</div></div>}
    {chat && <div role="dialog" aria-label="Conversation" aria-modal="true" className="fixed inset-0 z-50 flex flex-col bg-white p-4"><header className="mx-auto flex w-full max-w-xl items-center justify-between border-b py-3"><h2 className="font-bold">{chat.user?.name || 'APEX Member'}</h2><button disabled={sending} onClick={() => { setChat(null); setText(''); pending.current = null; }} aria-label="Close chat" className="h-10 w-10"><i className="fas fa-times" /></button></header>{error && <p role="alert" className="mx-auto w-full max-w-xl p-2 text-red-700">{error}</p>}<div className="mx-auto w-full max-w-xl flex-1 overflow-auto py-3">{messages.map(m => <div key={m._id} className={'mb-3 max-w-[85%] rounded-lg p-3 ' + (m.senderId === uid ? 'ml-auto bg-pink-100' : 'bg-gray-100')}><p className="whitespace-pre-wrap break-words">{m.text}</p><small>{new Date(m.timestamp).toLocaleString()}</small></div>)}</div><form onSubmit={send} className="mx-auto flex w-full max-w-xl gap-2 border-t pt-3"><input aria-label="Message" className="min-w-0 flex-1 rounded-lg border p-3" maxLength={2000} value={text} disabled={sending || !!pending.current} onChange={e => setText(e.target.value)} /><button disabled={sending || !text.trim()} className="rounded-lg bg-pink-700 px-4 text-white">{sending ? 'Sending...' : pending.current ? 'Retry' : 'Send'}</button></form></div>}
  </main>;
}
