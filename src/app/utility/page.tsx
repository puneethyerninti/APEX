"use client";
import React, { useState } from 'react';
import Link from 'next/link';

const MOCK_PLANS = [
  { id: 1, price: "₹299", data: "2GB/day", validity: "28 Days", desc: "Truly Unlimited Calls + 100 SMS/day" },
  { id: 2, price: "₹479", data: "1.5GB/day", validity: "56 Days", desc: "Truly Unlimited Calls + 100 SMS/day" },
  { id: 3, price: "₹719", data: "2GB/day", validity: "84 Days", desc: "Truly Unlimited Calls + Disney+ Hotstar" },
  { id: 4, price: "₹199", data: "1.5GB/day", validity: "23 Days", desc: "Unlimited Calls" },
];

export default function UtilityPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'mobile_recharge'>('dashboard');
  const [mobileNumber, setMobileNumber] = useState('');

  const handleRechargeClick = (plan: any) => {
    window.dispatchEvent(new CustomEvent('openModal', { 
        detail: { type: 'checkout', data: { amount: plan.price, plan: `Mobile Recharge - ${plan.data}` } }
    }));
  };

  React.useEffect(() => {
    const handleSuccess = () => {
      // If we are in mobile recharge flow, reset it
      if (activeTab === 'mobile_recharge') {
        setActiveTab('dashboard');
        setMobileNumber('');
      }
    };
    window.addEventListener('paymentSuccess', handleSuccess);
    return () => window.removeEventListener('paymentSuccess', handleSuccess);
  }, [activeTab]);

  return (
    <>
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeTab === 'mobile_recharge' ? (
            <button onClick={() => setActiveTab('dashboard')} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
              <i className="fa-solid fa-arrow-left"></i>
            </button>
          ) : (
            <Link href="/" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
              <i className="fa-solid fa-arrow-left"></i>
            </Link>
          )}
          <h1 className="font-black text-lg text-gray-900">{activeTab === 'mobile_recharge' ? 'Mobile Recharge' : 'APEX Pay'}</h1>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: 'payment' }))}
          className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center"
        >
          <i className="fa-solid fa-qrcode"></i>
        </button>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="animate-[fadeIn_0.3s_ease-out]">
          {/* HERO DASHBOARD (PENDING BILLS) */}
          <div className="p-4">
            <div className="bg-gradient-to-br from-teal-600 to-cyan-700 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex items-center">
              <div className="absolute right-0 top-0 opacity-10">
                <i className="fa-solid fa-file-invoice text-[120px] -mt-4 -mr-4"></i>
              </div>
              <div className="relative z-10 w-full">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-teal-100 text-[10px] font-bold uppercase tracking-widest">Pending Bills (1)</p>
                  <span className="bg-red-500 text-white text-[8px] px-2 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">Due Today</span>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 mb-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-teal-600">
                      <i className="fa-solid fa-bolt"></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs">BESCOM Electricity</h4>
                      <p className="text-[9px] text-teal-100">Acc: 83920194</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h4 className="font-black text-sm">&#8377;1,240</h4>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { type: 'checkout', data: { amount: '₹1,240', plan: 'BESCOM Electricity Bill' } } }))}
                      className="bg-white text-teal-700 text-[9px] font-black px-3 py-1 rounded shadow-sm mt-1 hover:bg-gray-50"
                    >
                      PAY
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CATEGORY GRID */}
          <div className="px-4 mb-5">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Recharge & Pay Bills</h3>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="grid grid-cols-4 gap-y-4 gap-x-2">
                <button onClick={() => setActiveTab('mobile_recharge')} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 text-lg flex items-center justify-center"><i className="fa-solid fa-mobile-screen"></i></div>
                  <span className="text-[9px] font-bold text-gray-600">Mobile</span>
                </button>
                <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                  <div className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 text-lg flex items-center justify-center"><i className="fa-solid fa-tv"></i></div>
                  <span className="text-[9px] font-bold text-gray-600">DTH</span>
                </button>
                <button onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { type: 'checkout', data: { amount: '₹1,240', plan: 'BESCOM Electricity Bill' } } }))} className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                  <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 text-lg flex items-center justify-center"><i className="fa-solid fa-bolt"></i></div>
                  <span className="text-[9px] font-bold text-gray-600">Electricity</span>
                </button>
                <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                  <div className="w-10 h-10 rounded-full bg-cyan-50 text-cyan-600 text-lg flex items-center justify-center"><i className="fa-solid fa-wifi"></i></div>
                  <span className="text-[9px] font-bold text-gray-600">Broadband</span>
                </button>
                <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                  <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 text-lg flex items-center justify-center"><i className="fa-solid fa-fire-flame-simple"></i></div>
                  <span className="text-[9px] font-bold text-gray-600">Gas</span>
                </button>
                <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 text-lg flex items-center justify-center"><i className="fa-solid fa-droplet"></i></div>
                  <span className="text-[9px] font-bold text-gray-600">Water</span>
                </button>
                <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                  <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 text-lg flex items-center justify-center"><i className="fa-solid fa-graduation-cap"></i></div>
                  <span className="text-[9px] font-bold text-gray-600">Education</span>
                </button>
                <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                  <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 text-lg flex items-center justify-center"><i className="fa-solid fa-ellipsis"></i></div>
                  <span className="text-[9px] font-bold text-gray-600">More</span>
                </button>
              </div>
            </div>
          </div>

          {/* RECENT RECHARGES */}
          <div className="mb-5">
            <h3 className="px-4 text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Recent Recharges</h3>
            <div className="flex gap-3 overflow-x-auto px-4 scrollbar-none flex-nowrap pb-2">
              <div onClick={() => { setMobileNumber('9494273763'); setActiveTab('mobile_recharge'); }} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 min-w-[120px] flex-shrink-0 cursor-pointer flex flex-col items-center text-center hover:border-teal-300 transition-all">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2 font-black text-xs">JIO</div>
                <h4 className="font-bold text-[10px] text-gray-900 truncate w-full">9494273763</h4>
                <p className="text-[9px] text-gray-500 mb-2">Last: &#8377;299</p>
                <button className="w-full bg-teal-50 text-teal-600 font-bold text-[9px] py-1.5 rounded border border-teal-100 pointer-events-none">Repeat</button>
              </div>
              <div onClick={() => { setMobileNumber('8849201928'); setActiveTab('mobile_recharge'); }} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 min-w-[120px] flex-shrink-0 cursor-pointer flex flex-col items-center text-center hover:border-teal-300 transition-all">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 mb-2 font-black text-xs">AIR</div>
                <h4 className="font-bold text-[10px] text-gray-900 truncate w-full">8849201928</h4>
                <p className="text-[9px] text-gray-500 mb-2">Last: &#8377;749</p>
                <button className="w-full bg-teal-50 text-teal-600 font-bold text-[9px] py-1.5 rounded border border-teal-100 pointer-events-none">Repeat</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 animate-[fadeIn_0.3s_ease-out]">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
            <h3 className="font-black text-gray-900 mb-4">Enter Details</h3>
            
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Mobile Number</label>
              <div className="relative">
                <i className="fa-solid fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input 
                  type="tel" 
                  maxLength={10}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 98765 43210" 
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  autoFocus
                />
              </div>
            </div>

            {mobileNumber.length >= 10 && (
              <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl animate-[fadeIn_0.3s_ease-out]">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-600 font-black shadow-sm">JIO</div>
                <div>
                  <p className="font-bold text-sm text-gray-900">Reliance Jio</p>
                  <p className="text-[10px] text-gray-500">Karnataka</p>
                </div>
                <button className="ml-auto text-teal-600 text-[10px] font-bold">Change</button>
              </div>
            )}
          </div>

          {mobileNumber.length >= 10 && (
            <div className="animate-[slideUp_0.3s_ease-out]">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Recommended Plans</h3>
              <div className="flex flex-col gap-3">
                {MOCK_PLANS.map((plan) => (
                  <div key={plan.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-black text-xl text-gray-900">{plan.price}</h4>
                      <button onClick={() => handleRechargeClick(plan)} className="bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white transition-colors text-[10px] font-black px-4 py-1.5 rounded-full shadow-sm border border-teal-100">
                        Select
                      </button>
                    </div>
                    <div className="flex gap-4 mb-2">
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Data</p>
                        <p className="font-bold text-sm text-gray-800">{plan.data}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Validity</p>
                        <p className="font-bold text-sm text-gray-800">{plan.validity}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 border-t border-gray-50 pt-2">{plan.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
