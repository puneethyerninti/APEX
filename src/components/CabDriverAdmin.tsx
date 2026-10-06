"use client";
import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { cabError } from '@/services/cabs';

export default function CabDriverAdmin() {
  const [users, setUsers] = useState<any[]>([]);
  const [id, setId] = useState('');
  const [type, setType] = useState('mini');
  const [plate, setPlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { api.get('/admin/users').then(({ data }) => setUsers(data.users || [])).catch(e => setMessage(cabError(e))); }, []);
  return <form className="p-5 border-b space-y-3" onSubmit={async e => {
    e.preventDefault(); if (busy) return;
    setBusy(true); setMessage('');
    try { await api.put('/travels/admin/drivers/' + id + '/vehicle', { type, plate, make, model, approved }); setMessage('Approved vehicle saved. Driver must sign in again.'); }
    catch (error) { setMessage(cabError(error)); } finally { setBusy(false); }
  }}>
    <h2 className="font-semibold">Driver approval</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label>Account<select required className="block w-full border p-2 rounded-lg" value={id} onChange={e => setId(e.target.value)}><option value="">Select account</option>{users.filter(u => u.role !== 'admin').map(u => <option key={u._id} value={u._id}>{u.name} / {u.phone}</option>)}</select></label>
      <label>Vehicle<select className="block w-full border p-2 rounded-lg" value={type} onChange={e => setType(e.target.value)}><option value="mini">Mini</option><option value="xl">XL</option></select></label>
      <label>Plate<input required maxLength={80} className="block w-full border p-2 rounded-lg" value={plate} onChange={e => setPlate(e.target.value)} /></label>
      <label>Make<input required maxLength={80} className="block w-full border p-2 rounded-lg" value={make} onChange={e => setMake(e.target.value)} /></label>
      <label>Model<input required maxLength={80} className="block w-full border p-2 rounded-lg" value={model} onChange={e => setModel(e.target.value)} /></label>
    </div>
    <label className="block"><input type="checkbox" required checked={approved} onChange={e => setApproved(e.target.checked)} /> Driver identity, licence and vehicle verified</label>
    <button disabled={busy || !approved} className="border rounded-lg p-2 disabled:opacity-40">{busy ? 'Saving...' : 'Approve vehicle'}</button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </form>;
}
