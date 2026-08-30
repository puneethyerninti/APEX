"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

const getCategoryBehavior = (catName: string) => {
  const name = (catName || '').toLowerCase();
  
  if (name.includes('mobile') && name.includes('prepaid')) {
    return {
      type: 'recharge',
      supportsBillFetch: false,
      inputs: [
        { param_name: 'utility_acc_no', param_label: 'Mobile Number', type: 'Numeric', regex: '^[6-9][0-9]{9}$', error: 'Enter a valid 10-digit mobile number' }
      ]
    };
  }
  
  if (name.includes('dth') || name.includes('cable')) {
    return {
      type: 'direct_pay',
      supportsBillFetch: false,
      inputs: [
        { param_name: 'utility_acc_no', param_label: 'Subscriber ID / Account Number', type: 'AlphaNumeric', regex: '^.{3,30}$', error: 'Enter a valid Subscriber ID' },
        { param_name: 'amount', param_label: 'Amount (₹)', type: 'Numeric', regex: '^[1-9][0-9]{0,4}$', error: 'Enter a valid amount' }
      ]
    };
  }
  
  // Default for Electricity, Gas, Water, Postpaid, Broadband, FASTag, etc.
  return {
    type: 'fetch_bill',
    supportsBillFetch: true,
    inputs: [
      { param_name: 'utility_acc_no', param_label: 'Consumer Number / Account ID', type: 'AlphaNumeric', regex: '^.{3,30}$', error: 'Enter a valid Consumer/Account Number' }
    ]
  };
};

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
  // Stores phone_operator_code + circleid returned by Eko when fetching plans
  const [detectedMeta, setDetectedMeta] = useState<{ phone_operator_code: string; circleid: string } | null>(null);

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
    setFormValues({});
    setBillInfo(null);
    setRechargePlans(null);
    setPaySuccess(null);
    setErrorMsg(null);
    
    const behavior = getCategoryBehavior(selectedCategory?.operator_category_name);
    setSupportsBillFetch(behavior.supportsBillFetch);
    
    // Start with base fallback inputs
    const baseInputs = JSON.parse(JSON.stringify(behavior.inputs));
    setOperatorParams(baseInputs);
    
    // For recharge type (prepaid), no need to fetch Eko params — use base inputs
    if (behavior.type === 'recharge') {
      setIsLoading(false);
      return;
    }
    
    // For all bill-based services: fetch the EXACT param_names from Eko
    // These are critical — e.g. Axis Bank needs 'mobile_number' NOT 'utility_acc_no' as field 1
    setIsLoading(true);
    try {
      const res = await api.get(`/utility/bbps/operator/${operator.operator_id}/parameters`);
      if (res.data.success && res.data.data) {
        const ekoFields: any[] = res.data.data.list_elements || [];
        
        if (ekoFields.length > 0) {
          // Replace ALL base inputs with Eko's exact field definitions
          // This ensures param_name keys match exactly what Eko expects in the bill fetch request
          const ekoInputs = ekoFields
            .filter((f: any) => f.param_name?.toLowerCase() !== 'amount') // amount is never user-entered for bill-fetch
            .map((f: any) => ({
              param_name: f.param_name,
              param_label: f.param_label || f.param_name,
              type: f.param_type || 'AlphaNumeric',
              regex: f.regex || '',
              error: f.error_message || `Please enter valid ${f.param_label}`
            }));
          
          if (ekoInputs.length > 0) {
            setOperatorParams(ekoInputs);
          } else {
            setOperatorParams(baseInputs);
          }
        }
        
        // Update bill fetch support based on what Eko actually says
        const ekoFetchBill = res.data.data.fetchBill;
        if (ekoFetchBill === 0) {
          setSupportsBillFetch(false);
        }
      }
    } catch (error: any) {
      console.warn('Eko params fetch failed, using fallback UI.', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Fetch Bill — with graceful fallback when Eko biller is temporarily down
  const handleFetchBill = async () => {
    if (!selectedOperator) return;
    
    // Strict Validation using Eko's exact regex
    for (const param of operatorParams) {
       const val = formValues[param.param_name] || '';
       if (!val) {
          window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `Please enter ${param.param_label}`, type: 'error' } }));
          return;
       }
       if (param.regex) {
          try {
            const rx = new RegExp(param.regex);
            if (!rx.test(val)) {
               window.dispatchEvent(new CustomEvent('showToast', { detail: { message: param.error || `Invalid ${param.param_label}`, type: 'error' } }));
               return;
            }
          } catch (e) { /* Ignore bad regex patterns from Eko */ }
       }
    }
    
    // Build payload using exact Eko param_names as keys
    const fetchPayload: any = {
      phone_operator_code: selectedOperator.operator_id.toString(),
      confirmation_mobile_no: user?.phone || '9999999999',
    };
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
      const msg: string = error.response?.data?.message || error.message || '';
      const isServerDown = msg.toLowerCase().includes('server is down') || 
                           msg.toLowerCase().includes('unable to fetch') ||
                           msg.toLowerCase().includes('biller') ||
                           msg.toLowerCase().includes('no pending bill');
      
      if (isServerDown) {
        // Eko's biller is temporarily down — let user pay with manual amount
        setErrorMsg(`Biller's server is temporarily unavailable. You can still pay by entering the amount manually.`);
        // Show manual amount entry fallback
        setSupportsBillFetch(false);
        setOperatorParams(prev => {
          const hasAmount = prev.some(p => p.param_name === 'amount');
          if (hasAmount) return prev;
          return [...prev, { param_name: 'amount', param_label: 'Amount (₹)', type: 'Numeric', regex: '^[1-9][0-9]{0,5}$', error: 'Enter a valid amount' }];
        });
      } else {
        setErrorMsg(msg || 'Failed to fetch bill. Please check your details and try again.');
      }
    } finally {
      setIsFetchingBill(false);
    }
  };

  // Handle Plans fetch — stores detected operator meta for use in recharge
  const handleFetchPlans = async (mobile: string) => {
    if (!selectedOperator) return;
    setIsFetchingPlans(true);
    setRechargePlans(null);
    setDetectedMeta(null);
    try {
      const res = await api.get(`/utility/plans?mobile=${mobile}`);
      if (res.data.success && res.data.data) {
        setRechargePlans(res.data.data);
        // Store meta (phone_operator_code + circleid) for the recharge pay call
        if (res.data.meta) {
          setDetectedMeta(res.data.meta);
        }
      } else {
        setRechargePlans([]);
      }
    } catch (error: any) {
      console.error('Error fetching plans:', error);
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: error.response?.data?.message || 'Failed to fetch plans for this number.', type: 'error' } }));
    } finally {
      setIsFetchingPlans(false);
    }
  };

  // Handle plan tap — creates Razorpay order with mobile_recharge category
  const handlePlanPay = async (plan: any) => {
    if (!user?.uid || !selectedOperator) return;
    const mobile = formValues['utility_acc_no'] || '';
    if (!mobile || mobile.length !== 10) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Please enter a valid 10-digit mobile number first', type: 'error' } }));
      return;
    }
    const numAmount = parseFloat(plan.price);
    setIsPaying(true);
    try {
      const orderRes = await api.post('/finance/razorpay/order', {
        amount: numAmount,
        userId: user.uid,
        category: 'mobile_recharge',
        serviceName: `Recharge ₹${numAmount} - ${selectedOperator.name}`,
        metadata: {
          mobile,
          operatorCode: detectedMeta?.phone_operator_code || selectedOperator.operator_id.toString(),
          circleid: detectedMeta?.circleid || '',
          amount: numAmount,
          planDescription: plan.description,
          operatorName: selectedOperator.name
        }
      });
      const { order, keyId } = orderRes.data;
      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'APEX App',
        description: `${selectedOperator.name} — ₹${numAmount} Recharge`,
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
              setPaySuccess(verifyRes.data);
              window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `Recharge of ₹${numAmount} successful! ${plan.validity} plan activated.`, type: 'success' } }));
            }
          } catch (e: any) {
            window.dispatchEvent(new CustomEvent('showToast', { detail: { message: e.response?.data?.message || 'Recharge failed', type: 'error' } }));
          } finally {
            setIsPaying(false);
          }
        },
        prefill: { name: user.name || 'APEX User', contact: user.phone || mobile },
        theme: { color: '#2D1B69' },
        modal: { ondismiss: () => setIsPaying(false) }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: error.response?.data?.message || 'Payment gateway failed', type: 'error' } }));
      setIsPaying(false);
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
    
    // Collect the primary account number for this operator
    const primaryParamName = operatorParams[0]?.param_name || 'utility_acc_no';
    const accountNo = formValues[primaryParamName] || '';
    
    try {
        const orderRes = await api.post('/finance/razorpay/order', {
            amount: numAmount,
            userId: user.uid,
            category: 'bbps_payment',
            serviceName: `BBPS - ${selectedOperator.name}`,
            metadata: {
                operatorCode: selectedOperator.operator_id,
                operatorName: selectedOperator.name,
                utility_acc_no: accountNo,
                confirmation_mobile_no: user.phone || accountNo,
                category: selectedCategory?.operator_category_id || 0,
                utilitycustomername: currentBill.utilitycustomername || user.name || 'Customer',
                client_ref_id: currentBill.client_ref_id || '',
                formValues: formValues
            }
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
    
    // Strict Validation
    for (const param of operatorParams) {
       const val = formValues[param.param_name] || '';
       if (!val) {
          window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `Please enter ${param.param_label}`, type: 'error' } }));
          return;
       }
       if (param.regex) {
          const rx = new RegExp(param.regex);
          if (!rx.test(val)) {
             window.dispatchEvent(new CustomEvent('showToast', { detail: { message: param.error || `Invalid ${param.param_label}`, type: 'error' } }));
             return;
          }
       }
    }
    
    const amountStr = formValues['amount'] || '';
    const numAmount = parseFloat(amountStr);
    const primaryParamName = operatorParams[0]?.param_name || 'utility_acc_no';
    const accountNo = formValues[primaryParamName] || '';

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

  const isMobileRecharge = selectedCategory?.operator_category_name?.toLowerCase().includes('mobile') &&
    selectedCategory?.operator_category_name?.toLowerCase().includes('prepaid');
  const isDTH = selectedCategory?.operator_category_name?.toLowerCase().includes('dth') ||
    selectedCategory?.operator_category_name?.toLowerCase().includes('cable');

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
                    <div key={idx} className="border border-gray-100 rounded-xl p-4 bg-white hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group" onClick={() => handlePlanPay(plan)}>
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
              <div className="mt-6 space-y-4">
                {/* DTH: Quick-select preset recharge amounts */}
                {isDTH && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Quick Recharge</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[100, 200, 300, 500, 1000, 1500, 2000, 3000].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setFormValues({...formValues, amount: amt.toString()})}
                          className={`py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                            formValues['amount'] === amt.toString()
                              ? 'bg-[#2D1B69] text-white border-[#2D1B69] shadow-md'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-[#2D1B69]'
                          }`}
                        >
                          ₹{amt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={handleDirectPay}
                  disabled={isPaying}
                  className="w-full py-3.5 bg-[#2D1B69] text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2 hover:bg-[#3D2587] transition-colors disabled:opacity-70"
                >
                  {isPaying ? <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</> : 'Proceed to Pay'}
                </button>
              </div>
            )}

            {/* Step 4: Show Bill Info */}
            {billInfo && (
               <div className="mt-8 animate-[slideUp_0.4s_ease-out]">
                 <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#2D1B69] to-indigo-500"></div>
                   
                   <div className="p-6">
                     <div className="flex items-center justify-between mb-6">
                       <div>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Bill Amount Due</p>
                         <h2 className="text-4xl font-black text-[#2D1B69]">₹{billInfo.amount}</h2>
                       </div>
                       <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
                         <i className="fa-solid fa-file-invoice text-indigo-500 text-xl"></i>
                       </div>
                     </div>

                     <div className="space-y-4 border-t border-dashed border-gray-200 pt-5">
                       {billInfo.utilitycustomername && (
                         <div className="flex justify-between items-start">
                           <span className="text-sm text-gray-500 font-medium">Biller Name</span>
                           <span className="text-sm font-bold text-gray-900 text-right max-w-[180px]">{billInfo.utilitycustomername}</span>
                         </div>
                       )}
                       
                       {formatDueDate(billInfo.billDueDate) && (
                         <div className="flex justify-between items-center">
                           <span className="text-sm text-gray-500 font-medium">Due Date</span>
                           <span className="text-[11px] font-bold bg-red-50 text-red-600 px-2.5 py-1 rounded-md border border-red-100 flex items-center">
                             <i className="fa-regular fa-calendar mr-1.5"></i> {formatDueDate(billInfo.billDueDate)}
                           </span>
                         </div>
                       )}
                     </div>
                   </div>

                   <div className="p-4 bg-gray-50 border-t border-gray-100">
                     <button 
                       onClick={handlePayBill} 
                       disabled={isPaying}
                       className="w-full py-4 bg-[#2D1B69] text-white font-bold rounded-xl shadow-[0_8px_20px_-8px_rgba(45,27,105,0.6)] flex justify-center items-center gap-2 hover:bg-[#3D2587] transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0"
                     >
                       {isPaying ? (
                         <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</>
                       ) : (
                         <>Proceed to Pay ₹{billInfo.amount}</>
                       )}
                     </button>
                   </div>
                 </div>
                 <p className="text-center text-[10px] text-gray-400 mt-4 flex items-center justify-center gap-1.5 uppercase tracking-wider font-bold">
                   <i className="fa-solid fa-shield-halved"></i> 100% Safe and secure
                 </p>
               </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}
