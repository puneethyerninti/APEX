"use client";
import React from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/services/api';

export default function AdminDashboardPage() {
  const user = useAppStore((state) => state.user);
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [dbStats, setDbStats] = useState<any>(null);
  const [pendingApprovals, setPendingApprovals] = useState<{jobs: any[], profiles: any[]}>({jobs: [], profiles: []});
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'users'>('overview');

  useEffect(() => {
    const adminPhone = process.env.NEXT_PUBLIC_ADMIN_PHONE_NUMBER;
    
    if (user === undefined) return; // Still loading state
    
    if (!user || user.phone !== adminPhone) {
      router.replace('/');
    } else {
      setIsAuthorized(true);
      fetchStats(adminPhone);
    }
  }, [user, router]);

  const fetchStats = async (phone: string) => {
    try {
      const response = await api.get('/admin/stats', { headers: { 'x-phone-number': phone } });
      setDbStats(response.data.stats);
    } catch (error) {
      console.error("Failed to fetch admin stats", error);
    }
  };

  const fetchApprovalsAndUsers = async () => {
    try {
      const adminPhone = process.env.NEXT_PUBLIC_ADMIN_PHONE_NUMBER || '';
      const headers = { 'x-phone-number': adminPhone };
      const [approvalsRes, usersRes] = await Promise.all([
        api.get('/admin/approvals', { headers }),
        api.get('/admin/users', { headers })
      ]);
      setPendingApprovals(approvalsRes.data);
      setUsers(usersRes.data.users);
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchApprovalsAndUsers();
    }
  }, [isAuthorized]);

  const handleApproval = async (type: 'job' | 'profile', id: string, status: 'approved' | 'rejected') => {
    try {
      const adminPhone = process.env.NEXT_PUBLIC_ADMIN_PHONE_NUMBER || '';
      await api.post('/admin/approvals/status', { type, id, status }, { headers: { 'x-phone-number': adminPhone } });
      fetchApprovalsAndUsers(); // refresh data
      fetchStats(adminPhone);
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const stats = [
    { label: "Total Users", value: dbStats ? dbStats.totalUsers.toLocaleString() : "...", icon: "fa-users", color: "from-violet-500 to-purple-600", change: "Live" },
    { label: "Revenue", value: dbStats ? `₹${dbStats.revenue.toLocaleString()}` : "...", icon: "fa-indian-rupee-sign", color: "from-emerald-500 to-teal-600", change: "Live" },
    { label: "Pending Jobs", value: dbStats ? dbStats.pendingJobs.toLocaleString() : "...", icon: "fa-briefcase", color: "from-amber-500 to-orange-600", change: "Action" },
    { label: "Pending Profiles", value: dbStats ? dbStats.pendingProfiles.toLocaleString() : "...", icon: "fa-ring", color: "from-rose-500 to-pink-600", change: "Action" },
  ];

  const recentOrders = [
    { id: "#APX-7842", customer: "Rahul Verma", service: "Matrimony Gold", amount: "₹15,000", status: "Completed", statusColor: "bg-green-100 text-green-700" },
    { id: "#APX-7841", customer: "Priya Singh", service: "Academy Course", amount: "₹12,000", status: "Processing", statusColor: "bg-yellow-100 text-yellow-700" },
    { id: "#APX-7840", customer: "Amit Patel", service: "Cab Booking", amount: "₹450", status: "Completed", statusColor: "bg-green-100 text-green-700" },
    { id: "#APX-7839", customer: "Sneha Rao", service: "Bill Payment", amount: "₹1,240", status: "Completed", statusColor: "bg-green-100 text-green-700" },
    { id: "#APX-7838", customer: "Karthik N", service: "Realty Enquiry", amount: "₹0", status: "Pending", statusColor: "bg-blue-100 text-blue-700" },
  ];

  const modules = [
    { name: "Finance", users: "3,412", revenue: "₹4.2L", icon: "fa-chart-line", color: "text-blue-600 bg-blue-50" },
    { name: "Store", users: "5,201", revenue: "₹6.8L", icon: "fa-store", color: "text-amber-600 bg-amber-50" },
    { name: "Matrimony", users: "1,847", revenue: "₹3.1L", icon: "fa-ring", color: "text-rose-600 bg-rose-50" },
    { name: "Academy", users: "892", revenue: "₹2.4L", icon: "fa-graduation-cap", color: "text-purple-600 bg-purple-50" },
    { name: "Travels", users: "1,105", revenue: "₹1.2L", icon: "fa-taxi", color: "text-orange-600 bg-orange-50" },
    { name: "Utility", users: "390", revenue: "₹0.7L", icon: "fa-bolt", color: "text-teal-600 bg-teal-50" },
  ];

  return (
    <>
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gray-700 transition-colors">
            <i className="fa-solid fa-arrow-left"></i>
          </Link>
          <div>
            <h1 className="font-black text-sm text-white">Admin Dashboard</h1>
            <p className="text-[9px] text-gray-400">APEX Control Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center hover:bg-gray-700 transition-colors relative">
            <i className="fa-solid fa-bell text-sm"></i>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-gray-900"></span>
          </button>
          <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px] font-black">
            AD
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5 bg-gray-50 min-h-screen">
        
        {/* TABS */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'overview' ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>Overview</button>
          <button onClick={() => setActiveTab('approvals')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'approvals' ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>Approvals {pendingApprovals.jobs.length + pendingApprovals.profiles.length > 0 && <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[8px]">{pendingApprovals.jobs.length + pendingApprovals.profiles.length}</span>}</button>
          <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'users' ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>Users List</button>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* STAT CARDS */}
            <div className="grid grid-cols-2 gap-3">
              {stats.map((stat, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.color} text-white flex items-center justify-center shadow-sm`}>
                      <i className={`fa-solid ${stat.icon} text-sm`}></i>
                    </div>
                    <span className="bg-green-50 text-green-600 text-[8px] font-black px-1.5 py-0.5 rounded">{stat.change}</span>
                  </div>
                  <h3 className="text-lg font-black text-gray-900">{stat.value}</h3>
                  <p className="text-[10px] text-gray-500 font-bold">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* QUICK ACTIONS */}
            <div className="mt-5">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h3>
              <div className="grid grid-cols-3 gap-2">
                <button className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition-all">
                  <i className="fa-solid fa-user-plus text-violet-500"></i>
                  <span className="text-[9px] font-bold text-gray-600">Add User</span>
                </button>
                <button className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition-all">
                  <i className="fa-solid fa-paper-plane text-blue-500"></i>
                  <span className="text-[9px] font-bold text-gray-600">Send Notice</span>
                </button>
                <button className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition-all">
                  <i className="fa-solid fa-file-export text-emerald-500"></i>
                  <span className="text-[9px] font-bold text-gray-600">Export Data</span>
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'approvals' && (
          <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Pending Matrimony Profiles</h3>
            {pendingApprovals.profiles.length === 0 ? (
              <p className="text-xs text-gray-500 bg-white p-3 rounded-lg border border-gray-100">No pending profiles.</p>
            ) : (
              pendingApprovals.profiles.map(profile => (
                <div key={profile._id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-sm">{profile.user?.name || 'Unknown'}</h4>
                      <p className="text-[10px] text-gray-500">{profile.age} yrs • {profile.profession}</p>
                    </div>
                    <span className="bg-yellow-100 text-yellow-700 text-[8px] font-bold px-2 py-1 rounded">Pending</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleApproval('profile', profile._id, 'approved')} className="flex-1 bg-green-500 text-white text-xs font-bold py-2 rounded-lg shadow-sm hover:bg-green-600 transition-colors">Approve</button>
                    <button onClick={() => handleApproval('profile', profile._id, 'rejected')} className="flex-1 bg-red-50 text-red-500 text-xs font-bold py-2 rounded-lg hover:bg-red-100 transition-colors border border-red-100">Reject</button>
                  </div>
                </div>
              ))
            )}

            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mt-5">Pending Jobs</h3>
            {pendingApprovals.jobs.length === 0 ? (
              <p className="text-xs text-gray-500 bg-white p-3 rounded-lg border border-gray-100">No pending jobs.</p>
            ) : (
              pendingApprovals.jobs.map(job => (
                <div key={job._id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-sm">{job.title}</h4>
                      <p className="text-[10px] text-gray-500">{job.company} • {job.location}</p>
                      <p className="text-[10px] text-gray-400 mt-1">Posted by: {job.postedBy?.name || 'Unknown'} ({job.postedBy?.phone || 'N/A'})</p>
                    </div>
                    <span className="bg-yellow-100 text-yellow-700 text-[8px] font-bold px-2 py-1 rounded">Pending</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleApproval('job', job._id, 'approved')} className="flex-1 bg-green-500 text-white text-xs font-bold py-2 rounded-lg shadow-sm hover:bg-green-600 transition-colors">Approve</button>
                    <button onClick={() => handleApproval('job', job._id, 'rejected')} className="flex-1 bg-red-50 text-red-500 text-xs font-bold py-2 rounded-lg hover:bg-red-100 transition-colors border border-red-100">Reject</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">All Users</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {users.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-xs">No users found.</div>
              ) : (
                users.map((u, idx) => (
                  <div key={u._id} className={`flex items-center justify-between px-4 py-3 ${idx !== users.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                        <i className="fa-solid fa-user text-xs"></i>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">{u.name}</h4>
                        <p className="text-[9px] text-gray-500">{u.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm text-green-600">₹{u.walletBalance?.toLocaleString() || 0}</p>
                      <button className="text-[8px] font-bold text-blue-500 hover:underline">Edit Wallet</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
