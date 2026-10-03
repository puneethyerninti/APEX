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
  const [isVideoMuted, setIsVideoMuted] = React.useState(true);

  const invested = user?.portfolioInvested || 0;
  const returns = user?.portfolioReturns || 0;
  const total = invested + returns;
  const percent = invested > 0 ? ((returns / invested) * 100).toFixed(1) : 0;
  const isPositive = returns >= 0;

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
                  <h2 className="text-3xl font-black tracking-tight">₹{total.toLocaleString('en-IN')}</h2>
                  {total > 0 && (
                    <span className={`${isPositive ? 'text-green-300' : 'text-red-300'} text-xs font-bold mb-1 flex items-center gap-1`}>
                        <i className={`fa-solid ${isPositive ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`}></i> 
                        {isPositive ? '+' : ''}{percent}%
                    </span>
                  )}
              </div>
              <div className="flex gap-4 border-t border-white/20 pt-3 mt-1">
                  <div>
                      <p className="text-blue-100 text-[9px] uppercase">Invested</p>
                      <p className="font-bold text-sm">₹{invested.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                      <p className="text-blue-100 text-[9px] uppercase">Returns</p>
                      <p className={`font-bold text-sm ${isPositive ? 'text-green-300' : 'text-red-300'}`}>₹{returns.toLocaleString('en-IN')}</p>
                  </div>
              </div>
          </div>
      </div>

      {/* STABLE MONEY PROMO VIDEO */}
      <div className="px-4 mb-5 relative">
          <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100 relative bg-black/5 group">
              <video 
                src="/stable_money.mp4" 
                autoPlay 
                loop 
                muted={isVideoMuted} 
                playsInline 
                className="w-full h-[180px] object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <button 
                  onClick={() => setIsVideoMuted(!isVideoMuted)}
                  className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors z-10"
              >
                  <i className={`fa-solid ${isVideoMuted ? 'fa-volume-xmark' : 'fa-volume-high'} text-[10px]`}></i>
              </button>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between pointer-events-none">
                  <div>
                      <h3 className="text-white font-black text-lg leading-tight mb-1">Grow your Wealth<br/>with Fixed Deposits</h3>
                      <div className="flex items-center gap-1.5 opacity-90">
                          <span className="text-[8px] text-gray-300 font-medium">Powered By</span>
                          <span className="text-[10px] font-black text-white lowercase tracking-widest leading-none">stable money</span>
                          <span className="text-[9px] text-gray-300 font-black">+</span>
                          <img src="/APEX%20logo.jpeg" alt="APEX" className="h-4 rounded-sm object-contain" />
                      </div>
                  </div>
                  <a href="https://stablemoney.onelink.me/rkWL/reg7ibv8" target="_blank" rel="noopener noreferrer" className="pointer-events-auto bg-white text-gray-900 text-[10px] font-black px-4 py-2 rounded-full shadow-sm hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5">
                      Invest Now <i className="fa-solid fa-arrow-right"></i>
                  </a>
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
                      <div className="flex flex-col gap-0">
                          <span className="text-sm font-bold text-gray-800">Loans</span>
                          <div className="flex flex-col items-start gap-1 opacity-80 mt-1">
                              <span className="text-[7px] text-gray-400 font-medium uppercase tracking-wider leading-none">Powered By</span>
                              <div className="flex items-center gap-0.5">
                                  <div className="w-3.5 h-3.5 bg-emerald-600 rounded-full flex items-center justify-center text-white text-[7px] font-black leading-none">₹</div>
                                  <span className="text-[10px] font-black text-gray-800 tracking-widest leading-none">digi<span className="text-gray-400">पे</span></span>
                              </div>
                          </div>
                      </div>
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
                      <div className="flex flex-col gap-0">
                          <span className="text-sm font-bold text-gray-800">Investment</span>
                          <div className="flex flex-col items-start gap-1 opacity-80 mt-1">
                              <span className="text-[7px] text-gray-400 font-medium uppercase tracking-wider leading-none">Powered By</span>
                              <div className="flex items-center gap-0.5">
                                  <span className="text-[10px] font-black text-gray-800 lowercase tracking-widest leading-none">stable money</span>
                                  <span className="text-[8px] text-gray-400 font-black">+</span>
                                  <img src="/APEX%20logo.jpeg" alt="APEX" className="h-4 rounded-sm object-contain" />
                              </div>
                          </div>
                      </div>
                  </div>
                  <ul className="text-xs text-gray-500 space-y-1.5 w-full pl-2 border-l-2 border-emerald-100">
                      <li><Link href="/finance/mutual-funds" className="hover:text-emerald-600 font-medium block">Mutual Funds</Link></li>
                      <li><a href="https://stablemoney.onelink.me/rkWL/reg7ibv8" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 font-medium block">Fixed Deposit</a></li>
                      <li><a href="#" onClick={(e) => handleOpenLeadForm(e, 'NPS')} className="hover:text-emerald-600 font-medium block">NPS</a></li>
                      <li><Link href="/finance/mutual-funds" className="hover:text-emerald-600 font-medium block">NFO</Link></li>
                      <li><a href="https://stablemoney.onelink.me/rkWL/reg7ibv8" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 font-medium block">Bonds</a></li>
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
                      <div className="flex flex-col gap-0">
                          <span className="text-sm font-bold text-gray-800">Credit Cards</span>
                          <div className="flex flex-col items-start gap-1 opacity-80 mt-1">
                              <span className="text-[7px] text-gray-400 font-medium uppercase tracking-wider leading-none">Powered By</span>
                              <div className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-sm flex items-center justify-center tracking-widest leading-none">
                                  ZET
                              </div>
                          </div>
                      </div>
                  </div>
                  <ul className="text-xs text-gray-500 space-y-1.5 w-full pl-2 border-l-2 border-blue-100">
                      <li><Link href="/finance/credit-cards" className="hover:text-blue-600 font-medium block">Apply New</Link></li>
                  </ul>
              </div>
          </div>
      </div>

      {/* Lead Form Modal */}
      {isLeadFormOpen && (
          <div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center p-4 pb-0 sm:pb-4 backdrop-blur-sm overflow-hidden">
              <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-[slideUp_0.3s_ease-out]">
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
