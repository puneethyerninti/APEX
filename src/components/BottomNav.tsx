"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 h-14 flex justify-around items-center z-[45] px-2 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:hidden">
      <Link
        href="/"
        className={`flex flex-col items-center gap-0.5 font-bold text-[9px] transition-colors ${
          pathname === "/" ? "text-apex-purple font-black" : "text-gray-400 hover:text-apex-purple"
        }`}
      >
        <i className="fa-solid fa-house-chimney text-base"></i>
        <span>Home</span>
      </Link>
      <Link
        href="/finance"
        className={`flex flex-col items-center gap-0.5 font-bold text-[9px] transition-colors ${
          pathname === "/finance" ? "text-apex-purple font-black" : "text-gray-400 hover:text-apex-purple"
        }`}
      >
        <i className="fa-solid fa-chart-line text-base"></i>
        <span>Invest</span>
      </Link>
      <Link
        href="/payment"
        className={`flex flex-col items-center gap-0.5 font-bold text-[9px] transition-colors ${
          pathname === "/payment" ? "text-apex-purple font-black" : "text-gray-400 hover:text-apex-purple"
        }`}
      >
        <i className="fa-solid fa-indian-rupee-sign text-base"></i>
        <span>Payments</span>
      </Link>
      <Link
        href="/matrimony"
        className={`flex flex-col items-center gap-0.5 font-bold text-[9px] transition-colors ${
          pathname === "/matrimony" ? "text-apex-purple font-black" : "text-gray-400 hover:text-apex-purple"
        }`}
      >
        <i className="fa-solid fa-heart text-base"></i>
        <span>Matches</span>
      </Link>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: 'account' }))}
        className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-apex-purple font-bold text-[9px] transition-colors border-none bg-none outline-none"
      >
        <i className="fa-solid fa-user-gear text-base"></i>
        <span>Account</span>
      </button>
    </div>
  );
}
