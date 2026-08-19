"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

export default function UtilityPage() {
  const router = useRouter();
  const user = useAppStore(state => state.user);
  
  // State for BBPS Flow
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  
  const [operators, setOperators] = useState<any[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<any>(null);
  
  const [operatorParams, setOperatorParams] = useState<any[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  
  const [billInfo, setBillInfo] = useState<any>(null);
  
  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFetchingBill, setIsFetchingBill] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Categories on Mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/utility/bbps/categories');
      if (res.data.success && res.data.data?.data) {
        setCategories(res.data.data.data);
      } else {
        throw new Error(res.data.message || 'Failed to load categories');
      }
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      const is401 = error.response?.status === 401;
      setErrorMsg(is401 
        ? 'Eko Server blocked access (401 Unauthorized). Service Code 53 is not yet active for your Developer Key.' 
        : 'Failed to load BBPS categories from server.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fetch Operators when Category is selected
  const handleCategorySelect = async (category: any) => {
    setSelectedCategory(category);
    setOperators([]);
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get(`/utility/bbps/operators?category=${category.category_id}`);
      if (res.data.success && res.data.data?.data) {
        setOperators(res.data.data.data);
      } else {
        throw new Error(res.data.message || 'Failed to load operators');
      }
    } catch (error: any) {
      console.error('Error fetching operators:', error);
      setErrorMsg('Failed to load operators for this category.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Fetch Operator Parameters when Operator is selected
  const handleOperatorSelect = async (operator: any) => {
    setSelectedOperator(operator);
    setOperatorParams([]);
    setFormValues({});
    setBillInfo(null);
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get(`/utility/bbps/operator/${operator.operator_id}/parameters`);
      if (res.data.success && res.data.data?.data) {
        // Eko usually returns a req_list in dependent_params or directly
        const p = res.data.data.data;
        setOperatorParams(p);
      } else {
        throw new Error(res.data.message || 'Failed to load parameters');
      }
    } catch (error: any) {
      console.error('Error fetching operator params:', error);
      setErrorMsg('Failed to load form fields for this operator.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Fetch Bill dynamically based on form input
  const handleFetchBill = async () => {
    if (!selectedOperator) return;
    
    // Convert formValues to the query required by Eko
    const fetchPayload = {
      phone_operator_code: selectedOperator.operator_id,
      ...formValues
    };

    setIsFetchingBill(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/utility/bbps/fetch-bill', fetchPayload);
      if (res.data.success && res.data.data?.data) {
        setBillInfo(res.data.data.data);
      } else {
        throw new Error(res.data.data?.message || res.data.message || 'Could not fetch bill');
      }
    } catch (error: any) {
      console.error('Error fetching bill:', error);
      setErrorMsg(error.response?.data?.message || error.message || 'Failed to fetch bill details. Check the details and try again.');
    } finally {
      setIsFetchingBill(false);
    }
  };

  // 5. Pay Bill via Razorpay -> Eko
  const handlePayBill = async () => {
    if (!user?.uid || !selectedOperator || !billInfo?.amount) {
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Invalid bill information', type: 'error' } }));
        return;
    }
    
    const numAmount = parseFloat(billInfo.amount);
    setIsPaying(true);
    try {
        const orderRes = await api.post('/finance/razorpay/order', {
            amount: numAmount,
            userId: user.uid,
            category: 'bbps_payment',
            serviceName: `BBPS - ${selectedOperator.name}`
        });
        
        const { order, keyId } = orderRes.data;

        const options = {
            key: keyId,
            amount: order.amount,
            currency: order.currency,
            name: "APEX App",
            description: `Pay ${selectedOperator.name} Bill`,
            order_id: order.id,
            handler: async function (response: any) {
                try {
                    const verifyRes = await api.post('/finance/razorpay/verify', {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        amount: numAmount,
                        userId: user.uid
                    });
                    
                    if (verifyRes.data.success) {
                        const primaryParamName = operatorParams[0]?.name || operatorParams[0]?.param_name || 'utility_acc_no';
                        const accountNo = formValues[primaryParamName] || 'UNKNOWN';

                        await api.post('/utility/pay', {
                            userId: user.uid,
                            operatorCode: selectedOperator.operator_id,
                            amount: numAmount,
                            utility_acc_no: accountNo,
                            ...formValues
                        });

                        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `Successfully paid bill!`, type: 'success' } }));
                        
                        setSelectedOperator(null);
                        setBillInfo(null);
                        setFormValues({});
                    }
                } catch (e) {
                    console.error("Verification failed", e);
                    window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Verification failed', type: 'error' } }));
                } finally {
                    setIsPaying(false);
                }
            },
            prefill: {
                name: user.name || "APEX User",
                contact: user.phone || ""
            },
            theme: { color: "#2D1B69" },
            modal: { ondismiss: function() { setIsPaying(false); } }
        };
        
        const rzp = new (window as any).Razorpay(options);
        rzp.open();

    } catch (error) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `Payment gateway failed`, type: 'error' } }));
      setIsPaying(false);
    }
  };

  const getCategoryIcon = (catName: string) => {
    const n = catName.toLowerCase();
    if (n.includes('electric')) return 'fa-solid fa-bolt text-orange-500';
    if (n.includes('water')) return 'fa-solid fa-droplet text-blue-500';
    if (n.includes('gas')) return 'fa-solid fa-fire-flame-simple text-red-500';
    if (n.includes('dth') || n.includes('tv')) return 'fa-solid fa-satellite-dish text-purple-500';
    if (n.includes('mobile') || n.includes('prepaid')) return 'fa-solid fa-mobile-screen text-green-500';
    if (n.includes('broadband') || n.includes('landline')) return 'fa-solid fa-phone-volume text-gray-600';
    return 'fa-solid fa-file-invoice-dollar text-indigo-500';
  };

  return (
    <>
      <div className="bg-[#2D1B69] text-white p-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <button 
          onClick={() => {
            if (selectedOperator) setSelectedOperator(null);
            else if (selectedCategory) setSelectedCategory(null);
            else router.back();
          }} 
          className="text-white hover:text-gray-200 transition-colors p-2 -ml-2"
        >
          <i className="fa-solid fa-arrow-left text-lg"></i>
        </button>
        <h1 className="text-[17px] font-bold truncate px-4 max-w-[200px]">
          {selectedOperator ? selectedOperator.name : selectedCategory ? selectedCategory.category_name : 'BBPS Payments'}
        </h1>
        <Link href="/" className="text-white hover:text-gray-200 transition-colors p-2 -mr-2 flex items-center justify-center">
          <i className="fa-solid fa-house text-[17px]"></i>
        </Link>
      </div>

      <div className="p-4 space-y-6 animate-[fadeIn_0.3s_ease-out] mb-10">
        
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium flex gap-3 shadow-sm">
             <i className="fa-solid fa-triangle-exclamation mt-0.5 text-red-500 shrink-0"></i>
             <p>{errorMsg}</p>
          </div>
        )}

        {isLoading && !errorMsg && (
          <div className="flex flex-col items-center justify-center py-12">
            <i className="fa-solid fa-spinner fa-spin text-3xl text-[#2D1B69] mb-4"></i>
            <p className="text-gray-500 font-medium">Connecting to BBPS...</p>
          </div>
        )}

        {/* STEP 1: Categories */}
        {!isLoading && !selectedCategory && categories.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-50 bg-gray-50/50">
               <h3 className="text-[13px] font-bold text-gray-500 tracking-wider uppercase">Select Category</h3>
            </div>
            <div className="grid grid-cols-3 divide-y divide-gray-100">
              {categories.map((cat, index) => (
                <button 
                  key={cat.category_id || index} 
                  className={`flex flex-col items-center justify-center p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors group min-h-[105px] ${(index + 1) % 3 !== 0 ? 'border-r border-gray-100' : ''}`}
                  onClick={() => handleCategorySelect(cat)}
                >
                  <div className="mb-2.5 transition-transform duration-200 group-hover:scale-110">
                    <i className={`${getCategoryIcon(cat.category_name)} text-3xl drop-shadow-sm`}></i>
                  </div>
                  <span className="text-[11px] font-bold text-gray-700 text-center leading-[1.2]">{cat.category_name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Operators */}
        {!isLoading && selectedCategory && !selectedOperator && operators.length > 0 && (
          <div>
            <div className="relative shadow-sm rounded-xl overflow-hidden bg-white border border-gray-100 mb-4">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <i className="fa-solid fa-magnifying-glass text-gray-400"></i>
              </div>
              <input 
                type="text" 
                placeholder="Search operator..." 
                className="block w-full pl-11 pr-4 py-3 border-none focus:ring-2 focus:ring-[#2D1B69] bg-white outline-none text-[14px] font-medium text-gray-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
              {operators.filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase())).map((op, idx) => (
                 <button 
                   key={op.operator_id || idx}
                   className="w-full text-left p-4 hover:bg-gray-50 active:bg-gray-100 flex items-center justify-between"
                   onClick={() => handleOperatorSelect(op)}
                 >
                    <span className="font-semibold text-gray-800 text-sm">{op.name}</span>
                    <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
                 </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Dynamic Form & Bill Payment */}
        {!isLoading && selectedOperator && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-[slideUp_0.3s_ease-out]">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Enter Details</h3>
            
            <div className="space-y-4">
              {operatorParams.map((param: any, idx) => (
                <div key={idx}>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{param.name || param.param_name}</label>
                  <input 
                    type={param.regex?.includes('^\\d') ? 'number' : 'text'}
                    value={formValues[param.name || param.param_name] || ''}
                    onChange={(e) => setFormValues({...formValues, [param.name || param.param_name]: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D1B69] transition-all"
                    placeholder={`Enter ${param.name || param.param_name}`}
                  />
                </div>
              ))}
            </div>

            {!billInfo && (
              <button 
                onClick={handleFetchBill} 
                disabled={isFetchingBill}
                className="w-full mt-6 py-3.5 bg-[#2D1B69] text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2 hover:bg-[#3D2587] transition-colors disabled:opacity-70"
              >
                {isFetchingBill ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Fetch Bill'}
              </button>
            )}

            {/* Step 4: Show Bill Info */}
            {billInfo && (
               <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3 pb-3 border-b border-indigo-100">
                     <span className="text-xs text-indigo-900/70 font-bold uppercase tracking-wider">Customer Name</span>
                     <span className="text-sm font-bold text-indigo-900 truncate pl-2 max-w-[200px] text-right">{billInfo.customer_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                     <span className="text-xs text-indigo-900/70 font-bold uppercase tracking-wider">Bill Amount</span>
                     <span className="text-2xl font-black text-[#2D1B69]">₹{billInfo.amount}</span>
                  </div>
                  {billInfo.due_date && (
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs text-indigo-900/70 font-bold uppercase tracking-wider">Due Date</span>
                      <span className="text-sm font-bold text-red-600">{billInfo.due_date}</span>
                    </div>
                  )}

                  <button 
                    onClick={handlePayBill} 
                    disabled={isPaying}
                    className="w-full py-3.5 bg-green-500 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2 hover:bg-green-600 transition-colors disabled:opacity-70"
                  >
                    {isPaying ? <i className="fa-solid fa-spinner fa-spin"></i> : `Pay ₹${billInfo.amount}`}
                  </button>
               </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}
