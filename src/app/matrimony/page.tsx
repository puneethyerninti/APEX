"use client";
import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { SocketContext } from '@/context/SocketContext';
import { api } from '@/services/api';

const formatSmartTimestamp = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isYesterday = new Date(new Date().setDate(now.getDate() - 1)).getDate() === date.getDate();
    if (isYesterday) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export default function Page() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPaymentStep, setIsPaymentStep] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeChatProfile, setActiveChatProfile] = useState<any>(null);
  const [messages, setMessages] = useState<{senderId: string, text: string, timestamp: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxChats, setInboxChats] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAppStore();
  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    contactNumber: '',
    profession: '',
    photo: null as File | null,
    idDocument: null as File | null,
  });

  const handlePlanClick = (plan: string) => {
    setSelectedPlan(plan);
    setIsSuccess(false);
  };

  const closeForm = () => {
    setSelectedPlan(null);
    setIsSuccess(false);
    setIsPaymentStep(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo' | 'idDocument') => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, [field]: e.target.files[0] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPaymentStep(true);
  };

  useEffect(() => {
    const handleSuccess = () => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setIsPaymentStep(false);
    };
    window.addEventListener('paymentSuccess', handleSuccess);
    return () => window.removeEventListener('paymentSuccess', handleSuccess);
  }, []);

  useEffect(() => {
    // Fetch live matches, excluding the current user
    if (user?.uid) {
      api.get(`/matrimony/profiles?userId=${user.uid}`)
        .then(res => setMatches(res.data))
        .catch(err => console.error("Failed to fetch matches:", err));
    } else {
      api.get('/matrimony/profiles')
        .then(res => setMatches(res.data))
        .catch(err => console.error("Failed to fetch matches:", err));
    }
  }, [user]);

  const fetchInbox = useCallback(() => {
    if (user?.uid) {
      api.get(`/matrimony/inbox/${user.uid}`)
        .then(res => {
            setInboxChats(res.data);
            const unread = res.data.filter((chat: any) => !chat.latestMessage.isRead && chat.latestMessage.receiverId === user.uid).length;
            setUnreadCount(unread);
        })
        .catch(err => console.error("Failed to fetch inbox:", err));
    }
  }, [user]);

  useEffect(() => {
    if (inboxOpen || chatOpen) {
      fetchInbox();
    }
  }, [inboxOpen, chatOpen, messages, fetchInbox]);

  useEffect(() => {
    if (chatOpen && socket && activeChatProfile) {
      const participants = [user?.uid || 'guest', activeChatProfile.user?._id || activeChatProfile._id].sort();
      const roomId = `match_${participants[0]}_${participants[1]}`;
      // Fetch existing messages
      api.get(`/matrimony/messages/${roomId}`).then(res => {
        setMessages(res.data);
      }).catch(err => console.error(err));

      socket.emit('join_room', roomId);
      
      const handleNewMessage = (data: any) => {
        setMessages((prev) => [...prev, data]);
        // Also ping backend to mark it as read since we are actively in chat
        if (data.senderId !== user?.uid) {
            api.put(`/matrimony/messages/${roomId}/read`, { userId: user?.uid }).catch(()=>{});
        }
      };
      
      const handleTyping = (data: any) => {
          if (data.roomId === roomId && data.isTyping !== undefined) {
              setIsTyping(data.isTyping);
          }
      };
      
      socket.on('receive_message', handleNewMessage);
      socket.on('typing', handleTyping);
      
      return () => {
        socket.off('receive_message', handleNewMessage);
        socket.off('typing', handleTyping);
      };
    }
  }, [chatOpen, socket, activeChatProfile, user]);

  useEffect(() => {
    if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setChatInput(e.target.value);
      if (!socket || !activeChatProfile) return;
      
      const participants = [user?.uid || 'guest', activeChatProfile.user?._id || activeChatProfile._id].sort();
      const roomId = `match_${participants[0]}_${participants[1]}`;
      
      socket.emit('typing', { roomId, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
          socket.emit('typing', { roomId, isTyping: false });
      }, 1500);
  };

  const handleSendMessage = () => {
      if (!chatInput.trim() || !socket || !activeChatProfile) return;
      
      const participants = [user?.uid || 'guest', activeChatProfile.user?._id || activeChatProfile._id].sort();
      const roomId = `match_${participants[0]}_${participants[1]}`;
      const msgData = {
          roomId,
          senderId: user?.uid || 'guest',
          receiverId: activeChatProfile.user?._id || activeChatProfile._id,
          text: chatInput,
          timestamp: new Date().toISOString()
      };
      
      socket.emit('send_message', msgData);
      setChatInput('');
      socket.emit('typing', { roomId, isTyping: false });
  };

  const openChat = async (chat: any) => {
      setActiveChatProfile(chat.profile);
      setChatOpen(true);
      setInboxOpen(false);
      
      if (!user?.uid) return;
      const participants = [user.uid, chat.profile.user?._id || chat.profile._id].sort();
      const roomId = `match_${participants[0]}_${participants[1]}`;
      
      try {
          await api.put(`/matrimony/messages/${roomId}/read`, { userId: user.uid });
          fetchInbox();
      } catch(err) {}
  };

  const triggerCheckout = () => {
    let amount = selectedPlan === 'Premium' ? '₹20,000' : selectedPlan === 'Gold' ? '₹10,000' : '₹5,000';
    window.dispatchEvent(new CustomEvent('openModal', { 
        detail: { type: 'checkout', data: { amount, plan: `Matrimony ${selectedPlan} Plan` } }
    }));
  };

  return (
    <>
        {/* HEADER */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Link href="/" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                    <i className="fa-solid fa-arrow-left"></i>
                </Link>
                <h1 className="font-black text-lg text-gray-900">Anand Matrimony</h1>
            </div>
            <button onClick={() => setInboxOpen(true)} className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center relative">
                <i className="fa-solid fa-message"></i>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border border-white text-[9px] font-black text-white flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>
        </div>

        {/* HERO DASHBOARD */}
        <div className="p-4 max-w-7xl mx-auto">
            <div className="bg-gradient-to-br from-rose-600 to-pink-700 rounded-2xl p-5 md:p-8 text-white shadow-lg relative overflow-hidden flex flex-col items-center text-center">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10">
                </div>
                <div className="relative z-10">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-md text-rose-600 text-xl">
                        <i className="fa-solid fa-shield-heart"></i>
                    </div>
                    <h2 className="text-xl font-black mb-1">100% Verified Profiles</h2>
                    <p className="text-rose-100 text-[10px] mb-4">India&apos;s most trusted premium matchmaking service. Find
                        your perfect partner today.</p>
                    <div className="flex gap-2 justify-center">
                        <button className="bg-white text-rose-600 text-[10px] font-black px-4 py-1.5 rounded-full shadow-sm">Complete
                            Profile</button>
                        <button className="bg-rose-800/50 backdrop-blur text-white border border-rose-400/50 text-[10px] font-bold px-4 py-1.5 rounded-full">Upgrade</button>
                    </div>
                </div>
            </div>
        </div>



        
        {/* CATEGORY GRID */}
        <div className="px-4 mb-5 max-w-7xl mx-auto">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Browse Profiles</h3>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-6">
                <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-rose-600 text-lg">
                        <i className="fa-solid fa-users"></i></div>
                    <span className="text-[9px] font-bold text-gray-600">Community</span>
                </button>
                <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-pink-600 text-lg">
                        <i className="fa-solid fa-hands-praying"></i></div>
                    <span className="text-[9px] font-bold text-gray-600">Religion</span>
                </button>
                <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-purple-600 text-lg">
                        <i className="fa-solid fa-location-dot"></i></div>
                    <span className="text-[9px] font-bold text-gray-600">City</span>
                </button>
                <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-orange-600 text-lg">
                        <i className="fa-solid fa-crown"></i></div>
                    <span className="text-[9px] font-bold text-gray-600">Premium</span>
                </button>
            </div>
        </div>

        {/* PRIME PLANS SCROLLABLE */}
        <div className="mb-5 max-w-7xl mx-auto w-full">
            <div className="px-4 flex justify-between items-end mb-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Prime Plans</h3>
            </div>
            <div className="flex gap-3 md:gap-6 overflow-x-auto px-4 scrollbar-none flex-nowrap md:flex-wrap pb-2">
                
                {/* Silver */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-w-[160px] flex-shrink-0 p-4 text-center cursor-pointer hover:shadow-md transition-all" onClick={() => handlePlanClick('Silver')}>
                    <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-2xl mb-2">
                        <i className="fa-solid fa-medal"></i>
                    </div>
                    <h4 className="font-black text-gray-900">Silver</h4>
                    <p className="text-[10px] text-gray-500 mb-2">3 Months Access</p>
                    <div className="text-rose-600 font-black text-sm">₹5,000</div>
                </div>

                {/* Gold */}
                <div className="bg-gradient-to-b from-yellow-50 to-yellow-100 rounded-2xl shadow-md border border-yellow-200 min-w-[160px] flex-shrink-0 p-4 text-center cursor-pointer hover:shadow-lg transition-all relative transform scale-105" onClick={() => handlePlanClick('Gold')}>
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">Popular</div>
                    <div className="w-12 h-12 mx-auto bg-yellow-200 rounded-full flex items-center justify-center text-yellow-600 text-2xl mb-2">
                        <i className="fa-solid fa-crown"></i>
                    </div>
                    <h4 className="font-black text-gray-900">Gold</h4>
                    <p className="text-[10px] text-gray-600 mb-2">6 Months Access</p>
                    <div className="text-rose-600 font-black text-sm">₹10,000</div>
                </div>

                {/* Diamond */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-200 min-w-[160px] flex-shrink-0 p-4 text-center cursor-pointer hover:shadow-md transition-all" onClick={() => handlePlanClick('Diamond')}>
                    <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center text-blue-500 text-2xl mb-2">
                        <i className="fa-regular fa-gem"></i>
                    </div>
                    <h4 className="font-black text-gray-900">Diamond</h4>
                    <p className="text-[10px] text-gray-500 mb-2">12 Months Access</p>
                    <div className="text-rose-600 font-black text-sm">₹25,000</div>
                </div>

            </div>
        </div>

{/* HORIZONTAL TRACK */}
        <div className="mb-5 max-w-7xl mx-auto w-full">
            <div className="px-4 flex justify-between items-end mb-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">New Matches</h3>
                <button onClick={() => {}} className="text-[9px] font-bold text-rose-600 md:text-sm">View All</button>
            </div>
            <div className="flex md:grid md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 overflow-x-auto md:overflow-visible px-4 scrollbar-none flex-nowrap pb-2">
                {matches.length === 0 ? (
                    <div className="text-xs text-gray-500 w-full text-center py-4 bg-white rounded-xl border border-gray-100">
                        No matches available right now.
                    </div>
                ) : (
                    matches.map((match) => (
                        <div key={match._id} className="bg-white rounded-xl shadow-sm border border-gray-100 min-w-[140px] flex-shrink-0 overflow-hidden cursor-pointer relative">
                            <div className="h-32 bg-gray-200 relative">
                                {/* Use uploaded images or fallback */}
                                <img src={match.images?.[0] || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80"} alt={match.user?.name} className="w-full h-full object-cover" />
                                <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-black/80 to-transparent"></div>
                                <span className="absolute bottom-2 left-2 text-white font-black text-[10px] truncate max-w-[120px]">{match.user?.name} <i className="fa-solid fa-circle-check text-blue-400 ml-0.5"></i></span>
                            </div>
                            <div className="p-3">
                                <p className="text-[9px] text-gray-500 mb-1">{match.age} Yrs, {match.height || 'N/A'}</p>
                                <p className="text-[9px] font-bold text-gray-700 truncate">{match.profession}</p>
                                <p className="text-[9px] text-gray-500 mb-2 truncate">{match.location}</p>
                                <button onClick={() => {
                                    setActiveChatProfile(match);
                                    setChatOpen(true);
                                }} className="w-full bg-rose-50 text-rose-600 font-bold text-[9px] py-1.5 rounded border border-rose-100 hover:bg-rose-100"><i className="fa-solid fa-comment-dots mr-1"></i> Chat Now</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* MODAL / FORM UI OVERLAY */}
        {selectedPlan && (
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-0 sm:pb-4 transition-all">
                <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-[slideUp_0.3s_ease-out]">
                    {/* Modal Header */}
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                        <div>
                            <h2 className="text-lg font-black text-gray-900">Upgrade to {selectedPlan}</h2>
                            <p className="text-[10px] text-gray-500">Complete your profile to proceed</p>
                        </div>
                        <button onClick={closeForm} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-5 overflow-y-auto custom-scrollbar">
                        {isSuccess ? (
                            <div className="py-10 flex flex-col items-center text-center animate-[fadeIn_0.5s_ease-out]">
                                <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-4xl mb-4 shadow-sm">
                                    <i className="fa-solid fa-check"></i>
                                </div>
                                <h3 className="text-xl font-black text-gray-900 mb-2">Application Submitted!</h3>
                                <p className="text-sm text-gray-500 max-w-[250px] mx-auto mb-6">
                                    Your profile is under review. Our matchmaking experts will contact you shortly regarding your {selectedPlan} plan.
                                </p>
                                <button onClick={closeForm} className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl shadow-md">
                                    Done
                                </button>
                            </div>
                        ) : !isPaymentStep ? (
                            <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-6">
                                {/* Inputs */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Full Name</label>
                                    <input required type="text" placeholder="Enter your name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Age</label>
                                        <input required type="number" placeholder="e.g. 26" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Contact No.</label>
                                        <input required type="tel" placeholder="e.g. 9876543210" value={formData.contactNumber} onChange={(e) => setFormData({...formData, contactNumber: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
                                    </div>
                                </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Profession</label>
                                        <input required type="text" placeholder="e.g. Engineer" value={formData.profession} onChange={(e) => setFormData({...formData, profession: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
                                    </div>
                                
                                {/* File Uploads */}
                                <div className="mt-2">
                                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Profile Photo</label>
                                    <div className="relative w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 hover:border-rose-400 transition-all cursor-pointer">
                                        <input required type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'photo')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        <div className="flex flex-col items-center pointer-events-none">
                                            <i className="fa-solid fa-cloud-arrow-up text-2xl text-gray-400 mb-2"></i>
                                            <span className="text-xs font-bold text-gray-600">{formData.photo ? formData.photo.name : 'Upload Photo (JPG, PNG)'}</span>
                                            {!formData.photo && <span className="text-[9px] text-gray-400 mt-0.5">Max size: 5MB</span>}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Govt ID Proof (Aadhaar / Passport)</label>
                                    <div className="relative w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 hover:border-rose-400 transition-all cursor-pointer">
                                        <input required type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'idDocument')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        <div className="flex flex-col items-center pointer-events-none">
                                            <i className="fa-regular fa-id-card text-2xl text-gray-400 mb-2"></i>
                                            <span className="text-xs font-bold text-gray-600">{formData.idDocument ? formData.idDocument.name : 'Upload Document'}</span>
                                            {!formData.idDocument && <span className="text-[9px] text-gray-400 mt-0.5">PDF, JPG, PNG allowed</span>}
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" className="mt-4 w-full py-3.5 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 hover:bg-rose-700 active:scale-[0.98] transition-all flex justify-center items-center gap-2">
                                    Proceed to Payment <i className="fa-solid fa-arrow-right"></i>
                                </button>
                            </form>
                        ) : (
                            <div className="py-6 flex flex-col items-center animate-[fadeIn_0.5s_ease-out]">
                                <div className="w-16 h-16 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-3xl mb-4 shadow-sm">
                                    <i className="fa-solid fa-file-invoice"></i>
                                </div>
                                <h3 className="text-xl font-black text-gray-900 mb-1">Order Summary</h3>
                                <p className="text-sm text-gray-500 mb-6 text-center">Complete payment to activate your profile.</p>
                                
                                <div className="w-full bg-gray-50 p-5 rounded-2xl border border-gray-200 mb-6 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-gray-900">{selectedPlan} Plan</p>
                                        <p className="text-[10px] text-gray-500">APEX Matrimony</p>
                                    </div>
                                    <span className="font-black text-lg text-gray-900">
                                        {selectedPlan === 'Premium' ? '₹20,000' : selectedPlan === 'Gold' ? '₹10,000' : '₹5,000'}
                                    </span>
                                </div>

                                <button onClick={triggerCheckout} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg shadow-gray-900/30 hover:bg-black active:scale-[0.98] transition-all flex justify-center items-center gap-2">
                                    Proceed to Pay <i className="fa-solid fa-lock text-sm"></i>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* CHAT MODAL (Floating) */}
        {chatOpen && (
            <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-[70] w-[95%] max-w-md">
                <div className="bg-white w-full h-[60vh] sm:h-[500px] rounded-3xl shadow-[0_15px_50px_rgba(0,0,0,0.2)] border border-gray-100 flex flex-col animate-[slideUp_0.3s_ease-out] overflow-hidden">
                    {/* Chat Header */}
                    <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-rose-600 text-white rounded-t-3xl sm:rounded-t-3xl">
                        <button onClick={() => setChatOpen(false)} className="w-8 h-8 flex items-center justify-center hover:bg-rose-700 rounded-full transition-colors">
                            <i className="fa-solid fa-arrow-left"></i>
                        </button>
                        <div className="flex-1 flex items-center gap-2">
                            {activeChatProfile?.images?.[0] ? (
                                <img src={activeChatProfile.images[0]} alt="Profile" className="w-8 h-8 rounded-full border border-white object-cover shadow-sm" />
                            ) : (
                                <div className="w-8 h-8 rounded-full border border-white bg-rose-200 text-rose-700 flex items-center justify-center font-black shadow-sm text-xs">
                                    {activeChatProfile?.user?.name ? activeChatProfile.user.name.substring(0, 2).toUpperCase() : 'U'}
                                </div>
                            )}
                            <div>
                                <h3 className="font-bold text-sm leading-tight">{activeChatProfile?.user?.name || 'User'}</h3>
                                <p className="text-[10px] text-rose-200">
                                    {isTyping ? <span className="animate-pulse">typing...</span> : 'Online'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Chat Body */}
                    <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
                        <div className="flex justify-center">
                            <span className="text-[9px] bg-gray-200 text-gray-500 px-2 py-1 rounded-full">Today</span>
                        </div>
                        {messages.map((msg, i) => {
                            const isMe = msg.senderId === (user?.uid || 'guest');
                            return (
                                <div key={i} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''} group`}>
                                    {!isMe && (
                                        activeChatProfile?.images?.[0] ? (
                                            <img src={activeChatProfile.images[0]} alt="Profile" className="w-6 h-6 rounded-full self-end object-cover flex-shrink-0" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center text-[10px] font-black self-end flex-shrink-0">
                                                {activeChatProfile?.user?.name ? activeChatProfile.user.name.substring(0, 2).toUpperCase() : 'U'}
                                            </div>
                                        )
                                    )}
                                    <div className="flex flex-col">
                                        <div className={`p-3 rounded-2xl shadow-sm text-sm max-w-[200px] sm:max-w-[280px] break-words ${isMe ? 'bg-rose-600 text-white rounded-br-none' : 'bg-white text-gray-700 rounded-bl-none border border-gray-100'}`}>
                                            {msg.text}
                                        </div>
                                        <span className={`text-[9px] text-gray-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'text-right' : 'text-left'}`}>
                                            {formatSmartTimestamp(msg.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center">
                        <input 
                            type="text" 
                            placeholder="Type a message..." 
                            value={chatInput}
                            onChange={handleInputChange}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" 
                        />
                        <button onClick={handleSendMessage} className="w-10 h-10 bg-rose-600 text-white rounded-full flex items-center justify-center hover:bg-rose-700 shadow-sm flex-shrink-0">
                            <i className="fa-solid fa-paper-plane text-sm"></i>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* INBOX MODAL (Floating) */}
        {inboxOpen && (
            <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-[70] w-[95%] max-w-md">
                <div className="bg-white w-full h-[60vh] sm:h-[500px] rounded-3xl shadow-[0_15px_50px_rgba(0,0,0,0.2)] border border-gray-100 flex flex-col animate-[slideUp_0.3s_ease-out] overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 sm:rounded-t-3xl rounded-t-3xl">
                        <div>
                            <h2 className="text-lg font-black text-gray-900">Messages</h2>
                            <p className="text-[10px] text-gray-500">Your recent conversations</p>
                        </div>
                        <button onClick={() => setInboxOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    
                    <div className="flex-1 p-2 overflow-y-auto bg-gray-50 custom-scrollbar">
                        {inboxChats.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <i className="fa-regular fa-comments text-4xl mb-3 text-gray-300"></i>
                                <p className="text-xs font-bold">No messages yet</p>
                                <p className="text-[10px]">Start a conversation from new matches</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                {inboxChats.map((chat, idx) => {
                                    const isUnread = !chat.latestMessage.isRead && chat.latestMessage.receiverId === user?.uid;
                                    return (
                                        <div 
                                            key={idx} 
                                            onClick={() => openChat(chat)}
                                            className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm hover:shadow-md cursor-pointer border border-transparent hover:border-rose-100 transition-all relative"
                                        >
                                            {chat.profile.images?.[0] ? (
                                                <img src={chat.profile.images[0]} alt="Profile" className="w-12 h-12 rounded-full object-cover border border-gray-100 flex-shrink-0" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-lg font-black flex-shrink-0 border border-rose-50">
                                                    {chat.profile.user?.name ? chat.profile.user.name.substring(0, 2).toUpperCase() : 'U'}
                                                </div>
                                            )}
                                            <div className="flex-1 overflow-hidden min-w-0">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <h3 className={`font-bold text-sm truncate ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>{chat.profile.user?.name || 'User'}</h3>
                                                    <span className={`text-[9px] whitespace-nowrap ml-2 ${isUnread ? 'text-rose-600 font-black' : 'text-gray-400'}`}>
                                                        {formatSmartTimestamp(chat.latestMessage.timestamp)}
                                                    </span>
                                                </div>
                                                <p className={`text-xs truncate ${isUnread ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                                                    {chat.latestMessage.senderId === user?.uid ? 'You: ' : ''}{chat.latestMessage.text}
                                                </p>
                                            </div>
                                            {isUnread && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-rose-600 rounded-full border border-white shadow-sm"></div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </>
  );
}
