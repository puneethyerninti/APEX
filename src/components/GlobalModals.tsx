"use client";

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { db } from '@/firebase.config';
// doc, setDoc removed as they are no longer used for profile

export default function GlobalModals() {
    const [modal, setModal] = useState<string | null>(null);
    const [modalData, setModalData] = useState<any>(null);
    const [checkoutStep, setCheckoutStep] = useState<'methods' | 'qr' | 'processing'>('methods');
    
    // Profile Edit State
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editProfilePicture, setEditProfilePicture] = useState('');
    
    // Global state
    const walletBalance = useAppStore((state) => state.walletBalance);
    const deductMoney = useAppStore((state) => state.deductMoney);
    const addMoney = useAppStore((state) => state.addMoney);
    const user = useAppStore((state) => state.user);
    const updateUserProfile = useAppStore((state) => state.updateUserProfile);
    const { logout } = useAuth();

    useEffect(() => {
        const handleOpenModal = (e: any) => {
            if (typeof e.detail === 'string') {
                setModal(e.detail);
                setModalData(null);
                setCheckoutStep('methods');
            } else if (e.detail && typeof e.detail === 'object') {
                setModal(e.detail.type);
                setModalData(e.detail.data);
                setCheckoutStep('methods');
            }
        };
        window.addEventListener('openModal', handleOpenModal);
        return () => window.removeEventListener('openModal', handleOpenModal);
    }, []);

    if (!modal) return null;

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.phone) return;
        
        // Optimistic UI Update: Instantly update local store and close modal
        updateUserProfile({ name: editName, email: editEmail, profilePicture: editProfilePicture });
        setModal('account'); 
        
        // Background sync to Node.js Backend API
        try {
            await api.post('/user/profile', {
                phone: user.phone,
                name: editName,
                email: editEmail,
                profilePicture: editProfilePicture,
            });
        } catch (error) {
            console.error("Failed to update profile", error);
            // Optionally could revert the store update here if it failed
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditProfilePicture(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCheckout = async () => {
        setCheckoutStep('processing');
        try {
            if (user?.uid) {
                const amtStr = modalData?.amount || '0';
                const numericAmt = parseInt(amtStr.toString().replace(/[^0-9]/g, ''), 10) || 0;
                
                const isWalletTopup = modalData?.plan === 'Wallet Top-up';
                let category = 'subscription';
                if (modalData?.plan?.includes('Matrimony')) category = 'matrimony';
                else if (isWalletTopup) category = 'add_money';
                else if (modalData?.metadata?.type) category = 'travel_booking'; // We'll assume if there is a type it's travel, we will fix travel page to pass correct category or we just rely on page doing it. Wait, `category` is passed directly in some cases, let's just use `modalData?.category` if it exists.
                
                const actualCategory = modalData?.category || category;
                
                // For metadata, we merge plan and other things
                const metadata = {
                    plan: modalData?.plan,
                    ...(modalData?.metadata || {})
                };
                
                const orderRes = await api.post('/finance/razorpay/order', {
                    amount: numericAmt,
                    userId: user.uid,
                    category: actualCategory,
                    serviceName: modalData?.plan || 'Service Payment',
                    metadata
                });
                
                const { order, keyId } = orderRes.data;
                
                const options = {
                    key: keyId,
                    amount: order.amount,
                    currency: order.currency,
                    name: "APEX App",
                    description: modalData?.plan || 'Service Payment',
                    order_id: order.id,
                    handler: async function (response: any) {
                        try {
                            setCheckoutStep('processing');
                            const verifyRes = await api.post('/finance/razorpay/verify', {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                amount: numericAmt,
                                userId: user.uid
                            });
                            
                            if (verifyRes.data.success) {
                                // The backend completely handled the fulfillment and updated DB. 
                                // We just need to trigger the UI updates!
                                const returnedCategory = verifyRes.data.category || actualCategory;
                                
                                if (returnedCategory === 'matrimony') {
                                    const planName = modalData.plan?.replace('Matrimony ', '')?.replace(' Plan', '');
                                    window.dispatchEvent(new CustomEvent('paymentSuccess', { detail: { type: 'matrimony', plan: planName } }));
                                } else if (returnedCategory === 'subscription') {
                                    window.dispatchEvent(new CustomEvent('paymentSuccess', { detail: { type: 'apex_plan', plan: modalData.plan } }));
                                } else if (returnedCategory === 'travel_booking') {
                                    window.dispatchEvent(new CustomEvent('paymentSuccess', { detail: { type: 'travel_booking', data: verifyRes.data.fulfillmentData } }));
                                } else if (returnedCategory === 'mobile_recharge') {
                                    window.dispatchEvent(new CustomEvent('paymentSuccess', { detail: { type: 'mobile_recharge', data: verifyRes.data.fulfillmentData } }));
                                } else if (returnedCategory === 'academy_enrollment') {
                                    window.dispatchEvent(new CustomEvent('paymentSuccess', { detail: { type: 'academy_enrollment' } }));
                                } else {
                                    window.dispatchEvent(new CustomEvent('paymentSuccess'));
                                }
                                setModal(null);
                            }
                        } catch (e) {
                            console.error("Verification failed", e);
                            setCheckoutStep('methods');
                        }
                    },
                    prefill: {
                        name: user.name || "APEX User",
                        contact: user.phone || ""
                    },
                    theme: {
                        color: "#2D1B69"
                    },
                    modal: {
                        ondismiss: function() {
                            setCheckoutStep('methods');
                        }
                    }
                };
                
                const rzp = new (window as any).Razorpay(options);
                rzp.open();
            }
        } catch (e) {
            console.error("Failed to initialize payment", e);
            setCheckoutStep('methods');
        }
    };

    const handleAddMoney = async () => {
        const amount = window.prompt("Enter amount to add to wallet (₹):", "500");
        if (!amount || isNaN(parseInt(amount)) || parseInt(amount) <= 0) return;
        
        setModal('checkout');
        setModalData({
            amount: amount,
            plan: 'Wallet Top-up',
            category: 'add_money'
        });
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center">
            <div className="bg-white w-full max-w-md max-h-[80vh] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col animate-[slideUp_0.3s_ease-out]">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 sm:rounded-t-3xl rounded-t-3xl">
                    <h2 className="text-lg font-black text-gray-900">
                        {modal === 'checkout' ? 'Secure Checkout' : 'My Account'}
                    </h2>
                    <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                    {/* CHECKOUT MODAL */}
                    {modal === 'checkout' && (
                        <div className="flex flex-col gap-4">
                            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Amount to Pay</p>
                                <h3 className="text-3xl font-black text-gray-900">{modalData?.amount || '₹ 0.00'}</h3>
                                <p className="text-xs text-gray-600 mt-1">{modalData?.plan || 'Service Payment'}</p>
                            </div>

                            {checkoutStep === 'methods' && (
                                <div className="mt-4 animate-[fadeIn_0.3s_ease-out]">
                                    <button onClick={handleCheckout} className="w-full py-4 bg-violet-600 text-white font-bold rounded-xl shadow-lg shadow-violet-600/30 hover:bg-violet-700 transition-all flex items-center justify-center gap-2">
                                        <i className="fa-solid fa-lock text-sm"></i>
                                        Proceed to Pay Securely
                                    </button>
                                    <p className="text-[10px] text-gray-400 text-center mt-3 flex items-center justify-center gap-1">
                                        <i className="fa-solid fa-shield-halved"></i> Payments are processed securely via Razorpay
                                    </p>
                                </div>
                            )}

                            {checkoutStep === 'processing' && (
                                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-b-3xl">
                                    <div className="w-12 h-12 border-4 border-gray-200 border-t-violet-600 rounded-full animate-spin mb-4"></div>
                                    <h3 className="text-lg font-black text-gray-900">Verifying Payment...</h3>
                                    <p className="text-xs text-gray-500 mt-1">Please do not close this window</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* WALLET REMOVED FOR COMPLIANCE */}
                    
                    {/* ACCOUNT MODAL */}
                    {modal === 'account' && (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                {user?.profilePicture ? (
                                    <img src={user.profilePicture} alt={user?.name || (user?.phone || 'Guest')} className="w-16 h-16 rounded-full object-cover shadow-sm border-2 border-white" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xl font-black">
                                        {user?.name ? user.name.substring(0, 2).toUpperCase() : <i className="fa-solid fa-user"></i>}
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-black text-lg text-gray-900">{user?.name || (user?.phone || 'Guest')}</h3>
                                    <p className="text-[10px] text-gray-500">{user?.phone || 'No phone number'}</p>
                                    {user?.isPremium && <span className="mt-1 inline-block bg-green-100 text-green-700 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Premium Member</span>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <button className="flex flex-col items-center justify-center gap-2 bg-white border border-gray-100 shadow-sm p-4 rounded-xl hover:shadow-md transition-all">
                                    <i className="fa-solid fa-box text-violet-500 text-xl"></i>
                                    <span className="text-[10px] font-bold text-gray-700">My Orders</span>
                                </button>
                                <button onClick={() => {
                                    setEditName(user?.name || '');
                                    setEditEmail(user?.email || '');
                                    setEditProfilePicture(user?.profilePicture || '');
                                    setModal('edit_profile');
                                }} className="flex flex-col items-center justify-center gap-2 bg-white border border-gray-100 shadow-sm p-4 rounded-xl hover:shadow-md transition-all">
                                    <i className="fa-solid fa-user-pen text-blue-500 text-xl"></i>
                                    <span className="text-[10px] font-bold text-gray-700">Edit Profile</span>
                                </button>
                                <button className="flex flex-col items-center justify-center gap-2 bg-white border border-gray-100 shadow-sm p-4 rounded-xl hover:shadow-md transition-all">
                                    <i className="fa-solid fa-heart text-rose-500 text-xl"></i>
                                    <span className="text-[10px] font-bold text-gray-700">Saved Matches</span>
                                </button>

                                <button className="flex flex-col items-center justify-center gap-2 bg-white border border-gray-100 shadow-sm p-4 rounded-xl hover:shadow-md transition-all">
                                    <i className="fa-solid fa-graduation-cap text-blue-500 text-xl"></i>
                                    <span className="text-[10px] font-bold text-gray-700">My Courses</span>
                                </button>
                                {user?.role === 'admin' && (
                                    <button onClick={() => { setModal(null); window.location.href = '/admin-dashboard'; }} className="flex flex-col items-center justify-center gap-2 bg-violet-50 border border-violet-100 shadow-sm p-4 rounded-xl hover:shadow-md transition-all">
                                        <i className="fa-solid fa-shield-halved text-violet-600 text-xl"></i>
                                        <span className="text-[10px] font-bold text-violet-700">Admin Portal</span>
                                    </button>
                                )}
                                {(user?.role === 'driver' || user?.role === 'admin') && (
                                    <button onClick={() => { setModal(null); window.location.href = '/driver-dashboard'; }} className="flex flex-col items-center justify-center gap-2 bg-green-50 border border-green-100 shadow-sm p-4 rounded-xl hover:shadow-md transition-all">
                                        <i className="fa-solid fa-car text-green-600 text-xl"></i>
                                        <span className="text-[10px] font-bold text-green-700">Driver Mode</span>
                                    </button>
                                )}
                            </div>
                            
                            <button onClick={() => { logout(); setModal(null); }} className="w-full mt-2 py-3 bg-red-50 text-red-600 font-bold text-sm rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                                <i className="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
                            </button>
                        </div>
                    )}

                    {/* EDIT PROFILE MODAL */}
                    {modal === 'edit_profile' && (
                        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                            <div className="flex flex-col items-center gap-2 mb-2">
                                <div className="relative group cursor-pointer">
                                    {editProfilePicture ? (
                                        <img src={editProfilePicture} alt="Profile" className="w-24 h-24 rounded-full object-cover shadow-md border-4 border-white" />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-3xl shadow-inner border-4 border-white">
                                            <i className="fa-solid fa-user"></i>
                                        </div>
                                    )}
                                    <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <i className="fa-solid fa-camera text-white text-xl"></i>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    </label>
                                </div>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Tap to change photo</p>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-700">Full Name</label>
                                <input 
                                    type="text" 
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                                    required
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-700">Email Address</label>
                                <input 
                                    type="email" 
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                                />
                            </div>
                            
                            <div className="flex gap-3 mt-4">
                                <button type="button" onClick={() => setModal('account')} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-200 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 py-3 bg-[#6C3FC5] text-white font-bold text-sm rounded-xl hover:bg-[#5a34a8] transition-colors flex justify-center items-center gap-2">
                                    Save Profile
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
