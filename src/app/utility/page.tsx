"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

export default function UtilityPage() {
  const router = useRouter();
  const user = useAppStore(state => state.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBiller, setSelectedBiller] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  const handlePayBill = async () => {
    if (!user?.uid || !selectedBiller) return;
    setIsPaying(true);
    try {
        const orderRes = await api.post('/finance/razorpay/order', {
            amount: 500,
            userId: user.uid,
            category: 'utility_payment',
            serviceName: `Bill Payment - ${selectedBiller}`
        });
        
        const { order, keyId } = orderRes.data;
        
        const options = {
            key: keyId,
            amount: order.amount,
            currency: order.currency,
            name: "APEX App",
            description: `Pay ${selectedBiller} Bill`,
            order_id: order.id,
            handler: async function (response: any) {
                try {
                    const verifyRes = await api.post('/finance/razorpay/verify', {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        amount: 500,
                        userId: user.uid
                    });
                    
                    if (verifyRes.data.success) {
                        // After successful verification, hit the utility endpoint to dispatch notifications/receipts
                        await api.post('/utility/pay', {
                            userId: user.uid,
                            billerName: selectedBiller,
                            amount: 500
                        });
                        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `Successfully paid ${selectedBiller} bill!`, type: 'success' } }));
                        setSelectedBiller(null);
                        setIsPaying(false);
                    }
                } catch (e) {
                    console.error("Verification failed", e);
                    window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Verification failed', type: 'error' } }));
                    setIsPaying(false);
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
                    setIsPaying(false);
                }
            }
        };
        
        const rzp = new (window as any).Razorpay(options);
        rzp.open();

    } catch (error) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `Payment failed for ${selectedBiller}`, type: 'error' } }));
      setIsPaying(false);
    }
  };

  const billers = [
    { name: 'Electricity', icon: 'fa-solid fa-bolt', color: 'text-orange-500' },
    { name: 'Water', icon: 'fa-solid fa-droplet', color: 'text-blue-500' },
    { name: 'Gas', icon: 'fa-solid fa-fire-flame-simple', color: 'text-red-500' },
    { name: 'Mobile Recharge', icon: 'fa-solid fa-mobile-screen', color: 'text-green-500' },
    { name: 'DTH Recharge', icon: 'fa-solid fa-satellite-dish', color: 'text-purple-500' },
    { name: 'Landline / Broadband', icon: 'fa-solid fa-phone-volume', color: 'text-gray-600' },
    { name: 'Credit Card Bill', icon: 'fa-solid fa-credit-card', color: 'text-blue-600' },
    { name: 'FASTag Recharge', icon: 'fa-solid fa-car-side', color: 'text-orange-400' },
    { name: 'Housing Society', icon: 'fa-regular fa-building', color: 'text-green-600' },
    { name: 'Insurance Premium', icon: 'fa-solid fa-shield-heart', color: 'text-purple-600' },
    { name: 'Piped Gas', icon: 'fa-solid fa-gauge', color: 'text-teal-500' },
    { name: 'Municipal Taxes', icon: 'fa-solid fa-file-invoice-dollar', color: 'text-orange-600' },
    { name: 'Education Fees', icon: 'fa-solid fa-graduation-cap', color: 'text-green-500' },
    { name: 'Hospital Bills', icon: 'fa-regular fa-hospital', color: 'text-red-500' },
    { name: 'Loan Repayment', icon: 'fa-solid fa-indian-rupee-sign', color: 'text-blue-500' },
  ];

  return (
    <>
      {/* Header */}
      <div className="bg-[#2D1B69] text-white p-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <button onClick={() => router.back()} className="text-white hover:text-gray-200 transition-colors p-2 -ml-2">
          <i className="fa-solid fa-arrow-left text-lg"></i>
        </button>
        <h1 className="text-[17px] font-bold">BBPS Payments</h1>
        <Link href="/" className="text-white hover:text-gray-200 transition-colors p-2 -mr-2 flex items-center justify-center">
          <i className="fa-solid fa-house text-[17px]"></i>
        </Link>
      </div>

      <div className="p-4 space-y-6 animate-[fadeIn_0.3s_ease-out] mb-10">
        {/* Search Bar */}
        <div className="relative shadow-sm rounded-xl overflow-hidden bg-white border border-gray-100">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <i className="fa-solid fa-magnifying-glass text-gray-400"></i>
          </div>
          <input 
            type="text" 
            placeholder="Search biller, service or provider" 
            className="block w-full pl-11 pr-4 py-3.5 border-none focus:ring-2 focus:ring-[#2D1B69] bg-white outline-none text-[15px] font-medium text-gray-700 placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Promo Banner */}
        <div className="bg-gradient-to-r from-[#4A329A] to-[#2D1B69] rounded-2xl p-5 text-white flex items-center justify-between shadow-lg relative overflow-hidden">
          <div className="z-10 w-2/3">
            <h2 className="text-lg font-bold leading-tight mb-2 tracking-wide">All Your Bill Payments,<br/>One Place</h2>
            <p className="text-[13px] text-indigo-200 tracking-wide font-medium">Secure | Fast | Reliable</p>
          </div>
          <div className="z-10 relative">
            <div className="w-16 h-20 bg-white/10 rounded-xl border border-white/20 flex flex-col items-center justify-center backdrop-blur-sm relative p-2">
              <i className="fa-solid fa-file-invoice text-2xl text-white mb-1.5 opacity-90"></i>
              <div className="w-8 h-1.5 bg-white/40 rounded-full mt-0.5"></div>
              <div className="w-5 h-1.5 bg-white/40 rounded-full mt-1.5"></div>
              <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full w-7 h-7 flex items-center justify-center border-2 border-[#2D1B69] shadow-lg">
                <i className="fa-solid fa-check text-xs text-white"></i>
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
        </div>

        {/* Bill Payments Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-50 bg-gray-50/50">
             <h3 className="text-[13px] font-bold text-gray-500 tracking-wider uppercase">Bill Payments</h3>
          </div>
          
          <div className="grid grid-cols-3 divide-y divide-gray-100">
            {billers.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase())).map((biller, index) => (
              <button 
                key={index} 
                className={`flex flex-col items-center justify-center p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors group min-h-[105px] ${(index + 1) % 3 !== 0 ? 'border-r border-gray-100' : ''}`}
                onClick={() => setSelectedBiller(biller.name)}
              >
                <div className="mb-2.5 transition-transform duration-200 group-hover:scale-110">
                  <i className={`${biller.icon} text-3xl ${biller.color} drop-shadow-sm`}></i>
                </div>
                <span className="text-[11px] font-bold text-gray-700 text-center leading-[1.2]">{biller.name}</span>
              </button>
            ))}
            {billers.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <div className="col-span-3 p-8 text-center text-gray-400 text-sm font-medium">
                No billers found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="bg-[#3D2587] rounded-xl p-4 flex items-center gap-4 shadow-lg overflow-hidden relative">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-xl translate-x-1/2 -translate-y-1/2"></div>
          <div className="w-11 h-12 bg-white rounded-lg flex flex-col items-center justify-center shrink-0 shadow-inner relative z-10">
             <div className="text-[10px] font-black text-[#3D2587] leading-none mb-1">BILL</div>
             <div className="flex gap-1">
               <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
               <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
               <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
             </div>
             <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-4 h-4 flex items-center justify-center shadow">
               <i className="fa-solid fa-check text-[7px] text-white"></i>
             </div>
          </div>
          <div className="z-10">
            <h4 className="text-white text-[15px] font-bold leading-tight">Pay Any Bill,<br/>Anytime, Anywhere</h4>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="bg-green-500 rounded-full w-3.5 h-3.5 flex items-center justify-center">
                 <i className="fa-solid fa-check text-[8px] text-white"></i>
              </div>
              <p className="text-green-400 text-[10px] font-bold uppercase tracking-widest">100% Secure Payments</p>
            </div>
          </div>
        </div>

      </div>

      {/* Payment Modal */}
      {selectedBiller && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center">
            <div className="bg-white w-full max-w-md p-6 sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col animate-[slideUp_0.3s_ease-out]">
                <h2 className="text-lg font-black text-gray-900 mb-2">Pay {selectedBiller} Bill</h2>
                <p className="text-sm text-gray-500 mb-6">Confirm payment of ₹500 for your {selectedBiller} service.</p>
                
                <div className="flex gap-3">
                    <button onClick={() => setSelectedBiller(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">
                        Cancel
                    </button>
                    <button onClick={handlePayBill} disabled={isPaying} className="flex-1 py-3 bg-[#2D1B69] text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2">
                        {isPaying ? <i className="fa-solid fa-spinner fa-spin"></i> : "Pay ₹500"}
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
}
