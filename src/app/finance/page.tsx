"use client";
import React from 'react';
import Link from 'next/link';
import NotificationBell from '@/components/NotificationBell';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

export default function FinancePage() {
  const user = useAppStore((state) => state.user);

  const [isLeadFormOpen, setIsLeadFormOpen] = React.useState(false);
  const [leadServiceType, setLeadServiceType] = React.useState('');
  const [leadName, setLeadName] = React.useState('');
  const [leadMobile, setLeadMobile] = React.useState('');

  const handleOpenLeadForm = (e: React.MouseEvent, type: string) => {
      e.preventDefault();
      setLeadServiceType(type);
      setIsLeadFormOpen(true);
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!leadName.trim() || !leadMobile.trim()) {
          alert('Please enter Name and Mobile Number');
          return;
      }
      if (leadMobile.length < 10) {
          alert('Please enter a valid Mobile Number');
          return;
      }
      
      try {
          await api.post('/leads', {
              name: leadName,
              mobile: leadMobile,
              serviceType: leadServiceType,
              userId: user?.uid || user?._id
          });
      } catch (error) {
          console.error('Failed to post lead', error);
      }

      const message = `Hi APEX, I am interested in ${leadServiceType}.\nName: ${leadName}\nMobile: ${leadMobile}`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/919494273763?text=${encodedMessage}`;
      
      window.open(whatsappUrl, '_blank');
      
      setIsLeadFormOpen(false);
      setLeadName('');
      setLeadMobile('');
  };

  return (
    <>
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
              <Link href="/" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                  <i className="fa-solid fa-arrow-left"></i>
              </Link>
              <h1 className="font-black text-lg text-gray-900">Financial Services</h1>
          </div>
          <NotificationBell className="w-8 h-8 rounded-full bg-blue-50 text-blue-600" />
      </div>

      {/* HERO DASHBOARD */}
      <div className="p-4">
          <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider mb-1">Total Portfolio Value</p>
              <div className="flex items-end gap-2 mb-3">
                  <h2 className="text-3xl font-black tracking-tight">₹12,45,600</h2>
                  <span className="text-green-300 text-xs font-bold mb-1 flex items-center gap-1"><i className="fa-solid fa-arrow-trend-up"></i> +4.2%</span>
              </div>
              <div className="flex gap-4 border-t border-white/20 pt-3 mt-1">
                  <div>
                      <p className="text-blue-100 text-[9px] uppercase">Invested</p>
                      <p className="font-bold text-sm">₹10,00,000</p>
                  </div>
                  <div>
                      <p className="text-blue-100 text-[9px] uppercase">Returns</p>
                      <p className="font-bold text-sm text-green-300">₹2,45,600</p>
                  </div>
              </div>
          </div>
      </div>

      {/* SERVICES GRID */}
      <div className="px-4 mb-5">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Our Services</h3>
          <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col items-start p-4 bg-white rounded-2xl border border-gray-100 shadow-sm gap-3 hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 text-lg"><i className="fa-solid fa-hand-holding-dollar"></i></div>
                      <span className="text-sm font-bold text-gray-800">Loans</span>
                  </div>
                  <ul className="text-xs text-gray-500 space-y-1.5 w-full pl-2 border-l-2 border-rose-100">
                      <li><a href="#" onClick={(e) => handleOpenLeadForm(e, 'Personal Loan')} className="hover:text-rose-600 font-medium block">Personal Loan</a></li>
                      <li><a href="#" onClick={(e) => handleOpenLeadForm(e, 'Home Loan')} className="hover:text-rose-600 font-medium block">Home Loan</a></li>
                      <li><a href="#" onClick={(e) => handleOpenLeadForm(e, 'Business Loan')} className="hover:text-rose-600 font-medium block">Business Loan</a></li>
                  </ul>
              </div>
              
              <div className="flex flex-col items-start p-4 bg-white rounded-2xl border border-gray-100 shadow-sm gap-3 hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-lg"><i className="fa-solid fa-chart-line"></i></div>
                      <span className="text-sm font-bold text-gray-800">Investment</span>
                  </div>
                  <ul className="text-xs text-gray-500 space-y-1.5 w-full pl-2 border-l-2 border-emerald-100">
                      <li><Link href="/finance/mutual-funds" className="hover:text-emerald-600 font-medium block">Mutual Funds</Link></li>
                      <li><a href="https://stablemoney.onelink.me/rkWL/reg7ibv8" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 font-medium block">Fixed Deposit</a></li>
                      <li><a href="#" onClick={(e) => handleOpenLeadForm(e, 'NPS')} className="hover:text-emerald-600 font-medium block">NPS</a></li>
                      <li><a href="#" onClick={(e) => handleOpenLeadForm(e, 'NFO')} className="hover:text-emerald-600 font-medium block">NFO</a></li>
                      <li><a href="#" onClick={(e) => handleOpenLeadForm(e, 'Bonds')} className="hover:text-emerald-600 font-medium block">Bonds</a></li>
                  </ul>
              </div>
              
              <div className="flex flex-col items-start p-4 bg-white rounded-2xl border border-gray-100 shadow-sm gap-3 hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 text-lg"><i className="fa-solid fa-shield-halved"></i></div>
                      <span className="text-sm font-bold text-gray-800">Insurance</span>
                  </div>
                  <ul className="text-xs text-gray-500 space-y-1.5 w-full pl-2 border-l-2 border-purple-100">
                      <li><a href="#" onClick={(e) => handleOpenLeadForm(e, 'Health Insurance')} className="hover:text-purple-600 font-medium block">Health Insurance</a></li>
                      <li><a href="#" onClick={(e) => handleOpenLeadForm(e, 'Life Insurance')} className="hover:text-purple-600 font-medium block">Life Insurance</a></li>
                      <li><a href="#" onClick={(e) => handleOpenLeadForm(e, 'Motor Insurance')} className="hover:text-purple-600 font-medium block">Motor Insurance</a></li>
                      <li><a href="#" onClick={(e) => handleOpenLeadForm(e, 'Travel Insurance')} className="hover:text-purple-600 font-medium block">Travel Insurance</a></li>
                  </ul>
              </div>
              
              <div className="flex flex-col items-start p-4 bg-white rounded-2xl border border-gray-100 shadow-sm gap-3 hover:border-blue-200 transition-all justify-start">
                  <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-lg"><i className="fa-solid fa-credit-card"></i></div>
                      <span className="text-sm font-bold text-gray-800">Credit Cards</span>
                  </div>
                  <ul className="text-xs text-gray-500 space-y-1.5 w-full pl-2 border-l-2 border-blue-100">
                      <li><a href="#" onClick={(e) => handleOpenLeadForm(e, 'Credit Card')} className="hover:text-blue-600 font-medium block">Apply New</a></li>
                  </ul>
              </div>
          </div>
      </div>

      {/* Lead Form Modal */}
      {isLeadFormOpen && (
          <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-hidden">
              <div className="bg-white border border-gray-100 rounded-2xl w-full max-w-sm p-5 shadow-2xl relative animate-in fade-in zoom-in duration-200">
                  <button 
                      onClick={() => setIsLeadFormOpen(false)}
                      className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                  >
                      <i className="fa-solid fa-xmark"></i>
                  </button>
                  
                  <div className="text-center mb-6">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                          <i className="fa-solid fa-headset text-xl"></i>
                      </div>
                      <h3 className="text-gray-900 font-black text-xl mb-1">
                          {leadServiceType === 'Apply PAN' ? 'Apply for PAN Card' : 
                           leadServiceType === 'PAN Correction' ? 'PAN Card Correction' : 
                           `Apply for ${leadServiceType}`}
                      </h3>
                      <p className="text-gray-500 text-xs">Fill in your details and we will connect you to our expert on WhatsApp.</p>
                  </div>
                  
                  <form onSubmit={handleLeadSubmit} className="space-y-4">
                      <div>
                          <label className="block text-gray-700 text-xs font-bold mb-1.5 ml-1">Full Name</label>
                          <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <i className="fa-regular fa-user text-gray-400"></i>
                              </div>
                              <input 
                                  type="text" 
                                  value={leadName}
                                  onChange={(e) => setLeadName(e.target.value)}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                                  placeholder="Enter your name"
                                  required
                              />
                          </div>
                      </div>
                      
                      <div>
                          <label className="block text-gray-700 text-xs font-bold mb-1.5 ml-1">Mobile Number</label>
                          <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <i className="fa-solid fa-mobile-screen text-gray-400"></i>
                              </div>
                              <input 
                                  type="tel" 
                                  value={leadMobile}
                                  onChange={(e) => setLeadMobile(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                                  placeholder="Enter 10-digit number"
                                  pattern="[0-9]{10}"
                                  required
                              />
                          </div>
                      </div>
                      
                      <button 
                          type="submit"
                          className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 mt-2"
                      >
                          <i className="fa-brands fa-whatsapp text-lg"></i> Continue on WhatsApp
                      </button>
                  </form>
              </div>
          </div>
      )}
    </>
  );
}
