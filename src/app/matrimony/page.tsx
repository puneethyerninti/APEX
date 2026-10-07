"use client";
import { useCallback, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import { loadRazorpay } from '@/services/razorpay';
import { useAppStore } from '@/store/useAppStore';
import { SocketContext } from '@/context/SocketContext';
import MatrimonyChat from '@/components/MatrimonyChat';

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
  const [inbox, setInbox] = useState<any[] | null>(null);
  const [inboxLoaded, setInboxLoaded] = useState(false);
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
    setEditing(false); setPhotos([]); setError(''); setNotice('');
  }, [uid]);
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    const run = () => refresh().catch(e => { if (alive) setError(errorText(e)); });
    void run();
    const timer = setInterval(() => { if (!document.hidden) void run(); }, 15000);
    socket?.on('connect', run);
    return () => { alive = false; clearInterval(timer); socket?.off('connect', run); };
  }, [uid, refresh, socket]);
  const inboxOpen = inbox !== null;
  useEffect(() => {
    if (!uid || !inboxOpen) return;
    let alive = true, running = false;
    const sync = async () => {
      if (running || document.hidden) return;
      running = true;
      try {
        const res = await api.get('/matrimony/inbox/' + uid);
        if (alive) { setInbox(res.data); setInboxLoaded(true); }
      } catch (e) { if (alive) setError(errorText(e)); }
      finally { running = false; }
    };
    const update = () => void sync();
    void sync(); socket?.on('receive_message', update); socket?.on('messages_read', update); socket?.on('connect', update);
    document.addEventListener('visibilitychange', update);
    const timer = setInterval(update, 5000);
    return () => { alive = false; clearInterval(timer); socket?.off('receive_message', update); socket?.off('messages_read', update); socket?.off('connect', update); document.removeEventListener('visibilitychange', update); };
  }, [uid, inboxOpen, socket]);
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      photos.forEach(photo => body.append('images', photo));
      const res = await api.post('/matrimony/profile', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      const active = useAppStore.getState().user;
      if ((active?._id || active?.uid) !== uid) return;
      setProfile(res.data); setEditing(false); setNotice('Your APEX profile is pending review.');
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  async function checkout(plan: typeof plans[number]) {
    if (busy) return;
    if (!uid) { setError('Sign in before purchasing a membership.'); return; }
    if (!loaded) { setError('Your profile is still being refreshed.'); return; }
    if (profile?.status !== 'approved') {
      setNotice(profile?.status === 'pending' ? 'Your APEX profile is awaiting admin review. No payment has been collected.' : 'Submit your APEX profile for review before purchasing a membership. No payment has been collected.');
      if (!profile || profile.status !== 'pending') {
        setForm(Object.fromEntries(Object.keys(empty).map(key => [key, String(profile?.[key] || '')])) as typeof empty);
        setPhotos([]); setEditing(true);
      }
      document.getElementById('apex-profile')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
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
  const filtered = matches.filter(p => ['community', 'religion', 'location'].every(key => !(filters as any)[key] || p[key] === (filters as any)[key]) && (!filters.premium || p.subscription?.isActive));
  return <main className="pb-28 text-gray-900">
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-gray-100 bg-white px-4 py-2.5 md:px-6">
      <Link href="/" aria-label="Home" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50"><i className="fas fa-arrow-left" /></Link>
      <h1 className="text-center text-base font-extrabold">Anand Matrimony</h1>
      <button title="Messages" aria-label="Messages" onClick={() => { if (!uid) { setError('Sign in to open messages.'); return; } if (!profile?.subscription?.isActive) { setNotice('An approved APEX profile and active membership are required for messages.'); document.getElementById('apex-profile')?.scrollIntoView({ behavior: 'smooth' }); return; } setError(''); setInboxLoaded(false); setInbox([]); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600"><i className="fas fa-comment-alt" /></button>
    </header>
    <div className="mx-auto max-w-5xl p-3 md:p-4">
      <section className="flex flex-col items-center rounded-xl bg-gradient-to-br from-rose-600 to-pink-700 px-3 py-4 text-center text-white shadow-sm">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg text-rose-600"><i aria-hidden="true" className="fas fa-heart" /></div>
        <h2 className="text-lg font-extrabold">Find Your Perfect Partner</h2>
        <p className="mt-1 text-xs text-rose-100">Begin your journey with Anand Matrimony.</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <a href="https://anandmatrimony.co.in/" target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-4 py-2 text-xs font-bold text-rose-600">Complete Profile</a>
          <button onClick={() => document.getElementById('prime-plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="rounded-full border border-white/40 px-4 py-2 text-xs font-bold">Upgrade</button>
        </div>
      </section>
    </div>
    {error && <p role="alert" className="mx-4 my-3 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
    <section className="mx-auto mb-4 max-w-5xl px-3 md:px-4">
      <h2 className="mb-2 text-[11px] font-extrabold uppercase text-gray-500">Browse Profiles</h2>
      <div className="grid grid-cols-4 gap-2 md:max-w-sm">{[
        { key: 'community', label: 'Community', icon: 'fa-users', color: 'text-rose-600' },
        { key: 'religion', label: 'Religion', icon: 'fa-hands-praying', color: 'text-pink-600' },
        { key: 'location', label: 'City', icon: 'fa-location-dot', color: 'text-purple-600' },
        { key: 'premium', label: 'Premium', icon: 'fa-crown', color: 'text-orange-600' }
      ].map(item => <button key={item.key} aria-pressed={item.key === 'premium' ? filters.premium : filterPanel === item.key} onClick={() => { if (item.key === 'premium') setFilters({ ...filters, premium: !filters.premium }); else setFilterPanel(filterPanel === item.key ? '' : item.key); }} className="flex min-w-0 flex-col items-center gap-1 text-[10px] font-bold text-gray-600"><span className={'flex h-10 w-10 items-center justify-center rounded-lg border bg-white text-base shadow-sm ' + item.color + ((item.key === 'premium' ? filters.premium : filterPanel === item.key) ? ' border-rose-400' : ' border-gray-100')}><i aria-hidden="true" className={'fas ' + item.icon} /></span>{item.label}</button>)}</div>
      {filterPanel && <label className="mt-4 block max-w-sm text-sm font-semibold">{filterPanel === 'location' ? 'City' : filterPanel === 'religion' ? 'Religion' : 'Community'}<select aria-label={filterPanel} className="mt-2 block w-full rounded-lg border border-gray-200 bg-white p-3" value={(filters as any)[filterPanel]} onChange={e => setFilters({ ...filters, [filterPanel]: e.target.value })}><option value="">All {filterPanel === 'location' ? 'cities' : filterPanel}</option>{[...new Set(matches.map(p => p[filterPanel]).filter(Boolean))].sort().map(value => <option key={value} value={value}>{value}</option>)}</select></label>}
      {(filters.community || filters.religion || filters.location || filters.premium) && <button onClick={() => { setFilters({ community: '', religion: '', location: '', premium: false }); setFilterPanel(''); }} className="mt-3 text-sm font-semibold text-rose-600">Clear filters</button>}
    </section>
    <section id="prime-plans" className="mx-auto max-w-5xl scroll-mt-20 px-3 pb-4 md:px-4">
      <h2 className="mb-2 text-[11px] font-extrabold uppercase text-gray-500">Prime Plans</h2>
      <div className="grid grid-cols-3 gap-2">{plans.map((plan, index) => <div key={plan.name} className={'relative flex min-w-0 flex-col rounded-lg border p-2.5 shadow-sm sm:p-3 ' + (index === 1 ? 'border-yellow-200 bg-yellow-50' : index === 2 ? 'border-sky-100 bg-sky-50' : 'border-gray-100 bg-white')}>
        {index === 1 && <span className="absolute right-1.5 top-1.5 text-[8px] font-bold text-rose-600">Popular</span>}
        <div className={'mb-2 flex h-8 w-8 items-center justify-center rounded-full text-sm ' + (index === 1 ? 'bg-yellow-200 text-yellow-600' : index === 2 ? 'bg-sky-100 text-sky-500' : 'bg-gray-100 text-gray-400')}><i aria-hidden="true" className={'fas ' + (index === 1 ? 'fa-crown' : index === 2 ? 'fa-gem' : 'fa-medal')} /></div>
        <h3 className="text-xs font-extrabold">{plan.name}</h3><p className="mt-0.5 text-[10px] text-gray-500">{plan.months} months</p><p className="my-2 text-sm font-extrabold text-rose-600">{'\u20b9'}{plan.amount.toLocaleString('en-IN')}</p>
        <button disabled={busy || (!!uid && !loaded)} onClick={() => void checkout(plan)} className="mt-auto min-h-9 w-full rounded-lg bg-rose-600 px-1 py-2 text-[10px] font-bold text-white disabled:opacity-40">{busy ? 'Processing' : 'Purchase'}</button>
      </div>)}</div>
    </section>
    {!uid ? <p className="mx-auto max-w-5xl px-3 text-xs"><Link href="/login" className="text-pink-700 underline">Sign in</Link> to view APEX profiles.</p> : <div className="mx-auto max-w-5xl px-3 md:px-4">
      <section id="apex-profile" className="scroll-mt-20 border-y border-gray-200 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-bold">My APEX Profile</h2><p className="mt-1 text-[11px] text-gray-500">{!loaded ? 'Updating profile' : profile ? 'Review: ' + profile.status : 'Not submitted'}</p>{profile?.subscription?.isActive && <p className="text-[11px] text-rose-600">{profile.subscription.plan} until {new Date(profile.subscription.expiresAt).toLocaleDateString()}</p>}</div><button disabled={!loaded || busy} onClick={() => { setForm(Object.fromEntries(Object.keys(empty).map(key => [key, String(profile?.[key] || '')])) as typeof empty); setPhotos([]); setEditing(!editing); }} className="rounded-full bg-white px-3 py-2 text-[11px] font-bold text-rose-600 shadow-sm disabled:opacity-40">{editing ? 'Cancel' : 'Edit APEX Profile'}</button></div>
        {notice && <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{notice}</p>}
        {editing && <form onSubmit={saveProfile} className="mt-4 max-w-2xl space-y-4">
          {profile?.status === 'approved' && <p className="text-xs text-amber-800">Changes need a new review before your profile is published again.</p>}
          <fieldset disabled={busy} className="grid grid-cols-2 gap-x-3 gap-y-3"><legend className="mb-2 text-xs font-bold text-gray-700">Personal Details</legend>{[
            { key: 'age', label: 'Age', placeholder: '18 or older', required: true },
            { key: 'height', label: 'Height', placeholder: 'Height in cm', required: false },
            { key: 'religion', label: 'Religion', placeholder: 'Your religion', required: true },
            { key: 'community', label: 'Community', placeholder: 'Your community', required: false },
            { key: 'profession', label: 'Profession', placeholder: 'Your profession', required: true },
            { key: 'location', label: 'City', placeholder: 'Your city', required: true }
          ].map(field => <label key={field.key} className="min-w-0 text-[11px] font-semibold text-gray-600">{field.label}{field.required && <span className="ml-0.5 text-rose-600">*</span>}<input className="mt-1 block h-10 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-normal text-gray-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" placeholder={field.placeholder} required={field.required} type={field.key === 'age' ? 'number' : 'text'} min={field.key === 'age' ? 18 : undefined} max={field.key === 'age' ? 100 : undefined} maxLength={120} value={form[field.key as keyof typeof empty]} onChange={e => setForm({ ...form, [field.key]: e.target.value })} /></label>)}</fieldset>
          <label className="block text-[11px] font-semibold text-gray-600">About Me<textarea rows={3} placeholder="A little about you" disabled={busy} className="mt-1 block w-full resize-y rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-normal outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" maxLength={2000} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} /><span className="mt-1 block text-right text-[10px] font-normal text-gray-400">{form.bio.length}/2000</span></label>
          <div><label className="block text-[11px] font-semibold text-gray-600">Profile Photos<input disabled={busy} className="mt-1 block w-full rounded-lg border border-dashed border-rose-200 bg-white p-2 text-[11px] file:mr-3 file:rounded file:border-0 file:bg-rose-50 file:px-3 file:py-2 file:text-[11px] file:font-semibold file:text-rose-600" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => {
            const selected = Array.from(e.target.files || []);
            if (selected.length > 5 || selected.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) { setError('Choose up to five JPEG, PNG or WebP photos, each under 5 MB.'); e.target.value = ''; setPhotos([]); return; }
            setPhotos(selected); setError('');
          }} /></label><p className="mt-1 text-[10px] text-gray-500">{photos.length ? `${photos.length} photos selected` : profile?.images?.length ? `${profile.images.length} existing photos kept unless replaced` : 'JPEG, PNG or WebP / up to 5 photos / 5 MB each'}</p></div>
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-3"><button type="button" disabled={busy} onClick={() => setEditing(false)} className="px-3 py-2 text-xs font-semibold text-gray-500">Cancel</button><button disabled={busy} className="rounded-lg bg-rose-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">{busy ? 'Saving...' : 'Submit for Review'}</button></div>
        </form>}
      </section>
      <section className="py-4"><h2 className="mb-2 text-[11px] font-extrabold uppercase text-gray-500">New Matches</h2>{loaded && !filtered.length && <p className="text-xs text-gray-500">No approved profiles match your filters.</p>}<div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">{filtered.map(p => <article key={p._id} className="min-w-0 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">{p.images?.[0] ? <img alt={p.user?.name || 'Profile'} src={p.images[0]} className="aspect-[4/5] w-full object-cover" /> : <div className="flex aspect-[4/5] items-center justify-center bg-rose-50 text-4xl text-rose-300"><i aria-hidden="true" className="fas fa-user" /></div>}<div className="p-3"><h3 className="break-words text-sm font-extrabold">{p.user?.name || 'APEX Member'}</h3><p className="mt-1 break-words text-xs text-gray-500">{p.age} years, {p.location}</p><p className="mt-1 break-words text-xs text-gray-500">{p.profession}</p><button disabled={!profile?.subscription?.isActive} onClick={() => { setError(''); setChat(p); }} className="mt-3 w-full rounded-lg bg-rose-50 py-2 text-xs font-bold text-rose-600 disabled:opacity-40">Message</button></div></article>)}</div></section>
    </div>}
    {inbox && <div role="dialog" aria-label="Inbox" aria-modal="true" className="fixed inset-0 z-50 overflow-auto bg-white p-4"><div className="mx-auto max-w-xl"><button onClick={() => setInbox(null)} className="float-right h-10 w-10" aria-label="Close inbox" title="Close inbox"><i className="fas fa-times" /></button><h2 className="py-2 text-base font-bold">Messages</h2>{error && <p role="alert" className="py-2 text-xs text-red-700">{error}</p>}{inboxLoaded && !inbox.length && <p className="py-5 text-xs text-gray-500">No conversations yet.</p>}{inbox.map(item => <button key={item.latestMessage.roomId} onClick={() => { setInbox(null); setError(''); setChat(item.profile); }} className="block w-full border-b border-gray-100 py-3 text-left"><span className="flex items-center justify-between gap-2"><strong className="text-sm">{item.profile.user?.name || 'APEX Member'}</strong>{item.unreadCount > 0 && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] text-white">{item.unreadCount} unread</span>}</span><p className="mt-1 truncate text-xs text-gray-500">{item.latestMessage.text}</p></button>)}</div></div>}
    {chat && uid && <MatrimonyChat key={uid + ':' + accountId(chat)} uid={uid} profile={chat} socket={socket} onClose={() => setChat(null)} />}
  </main>;
}
