"use client";
import React, { useEffect, useState, useContext, useRef } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { SocketContext } from '@/context/SocketContext';

export default function AdminDashboardPage() {
  const user = useAppStore((state) => state.user);
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [dbStats, setDbStats] = useState<any>(null);
  const [pendingApprovals, setPendingApprovals] = useState<{jobs: any[], profiles: any[], realty: any[]}>({jobs: [], profiles: [], realty: []});
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'users' | 'transactions'>('overview');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'wallet' | 'job' | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formData, setFormData] = useState({ amount: '', title: '', company: '', location: '' });

  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Generate a simple beep sound via base64 for alerts
    const audioUrl = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"+Array(100).join("X");
    audioRef.current = new Audio(audioUrl);
  }, []);

  const playAlertSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log("Audio play blocked by browser", e));
    }
  };

  useEffect(() => {
    if (user === undefined) return;
    
    // Check if user has admin role via our new RBAC system
    if (!user || user.role !== 'admin') {
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Access Denied', type: 'error' } }));
      router.replace('/');
    } else {
      setIsAuthorized(true);
      fetchAllData();
    }
  }, [user, router]);

  const fetchAllData = async () => {
    try {
      const [statsRes, approvalsRes, usersRes, transRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/approvals'),
        api.get('/admin/users'),
        api.get('/admin/transactions')
      ]);
      setDbStats(statsRes.data.stats);
      setPendingApprovals(approvalsRes.data);
      setUsers(usersRes.data.users);
      setTransactions(transRes.data.transactions);
    } catch (error) {
      console.error("Failed to fetch admin data", error);
    }
  };

  useEffect(() => {
    if (isAuthorized && socket) {
      socket.emit('join_admin_room');
      
      const handleDataRefresh = () => {
        console.log("Live Admin Data Refresh!");
        playAlertSound();
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'New data arrived!', type: 'success' } }));
        fetchAllData();
      };
      
      socket.on('admin_data_refresh', handleDataRefresh);
      return () => {
        socket.off('admin_data_refresh', handleDataRefresh);
      };
    }
  }, [isAuthorized, socket]);

  const handleApproval = async (type: string, id: string, status: string) => {
    try {
      await api.post('/admin/approvals/status', { type, id, status });
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `${type} ${status}`, type: 'success' } }));
      fetchAllData();
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const handleDelete = async (type: string, id: string) => {
    if(!confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      await api.delete(`/admin/${type}/${id}`);
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Deleted successfully', type: 'success' } }));
      fetchAllData();
    } catch (error) {
      console.error(error);
    }
  };

  const submitModal = async () => {
    if (modalType === 'wallet') {
      try {
        await api.post(`/admin/users/${selectedUser._id}/wallet`, { amount: Number(formData.amount) });
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Wallet updated', type: 'success' } }));
      } catch (err) { console.error(err); }
    }
    // ... logic for creating job etc can be added here
    setIsModalOpen(false);
    fetchAllData();
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const stats = [
    { label: "Total Users", value: dbStats?.totalUsers || 0, icon: "fa-users", color: "from-violet-500 to-purple-600" },
    { label: "Total Revenue", value: `₹${dbStats?.revenue || 0}`, icon: "fa-indian-rupee-sign", color: "from-emerald-500 to-teal-600" },
    { label: "Pending Jobs", value: dbStats?.pendingJobs || 0, icon: "fa-briefcase", color: "from-amber-500 to-orange-600" },
    { label: "Pending Realty", value: dbStats?.pendingRealty || 0, icon: "fa-building", color: "from-blue-500 to-cyan-600" },
  ];

  return (
    <>
      <div className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gray-700">
            <i className="fa-solid fa-arrow-left"></i>
          </Link>
          <div>
            <h1 className="font-black text-sm text-white">Advanced Admin Portal</h1>
            <p className="text-[9px] text-green-400 font-bold"><i className="fa-solid fa-circle text-[6px] animate-pulse"></i> Live RBAC Secured</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5 bg-gray-50 min-h-screen">
        
        {/* TABS */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {['overview', 'approvals', 'users', 'transactions'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)} 
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.color} text-white flex items-center justify-center mb-3`}>
                  <i className={`fa-solid ${stat.icon} text-sm`}></i>
                </div>
                <h3 className="text-lg font-black text-gray-900">{stat.value}</h3>
                <p className="text-[10px] text-gray-500 font-bold">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase">Jobs Pending</h3>
            {pendingApprovals.jobs.map(job => (
              <div key={job._id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <h4 className="font-bold text-sm">{job.title}</h4>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleApproval('job', job._id, 'approved')} className="flex-1 bg-green-500 text-white text-xs py-2 rounded-lg font-bold">Approve</button>
                  <button onClick={() => handleApproval('job', job._id, 'rejected')} className="flex-1 bg-red-100 text-red-600 text-xs py-2 rounded-lg font-bold">Reject</button>
                </div>
              </div>
            ))}
            
            <h3 className="text-xs font-black text-gray-400 uppercase mt-4">Profiles Pending</h3>
            {pendingApprovals.profiles.map(p => (
              <div key={p._id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <h4 className="font-bold text-sm">{p.user?.name}</h4>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleApproval('profile', p._id, 'approved')} className="flex-1 bg-green-500 text-white text-xs py-2 rounded-lg font-bold">Approve</button>
                  <button onClick={() => handleApproval('profile', p._id, 'rejected')} className="flex-1 bg-red-100 text-red-600 text-xs py-2 rounded-lg font-bold">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u._id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-sm">{u.name} {u.role === 'admin' && <span className="text-[8px] bg-red-500 text-white px-1 rounded">ADMIN</span>}</h4>
                  <p className="text-[10px] text-gray-500">{u.phone} • ₹{u.walletBalance}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSelectedUser(u); setFormData({...formData, amount: u.walletBalance}); setModalType('wallet'); setIsModalOpen(true); }} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><i className="fa-solid fa-wallet text-xs"></i></button>
                  <button onClick={() => handleDelete('user', u._id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><i className="fa-solid fa-trash text-xs"></i></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-2">
            {transactions.map((t) => (
              <div key={t._id} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-sm capitalize">{t.type}</h4>
                  <p className="text-[9px] text-gray-500">{t.userId?.name} • {new Date(t.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className={`font-black text-sm ${t.status==='completed'?'text-green-600':t.status==='failed'?'text-red-600':'text-yellow-600'}`}>₹{t.amount}</p>
                  <p className="text-[8px] uppercase">{t.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <h3 className="font-black text-lg mb-4">{modalType === 'wallet' ? `Edit Wallet: ${selectedUser?.name}` : 'Create Entity'}</h3>
            
            {modalType === 'wallet' && (
              <input type="number" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 font-bold" placeholder="Amount" />
            )}
            
            <div className="flex gap-2">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold">Cancel</button>
              <button onClick={submitModal} className="flex-1 bg-violet-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-violet-600/30">Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
