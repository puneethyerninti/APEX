"use client";
import React, { useEffect, useState, useContext, useRef } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { SocketContext } from '@/context/SocketContext';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AdminDashboardPage() {
  const user = useAppStore((state) => state.user);
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [dbStats, setDbStats] = useState<any>(null);
  const [pendingApprovals, setPendingApprovals] = useState<{jobs: any[], profiles: any[], realty: any[]}>({jobs: [], profiles: [], realty: []});
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'users' | 'transactions'>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
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
    setIsAuthorized(true);
    fetchAllData();
  }, [user]);

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
        playAlertSound();
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'New live data arrived!', type: 'success' } }));
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
    setIsModalOpen(false);
    fetchAllData();
  };

  const markTransactionPaid = async (id: string) => {
    if(!confirm("Are you sure you verified this payment in Razorpay Dashboard?")) return;
    try {
      await api.put(`/admin/transactions/${id}/complete`);
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Transaction verified and marked as paid', type: 'success' } }));
      fetchAllData();
    } catch (err: any) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: err.response?.data?.error || 'Failed to verify transaction', type: 'error' } }));
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#A0684A] rounded-full animate-spin"></div>
      </div>
    );
  }

  // --- CHART DATA ---
  const lineChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Revenue',
        data: [12000, 19000, 15000, 22000, 25000, dbStats?.revenue || 30000], // Mocking some history
        borderColor: '#A0684A',
        backgroundColor: 'rgba(160, 104, 74, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const doughnutData = {
    labels: ['Store', 'Finance', 'Realty', 'Matrimony'],
    datasets: [
      {
        data: [45, 30, 15, 10], // Static based on HTML for now
        backgroundColor: ['#A0684A', '#25D366', '#3B82F6', '#EF4444'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="font-sans antialiased flex min-h-screen md:h-screen overflow-y-auto md:overflow-hidden bg-[#F9FAFB] text-[#222222]">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-[260px] bg-white border-r border-gray-100 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex-shrink-0 flex flex-col shadow-xl lg:shadow-none transition-transform duration-300 ease-in-out`}>
        <div className="h-16 flex items-center px-5 border-b border-gray-100 flex-shrink-0">
            <img src="/icon.jpeg" alt="APEX Logo" className="h-9 w-9 object-contain rounded-lg shadow-sm mr-3" />
            <span className="font-bold text-base tracking-wider text-[#A0684A] uppercase">APEX Admin</span>
            <button className="ml-auto lg:hidden text-gray-400 hover:text-[#A0684A]" onClick={() => setIsSidebarOpen(false)}>
                <i className="fa-solid fa-xmark text-lg"></i>
            </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1 custom-scrollbar">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2 px-3">Main</p>
            <button onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }} className={`w-full flex items-center px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'overview' ? 'bg-[#A0684A]/10 text-[#A0684A]' : 'text-gray-500 hover:bg-gray-50 hover:text-[#A0684A]'}`}>
                <i className="fa-solid fa-chart-pie w-5 text-center mr-3 text-base"></i> Overview
            </button>
            <button onClick={() => { setActiveTab('approvals'); setIsSidebarOpen(false); }} className={`w-full flex items-center px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'approvals' ? 'bg-[#A0684A]/10 text-[#A0684A]' : 'text-gray-500 hover:bg-gray-50 hover:text-[#A0684A]'}`}>
                <i className="fa-solid fa-clipboard-check w-5 text-center mr-3 text-base"></i> Approvals
                {(pendingApprovals.jobs.length + pendingApprovals.profiles.length + pendingApprovals.realty.length) > 0 && (
                  <span className="ml-auto bg-red-50 text-red-600 py-0.5 px-2 rounded-full text-[10px] font-bold border border-red-100">
                    {pendingApprovals.jobs.length + pendingApprovals.profiles.length + pendingApprovals.realty.length}
                  </span>
                )}
            </button>
            <button onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }} className={`w-full flex items-center px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'users' ? 'bg-[#A0684A]/10 text-[#A0684A]' : 'text-gray-500 hover:bg-gray-50 hover:text-[#A0684A]'}`}>
                <i className="fa-solid fa-users w-5 text-center mr-3 text-base"></i> User Management
            </button>
            <button onClick={() => { setActiveTab('transactions'); setIsSidebarOpen(false); }} className={`w-full flex items-center px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'transactions' ? 'bg-[#A0684A]/10 text-[#A0684A]' : 'text-gray-500 hover:bg-gray-50 hover:text-[#A0684A]'}`}>
                <i className="fa-solid fa-indian-rupee-sign w-5 text-center mr-3 text-base"></i> Transactions
            </button>

            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2 px-3 mt-6">System</p>
            <Link href="/" className="flex items-center px-3 py-2.5 text-gray-500 hover:bg-gray-50 hover:text-[#A0684A] rounded-xl font-medium text-sm transition-all">
                <i className="fa-solid fa-arrow-right-from-bracket w-5 text-center mr-3 text-base"></i> Exit Admin
            </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-visible md:overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 z-10 shadow-sm flex-shrink-0">
            <div className="flex items-center gap-3">
                <button className="lg:hidden text-gray-500 hover:text-[#A0684A] transition-colors text-xl -ml-1" onClick={() => setIsSidebarOpen(true)}>
                    <i className="fa-solid fa-bars"></i>
                </button>
                <div className="relative hidden sm:block">
                    <i className="fa-solid fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input type="text" placeholder="Search ecosystem..." className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm w-56 lg:w-72 focus:outline-none focus:border-[#A0684A] focus:ring-2 focus:ring-[#A0684A]/10 transition-all placeholder-gray-400" />
                </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-5">

                
                <button className="text-gray-400 hover:text-[#A0684A] transition-colors relative p-1" onClick={fetchAllData}>
                    <i className="fa-solid fa-rotate-right text-lg"></i>
                </button>
            </div>
        </header>

        {/* Scrollable Dashboard */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
            <div className="max-w-[1600px] mx-auto w-full animate-[slideUp_0.4s_ease-out]">
                
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-[1.65rem] font-bold text-gray-900 capitalize">{activeTab}</h1>
                        <p className="text-sm text-gray-500 mt-1.5">Manage and monitor the APEX ecosystem.</p>
                    </div>
                </div>

                {activeTab === 'overview' && (
                  <>
                    {/* STAT CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
                        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-[13px] font-medium text-gray-500">Total Users</p>
                                    <h3 className="text-[1.7rem] font-extrabold text-gray-900 mt-1 leading-none">{dbStats?.totalUsers || 0}</h3>
                                </div>
                                <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center">
                                    <i className="fa-solid fa-users text-blue-500 text-lg"></i>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-[13px] font-medium text-gray-500">Total Revenue</p>
                                    <h3 className="text-[1.7rem] font-extrabold text-gray-900 mt-1 leading-none">₹{dbStats?.revenue || 0}</h3>
                                </div>
                                <div className="w-11 h-11 rounded-2xl bg-green-50 flex items-center justify-center">
                                    <i className="fa-solid fa-wallet text-green-500 text-lg"></i>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-[13px] font-medium text-gray-500">Pending Jobs</p>
                                    <h3 className="text-[1.7rem] font-extrabold text-gray-900 mt-1 leading-none">{dbStats?.pendingJobs || 0}</h3>
                                </div>
                                <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center">
                                    <i className="fa-solid fa-briefcase text-orange-500 text-lg"></i>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-[13px] font-medium text-gray-500">Pending Realty</p>
                                    <h3 className="text-[1.7rem] font-extrabold text-gray-900 mt-1 leading-none">{dbStats?.pendingRealty || 0}</h3>
                                </div>
                                <div className="w-11 h-11 rounded-2xl bg-teal-50 flex items-center justify-center">
                                    <i className="fa-solid fa-building text-teal-500 text-lg"></i>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CHARTS */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-8">
                        {/* Revenue Line Chart */}
                        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-base sm:text-lg font-bold text-gray-900">Revenue Overview</h2>
                            </div>
                            <div className="relative h-64 sm:h-72 w-full">
                                <Line data={lineChartData} options={{ maintainAspectRatio: false }} />
                            </div>
                        </div>

                        {/* Doughnut Chart */}
                        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-5">Ecosystem Distribution</h2>
                            <div className="relative h-52 sm:h-56 w-full flex justify-center">
                                <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, cutout: '70%' }} />
                            </div>
                            <div className="mt-5 space-y-2.5">
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                    <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#A0684A]"></span><span className="font-medium text-gray-700">Store</span></span>
                                    <span className="font-bold text-gray-700">45%</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                    <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#25D366]"></span><span className="font-medium text-gray-700">Finance</span></span>
                                    <span className="font-bold text-gray-700">30%</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                    <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]"></span><span className="font-medium text-gray-700">Realty</span></span>
                                    <span className="font-bold text-gray-700">15%</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                    <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span><span className="font-medium text-gray-700">Matrimony</span></span>
                                    <span className="font-bold text-gray-700">10%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* RECENT TRANSACTIONS PREVIEW */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
                        <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-base sm:text-lg font-bold text-gray-900">Recent Transactions</h2>
                            <button onClick={() => setActiveTab('transactions')} className="text-[#A0684A] text-sm font-semibold hover:underline">View All →</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-gray-50/80 text-gray-500 text-[11px] uppercase tracking-wider">
                                        <th className="px-5 sm:px-6 py-3.5 font-semibold">User</th>
                                          <th className="px-5 sm:px-6 py-3.5 font-semibold">Service</th>
                                        <th className="px-5 sm:px-6 py-3.5 font-semibold">Amount</th>
                                        <th className="px-5 sm:px-6 py-3.5 font-semibold">Status</th>
                                        <th className="px-5 sm:px-6 py-3.5 font-semibold">Actions / Link</th>
                                        <th className="px-5 sm:px-6 py-3.5 font-semibold">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 text-sm">
                                    {transactions.slice(0, 5).map(t => (
                                      <tr key={t._id} className="hover:bg-[#FDFAF8] transition-colors">
                                          <td className="px-5 sm:px-6 py-4">
                                              <div className="flex items-center gap-3">
                                                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0">
                                                      {t.userId?.name ? t.userId.name.substring(0, 2).toUpperCase() : 'U'}
                                                  </div>
                                                  <div className="min-w-0">
                                                      <p className="font-semibold text-gray-900 text-sm truncate">{t.userId?.name || 'Unknown'}</p>
                                                      <p className="text-[11px] text-gray-400 truncate">{t.userId?.phone}</p>
                                                  </div>
                                              </div>
                                          </td>
                                          <td className="px-5 sm:px-6 py-4 capitalize font-medium text-gray-700">{t.category ? t.category.replace('_', ' ') : t.type}</td>
                                          <td className="px-5 sm:px-6 py-4 font-bold text-gray-900">₹{t.amount}</td>
                                          <td className="px-5 sm:px-6 py-4">
                                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${t.status==='completed'?'bg-green-50 text-green-700 border-green-100':t.status==='failed'?'bg-red-50 text-red-700 border-red-100':'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                                                  {t.status}
                                              </span>
                                          </td>
                                          <td className="px-5 sm:px-6 py-4">
                                              {t.status === 'pending' ? (
                                                  <button onClick={() => markTransactionPaid(t._id)} className="bg-[#A0684A] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#87563c] transition-colors shadow-sm">
                                                      Verify & Mark Paid
                                                  </button>
                                              ) : t.razorpayPaymentId ? (
                                                  <a href={`https://dashboard.razorpay.com/app/payments/${t.razorpayPaymentId}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs font-semibold flex items-center gap-1">
                                                      View <i className="fa-solid fa-external-link-alt text-[10px]"></i>
                                                  </a>
                                              ) : (
                                                  <span className="text-green-600 text-xs font-bold"><i className="fa-solid fa-check-circle mr-1"></i>Verified</span>
                                              )}
                                          </td>
                                          <td className="px-5 sm:px-6 py-4 text-gray-500 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                                      </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                  </>
                )}

                {activeTab === 'approvals' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Jobs */}
                    <div>
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2"><i className="fa-solid fa-briefcase text-[#A0684A]"></i> Jobs Pending</h3>
                      <div className="space-y-4">
                        {pendingApprovals.jobs.length === 0 && <p className="text-gray-400 text-sm italic">No pending jobs.</p>}
                        {pendingApprovals.jobs.map(job => (
                          <div key={job._id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-gray-900">{job.title}</h4>
                                <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-bold">Pending</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-4">{job.company} • {job.location}</p>
                            <div className="flex gap-2">
                              <button onClick={() => handleApproval('job', job._id, 'approved')} className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs py-2.5 rounded-xl font-bold transition-colors">Approve</button>
                              <button onClick={() => handleApproval('job', job._id, 'rejected')} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs py-2.5 rounded-xl font-bold transition-colors">Reject</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Profiles */}
                    <div>
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2"><i className="fa-solid fa-heart text-[#A0684A]"></i> Profiles Pending</h3>
                      <div className="space-y-4">
                        {pendingApprovals.profiles.length === 0 && <p className="text-gray-400 text-sm italic">No pending profiles.</p>}
                        {pendingApprovals.profiles.map(p => (
                          <div key={p._id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-gray-900">{p.user?.name || 'Unknown'}</h4>
                                <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-bold">Pending</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-4">Phone: {p.user?.phone}</p>
                            <div className="flex gap-2">
                              <button onClick={() => handleApproval('profile', p._id, 'approved')} className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs py-2.5 rounded-xl font-bold transition-colors">Approve</button>
                              <button onClick={() => handleApproval('profile', p._id, 'rejected')} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs py-2.5 rounded-xl font-bold transition-colors">Reject</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'users' && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[700px]">
                              <thead>
                                  <tr className="bg-gray-50/80 text-gray-500 text-[11px] uppercase tracking-wider">
                                      <th className="px-5 sm:px-6 py-3.5 font-semibold">User</th>
                                      <th className="px-5 sm:px-6 py-3.5 font-semibold">Phone</th>
                                      <th className="px-5 sm:px-6 py-3.5 font-semibold">Wallet Balance</th>
                                      <th className="px-5 sm:px-6 py-3.5 font-semibold">Role</th>
                                      <th className="px-5 sm:px-6 py-3.5 text-right font-semibold">Actions</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 text-sm">
                                  {users.map((u) => (
                                    <tr key={u._id} className="hover:bg-[#FDFAF8] transition-colors">
                                        <td className="px-5 sm:px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0">
                                                    {u.name ? u.name.substring(0, 2).toUpperCase() : 'U'}
                                                </div>
                                                <span className="font-semibold text-gray-900 text-sm">{u.name || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 sm:px-6 py-4 font-medium text-gray-700">{u.phone}</td>
                                        <td className="px-5 sm:px-6 py-4 font-bold text-green-600">₹{u.walletBalance}</td>
                                        <td className="px-5 sm:px-6 py-4">
                                            {u.role === 'admin' ? (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-black border border-red-100 uppercase">Admin</span>
                                            ) : (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold uppercase">User</span>
                                            )}
                                        </td>
                                        <td className="px-5 sm:px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                              <button onClick={() => { setSelectedUser(u); setFormData({...formData, amount: u.walletBalance}); setModalType('wallet'); setIsModalOpen(true); }} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"><i className="fa-solid fa-wallet text-xs"></i></button>
                                              <button onClick={() => handleDelete('user', u._id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors"><i className="fa-solid fa-trash text-xs"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
                )}

                {activeTab === 'transactions' && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[700px]">
                              <thead>
                                  <tr className="bg-gray-50/80 text-gray-500 text-[11px] uppercase tracking-wider">
                                      <th className="px-5 sm:px-6 py-3.5 font-semibold">User</th>
                                      <th className="px-5 sm:px-6 py-3.5 font-semibold">Service</th>
                                      <th className="px-5 sm:px-6 py-3.5 font-semibold">Amount</th>
                                      <th className="px-5 sm:px-6 py-3.5 font-semibold">Status</th>
                                      <th className="px-5 sm:px-6 py-3.5 font-semibold">Actions / Link</th>
                                      <th className="px-5 sm:px-6 py-3.5 font-semibold">Date</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 text-sm">
                                  {transactions.map(t => (
                                    <tr key={t._id} className="hover:bg-[#FDFAF8] transition-colors">
                                        <td className="px-5 sm:px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0 overflow-hidden">
                                                    {t.user?.profilePicture ? (
                                                        <img src={t.user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                                    ) : (
                                                        t.user?.name ? t.user.name.substring(0, 2).toUpperCase() : 'U'
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 text-sm truncate">{t.user?.name || 'Unknown'}</p>
                                                    <p className="text-[11px] text-gray-400 truncate">{t.user?.phone}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 sm:px-6 py-4 capitalize font-medium text-gray-700">{t.category ? t.category.replace('_', ' ') : t.type}</td>
                                        <td className="px-5 sm:px-6 py-4 font-bold text-gray-900">₹{t.amount}</td>
                                        <td className="px-5 sm:px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${t.status==='completed'?'bg-green-50 text-green-700 border-green-100':t.status==='failed'?'bg-red-50 text-red-700 border-red-100':'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="px-5 sm:px-6 py-4">
                                            {t.status === 'pending' ? (
                                                <button onClick={() => markTransactionPaid(t._id)} className="bg-[#A0684A] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#87563c] transition-colors shadow-sm">
                                                    Verify & Mark Paid
                                                </button>
                                            ) : t.razorpayPaymentId ? (
                                                <a href={`https://dashboard.razorpay.com/app/payments/${t.razorpayPaymentId}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs font-semibold flex items-center gap-1">
                                                    View <i className="fa-solid fa-external-link-alt text-[10px]"></i>
                                                </a>
                                            ) : (
                                                <span className="text-green-600 text-xs font-bold"><i className="fa-solid fa-check-circle mr-1"></i>Verified</span>
                                            )}
                                        </td>
                                        <td className="px-5 sm:px-6 py-4 text-gray-500 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
                )}
            </div>
        </main>
      </div>

      {/* Modals */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-[slideUp_0.3s_ease-out]">
            <h3 className="font-black text-xl mb-1 text-gray-900">{modalType === 'wallet' ? 'Edit Wallet Balance' : 'Create Entity'}</h3>
            <p className="text-xs text-gray-500 mb-5">{modalType === 'wallet' ? `Updating wallet for ${selectedUser?.name}` : ''}</p>
            
            {modalType === 'wallet' && (
              <div className="mb-6">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Amount (₹)</label>
                <input type="number" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} className="w-full bg-gray-50 border border-gray-200 focus:border-[#A0684A] focus:ring-1 focus:ring-[#A0684A] rounded-xl px-4 py-3 font-bold text-gray-900 transition-colors outline-none" placeholder="Enter amount" />
              </div>
            )}
            
            <div className="flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold transition-colors">Cancel</button>
              <button onClick={submitModal} className="flex-1 bg-[#A0684A] hover:bg-[#87563c] text-white py-3 rounded-xl font-bold shadow-lg shadow-[#A0684A]/30 transition-all">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
