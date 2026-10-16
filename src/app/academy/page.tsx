"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import { loadRazorpay } from '@/services/razorpay';
import { assertServiceCheckoutAllowed, canUseServiceCheckout } from '@/services/checkoutPolicy';
import { useAppStore } from '@/store/useAppStore';
import AcademyOfferings from '@/components/AcademyOfferings';
export default function AcademyPage() {
  const user = useAppStore(s => s.user);
  const [courses, setCourses] = useState<any[]>([]), [enrollments, setEnrollments] = useState<any[]>([]);
  const [error, setError] = useState(''), [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false);
  const [purchases, setPurchases] = useState(process.env.NEXT_PUBLIC_DISTRIBUTION !== 'google-play');
  const refresh = async () => {
    setError('');
    try {
      const { data } = await api.get('/academy/courses'); setCourses(data);
      if (user?._id || user?.uid) { const owned = await api.get('/academy/enrollments'); setEnrollments(owned.data); }
      setLoaded(true);
    } catch { setError('Academy could not be refreshed. Please try again.'); }
  };
  useEffect(() => { setPurchases(canUseServiceCheckout('academy_enrollment')); setEnrollments([]); void refresh(); }, [user?._id, user?.uid]);
  async function enroll(course: any) {
    if (busy || !canUseServiceCheckout('academy_enrollment')) return;
    setBusy(true); setError('');
    try {
      assertServiceCheckoutAllowed('academy_enrollment');
      const Razorpay = await loadRazorpay();
      const { data } = await api.post('/finance/razorpay/order', { category: 'academy_enrollment', amount: course.price, serviceName: course.title, metadata: { courseName: course.title } });
      const checkout = new Razorpay({ key: data.keyId, order_id: data.order.id, amount: data.order.amount, currency: data.order.currency, name: 'APEX Academy',
        handler: async (payment: any) => { try { await api.post('/finance/razorpay/verify', payment); await refresh(); } catch { setError('Enrollment is not confirmed. Do not pay again; contact support for reconciliation.'); } finally { setBusy(false); } },
        modal: { ondismiss: () => setBusy(false) } });
      checkout.on('payment.failed', () => { setBusy(false); setError('Payment failed. No course access has been confirmed.'); }); checkout.open();
    } catch (e: any) { setError(e.response?.data?.error || 'Enrollment could not be started.'); setBusy(false); }
  }
  return <main className="pb-24">
    <header className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3"><Link href="/" aria-label="Home"><i className="fas fa-arrow-left" /></Link><h1 className="text-lg font-black">APEX Academy</h1><button title="Refresh academy" aria-label="Refresh academy" onClick={() => void refresh()}><i className="fas fa-rotate-right" /></button></header>
    {error && <p role="alert" className="px-4 py-3 text-xs text-red-700">{error}</p>}
    <AcademyOfferings />
    <section className="px-4 py-4"><h2 className="mb-3 text-xs font-bold uppercase text-gray-500">My Courses</h2>{loaded && !enrollments.length && <p className="text-xs text-gray-500">No course enrollments yet.</p>}{enrollments.map(item => <a key={item._id} href={item.accessUrl} target="_blank" rel="noopener noreferrer" className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-white p-3 text-sm font-bold">{item.title}<i className="fas fa-arrow-up-right-from-square" /></a>)}</section>
    {courses.length > 0 && <section className="px-4 py-4"><h2 className="mb-3 text-xs font-bold uppercase text-gray-500">Online Enrollment</h2><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{courses.map(course => <article key={course._id} className="overflow-hidden rounded-lg border border-gray-100 bg-white">{course.thumbnailUrl && <img src={course.thumbnailUrl} alt={course.title} className="aspect-video w-full object-cover" />}<div className="p-3"><h3 className="text-sm font-bold">{course.title}</h3><p className="mt-1 text-xs text-gray-500">{course.description}</p>{purchases && <button disabled={busy || !user || course.enrollmentAvailable !== true || Number(course.price) <= 0} onClick={() => void enroll(course)} className="mt-3 w-full rounded-lg bg-purple-100 px-2 py-2 text-xs font-bold text-purple-700 disabled:opacity-40">Enroll: INR {course.price}</button>}</div></article>)}</div></section>}
    <section className="px-4 py-4"><a href="https://www.youtube.com/@APEXGROUPS" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg bg-white p-3 text-sm font-bold"><img src="/apex-academy-india.png" alt="APEX Academy India" className="h-12 w-12 object-contain" />APEX Academy India <i className="fab fa-youtube text-red-600" /></a></section>
  </main>;
}
