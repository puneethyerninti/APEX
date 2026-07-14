"use client";
import React from 'react';
import Link from 'next/link';

export default function JobsPage() {
  return (
    <>
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
            <i className="fa-solid fa-arrow-left"></i>
        </Link>
        <h1 className="font-black text-lg text-gray-900">APEX Jobs</h1>
      </div>

      <div className="p-4">
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg mb-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
            <i className="fa-solid fa-briefcase text-3xl text-white"></i>
          </div>
          <h2 className="text-xl font-black mb-2">Find Your Dream Job</h2>
          <p className="text-xs text-blue-100 max-w-[250px] mb-4">
            Connect with top employers and find opportunities that match your skills.
          </p>
          <div className="w-full relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input type="text" placeholder="Search for jobs..." className="w-full bg-white text-gray-900 rounded-full py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-cyan-300" />
          </div>
        </div>

        <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Recommended Jobs</h3>
        
        <div className="space-y-3">
            {[
                { title: "Frontend Developer", company: "TechCorp India", location: "Remote", type: "Full Time", salary: "₹6-8 LPA", logo: "fa-laptop-code" },
                { title: "Sales Executive", company: "GrowthX", location: "New Delhi", type: "Full Time", salary: "₹3-5 LPA", logo: "fa-chart-line" },
                { title: "Customer Support", company: "ServicePro", location: "Bangalore", type: "Work from Home", salary: "₹2-3 LPA", logo: "fa-headset" }
            ].map((job, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500">
                        <i className={`fa-solid ${job.logo}`}></i>
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-gray-900 text-sm mb-0.5">{job.title}</h4>
                        <p className="text-[10px] text-gray-500 mb-2">{job.company} • {job.location}</p>
                        <div className="flex gap-2">
                            <span className="bg-blue-50 text-blue-600 text-[8px] font-bold px-2 py-0.5 rounded">{job.type}</span>
                            <span className="bg-green-50 text-green-600 text-[8px] font-bold px-2 py-0.5 rounded">{job.salary}</span>
                        </div>
                    </div>
                    <button className="text-cyan-600 bg-cyan-50 hover:bg-cyan-100 p-2 rounded-lg transition-colors">
                        <i className="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            ))}
        </div>
      </div>
    </>
  );
}
