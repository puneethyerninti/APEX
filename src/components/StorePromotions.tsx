"use client";
import { useEffect, useRef, useState } from 'react';

export const storePromotions = [
  { src: '/promotions/apex-store-open.png', alt: 'APEX Store - We are open' },
  { src: '/promotions/apex-store-team-india.png', alt: 'APEX Store celebrates Team India champions' },
  { src: '/promotions/apex-store-sale.png', alt: 'APEX Store sale - 20% off' },
];

export default function StorePromotions() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStart = useRef<number | null>(null);
  const move = (direction: number) => setCurrent(value => (value + direction + storePromotions.length) % storePromotions.length);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (paused || focused || hovered || reducedMotion) return;
    const timer = setInterval(() => {
      if (!document.hidden) setCurrent(value => (value + 1) % storePromotions.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [paused, focused, hovered, reducedMotion]);

  const control = 'flex h-10 w-10 items-center justify-center rounded-full bg-gray-900/80 text-white hover:bg-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
  return <section aria-roledescription="carousel" aria-label="APEX Store advertisements" className="mx-auto max-w-7xl px-3 py-3"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
    <div className="relative h-64 overflow-hidden rounded-lg border border-gray-100 bg-white md:h-80"
      onTouchStart={event => { touchStart.current = event.touches[0].clientX; }}
      onTouchCancel={() => { touchStart.current = null; }}
      onTouchEnd={event => {
        if (touchStart.current !== null) {
          const distance = event.changedTouches[0].clientX - touchStart.current;
          if (Math.abs(distance) > 50) move(distance < 0 ? 1 : -1);
        }
        touchStart.current = null;
      }}>
      {storePromotions.map((poster, index) => <div key={poster.src} role="group" aria-roledescription="slide"
        aria-label={`${index + 1} of ${storePromotions.length}`} aria-hidden={current !== index}
        className={`absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none ${current === index ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <img src={poster.src} alt={poster.alt} width={720} height={968} loading={index === 0 ? 'eager' : 'lazy'} style={{ objectFit: 'contain' }} className="h-full w-full object-contain" />
      </div>)}
      <button type="button" aria-label="Previous advertisement" title="Previous advertisement" className={control + ' absolute left-2 top-1/2 -translate-y-1/2'} onClick={() => move(-1)}><i aria-hidden="true" className="fa-solid fa-chevron-left" /></button>
      <button type="button" aria-label="Next advertisement" title="Next advertisement" className={control + ' absolute right-2 top-1/2 -translate-y-1/2'} onClick={() => move(1)}><i aria-hidden="true" className="fa-solid fa-chevron-right" /></button>
    </div>
    <div className="mt-1 flex h-10 items-center justify-center gap-1">
      {storePromotions.map((poster, index) => <button key={poster.src} type="button" aria-label={`Show advertisement ${index + 1}`} aria-pressed={current === index}
        className="flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-apex-purple" onClick={() => setCurrent(index)}>
        <span className={`h-2 w-2 rounded-full ${current === index ? 'bg-apex-purple' : 'bg-gray-300'}`} />
      </button>)}
      <button type="button" aria-label={paused || reducedMotion ? 'Play slideshow' : 'Pause slideshow'} title={paused || reducedMotion ? 'Play slideshow' : 'Pause slideshow'}
        className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-apex-purple"
        onClick={() => { setPaused(!paused && !reducedMotion); setReducedMotion(false); }}>
        <i aria-hidden="true" className={paused || reducedMotion ? 'fa-solid fa-play' : 'fa-solid fa-pause'} />
      </button>
    </div>
  </section>;
}
