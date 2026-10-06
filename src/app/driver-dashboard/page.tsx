"use client";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';
import { CabRide, cabError } from '@/services/cabs';
const ArrowLeft = () => <i className="fa-solid fa-arrow-left" aria-hidden="true" />;
const RefreshCw = () => <i className="fa-solid fa-rotate-right" aria-hidden="true" />;

export default function DriverDashboard() {
  const user = useAppStore(s => s.user);
  const [online, setOnline] = useState(false);
  const [requests, setRequests] = useState<CabRide[]>([]);
  const [ride, setRide] = useState<CabRide | null>(null);
  const [cashCollected, setCashCollected] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const location = useRef<{ lat: number; lng: number; heading: number } | null>(null);
  const locationAt = useRef(0);
  const onlineRef = useRef(false);
  const currentRef = useRef<CabRide | null>(null);
  const refresh = async () => {
    try {
      const [active, incoming] = await Promise.all([api.get('/travels/rides/active'), api.get('/travels/driver/requests')]);
      setRide(active.data.ride); currentRef.current = active.data.ride;
      setRequests(incoming.data.rides);
    } catch (e) { setError(cabError(e)); }
  };
  useEffect(() => {
    if (user?.role !== 'driver') return;
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => clearInterval(timer);
  }, [user?.uid, user?.role]);
  useEffect(() => {
    if (user?.role !== 'driver' || !navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition(position => {
      location.current = { lat: position.coords.latitude, lng: position.coords.longitude, heading: position.coords.heading || 0 };
      locationAt.current = position.timestamp;
    }, () => {
      location.current = null;
      if (onlineRef.current) setError('GPS unavailable. Enable location before taking another trip.');
    }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 });
    const timer = setInterval(async () => {
      if (!onlineRef.current) return;
      if (!location.current || Date.now() - locationAt.current > 30000) {
        onlineRef.current = false; setOnline(false);
        await api.put('/travels/driver/status', { isOnline: false }).catch(() => {});
        return;
      }
      try { await api.put('/travels/driver/status', { isOnline: true, ...location.current }); }
      catch (e) { setError(cabError(e)); onlineRef.current = false; setOnline(false); }
    }, 10000);
    return () => {
      clearInterval(timer); navigator.geolocation.clearWatch(watch);
      if (onlineRef.current) void api.put('/travels/driver/status', { isOnline: false }).catch(() => {});
      onlineRef.current = false;
    };
  }, [user?.uid, user?.role]);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError(cabError(e)); } finally { setBusy(false); }
  };
  const changeStatus = (status: string) => run(async () => {
    await api.put('/travels/rides/' + ride!._id + '/status', { status, cashCollected });
    setCashCollected(false); await refresh();
  });
  if (user?.role !== 'driver') return <main className="p-6"><h1 className="text-xl font-bold">Driver access required</h1><Link href="/">Back home</Link></main>;
  return <main className="max-w-3xl mx-auto p-4 pb-28 space-y-5">
    <header className="flex gap-4 items-center"><Link className="inline-flex w-10 h-10 items-center justify-center shrink-0" href="/" aria-label="Home"><ArrowLeft /></Link><h1 className="text-xl font-bold flex-1">APEX Driver</h1><button className="inline-flex w-10 h-10 items-center justify-center shrink-0" aria-label="Refresh" title="Refresh requests" onClick={() => void refresh()}><RefreshCw /></button></header>
    {error && <p role="alert" className="p-3 bg-red-50 text-red-700 border rounded-lg">{error}</p>}
    <label className="flex items-center justify-between border-b py-4 font-semibold">{online ? 'Online' : 'Offline'}<input type="checkbox" checked={online} disabled={busy} onChange={event => {
      const next = event.target.checked;
      void run(async () => {
        if (next && (!location.current || Date.now() - locationAt.current > 30000)) throw new Error('Wait for a GPS fix and allow location access.');
        await api.put('/travels/driver/status', { isOnline: next, ...(next ? location.current : {}) });
        onlineRef.current = next; setOnline(next); await refresh();
      });
    }} /></label>
    {ride ? <section className="space-y-4">
      <h2 className="text-lg font-semibold">Current trip: {ride.status.replace('_', ' ')}</h2>
      <p className="break-words">Pickup: {ride.pickup.address}</p><p className="break-words">Destination: {ride.dropoff.address}</p>
      <a className="underline" target="_blank" rel="noreferrer" href={'https://www.google.com/maps/dir/?api=1&destination=' + (ride.status === 'in_progress' ? ride.dropoff.lat + ',' + ride.dropoff.lng : ride.pickup.lat + ',' + ride.pickup.lng)}>Navigate</a>
      <p>INR {ride.fare} / {ride.paymentMethod === 'cash' ? 'Cash' : 'Online'} / {ride.paymentStatus}</p>
      {ride.status === 'accepted' && <button disabled={busy} onClick={() => void changeStatus('arrived')} className="w-full border p-3 rounded-lg">Confirm arrival</button>}
      {ride.status === 'arrived' && <button disabled={busy} onClick={() => void changeStatus('in_progress')} className="w-full border p-3 rounded-lg">Start trip</button>}
      {ride.status === 'in_progress' && <>
        {ride.paymentMethod === 'cash' && <label className="block"><input type="checkbox" checked={cashCollected} onChange={e => setCashCollected(e.target.checked)} /> Cash collected: INR {ride.fare}</label>}
        <button disabled={busy || (ride.paymentMethod === 'cash' && !cashCollected)} onClick={() => void changeStatus('completed')} className="w-full bg-green-700 text-white p-3 rounded-lg disabled:opacity-40">Complete trip</button>
      </>}
      {['accepted', 'arrived'].includes(ride.status) && <button disabled={busy} onClick={() => void changeStatus('cancelled')} className="w-full border p-3 rounded-lg">Cancel trip</button>}
    </section> : <section><h2 className="font-semibold mb-3">Cab requests</h2>{!requests.length && <p className="text-gray-600">{online ? 'No available requests.' : 'You are offline.'}</p>}
      {requests.map(request => <article className="border-b py-4 space-y-2" key={request._id}>
        <p className="font-semibold break-words">{request.pickup.address}</p><p className="break-words">To {request.dropoff.address}</p><p>INR {request.fare} / {request.vehicleType} / {request.paymentMethod}</p>
        <button disabled={busy || !online} className="w-full border rounded-lg p-3" onClick={() => void run(async () => { await api.put('/travels/rides/' + request._id + '/status', { status: 'accepted' }); await refresh(); })}>Accept ride</button>
      </article>)}
    </section>}
  </main>;
}
