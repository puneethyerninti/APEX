import Link from 'next/link';
import StorePromotions from '@/components/StorePromotions';
const categories = ['clothing', 'cosmetics', 'electronics', 'watches', 'mobiles', 'gifts', 'accessories'];
export default function StorePage() {
  return <main className="pb-24">
    <header className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3"><Link href="/" aria-label="Home"><i className="fas fa-arrow-left" /></Link><h1 className="text-lg font-black">APEX Store</h1></header>
    <section className="px-4 py-5"><img src="/promotions/apex-store-open.png" alt="APEX Store" className="mx-auto max-h-64 w-full object-contain" /><a href="https://www.apextradingcompanystore.co.in/" target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-bold text-gray-900">Visit APEX Store <i className="fas fa-arrow-up-right-from-square" /></a></section>
    <section className="px-4 py-3"><h2 className="mb-3 text-xs font-bold uppercase text-gray-500">Categories</h2><div className="grid grid-cols-3 gap-3 sm:grid-cols-4">{categories.map(category => <Link key={category} href={'/store/' + category} className="rounded-lg border border-gray-100 bg-white p-3 text-center text-xs font-bold capitalize">{category}</Link>)}</div></section>
    <StorePromotions />
  </main>;
}
