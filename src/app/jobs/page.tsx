"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/services/api';

const jobSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  jobRole: z.string().min(1, 'Please select a job role'),
});

type JobFormValues = z.infer<typeof jobSchema>;

export default function JobsPage() {
  const [fileName, setFileName] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setFileName(e.target.files[0].name);
          setSelectedFile(e.target.files[0]);
      }
  };

  const onSubmit = async (data: JobFormValues) => {
      try {
          const formData = new FormData();
          formData.append('fullName', data.fullName);
          formData.append('email', data.email);
          formData.append('jobRole', data.jobRole);
          if (selectedFile) {
              formData.append('resume', selectedFile);
          }

          await api.post('/jobs/apply', formData, {
              headers: {
                  'Content-Type': 'multipart/form-data',
              },
          });
          
          setIsRegistered(true);
          reset();
          setFileName('');
          setSelectedFile(null);
          setTimeout(() => setIsRegistered(false), 3000); // Reset after 3s
      } catch (error) {
          console.error("Job application failed", error);
          alert("Failed to submit application");
      }
  };

  return (
    <>
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
            <i className="fa-solid fa-arrow-left"></i>
        </Link>
        <h1 className="font-black text-lg text-gray-900">APEX Jobs</h1>
      </div>

      {/* HERO DASHBOARD */}
      <div className="p-4 animate-[fadeIn_0.3s_ease-out]">
          <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex items-center mb-6">
              <div className="relative z-10 flex-1">
                  <p className="text-cyan-100 text-[9px] font-bold uppercase tracking-widest mb-1">Your Profile Strength</p>
                  <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-3xl font-black">92%</h2>
                      <span className="bg-white/20 text-white text-[8px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Excellent</span>
                  </div>
                  <p className="text-[10px] text-cyan-100 mb-3">You are in the top 5% of candidates for <strong>Frontend Developer</strong> roles.</p>
                  <label htmlFor="resumeUpload" className="inline-block cursor-pointer bg-white text-cyan-700 text-[10px] font-black px-4 py-1.5 rounded-full shadow-sm hover:bg-cyan-50 transition-colors">Update Resume</label>
              </div>
              <div className="relative z-10">
                  <div className="w-16 h-16 rounded-full border-4 border-white/20 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                      <i className="fa-solid fa-trophy text-3xl text-yellow-300 drop-shadow-sm"></i>
                  </div>
              </div>
          </div>

          {/* RESUME UPLOAD SECTION */}
          <div className="mb-6">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Resume Upload</h3>
              <div className="bg-white rounded-xl border-2 border-dashed border-cyan-200 p-5 text-center transition-colors hover:border-cyan-400 hover:bg-cyan-50 group">
                  <input type="file" id="resumeUpload" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileUpload} />
                  <label htmlFor="resumeUpload" className="cursor-pointer flex flex-col items-center w-full h-full">
                      <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 mb-3 group-hover:scale-110 transition-transform">
                          <i className="fa-solid fa-cloud-arrow-up text-xl"></i>
                      </div>
                      <h4 className="font-bold text-xs text-gray-800 mb-1">Click to browse or drag file here</h4>
                      <p className="text-[9px] text-gray-400 mb-3">Supported formats: PDF, DOC, DOCX (Max 5MB)</p>
                      {fileName && (
                          <div className="text-[10px] font-bold text-cyan-700 bg-white border border-cyan-100 px-3 py-1.5 rounded-lg shadow-sm w-full overflow-hidden text-ellipsis whitespace-nowrap">
                              <i className="fa-solid fa-file-check text-green-500 mr-1.5"></i> {fileName}
                          </div>
                      )}
                  </label>
              </div>
          </div>

          {/* JOB REGISTRATION FORM */}
          <div className="mb-6">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Job Registration</h3>
              <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="mb-4">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5">Full Name</label>
                      <input 
                        {...register('fullName')} 
                        type="text" 
                        placeholder="Enter your full name" 
                        className={`w-full bg-gray-50 border ${errors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-cyan-500'} rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-1 transition-all`} 
                      />
                      {errors.fullName && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.fullName.message}</p>}
                  </div>
                  <div className="mb-4">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5">Email Address</label>
                      <input 
                        {...register('email')} 
                        type="email" 
                        placeholder="name@example.com" 
                        className={`w-full bg-gray-50 border ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-cyan-500'} rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-1 transition-all`} 
                      />
                      {errors.email && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.email.message}</p>}
                  </div>
                  <div className="mb-5">
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5">Desired Job Role</label>
                      <select 
                        {...register('jobRole')} 
                        className={`w-full bg-gray-50 border ${errors.jobRole ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-cyan-500'} rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-1 transition-all text-gray-700`}
                      >
                          <option value="">Select a role...</option>
                          <option value="frontend">Frontend Developer</option>
                          <option value="backend">Backend Developer</option>
                          <option value="design">UI/UX Designer</option>
                          <option value="sales">Sales & Marketing</option>
                          <option value="support">Customer Support</option>
                      </select>
                      {errors.jobRole && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.jobRole.message}</p>}
                  </div>
                  
                  <button disabled={isSubmitting} type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black py-3 rounded-xl shadow-md hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                      {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : isRegistered ? (
                          <><i className="fa-solid fa-check"></i> Registered Successfully!</>
                      ) : (
                          <><i className="fa-solid fa-paper-plane"></i> Register Now</>
                      )}
                  </button>
              </form>

          </div>

          {/* CATEGORY GRID */}
          <div className="mb-6">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Explore Opportunities</h3>
              <div className="grid grid-cols-4 gap-3">
                  <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                      <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-blue-600 text-lg"><i className="fa-solid fa-building"></i></div>
                      <span className="text-[9px] font-bold text-gray-600">Top MNCs</span>
                  </button>
                  <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                      <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-cyan-600 text-lg"><i className="fa-solid fa-laptop-code"></i></div>
                      <span className="text-[9px] font-bold text-gray-600">Tech/IT</span>
                  </button>
                  <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                      <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-indigo-600 text-lg"><i className="fa-solid fa-earth-americas"></i></div>
                      <span className="text-[9px] font-bold text-gray-600">Remote</span>
                  </button>
                  <button className="flex flex-col items-center text-center gap-1.5 hover:scale-105 active:scale-95 transition-transform">
                      <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-pink-600 text-lg"><i className="fa-solid fa-briefcase"></i></div>
                      <span className="text-[9px] font-bold text-gray-600">Freelance</span>
                  </button>
              </div>
          </div>

          {/* HORIZONTAL TRACK - RECOMMENDED JOBS */}
          <div className="mb-5">
              <div className="flex justify-between items-end mb-3">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Recommended Jobs</h3>
                  <Link href="#" className="text-[9px] font-bold text-cyan-600">View All</Link>
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-none flex-nowrap pb-2">
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 min-w-[200px] flex-shrink-0 cursor-pointer hover:border-cyan-200 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500 text-sm"><i className="fa-brands fa-google"></i></div>
                          <div>
                              <h4 className="font-black text-[11px] text-gray-900 truncate">Senior React Dev</h4>
                              <p className="text-[9px] text-gray-500">Google &middot; Bangalore</p>
                          </div>
                      </div>
                      <div className="flex gap-1.5 mb-3">
                          <span className="bg-gray-50 text-gray-600 text-[8px] font-bold px-1.5 py-0.5 rounded">Remote</span>
                          <span className="bg-gray-50 text-gray-600 text-[8px] font-bold px-1.5 py-0.5 rounded">Full-Time</span>
                      </div>
                      <div className="flex items-end justify-between border-t border-gray-50 pt-2">
                          <span className="text-cyan-600 font-black text-[10px]">&#8377;35L - 50L / yr</span>
                          <span className="text-[8px] text-gray-400">2d ago</span>
                      </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 min-w-[200px] flex-shrink-0 cursor-pointer hover:border-cyan-200 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600 text-sm"><i className="fa-brands fa-microsoft"></i></div>
                          <div>
                              <h4 className="font-black text-[11px] text-gray-900 truncate">Product Designer</h4>
                              <p className="text-[9px] text-gray-500">Microsoft &middot; Hyderabad</p>
                          </div>
                      </div>
                      <div className="flex gap-1.5 mb-3">
                          <span className="bg-gray-50 text-gray-600 text-[8px] font-bold px-1.5 py-0.5 rounded">Hybrid</span>
                          <span className="bg-gray-50 text-gray-600 text-[8px] font-bold px-1.5 py-0.5 rounded">Full-Time</span>
                      </div>
                      <div className="flex items-end justify-between border-t border-gray-50 pt-2">
                          <span className="text-cyan-600 font-black text-[10px]">&#8377;25L - 40L / yr</span>
                          <span className="text-[8px] text-gray-400">5h ago</span>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </>
  );
}
