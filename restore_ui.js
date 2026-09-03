const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'src/app/matrimony/page.tsx');
let content = fs.readFileSync(pagePath, 'utf8');

// Insert states
const stateCode = `
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPaymentStep, setIsPaymentStep] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    contactNumber: '',
    profession: '',
    photo: null,
    idDocument: null,
  });

  const handlePlanClick = (plan) => {
    setSelectedPlan(plan);
    setIsSuccess(false);
  };

  const closeForm = () => {
    setSelectedPlan(null);
    setIsSuccess(false);
    setIsPaymentStep(false);
  };

  const handleFileChange = (e, field) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, [field]: e.target.files[0] });
    }
  };

  const handleSubmit = (e) => {
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

  const triggerCheckout = () => {
    let amount = selectedPlan === 'Premium' ? '₹20,000' : selectedPlan === 'Gold' ? '₹10,000' : '₹5,000';
    window.dispatchEvent(new CustomEvent('openModal', { 
        detail: { type: 'checkout', data: { amount, plan: 'Matrimony ' + selectedPlan + ' Plan' } }
    }));
  };
`;

if (!content.includes('const [selectedPlan, setSelectedPlan]')) {
    content = content.replace('const socket = socketContext?.socket;', 'const socket = socketContext?.socket;\n' + stateCode);
}

// Add the UI blocks before {/* HORIZONTAL TRACK */}
const uiCode = `
        {/* CATEGORY GRID */}
        <div className="px-4 mb-5">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Browse Profiles</h3>
            <div className="grid grid-cols-4 gap-3">
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
        <div className="mb-5">
            <div className="px-4 flex justify-between items-end mb-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Prime Plans</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 scrollbar-none flex-nowrap pb-2">
                
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

`;

if (!content.includes('CATEGORY GRID')) {
    content = content.replace('{/* HORIZONTAL TRACK */}', uiCode + '{/* HORIZONTAL TRACK */}');
}

// Add the modal overlay before the chat modal
const modalCode = `
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
`;

if (!content.includes('MODAL / FORM UI OVERLAY')) {
    content = content.replace('{/* CHAT MODAL (Floating) */}', modalCode + '\n{/* CHAT MODAL (Floating) */}');
}

fs.writeFileSync(pagePath, content);
console.log('UI restored successfully.');
