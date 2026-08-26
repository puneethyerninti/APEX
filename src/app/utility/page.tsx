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
  const [supportsBillFetch, setSupportsBillFetch] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  
  const [billInfo, setBillInfo] = useState<any>(null);
  const [rechargePlans, setRechargePlans] = useState<any[] | null>(null);
  const [isFetchingPlans, setIsFetchingPlans] = useState(false);
  
  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFetchingBill, setIsFetchingBill] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Categories on Mount
  useEffect(() => {
    const fetchCats = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await api.get('/utility/bbps/categories');
        if (res.data.success) {
          setCategories(res.data.data);
        } else {
          throw new Error(res.data.message || 'Failed to load categories');
        }
      } catch (error: any) {
        console.error('Error fetching categories:', error);
        setErrorMsg('Failed to load BBPS categories. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCats();
  }, []);

  // 2. Fetch Operators when Category is selected
  const handleCategorySelect = async (category: any) => {
    setSelectedCategory(category);
    setOperators([]);
    setSelectedOperator(null);
    setSearchQuery('');
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get(`/utility/bbps/operators?category=${category.operator_category_id}`);
      if (res.data.success) {
        setOperators(res.data.data);
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
    setRechargePlans(null);
    setPaySuccess(null);
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get(`/utility/bbps/operator/${operator.operator_id}/parameters`);
      if (res.data.success && res.data.data) {
        const paramData = res.data.data;
        const fields = paramData.list_elements || [];
        setOperatorParams(fields);
        // Check if this operator supports bill fetch
        setSupportsBillFetch(paramData.fetchBill === 1);
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

  // 4. Fetch Bill
  const handleFetchBill = async () => {
    if (!selectedOperator) return;
    
    const fetchPayload: any = {
      phone_operator_code: selectedOperator.operator_id.toString(),
    };

    // Add all form values (param_name is the key)
    Object.entries(formValues).forEach(([key, value]) => {
      if (value.trim()) fetchPayload[key] = value.trim();
    });

    setIsFetchingBill(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/utility/bbps/fetch-bill', fetchPayload);
      if (res.data.success && res.data.data) {
        setBillInfo(res.data.data);
      } else {
        throw new Error(res.data.message || 'Could not fetch bill');
      }
    } catch (error: any) {
      console.error('Error fetching bill:', error);
      setErrorMsg(error.response?.data?.message || error.message || 'Failed to fetch bill. Check the details and try again.');
    } finally {
      setIsFetchingBill(false);
    }
  };

  // 4b. Fetch Recharge Plans (for prepaid/postpaid without bill fetch)
  const handleFetchPlans = async (overrideMobileNo?: string) => {
    if (!selectedOperator) return;

    const primaryParamName = operatorParams[0]?.param_name || 'utility_acc_no';
    const mobileNo = overrideMobileNo || formValues[primaryParamName] || '';

    if (!mobileNo || mobileNo.length < 10) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `Please enter a valid ${operatorParams[0]?.param_label || 'mobile number'} first to see plans`, type: 'error' } }));
      return;
    }

    setIsFetchingPlans(true);
    try {
      const res = await api.get(`/utility/plans?mobile=${mobileNo}`);
      if (res.data.success && res.data.data) {
        setRechargePlans(res.data.data);
      } else {
        throw new Error(res.data.message || 'Could not fetch plans');
      }
    } catch (error: any) {
      console.error('Error fetching plans:', error);
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: error.response?.data?.message || 'Failed to fetch plans for this number.', type: 'error' } }));
    } finally {
      setIsFetchingPlans(false);
    }
  };

  // 5. Pay Bill via Razorpay -> Eko
  const handlePayBill = async (billOverride?: any) => {
    const currentBill = billOverride || billInfo;
    if (!user?.uid || !selectedOperator || !currentBill?.amount) {
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Invalid bill information', type: 'error' } }));
        return;
    }
    
    const numAmount = parseFloat(currentBill.amount);
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
                        // Get the primary account number from form
                        const primaryParamName = operatorParams[0]?.param_name || 'utility_acc_no';
                        const accountNo = formValues[primaryParamName] || 'UNKNOWN';

                        const payRes = await api.post('/utility/pay', {
                            userId: user.uid,
                            operatorCode: selectedOperator.operator_id,
                            operatorName: selectedOperator.name,
                            amount: numAmount,
                            utility_acc_no: accountNo,
                            confirmation_mobile_no: user.phone || accountNo,
                            sender_name: user.name || 'Customer',
                            category: selectedCategory?.operator_category_id || 0,
                            utilitycustomername: currentBill.utilitycustomername || user.name || 'Customer',
                            client_ref_id: currentBill.client_ref_id,
                            ...formValues
                        });

                        if (payRes.data.success) {
                            setPaySuccess(payRes.data.data);
                            window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `Payment successful!`, type: 'success' } }));
                        } else {
                            window.dispatchEvent(new CustomEvent('showToast', { detail: { message: payRes.data.message || 'Payment failed at biller', type: 'error' } }));
                        }
                    }
                } catch (e: any) {
                    console.error("Payment failed", e);
                    window.dispatchEvent(new CustomEvent('showToast', { detail: { message: e.response?.data?.message || 'Payment failed', type: 'error' } }));
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

  // 6. Direct Pay (for operators that don't support bill fetch)
  const handleDirectPay = async () => {
    if (!user?.uid || !selectedOperator) return;
    
    const amountStr = formValues['amount'] || '';
    if (!amountStr) {
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Please enter amount', type: 'error' } }));
        return;
    }

    const numAmount = parseFloat(amountStr);
    const primaryParamName = operatorParams[0]?.param_name || 'utility_acc_no';
    const accountNo = formValues[primaryParamName] || '';

    if (!accountNo) {
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `Please enter ${operatorParams[0]?.param_label || 'account number'}`, type: 'error' } }));
        return;
    }

    // Set fake bill info so Pay Bill flow works
    const fakeBill = {
        amount: numAmount.toString(),
        utilitycustomername: user.name || 'Customer',
        client_ref_id: `ref_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`
    };
    setBillInfo(fakeBill);
    handlePayBill(fakeBill);
  };

  const getCategoryIcon = (catName: string) => {
    const n = catName.toLowerCase();
    if (n.includes('electric')) return 'fa-solid fa-bolt text-yellow-500';
    if (n.includes('water')) return 'fa-solid fa-droplet text-blue-500';
    if (n.includes('gas') || n.includes('lpg')) return 'fa-solid fa-fire-flame-simple text-red-500';
    if (n.includes('dth') || n.includes('cable tv')) return 'fa-solid fa-satellite-dish text-purple-500';
    if (n.includes('mobile') && n.includes('prepaid')) return 'fa-solid fa-mobile-screen text-green-500';
    if (n.includes('mobile') && n.includes('postpaid')) return 'fa-solid fa-mobile-screen-button text-teal-500';
    if (n.includes('broadband') || n.includes('landline')) return 'fa-solid fa-wifi text-cyan-500';
    if (n.includes('insurance')) return 'fa-solid fa-shield-halved text-emerald-500';
    if (n.includes('loan')) return 'fa-solid fa-hand-holding-dollar text-amber-600';
    if (n.includes('credit card')) return 'fa-solid fa-credit-card text-pink-500';
    if (n.includes('tax') || n.includes('municipal')) return 'fa-solid fa-landmark text-slate-600';
    if (n.includes('education')) return 'fa-solid fa-graduation-cap text-indigo-500';
    if (n.includes('fastag')) return 'fa-solid fa-car text-violet-500';
    if (n.includes('housing') || n.includes('rental')) return 'fa-solid fa-house text-orange-500';
    if (n.includes('hospital')) return 'fa-solid fa-hospital text-red-400';
    if (n.includes('subscription') || n.includes('club')) return 'fa-solid fa-star text-yellow-400';
    return 'fa-solid fa-file-invoice-dollar text-indigo-500';
  };

  const formatDueDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'null') return null;
    // Eko returns YYYYMMDD format
    if (dateStr.length === 8) {
      const y = dateStr.substring(0, 4);
      const m = dateStr.substring(4, 6);
      const d = dateStr.substring(6, 8);
      return `${d}/${m}/${y}`;
    }
    return dateStr;
  };

  const handleBack = () => {
    if (paySuccess) {
      setPaySuccess(null);
      setBillInfo(null);
      setSelectedOperator(null);
      setSelectedCategory(null);
    } else if (billInfo) {
      setBillInfo(null);
    } else if (selectedOperator) {
      setSelectedOperator(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    } else {
      router.back();
    }
  };

  const getHeaderTitle = () => {
    if (paySuccess) return 'Payment Receipt';
    if (selectedOperator) return selectedOperator.name;
    if (selectedCategory) return selectedCategory.operator_category_name;
    return 'BBPS Payments';
  };

  const isMobileRecharge = selectedCategory?.operator_category_name?.toLowerCase().includes('mobile');

  return (
    <>
      <div className="bg-[#2D1B69] text-white p-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <button 
          onClick={handleBack} 
          className="text-white hover:text-gray-200 transition-colors p-2 -ml-2"
        >
          <i className="fa-solid fa-arrow-left text-lg"></i>
        </button>
        <h1 className="text-[17px] font-bold truncate px-4 max-w-[200px]">
          {getHeaderTitle()}
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

        {/* PAYMENT SUCCESS SCREEN */}
        {paySuccess && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center animate-[slideUp_0.3s_ease-out]">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-check text-green-600 text-2xl"></i>
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-1">Payment Successful!</h2>
            <p className="text-gray-500 text-sm mb-6">Your payment has been processed successfully</p>
            
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-6">
              {paySuccess.ekoData?.tid && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500 font-semibold">Transaction ID</span>
                  <span className="text-xs font-bold text-gray-800">{paySuccess.ekoData.tid}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 font-semibold">Amount</span>
                <span className="text-sm font-black text-green-600">₹{paySuccess.ekoData?.amount || paySuccess.transaction?.amount}</span>
              </div>
              {paySuccess.ekoData?.operator_name && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500 font-semibold">Biller</span>
                  <span className="text-xs font-bold text-gray-800">{paySuccess.ekoData.operator_name}</span>
                </div>
              )}
            </div>

            <button 
              onClick={() => { setPaySuccess(null); setBillInfo(null); setSelectedOperator(null); setSelectedCategory(null); }}
              className="w-full py-3 bg-[#2D1B69] text-white font-bold rounded-xl"
            >
              Done
            </button>
          </div>
        )}

        {/* STEP 1: Categories */}
        {!isLoading && !selectedCategory && !paySuccess && categories.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-50 bg-gray-50/50">
               <h3 className="text-[13px] font-bold text-gray-500 tracking-wider uppercase">Select Category</h3>
            </div>
            <div className="grid grid-cols-3 divide-y divide-gray-100">
              {categories.map((cat, index) => (
                <button 
                  key={cat.operator_category_id || index} 
                  className={`flex flex-col items-center justify-center p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors group min-h-[105px] ${(index + 1) % 3 !== 0 ? 'border-r border-gray-100' : ''}`}
                  onClick={() => handleCategorySelect(cat)}
                >
                  <div className="mb-2.5 transition-transform duration-200 group-hover:scale-110">
                    <i className={`${getCategoryIcon(cat.operator_category_name)} text-3xl drop-shadow-sm`}></i>
                  </div>
                  <span className="text-[11px] font-bold text-gray-700 text-center leading-[1.2]">{cat.operator_category_name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Operators */}
        {!isLoading && selectedCategory && !selectedOperator && !paySuccess && operators.length > 0 && (
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
              {operators.filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <p className="text-center text-gray-400 py-6 text-sm">No operators found</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Dynamic Form & Bill Payment */}
        {!isLoading && selectedOperator && !paySuccess && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-[slideUp_0.3s_ease-out]">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Enter Details</h3>
            
            <div className="space-y-4">
              {operatorParams.map((param: any, idx) => (
                <div key={idx}>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{param.param_label || param.param_name}</label>
                  <input 
                    type={param.param_type === 'Numeric' ? 'tel' : 'text'}
                    value={formValues[param.param_name] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormValues({...formValues, [param.param_name]: val});
                      
                      // Auto-fetch plans for 10-digit mobile numbers in prepaid
                      if (val.length === 10 && !supportsBillFetch && isMobileRecharge) {
                        handleFetchPlans(val);
                      } else if (isMobileRecharge && val.length !== 10) {
                        setRechargePlans(null);
                      }
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D1B69] transition-all"
                    placeholder={param.error_message || `Enter ${param.param_label || param.param_name}`}
                  />
                </div>
              ))}

              {/* For operators without bill fetch (like DTH), show an amount field */}
              {!supportsBillFetch && !isMobileRecharge && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Amount (₹)</label>
                  <input 
                    type="tel"
                    value={formValues['amount'] || ''}
                    onChange={(e) => setFormValues({...formValues, amount: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D1B69] transition-all"
                    placeholder="Enter amount"
                  />
                </div>
              )}
            </div>

            {/* Inline Loading State for Plans */}
            {isFetchingPlans && isMobileRecharge && (
              <div className="mt-6 p-6 border border-gray-100 rounded-xl flex flex-col items-center justify-center bg-gray-50">
                <i className="fa-solid fa-spinner fa-spin text-2xl text-indigo-500 mb-2"></i>
                <p className="text-sm text-gray-500 font-medium">Fetching best plans...</p>
              </div>
            )}

            {/* Inline Plans Display */}
            {rechargePlans && isMobileRecharge && !isFetchingPlans && (
              <div className="mt-6 animate-[fadeIn_0.3s_ease-out]">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Recommended Plans</h4>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                  {rechargePlans.length > 0 ? rechargePlans.map((plan: any, idx: number) => (
                    <div key={idx} className="border border-gray-100 rounded-xl p-4 bg-white hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group" onClick={() => {
                      setFormValues({...formValues, amount: plan.price.toString()});
                      
                      // Directly proceed to pay for seamless flow
                      const fakeBill = {
                          amount: plan.price.toString(),
                          utilitycustomername: user?.name || 'Customer',
                          client_ref_id: `ref_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`
                      };
                      setBillInfo(fakeBill);
                      handlePayBill(fakeBill);
                    }}>
                      <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-2xl font-black text-[#2D1B69]">₹{plan.price}</div>
                        <span className="bg-green-50 text-green-700 text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border border-green-200">
                          {plan.validity}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
                        <i className="fa-solid fa-wifi text-indigo-500"></i> {plan.data !== 'N/A' ? plan.data : 'Unlimited/NA'}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{plan.description}</p>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-gray-500 border border-dashed border-gray-200 rounded-xl">
                      <i className="fa-solid fa-box-open text-3xl mb-2 text-gray-300"></i>
                      <p className="text-sm">No plans found for this number.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fetch Bill button (only for operators that support it) */}
            {!billInfo && supportsBillFetch && (
              <button 
                onClick={handleFetchBill} 
                disabled={isFetchingBill}
                className="w-full mt-6 py-3.5 bg-[#2D1B69] text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2 hover:bg-[#3D2587] transition-colors disabled:opacity-70"
              >
                {isFetchingBill ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Fetch Bill'}
              </button>
            )}

            {/* Direct Pay button (for operators without bill fetch like DTH, hidden for mobile) */}
            {!billInfo && !supportsBillFetch && !isMobileRecharge && (
              <button 
                onClick={handleDirectPay} 
                className="w-full mt-6 py-3.5 bg-[#2D1B69] text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2 hover:bg-[#3D2587] transition-colors"
              >
                Proceed to Pay
              </button>
            )}

            {/* Step 4: Show Bill Info */}
            {billInfo && (
               <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                  {billInfo.utilitycustomername && (
                    <div className="flex justify-between items-center mb-3 pb-3 border-b border-indigo-100">
                       <span className="text-xs text-indigo-900/70 font-bold uppercase tracking-wider">Customer Name</span>
                       <span className="text-sm font-bold text-indigo-900 truncate pl-2 max-w-[200px] text-right">{billInfo.utilitycustomername}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-4">
                     <span className="text-xs text-indigo-900/70 font-bold uppercase tracking-wider">Bill Amount</span>
                     <span className="text-2xl font-black text-[#2D1B69]">₹{billInfo.amount}</span>
                  </div>
                  {formatDueDate(billInfo.billDueDate) && (
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs text-indigo-900/70 font-bold uppercase tracking-wider">Due Date</span>
                      <span className="text-sm font-bold text-red-600">{formatDueDate(billInfo.billDueDate)}</span>
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
