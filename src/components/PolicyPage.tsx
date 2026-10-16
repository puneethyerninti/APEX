import Link from 'next/link';
import SupportEmailLink from '@/components/SupportEmailLink';
export default function PolicyPage({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="mx-auto max-w-3xl px-4 py-6 pb-28 text-sm leading-relaxed text-gray-700"><Link href="/" className="text-xs font-bold text-purple-700">APEX Home</Link><h1 className="my-4 text-xl font-bold text-gray-900">{title}</h1><div className="space-y-4">{children}</div><p className="mt-6 text-xs">Email support: <SupportEmailLink className="text-purple-700 underline" /></p><nav aria-label="Policies" className="mt-6 flex flex-wrap gap-4 border-t border-gray-200 pt-4 text-xs text-purple-700">{[['Privacy', '/privacy'], ['Terms', '/terms'], ['Refunds', '/refunds'], ['Safety', '/safety'], ['Support', '/support'], ['Delete Account', '/account-deletion']].map(([name, path]) => <Link key={path} href={path}>{name}</Link>)}</nav></main>;
}
