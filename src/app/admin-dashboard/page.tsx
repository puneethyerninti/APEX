"use client";
import React from 'react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const stats = [
    { label: "Total Users", value: "12,847", icon: "fa-users", color: "from-violet-500 to-purple-600", change: "+12%" },
    { label: "Revenue (MTD)", value: "₹18.4L", icon: "fa-indian-rupee-sign", color: "from-emerald-500 to-teal-600", change: "+8.2%" },
    { label: "Active Orders", value: "342", icon: "fa-box", color: "from-amber-500 to-orange-600", change: "+23%" },
    { label: "Conversion Rate", value: "4.7%", icon: "fa-chart-line", color: "from-rose-500 to-pink-600", change: "+1.1%" },
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

        {/* MODULE PERFORMANCE */}
        <div>
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Module Performance</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {modules.map((mod, idx) => (
              <div key={idx} className={`flex items-center justify-between px-4 py-3 ${idx !== modules.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50 transition-colors`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${mod.color} flex items-center justify-center`}>
                    <i className={`fa-solid ${mod.icon} text-sm`}></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{mod.name}</h4>
                    <p className="text-[9px] text-gray-500">{mod.users} users</p>
                  </div>
                </div>
                <span className="font-black text-sm text-gray-900">{mod.revenue}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RECENT ORDERS */}
        <div>
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Recent Orders</h3>
          <div className="space-y-2">
            {recentOrders.map((order, idx) => (
              <div key={idx} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold text-gray-400">{order.id}</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${order.statusColor}`}>{order.status}</span>
                  </div>
                  <h4 className="font-bold text-xs text-gray-900 truncate">{order.customer}</h4>
                  <p className="text-[9px] text-gray-500">{order.service}</p>
                </div>
                <span className="font-black text-sm text-gray-900 ml-3">{order.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div>
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

      </div>
    </>
  );
}
