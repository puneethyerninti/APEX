
"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import AutoCarousel from '@/components/AutoCarousel';

export default function Page() {
  const [enrollCourse, setEnrollCourse] = useState<{name: string, price: string} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleEnroll = (name: string, price: string) => {
      setEnrollCourse({name, price});
      setIsSuccess(false);
  };

  const handlePayment = (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setTimeout(() => {
          setIsSubmitting(false);
          setIsSuccess(true);
      }, 1500);
  };
  return (
    <>
      
    
    {/* HEADER */}
    <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                <i className="fa-solid fa-arrow-left"></i>
            </Link>
            <h1 className="font-black text-lg text-gray-900">APEX Academy</h1>
        </div>
        <div className="flex gap-2">
            <button onClick={() => {}} className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                <i className="fa-solid fa-magnifying-glass"></i>
            </button>
            <button onClick={() => {}} className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                <i className="fa-solid fa-bookmark"></i>
            </button>
        </div>
    </div>

    {/* HERO DASHBOARD */}
    <div className="p-4">
        <h2 className="text-sm font-black text-gray-800 mb-2">Continue Learning</h2>
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-3 items-center">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 text-xl flex-shrink-0">
                <i className="fa-brands fa-python"></i>
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-xs mb-1">Advanced Python Masterclass</h3>
                <p className="text-[9px] text-gray-500 mb-2">Instructor: Dr. Sarah Jenkins</p>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                    <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: "65%" }}></div>
                </div>
                <p className="text-[8px] font-bold text-gray-400 text-right">65% Completed</p>
            </div>
        </div>
    </div>

    {/* COURSES SECTION */}
    <div className="mb-6">
        <div className="px-4 flex justify-between items-end mb-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Courses</h3>
            <Link href="#" className="text-[9px] font-bold text-purple-600">View All</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 scrollbar-none flex-nowrap pb-2 snap-x snap-mandatory">
            
            {/* Spoken English */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 w-36 flex-shrink-0 overflow-hidden cursor-pointer hover:shadow-md transition-shadow snap-start">
                <div className="h-24 bg-purple-50 relative flex items-center justify-center text-purple-500 text-3xl">
                    <i className="fa-solid fa-comments"></i>
                </div>
                <div className="p-3">
                    <h4 className="font-black text-[10px] text-gray-900 truncate mb-1">Spoken English</h4>
                    <p className="text-[9px] text-gray-500 mb-2 truncate">Fluency &amp; Grammar</p>
                    <span className="text-purple-600 font-black text-xs">₹4,999</span>
                </div>
            </div>

            {/* Spoken Hindi */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 w-36 flex-shrink-0 overflow-hidden cursor-pointer hover:shadow-md transition-shadow snap-start">
                <div className="h-24 bg-orange-50 relative flex items-center justify-center text-orange-500 text-3xl">
                    <i className="fa-solid fa-language"></i>
                </div>
                <div className="p-3">
                    <h4 className="font-black text-[10px] text-gray-900 truncate mb-1">Spoken Hindi</h4>
                    <p className="text-[9px] text-gray-500 mb-2 truncate">Conversational Skills</p>
                    <span className="text-purple-600 font-black text-xs">₹3,999</span>
                </div>
            </div>

            {/* Computer Courses */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 w-36 flex-shrink-0 overflow-hidden cursor-pointer hover:shadow-md transition-shadow snap-start">
                <div className="h-24 bg-blue-50 relative flex items-center justify-center text-blue-500 text-3xl">
                    <i className="fa-solid fa-desktop"></i>
                </div>
                <div className="p-3">
                    <h4 className="font-black text-[10px] text-gray-900 truncate mb-1">Computer Courses</h4>
                    <p className="text-[9px] text-gray-500 mb-2 truncate">MS Office, Tally, Basics</p>
                    <span className="text-purple-600 font-black text-xs">₹1200</span>
                </div>
            </div>
            
            {/* Competitive Exam Courses */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 w-36 flex-shrink-0 overflow-hidden cursor-pointer hover:shadow-md transition-shadow snap-start">
                <div className="h-24 bg-green-50 relative flex items-center justify-center text-green-500 text-3xl">
                    <i className="fa-solid fa-book-open-reader"></i>
                </div>
                <div className="p-3">
                    <h4 className="font-black text-[10px] text-gray-900 truncate mb-1">Competitive Exams</h4>
                    <p className="text-[9px] text-gray-500 mb-2 truncate">SSC, Bank, Railways</p>
                    <span className="text-purple-600 font-black text-xs">₹1500</span>
                </div>
            </div>

        </div>
    </div>

    {/* JOB ORIENTED COURSES */}
    <div className="mb-8">
        <div className="px-4 flex justify-between items-end mb-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Job Oriented Courses</h3>
            <Link href="#" className="text-[9px] font-bold text-purple-600">View All</Link>
        </div>
        <div className="px-4 mb-2">
            <AutoCarousel interval={3500}>
                {/* Full Stack */}
                <div className="bg-white border border-gray-100 w-full overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                    <div className="h-40 relative bg-gray-200">
                        <img src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&amp;fit=crop&amp;q=80" alt="Coding" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30"></div>
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-[8px] font-bold px-2 py-0.5 rounded">HOT</div>
                        <div className="absolute inset-0 flex items-center justify-center text-white/80 text-4xl">
                            <i className="fa-solid fa-code"></i>
                        </div>
                    </div>
                    <div className="p-4">
                        <h4 className="font-black text-sm text-gray-900 truncate mb-1">Full-Stack Web Development</h4>
                        <p className="text-xs text-gray-500 mb-3">HTML, CSS, JS, React, Node.js &amp; More. 100% Placement Assistance.</p>
                        <div className="flex items-center justify-between">
                            <span className="text-purple-600 font-black text-lg">₹9,999</span>
                            <button onClick={() => handleEnroll('Full-Stack Web Development', '₹9,999')} className="bg-purple-100 text-purple-700 text-xs font-bold px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors">Enroll Now</button>
                        </div>
                    </div>
                </div>
                
                {/* Data Science */}
                <div className="bg-white border border-gray-100 w-full overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                    <div className="h-40 relative bg-gray-200">
                        <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&amp;fit=crop&amp;q=80" alt="Data Science" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-white/80 text-4xl">
                            <i className="fa-solid fa-database"></i>
                        </div>
                    </div>
                    <div className="p-4">
                        <h4 className="font-black text-sm text-gray-900 truncate mb-1">Data Science &amp; AI/ML</h4>
                        <p className="text-xs text-gray-500 mb-3">Python, Pandas, Machine Learning. Build your career in AI.</p>
                        <div className="flex items-center justify-between">
                            <span className="text-purple-600 font-black text-lg">₹12,499</span>
                            <button onClick={() => handleEnroll('Data Science & AI/ML', '₹12,499')} className="bg-purple-100 text-purple-700 text-xs font-bold px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors">Enroll Now</button>
                        </div>
                    </div>
                </div>
                
                {/* Mobile App Dev */}
                <div className="bg-white border border-gray-100 w-full overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                    <div className="h-40 relative bg-gray-200">
                        <img src="https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&amp;fit=crop&amp;q=80" alt="Mobile App" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-white/80 text-4xl">
                            <i className="fa-brands fa-app-store-ios"></i>
                        </div>
                    </div>
                    <div className="p-4">
                        <h4 className="font-black text-sm text-gray-900 truncate mb-1">Mobile App Development</h4>
                        <p className="text-xs text-gray-500 mb-3">Learn Flutter &amp; React Native. Build iOS and Android apps.</p>
                        <div className="flex items-center justify-between">
                            <span className="text-purple-600 font-black text-lg">₹20,000</span>
                            <button onClick={() => handleEnroll('Mobile App Development', '₹20,000')} className="bg-purple-100 text-purple-700 text-xs font-bold px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors">Enroll Now</button>
                        </div>
                    </div>
                </div>
                
                {/* Digital Marketing */}
                <div className="bg-white border border-gray-100 w-full overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                    <div className="h-40 relative bg-gray-200">
                        <img src="https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&amp;fit=crop&amp;q=80" alt="Digital Marketing" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-white/80 text-4xl">
                            <i className="fa-solid fa-bullhorn"></i>
                        </div>
                    </div>
                    <div className="p-4">
                        <h4 className="font-black text-sm text-gray-900 truncate mb-1">Digital Marketing Masterclass</h4>
                        <p className="text-xs text-gray-500 mb-3">SEO, SEM, Social Media, Analytics. Become an expert marketer.</p>
                        <div className="flex items-center justify-between">
                            <span className="text-purple-600 font-black text-lg">₹7,999</span>
                            <button onClick={() => handleEnroll('Digital Marketing Masterclass', '₹7,999')} className="bg-purple-100 text-purple-700 text-xs font-bold px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors">Enroll Now</button>
                        </div>
                    </div>
                </div>
            </AutoCarousel>
        </div>
    </div>

    {/* STICKY BOTTOM ACTION */}
    
    {/* ENROLLMENT & PAYMENT MODAL */}
    {enrollCourse && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center">
            <div className="bg-white w-full max-w-md max-h-[90vh] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col animate-[slideUp_0.3s_ease-out]">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 sm:rounded-t-3xl rounded-t-3xl">
                    <div>
                        <h2 className="text-lg font-black text-gray-900">Enrollment</h2>
                        <p className="text-[10px] text-gray-500">{enrollCourse.name}</p>
                    </div>
                    <button onClick={() => setEnrollCourse(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                    {isSuccess ? (
                        <div className="py-10 flex flex-col items-center text-center animate-[fadeIn_0.5s_ease-out]">
                            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-4xl mb-4 shadow-sm">
                                <i className="fa-solid fa-check"></i>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">Enrollment Successful!</h3>
                            <p className="text-sm text-gray-500 max-w-[250px] mx-auto mb-6">
                                You have successfully enrolled in {enrollCourse.name}. You will receive a confirmation email shortly.
                            </p>
                            <button onClick={() => setEnrollCourse(null)} className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl shadow-md">
                                Back to Academy
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handlePayment} className="flex flex-col gap-4">
                            <h3 className="text-sm font-bold text-gray-800">1. Student Details</h3>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">Full Name</label>
                                <input required type="text" placeholder="Enter your name" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">Email Address</label>
                                <input required type="email" placeholder="Enter your email" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">Phone Number</label>
                                <input required type="tel" placeholder="Enter your phone" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
                            </div>

                            <hr className="my-2 border-gray-100" />

                            <h3 className="text-sm font-bold text-gray-800">2. Payment Summary</h3>
                            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-gray-600">Course Fee</span>
                                    <span className="text-xs font-bold text-gray-900">{enrollCourse.price}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-gray-600">GST (18%)</span>
                                    <span className="text-xs font-bold text-gray-900">Included</span>
                                </div>
                                <div className="h-px bg-gray-200 my-2"></div>
                                <div className="flex justify-between items-center">
                                    <span className="font-black text-gray-900">Total</span>
                                    <span className="font-black text-purple-600 text-lg">{enrollCourse.price}</span>
                                </div>
                            </div>
                            
                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-center">
                                <i className="fa-solid fa-qrcode text-4xl text-purple-300 mb-2"></i>
                                <p className="text-[10px] text-purple-600 font-bold mb-1">Pay with any UPI App</p>
                                <p className="text-xs font-black text-purple-800">apex@upi</p>
                            </div>

                            <button type="submit" disabled={isSubmitting} className="mt-2 w-full py-3.5 bg-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 hover:bg-purple-700 active:scale-[0.98] transition-all flex justify-center items-center gap-2">
                                {isSubmitting ? (
                                    <><i className="fa-solid fa-circle-notch fa-spin"></i> Processing Payment...</>
                                ) : (
                                    <>Pay {enrollCourse.price} &amp; Enroll <i className="fa-solid fa-arrow-right"></i></>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )}

    </>
  );
}
