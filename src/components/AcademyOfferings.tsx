"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import SupportEmailLink from '@/components/SupportEmailLink';
import { academyOfferings } from '@/config/academyOfferings';
import styles from './AcademyOfferings.module.css';

export default function AcademyOfferings() {
  const rail = useRef<HTMLUListElement>(null);
  const section = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visible, setVisible] = useState(false);

  const select = useCallback((index: number, smooth = false) => {
    const list = rail.current;
    if (!list) return;
    const next = (index + academyOfferings.length) % academyOfferings.length;
    const first = list.children[0] as HTMLElement;
    const target = list.children[next] as HTMLElement;
    list.scrollTo({ left: target.offsetLeft - first.offsetLeft, behavior: smooth && !reducedMotion ? 'smooth' : 'instant' });
    setActive(next);
  }, [reducedMotion]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!section.current) return;
    if (!('IntersectionObserver' in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (paused || hovered || focused || reducedMotion || !visible) return;
    const timer = setInterval(() => {
      if (!document.hidden) select(active + 1, active < academyOfferings.length - 1);
    }, 5000);
    return () => clearInterval(timer);
  }, [active, paused, hovered, focused, reducedMotion, visible, select]);

  const control = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600';
  return <section ref={section} aria-labelledby="academy-offerings" aria-roledescription="carousel" className="py-4"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
    <div className="flex items-center justify-between gap-3 px-4">
      <div className="min-w-0">
        <h2 id="academy-offerings" className="text-sm font-bold text-gray-900">Courses Offered</h2>
        <p className="mt-1 text-xs font-medium text-purple-700">Online &amp; Offline</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button type="button" aria-label="Previous course" title="Previous course" aria-controls="academy-course-rail" className={control} onClick={() => select(active - 1)}><i aria-hidden="true" className="fas fa-chevron-left" /></button>
        <button type="button" aria-label="Next course" title="Next course" aria-controls="academy-course-rail" className={control} onClick={() => select(active + 1)}><i aria-hidden="true" className="fas fa-chevron-right" /></button>
      </div>
    </div>
    <ul id="academy-course-rail" ref={rail} tabIndex={0} aria-label="Academy courses" className={styles.rail}
      onPointerDown={() => setPaused(true)}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === 'Home' || event.key === 'End') {
          event.preventDefault(); setPaused(true);
          select(event.key === 'Home' ? 0 : event.key === 'End' ? academyOfferings.length - 1 : active + (event.key === 'ArrowRight' ? 1 : -1));
        }
      }}
      onScroll={() => {
        const list = rail.current;
        if (!list) return;
        const first = list.children[0] as HTMLElement;
        const second = list.children[1] as HTMLElement;
        const stride = second.offsetLeft - first.offsetLeft;
        if (stride > 0) setActive(Math.max(0, Math.min(academyOfferings.length - 1, Math.round(list.scrollLeft / stride))));
      }}>
      {academyOfferings.map((course, index) => <li key={course.id} className={styles.card}>
        <article className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
          <img src={course.image} alt={course.alt} width={640} height={400} loading={index < 2 ? 'eager' : 'lazy'} className="aspect-[8/5] w-full object-cover" />
          <div className="flex flex-1 flex-col p-3">
            <p className="text-[10px] font-semibold text-purple-700">{course.category}</p>
            <h3 className="mt-1 min-h-10 text-sm font-bold leading-5 text-gray-900">{course.title}</h3>
            <p className="mt-1 min-h-9 text-xs leading-[18px] text-gray-500">{course.description}</p>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-gray-100 pt-3">
              <span className="text-xl font-extrabold leading-6 text-gray-900">&#8377;{course.fee.toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-gray-500">Full course</span>
            </div>
            <SupportEmailLink subject={`APEX Academy enquiry: ${course.title}`} className="mt-3 flex min-h-10 items-center justify-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600">
              <i aria-hidden="true" className="fas fa-envelope" />Enquire Now<span className="sr-only"> about {course.title}</span>
            </SupportEmailLink>
          </div>
        </article>
      </li>)}
    </ul>
    <div className="flex items-center justify-between gap-3 px-4">
      <p className="max-w-64 text-[10px] leading-4 text-gray-500">Introductory fees. Confirm batch details with the academy.</p>
      <div className="flex shrink-0 items-center gap-2">
        <span className="w-7 text-right text-[10px] tabular-nums text-gray-500">{active + 1} / {academyOfferings.length}</span>
        <button type="button" aria-label={reducedMotion ? 'Auto-scroll disabled for reduced motion' : paused ? 'Play course auto-scroll' : 'Pause course auto-scroll'} title={reducedMotion ? 'Auto-scroll disabled for reduced motion' : paused ? 'Play course auto-scroll' : 'Pause course auto-scroll'} disabled={reducedMotion} className={control + ' disabled:opacity-40'} onClick={() => setPaused(value => !value)}>
          <i aria-hidden="true" className={paused || reducedMotion ? 'fas fa-play' : 'fas fa-pause'} />
        </button>
      </div>
    </div>
  </section>;
}
