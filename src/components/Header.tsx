"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

const SEARCH_CATALOG = [
  { title: "Full-Stack Web Development", category: "Academy", icon: "fa-code", href: "/academy" },
  { title: "Data Science & AI/ML", category: "Academy", icon: "fa-database", href: "/academy" },
  { title: "Mobile App Development", category: "Academy", icon: "fa-app-store-ios", href: "/academy" },
  { title: "Digital Marketing", category: "Academy", icon: "fa-bullhorn", href: "/academy" },
  { title: "Premium Villas & Apartments", category: "Realty", icon: "fa-building", href: "/realty" },
  { title: "Commercial Plots", category: "Realty", icon: "fa-map-location-dot", href: "/realty" },
  { title: "Utility Bill Payments", category: "Services", icon: "fa-bolt", href: "/utility" },
  { title: "Mobile & DTH Recharge", category: "Services", icon: "fa-mobile-screen", href: "/utility" },
  { title: "Flight & Cab Booking", category: "Travel", icon: "fa-plane", href: "/travel" },
  { title: "Matrimony Prime Plans", category: "Matrimony", icon: "fa-heart", href: "/matrimony" },
  { title: "Charity Foundation", category: "Foundation", icon: "fa-hand-holding-heart", href: "/charity" },
  { title: "Job Portal", category: "Jobs", icon: "fa-briefcase", href: "/jobs" },
  { title: "Store & Groceries", category: "Shop", icon: "fa-store", href: "/store" },
  { title: "Quick Payments & Send Money", category: "Finance", icon: "fa-indian-rupee-sign", href: "/utility" },
];

export default function Header() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(SEARCH_CATALOG);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.toLowerCase();
    const results = SEARCH_CATALOG.filter(
      item => item.title.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)
    );
    setSearchResults(results);
  }, [searchQuery]);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectResult = (href: string) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    router.push(href);
  };

  const showToast = (message: string) => {
    const toast = document.createElement("div");
    toast.className =
      "fixed top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg z-[100] transform transition-all duration-300 opacity-0 translate-y-[-20px]";
    toast.innerHTML = `<i class="fa-solid fa-circle-info mr-2 text-apex-purple"></i>${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove("opacity-0", "translate-y-[-20px]");
      toast.classList.add("opacity-100", "translate-y-0");
    }, 10);

    setTimeout(() => {
      toast.classList.remove("opacity-100", "translate-y-0");
      toast.classList.add("opacity-0", "translate-y-[-20px]");
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  };

  return (
    <div className="sticky top-0 z-50 bg-violet-700 border-b border-violet-800 shadow-sm" id="navbar">
      {/* Top Row */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <Image
            src="/APEX logo.jpeg"
            alt="APEX"
            width={32}
            height={32}
            className="h-8 w-8 object-contain rounded-lg shadow-sm border border-violet-400"
          />
          <div>
            <span className="font-black text-sm tracking-wider text-white uppercase block leading-none">
              APEX
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3.5">
          <a
            href="https://wa.me/919494273763"
            className="text-green-300 hover:scale-110 transition-transform text-lg"
            aria-label="WhatsApp"
          >
            <i className="fa-brands fa-whatsapp"></i>
          </a>

          {/* Wallet Button */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: 'payment' }))}
            className="text-violet-100 hover:text-white transition-colors text-lg relative"
            aria-label="Wallet"
          >
            <i className="fa-solid fa-wallet"></i>
          </button>

          <Link
            href="/store"
            className="text-violet-100 hover:text-white transition-colors text-lg relative"
            aria-label="Cart"
          >
            <i className="fa-solid fa-shopping-bag"></i>
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              3
            </span>
          </Link>

          {/* Profile Button */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: 'account' }))}
            className="w-7 h-7 rounded-full bg-white text-violet-700 flex items-center justify-center text-[10px] font-bold shadow-sm"
            aria-label="Profile"
          >
            RS
          </button>
        </div>
      </div>

      {/* Search Bar Row */}
      <div className="px-4 pb-2.5">
        <div className="relative flex items-center" ref={searchRef}>
          <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-violet-300 text-sm"></i>
          <input
            type="text"
            id="global-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Search for Products, Realty, Courses..."
            className="w-full pl-9 pr-20 py-2 bg-violet-800/50 border border-violet-600 rounded-xl text-xs focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 transition-all text-white placeholder-violet-300 shadow-inner"
          />
          <div className="absolute right-2.5 flex items-center gap-2.5 text-violet-300 text-xs bg-transparent">
            <i
              className="fa-solid fa-microphone hover:text-white cursor-pointer"
              onClick={() => showToast("Voice search activated")}
            ></i>
            <i
              className="fa-solid fa-camera hover:text-white cursor-pointer"
              onClick={() => showToast("Camera search activated")}
            ></i>
          </div>

          {/* Intelligent Search Dropdown */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[60] max-h-64 overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
              {searchResults.length > 0 ? (
                searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectResult(item.href)}
                    className="w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-violet-50 flex items-center gap-3 transition-colors last:border-0 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                      <i className={`fa-solid ${item.icon}`}></i>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900 leading-tight mb-0.5">{item.title}</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{item.category}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center">
                  <i className="fa-solid fa-ghost text-3xl text-gray-300 mb-2"></i>
                  <p className="text-xs font-bold text-gray-500">No results found for &quot;{searchQuery}&quot;</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
