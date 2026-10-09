import Link from 'next/link';
import { APEX_TV_CHANNEL_URL } from '@/config/apexPay';

export default function ApexTv() {
  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-20 text-gray-900">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" aria-label="Back to home" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-600">
            <i aria-hidden="true" className="fa-solid fa-arrow-left" />
          </Link>
          <h1 className="text-lg font-black">APEX TV</h1>
          <i aria-hidden="true" className="fa-solid fa-tv ml-auto text-apex-purple" />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-5 py-8">
        <section className="flex flex-col items-center text-center">
          <a href={APEX_TV_CHANNEL_URL} target="_blank" rel="noopener noreferrer" aria-label="Visit APEX TV on YouTube" className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-600">
            <img src="/APEX logo.jpeg" alt="APEX" width={128} height={128} className="h-32 w-32 rounded-lg object-contain" />
          </a>
          <h2 className="mt-5 text-xl font-black">@Apexstore007</h2>
          <p className="mt-2 text-sm text-gray-500">APEX updates &amp; advertisements</p>
          <a href={APEX_TV_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-600">
            <i aria-hidden="true" className="fa-brands fa-youtube text-lg" />
            <span>Watch on YouTube</span>
            <i aria-hidden="true" className="fa-solid fa-arrow-up-right-from-square text-xs" />
          </a>
        </section>
      </main>
    </div>
  );
}
