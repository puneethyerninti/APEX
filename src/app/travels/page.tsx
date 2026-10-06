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
  const rideRef = useRef<CabRide | null>(null);
  useEffect(() => { rideRef.current = ride; }, [ride]);
  const refresh = async () => {
    try {
      const current = rideRef.current;
      const url = current ? '/travels/rides/' + current._id : '/travels/rides/active';
      const { data } = await api.get(url);
      setRide(data.ride);
    } catch (e) { setError(cabError(e)); }
  };
  useEffect(() => {
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
  }, [socket]);
  useEffect(() => {
    setQuote(null);
    if (!pickup || !dropoff || ride) return;
    let alive = true;
    setQuoting(true);
    setError('');
    api.post('/travels/quotes', { pickup, dropoff }).then(({ data }) => {
      if (alive) setQuote(data.quote);
    }).catch(e => { if (alive) setError(cabError(e)); }).finally(() => { if (alive) setQuoting(false); });
    return () => { alive = false; };
  }, [pickup, dropoff, ride?._id]);
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
  return <main className="max-w-3xl mx-auto pb-28 bg-white min-h-screen">
    <header className="flex items-center gap-4 p-4 border-b">
      <Link href="/" aria-label="Home" className="inline-flex w-10 h-10 items-center justify-center shrink-0"><ArrowLeft size={22} /></Link><h1 className="text-xl font-bold flex-1">APEX Cabs</h1>
      <button className="inline-flex w-10 h-10 items-center justify-center shrink-0" title="Trip history" aria-label="Trip history" onClick={() => void run(async () => { const { data } = await api.get('/travels/history'); setHistory(data.bookings); })}><History size={22} /></button>
    </header>
    <div className="h-64 sm:h-80"><TravelsMap cabLocation={driverLocation || ride?.driverId?.currentLocation || null} userLocation={ride?.pickup || pickup} routeGeometry={ride?.path || quote?.path} /></div>
    <section className="p-4 space-y-4">
      {error && <p role="alert" className="p-3 border border-red-200 bg-red-50 text-red-700 rounded-lg">{error}</p>}
      {history ? <div>
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Trip history</h2><button onClick={() => setHistory(null)}>Close</button></div>
        {!history.length && <p>No cab trips yet.</p>}
        {history.map(trip => <button key={trip._id} className="block w-full text-left py-4 border-b" onClick={() => { setRide(trip); setHistory(null); }}>
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
        {['searching', 'accepted', 'arrived'].includes(ride.status) && <button disabled={busy} className="border rounded-lg p-3 w-full" onClick={() => void run(async () => { const { data } = await api.put('/travels/rides/' + ride._id + '/status', { status: 'cancelled' }); setRide(data.ride); })}>Cancel ride</button>}
        {terminal && (ride.status === 'cancelled' || paid) && <button className="border rounded-lg p-3 w-full" onClick={() => { setRide(null); rideRef.current = null; setDriverLocation(null); setPickup(null); setDropoff(null); setPickupText(''); setDropoffText(''); }}>Book another cab</button>}
        <button className="inline-flex w-10 h-10 items-center justify-center" title="Refresh trip" aria-label="Refresh trip" onClick={() => void refresh()}><RefreshCw size={20} /></button>
      </> : <>
        <div className="flex items-center gap-3"><MapboxSearch placeholder="Pickup in Visakhapatnam" value={pickupText} onChange={value => { setPickupText(value); setPickup(null); }} onSelect={setPickup} /><button className="inline-flex w-10 h-10 items-center justify-center shrink-0" disabled={busy} title="Use current location" aria-label="Use current location" onClick={locate}><LocateFixed size={24} /></button></div>
        <MapboxSearch placeholder="Destination in Visakhapatnam" value={dropoffText} onChange={value => { setDropoffText(value); setDropoff(null); }} onSelect={setDropoff} />
        <fieldset className="flex gap-2"><legend className="text-sm mb-2">Cab</legend>{(['mini', 'xl'] as const).map(type => <label className="border rounded-lg p-3 flex-1" key={type}><input type="radio" name="vehicle" checked={vehicle === type} onChange={() => setVehicle(type)} /> {type === 'mini' ? 'Mini' : 'XL'} {quote ? '/ INR ' + quote.fares[type] : ''}</label>)}</fieldset>
        <fieldset className="flex gap-4"><legend className="text-sm mb-2">Payment</legend>{(['cash', 'online'] as const).map(type => <label key={type}><input type="radio" name="payment" checked={method === type} onChange={() => setMethod(type)} /> {type === 'cash' ? 'Cash to driver' : 'Online after trip'}</label>)}</fieldset>
        {quote && <p className="text-sm text-gray-600">{(quote.distance / 1000).toFixed(1)} km / {Math.ceil(quote.duration / 60)} min estimated trip</p>}
        {!quote && pickup && dropoff && !quoting && <button onClick={() => setPickup({ ...pickup })} className="underline">Refresh route</button>}
        <button disabled={busy || !quote || quoting || !user?.uid} className="w-full bg-violet-800 text-white p-3 rounded-lg disabled:opacity-40" onClick={() => void run(async () => {
          const { data } = await api.post('/travels/rides', { quoteId: quote!._id, vehicleType: vehicle, paymentMethod: method });
          setRide(data.ride); rideRef.current = data.ride;
        })}>{busy ? 'Please wait...' : quoting ? 'Calculating fare...' : 'Book cab'}</button>
      </>}
    </section>
  </main>;
}
