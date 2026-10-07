"use client";
import { useEffect, useState } from 'react';

export default function PaymentQr({ value, label }: { value: string; label: string }) {
  const [result, setResult] = useState({ value: '', url: '', error: false });
  useEffect(() => {
    let alive = true;
    if (!value) return;
    void import('qrcode').then(module => module.default.toDataURL(value, {
      width: 288, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#111827', light: '#ffffff' }
    })).then(url => { if (alive) setResult({ value, url, error: false }); })
      .catch(() => { if (alive) setResult({ value, url: '', error: true }); });
    return () => { alive = false; };
  }, [value]);
  const current = result.value === value;
  return <div className="mx-auto aspect-square w-60 max-w-full bg-white">
    {current && result.url ? <img src={result.url} alt={label} className="h-full w-full object-contain" /> :
      <div role="status" className="flex h-full items-center justify-center text-center text-sm text-gray-500">{current && result.error ? 'QR unavailable. Please reopen the payment.' : 'Preparing QR'}</div>}
  </div>;
}
