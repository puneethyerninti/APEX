import Link from 'next/link';
const categories = ['clothing', 'cosmetics', 'electronics', 'watches', 'mobiles', 'gifts', 'accessories'];
export function generateStaticParams() { return categories.map(category => ({ category })); }
export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  return <main className="pb-24">
    <header className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3"><Link href="/store" aria-label="Back to store"><i className="fas fa-arrow-left" /></Link><h1 className="text-lg font-black capitalize">{category}</h1></header>
    <section className="px-4 py-6"><img src="/promotions/apex-store-open.png" alt="APEX Store" className="mx-auto max-h-64 w-full object-contain" /><h2 className="mt-4 text-base font-bold capitalize">APEX Store: {category}</h2><a href="https://www.apextradingcompanystore.co.in/" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-bold">Open Store <i className="fas fa-arrow-up-right-from-square" /></a></section>
    <nav aria-label="Store categories" className="flex flex-wrap gap-2 px-4">{categories.map(item => <Link key={item} href={'/store/' + item} aria-current={category === item ? 'page' : undefined} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs capitalize">{item}</Link>)}</nav>
  </main>;
}
