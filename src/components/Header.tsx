"use client";

import Link from "next/link";
import Image from "next/image";

export default function Header() {
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

  const handleGlobalSearch = (query: string) => {
    query = query.toLowerCase();
    const sections = [
      { id: "quick-payments", keywords: ["pay", "bill", "recharge", "send", "money"] },
      { id: "prime-plans", keywords: ["matrimony", "prime", "plan", "marriage"] },
      { id: "real-estate-carousel", keywords: ["realty", "house", "plot", "real estate", "property"] },
      { id: "academy-courses", keywords: ["course", "academy", "learn", "education"] },
      { id: "business-modules", keywords: ["business", "store", "shop", "travel", "cab", "flight", "job", "finance"] },
      { id: "foundation", keywords: ["charity", "donate", "foundation", "help"] },
    ];

    if (query.length > 3) {
      const found = sections.find((s) => s.keywords.some((k) => query.includes(k)));
      if (found) {
        showToast("Found results for '" + query + "'. Scroll down!");
      }
    }
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
            onClick={() => showToast("Wallet Drawer Coming Soon")}
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
            onClick={() => showToast("Profile Drawer Coming Soon")}
            className="w-7 h-7 rounded-full bg-white text-violet-700 flex items-center justify-center text-[10px] font-bold shadow-sm"
            aria-label="Profile"
          >
            RS
          </button>
        </div>
      </div>

      {/* Search Bar Row (Flipkart-style) */}
      <div className="px-4 pb-2.5">
        <div className="relative flex items-center">
          <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-violet-300 text-sm"></i>
          <input
            type="text"
            id="global-search"
            onChange={(e) => handleGlobalSearch(e.target.value)}
            placeholder="Search for Products, Realty, Courses..."
            className="w-full pl-9 pr-20 py-2 bg-violet-800/50 border border-violet-600 rounded-xl text-xs focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 transition-all text-white placeholder-violet-300 shadow-inner"
          />
          <div className="absolute right-2.5 flex items-center gap-2.5 text-violet-300 text-xs">
            <i
              className="fa-solid fa-microphone hover:text-white cursor-pointer"
              onClick={() => showToast("Voice search not available")}
            ></i>
            <i
              className="fa-solid fa-camera hover:text-white cursor-pointer"
              onClick={() => showToast("Camera search not available")}
            ></i>
          </div>
        </div>
      </div>
    </div>
  );
}
