"use client";
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import { useSocket } from '@/context/SocketContext';
import { CabLocation, CabQuote, CabRide, cabError, payForCab } from '@/services/cabs';
import MapboxSearch from '@/components/MapboxSearch';
const TravelsMap = dynamic(() => import('@/components/TravelsMap'), { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-600" role="status">Loading map...</div> });
const ArrowLeft = (_props: { size?: number }) => <i className="fa-solid fa-arrow-left" aria-hidden="true" />;
const LocateFixed = (_props: { size?: number }) => <i className="fa-solid fa-location-crosshairs" aria-hidden="true" />;
const History = (_props: { size?: number }) => <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />;
const RefreshCw = (_props: { size?: number }) => <i className="fa-solid fa-rotate-right" aria-hidden="true" />;

export default function Page() {
  const user = useAppStore(s => s.user);
  const { socket } = useSocket();
  const [pickupText, setPickupText] = useState('');
  const [dropoffText, setDropoffText] = useState('');
  const [pickup, setPickup] = useState<CabLocation | null>(null);
  const [dropoff, setDropoff] = useState<CabLocation | null>(null);
  const [quote, setQuote] = useState<CabQuote | null>(null);
  const [ride, setRide] = useState<CabRide | null>(null);
  const [vehicle, setVehicle] = useState<'mini' | 'xl'>('mini');
  const [method, setMethod] = useState<'cash' | 'online'>('cash');
  const [busy, setBusy] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<CabRide[] | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [expanded, setExpanded] = useState(true);
  const rideRef = useRef<CabRide | null>(null);
  const rideRevision = useRef(0);
  const showRide = (next: CabRide | null) => {
    ++rideRevision.current;
    rideRef.current = next;
    setRide(next);
  };
  const refresh = async () => {
    const revision = rideRevision.current;
    try {
      const current = rideRef.current;
      const url = current ? '/travels/rides/' + current._id : '/travels/rides/active';
      const { data } = await api.get(url);
      if (useAppStore.getState().user?.uid !== user?.uid || revision !== rideRevision.current) return;
      showRide(data.ride);
    } catch (e) { if (revision === rideRevision.current) setError(cabError(e)); }
  };
  useEffect(() => {
    showRide(null); setQuote(null); setHistory(null); setDriverLocation(null);
    if (!user?.uid) return;
    void refresh();
    const timer = setInterval(() => void refresh(), 4000);
    return () => clearInterval(timer);
  }, [user?.uid]);
  useEffect(() => {
    if (!socket) return;
    const update = () => void refresh();
    const location = (data: any) => {
      if (data.rideId === rideRef.current?._id) setDriverLocation({ lat: data.lat, lng: data.lng });
    };
    socket.on('ride_status_update', update);
    socket.on('cab_payment_update', update);
    socket.on('ride_location_update', location);
    socket.on('connect', update);
    return () => {
      socket.off('ride_status_update', update); socket.off('cab_payment_update', update);
      socket.off('ride_location_update', location); socket.off('connect', update);
    };
  }, [socket, user?.uid]);
  useEffect(() => {
    setQuote(null);
    if (!pickup || !dropoff || ride || !user?.uid) { setQuoting(false); return; }
    let alive = true;
    setQuoting(true);
    setError('');
    api.post('/travels/quotes', { pickup, dropoff }).then(({ data }) => {
      if (alive) setQuote(data.quote);
    }).catch(e => { if (alive) setError(cabError(e)); }).finally(() => { if (alive) setQuoting(false); });
    return () => { alive = false; };
  }, [pickup, dropoff, ride?._id, user?.uid]);
  useEffect(() => {
    if (!quote) return;
    const timer = setTimeout(() => { setQuote(null); setError('Fare expired. Refresh the route.'); }, Math.max(0, new Date(quote.expiresAt).getTime() - Date.now()));
    return () => clearTimeout(timer);
  }, [quote]);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError(cabError(e)); } finally { setBusy(false); }
  };
  const locate = () => {
    if (!navigator.geolocation) { setError('Location is unavailable. Select a pickup address.'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(position => {
      const p = { lat: position.coords.latitude, lng: position.coords.longitude, address: 'Current GPS pickup' };
      setPickup(p); setPickupText(p.address); setBusy(false);
    }, () => { setBusy(false); setError('Location permission denied. Select a pickup address.'); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };
  const terminal = ride && ['completed', 'cancelled'].includes(ride.status);
  const paid = ride?.paymentStatus === 'paid';
  const labels: Record<string, string> = { searching: 'Finding a driver', accepted: 'Driver on the way', arrived: 'Driver arrived', in_progress: 'Trip in progress', completed: 'Trip completed', cancelled: 'Trip cancelled' };
  return <main className="relative h-[calc(100dvh-80px)] min-h-[360px] w-full overflow-hidden bg-gray-100 md:h-screen">
    <div className="absolute inset-0"><TravelsMap cabLocation={driverLocation || ride?.driverId?.currentLocation || null} userLocation={ride?.pickup || pickup} destination={ride?.dropoff || dropoff} routeGeometry={ride?.path || quote?.path} /></div>
    <header className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 border-b border-gray-100 bg-white/95 px-4 py-3 shadow-sm">
      <Link href="/" aria-label="Home" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600"><ArrowLeft size={22} /></Link><div className="flex-1"><h1 className="text-lg font-black text-gray-900">APEX Cabs</h1><p className="text-xs text-gray-500">Visakhapatnam</p></div>
      <button className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-600" title="Trip history" aria-label="Trip history" onClick={() => void run(async () => { const { data } = await api.get('/travels/history'); setHistory(data.bookings); setExpanded(true); })}><History size={22} /></button>
    </header>
    <section className={'absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-3xl bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.12)] transition-[max-height] md:inset-x-auto md:bottom-6 md:left-6 md:w-96 md:rounded-2xl ' + (expanded ? 'max-h-[68%] md:max-h-[calc(100%-120px)]' : 'max-h-16')}>
      <button aria-label={expanded ? 'Collapse booking panel' : 'Expand booking panel'} aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="flex h-12 shrink-0 flex-col items-center justify-center gap-1 text-xs font-semibold text-gray-500"><span className="h-1 w-10 rounded-full bg-gray-300" />{expanded ? 'Book a Ride' : ride ? labels[ride.status] : 'Book a Ride'}</button>
      <div className={expanded ? 'space-y-4 overflow-y-auto px-5 pb-5' : 'hidden'}>
      {error && <p role="alert" className="p-3 border border-red-200 bg-red-50 text-red-700 rounded-lg">{error}</p>}
      {history ? <div>
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Trip history</h2><button onClick={() => setHistory(null)}>Close</button></div>
        {!history.length && <p>No cab trips yet.</p>}
        {history.map(trip => <button key={trip._id} className="block w-full text-left py-4 border-b" onClick={() => { showRide(trip); setHistory(null); }}>
          <p className="font-semibold break-words">{trip.pickup.address} to {trip.dropoff.address}</p>
          <p className="text-sm text-gray-600">{labels[trip.status]} / INR {trip.fare} / {trip.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}</p>
        </button>)}
      </div> : ride ? <>
        <h2 className="text-lg font-bold">{labels[ride.status]}</h2>
        <p className="break-words">{ride.pickup.address} to {ride.dropoff.address}</p>
        <p>{ride.vehicleType === 'xl' ? 'XL' : 'Mini'} / INR {ride.fare} / {ride.paymentMethod === 'cash' ? 'Cash' : 'Online'}</p>
        {ride.status === 'searching' && <p className="text-sm text-gray-600">Search ends at {ride.expiresAt ? new Date(ride.expiresAt).toLocaleTimeString() : 'the next status update'}.</p>}
        {ride.driverId && <div className="border-t pt-3"><p className="font-semibold">{ride.driverId.name}</p><p>{ride.driverId.vehicleDetails?.make} {ride.driverId.vehicleDetails?.model} / {ride.driverId.vehicleDetails?.plate}</p>
          {!terminal && ride.driverId.phone && <a className="underline" href={'tel:' + ride.driverId.phone}>Call driver</a>}</div>}
        {ride.status === 'completed' && <p className={paid ? 'text-green-700' : 'text-amber-700'}>{paid ? 'Payment confirmed' : 'Payment pending'}</p>}
        {ride.status === 'completed' && !paid && ride.paymentMethod === 'online' && <button disabled={busy} className="bg-violet-800 text-white rounded-lg p-3 w-full" onClick={() => void run(async () => { await payForCab(ride); await refresh(); })}>Pay INR {ride.fare}</button>}
        {['searching', 'accepted', 'arrived'].includes(ride.status) && <button disabled={busy} className="border rounded-lg p-3 w-full" onClick={() => void run(async () => { const { data } = await api.put('/travels/rides/' + ride._id + '/status', { status: 'cancelled' }); showRide(data.ride); })}>Cancel ride</button>}
        {terminal && (ride.status === 'cancelled' || paid) && <button className="border rounded-lg p-3 w-full" onClick={() => { showRide(null); setDriverLocation(null); setPickup(null); setDropoff(null); setPickupText(''); setDropoffText(''); }}>Book another cab</button>}
        <button className="inline-flex w-10 h-10 items-center justify-center" title="Refresh trip" aria-label="Refresh trip" onClick={() => void refresh()}><RefreshCw size={20} /></button>
      </> : <>
        <div className="flex items-center gap-3"><MapboxSearch placeholder="Pickup in Visakhapatnam" value={pickupText} onChange={value => { setPickupText(value); setPickup(null); }} onSelect={setPickup} /><button className="inline-flex w-10 h-10 items-center justify-center shrink-0" disabled={busy} title="Use current location" aria-label="Use current location" onClick={locate}><LocateFixed size={24} /></button></div>
        <MapboxSearch placeholder="Destination in Visakhapatnam" value={dropoffText} onChange={value => { setDropoffText(value); setDropoff(null); }} onSelect={setDropoff} />
        <fieldset className="flex gap-3"><legend className="mb-2 text-xs font-bold text-gray-500">Choose Your Cab</legend>{(['mini', 'xl'] as const).map(type => <label className={'flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 ' + (vehicle === type ? 'border-violet-500 bg-violet-50' : 'border-gray-100 bg-white')} key={type}><input className="sr-only" type="radio" name="vehicle" checked={vehicle === type} onChange={() => setVehicle(type)} /><i aria-hidden="true" className={'fas text-2xl ' + (type === 'mini' ? 'fa-car-side text-violet-600' : 'fa-taxi text-amber-500')} /><span className="min-w-0"><strong className="block text-sm text-gray-900">{type === 'mini' ? 'Mini' : 'XL'}</strong><span className="block text-xs text-gray-500">{quote ? 'INR ' + quote.fares[type] : 'Select a route'}</span></span></label>)}</fieldset>
        <fieldset className="grid grid-cols-2 gap-2 text-xs"><legend className="mb-2 text-xs font-bold text-gray-500">Payment</legend>{(['cash', 'online'] as const).map(type => <label className="flex items-center gap-2 rounded-lg bg-gray-50 p-3" key={type}><input type="radio" name="payment" checked={method === type} onChange={() => setMethod(type)} /><span>{type === 'cash' ? 'Cash to driver' : 'Online after trip'}</span></label>)}</fieldset>
        {quote && <p className="text-sm text-gray-600">{(quote.distance / 1000).toFixed(1)} km / {Math.ceil(quote.duration / 60)} min estimated trip</p>}
        {!quote && pickup && dropoff && !quoting && <button onClick={() => setPickup({ ...pickup })} className="underline">Refresh route</button>}
        <button disabled={busy || !quote || quoting || !user?.uid} className="w-full bg-violet-800 text-white p-3 rounded-lg disabled:opacity-40" onClick={() => void run(async () => {
          const { data } = await api.post('/travels/rides', { quoteId: quote!._id, vehicleType: vehicle, paymentMethod: method });
          showRide(data.ride);
        })}>{busy ? 'Please wait...' : quoting ? 'Calculating fare...' : 'Book cab'}</button>
      </>}
      </div>
    </section>
  </main>;
}
