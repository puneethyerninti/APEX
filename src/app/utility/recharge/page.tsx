"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

interface Plan {
    id: string;
    category: string;
    price: number;
    data: string;
    validity: string;
    description: string;
}

export default function MobileRechargePage() {
  const router = useRouter();
  const user = useAppStore(state => state.user);
  
  const [mobileNumber, setMobileNumber] = useState('');
  const [operator, setOperator] = useState('Airtel'); // Defaulting for demo
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Popular');
  
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
      // Auto-fetch plans when operator is set
      const fetchPlans = async () => {
          if (mobileNumber.length !== 10) return;
          setLoadingPlans(true);
          try {
              const res = await api.get(`/utility/plans?operator=${operator}`);
              if (res.data.success) {
                  setPlans(res.data.data);
              }
          } catch (e) {
              console.error(e);
          }
          setLoadingPlans(false);
      };
      fetchPlans();
  }, [operator, mobileNumber]);

  useEffect(() => {
      // Dynamic Operator Detection based on prefixes (Fallback for MNP API)
      if (mobileNumber.length === 10) {
          const prefix = mobileNumber.substring(0, 4);
          const firstDigit = mobileNumber[0];
          
          // Basic heuristic for Indian Telecom Providers
          if (['6', '70', '79'].includes(prefix.substring(0, 2)) || firstDigit === '6') {
              setOperator('Jio');
          } else if (['99', '98', '94', '95'].includes(prefix.substring(0, 2)) || firstDigit === '9') {
              setOperator('Airtel');
          } else if (['89', '88', '84', '85'].includes(prefix.substring(0, 2)) || firstDigit === '8') {
              setOperator('VI');
          } else if (['94', '95'].includes(prefix.substring(0, 2))) {
               setOperator('BSNL');
          } else {
              setOperator('Airtel'); // Fallback
          }
      }
  }, [mobileNumber]);

  const categories = Array.from(new Set(plans.map(p => p.category)));
  const displayedPlans = plans.filter(p => p.category === activeCategory);

  const handleRecharge = async () => {
    if (!user?.uid || !selectedPlan || mobileNumber.length !== 10) {
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Enter a valid 10-digit mobile number', type: 'error' } }));
        return;
    }
    
    setIsPaying(true);
    try {
        const orderRes = await api.post('/finance/razorpay/order', {
            amount: selectedPlan.price,
            userId: user.uid,
            category: 'mobile_recharge',
            serviceName: `Recharge - ${operator}`
        });
        
        const { order, keyId, mock } = orderRes.data;
        
        if (mock) {
            // Bypass Razorpay for testing when keys are missing
            await api.post('/utility/recharge', {
                userId: user.uid,
                mobile: mobileNumber,
                amount: selectedPlan.price,
                operator: operator
            });

            window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `[Mock] Successfully recharged ₹${selectedPlan.price}!`, type: 'success' } }));
            router.push('/utility');
            return;
        }

        const options = {
            key: keyId,
            amount: order.amount,
            currency: order.currency,
            name: "APEX App",
            description: `Mobile Recharge - ₹${selectedPlan.price}`,
            order_id: order.id,
            handler: async function (response: any) {
                try {
                    const verifyRes = await api.post('/finance/razorpay/verify', {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        amount: selectedPlan.price,
                        userId: user.uid
                    });
                    
                    if (verifyRes.data.success) {
                        await api.post('/utility/recharge', {
                            userId: user.uid,
                            mobile: mobileNumber,
                            amount: selectedPlan.price,
                            operator: operator
                        });

                        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `Successfully recharged ₹${selectedPlan.price}!`, type: 'success' } }));
                        router.push('/utility');
                    }
                } catch (e) {
                    console.error("Verification failed", e);
                    window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Verification failed', type: 'error' } }));
                    setIsPaying(false);
                }
            },
            prefill: {
                name: user.name || "APEX User",
                contact: mobileNumber || user.phone || ""
            },
            theme: {
                color: "#2D1B69"
            },
            modal: {
                ondismiss: function() {
                    setIsPaying(false);
                }
            }
        };
        
        const rzp = new (window as any).Razorpay(options);
        rzp.open();

    } catch (error) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `Recharge failed`, type: 'error' } }));
      setIsPaying(false);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="bg-[#2D1B69] text-white p-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <button onClick={() => router.back()} className="text-white hover:text-gray-200 transition-colors p-2 -ml-2">
          <i className="fa-solid fa-arrow-left text-lg"></i>
        </button>
        <h1 className="text-[17px] font-bold">Mobile Recharge</h1>
        <div className="w-8"></div>
      </div>

      <div className="p-4 space-y-6 animate-[fadeIn_0.3s_ease-out]">
        
        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Enter Mobile Number</label>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-mobile-screen text-blue-600 text-lg"></i>
                </div>
                <input 
                    type="tel" 
                    maxLength={10}
                    placeholder="99999 99999"
                    className="w-full text-2xl font-bold text-gray-900 border-none outline-none placeholder:text-gray-300"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/[^0-9]/g, ''))}
                />
            </div>
            {mobileNumber.length === 10 && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                            <i className="fa-solid fa-bolt text-red-500 text-xs"></i>
                        </div>
                        <span className="text-sm font-bold text-gray-700">{operator} - Prepaid</span>
                    </div>
                    <button onClick={() => setOperator(operator === 'Airtel' ? 'Jio' : 'Airtel')} className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full">
                        Change
                    </button>
                </div>
            )}
        </div>

        {/* Plans Section */}
        {mobileNumber.length === 10 && (
            <div className="animate-[slideUp_0.4s_ease-out]">
                <h3 className="text-lg font-black text-gray-900 mb-3">Recommended Plans</h3>
                
                {/* Categories */}
                <div className="flex overflow-x-auto gap-2 pb-2 mb-4 scrollbar-hide">
                    {categories.map(cat => (
                        <button 
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${activeCategory === cat ? 'bg-[#2D1B69] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Plan List */}
                {loadingPlans ? (
                    <div className="flex justify-center p-8">
                        <i className="fa-solid fa-spinner fa-spin text-2xl text-[#2D1B69]"></i>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {displayedPlans.map(plan => (
                            <div key={plan.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:border-[#2D1B69] transition-colors">
                                {/* Decor */}
                                <div className="absolute top-0 right-0 bg-[#2D1B69] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                                    {operator}
                                </div>
                                
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-1 mb-1">
                                            <span className="text-xl font-black text-gray-900">₹{plan.price}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 font-medium">{plan.description}</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedPlan(plan)}
                                        className="bg-blue-50 text-blue-600 font-bold text-xs px-4 py-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors"
                                    >
                                        Select
                                    </button>
                                </div>
                                
                                <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Data</span>
                                        <span className="text-sm font-black text-gray-800">{plan.data}</span>
                                    </div>
                                    <div className="w-px h-6 bg-gray-200"></div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Validity</span>
                                        <span className="text-sm font-black text-gray-800">{plan.validity}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Payment Confirmation Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center">
            <div className="bg-white w-full max-w-md p-6 sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col animate-[slideUp_0.3s_ease-out]">
                <h2 className="text-lg font-black text-gray-900 mb-2">Confirm Recharge</h2>
                <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500 mb-1">{operator} • {mobileNumber}</p>
                        <p className="text-sm font-bold text-gray-900">{selectedPlan.data} / {selectedPlan.validity}</p>
                    </div>
                    <div className="text-xl font-black text-[#2D1B69]">
                        ₹{selectedPlan.price}
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <button onClick={() => setSelectedPlan(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">
                        Cancel
                    </button>
                    <button onClick={handleRecharge} disabled={isPaying} className="flex-1 py-3 bg-[#2D1B69] text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2">
                        {isPaying ? <i className="fa-solid fa-spinner fa-spin"></i> : `Pay ₹${selectedPlan.price}`}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
