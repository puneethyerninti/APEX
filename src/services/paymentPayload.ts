export interface PaymentPayee { pa: string; pn: string; am?: string; tn?: string; cu?: string; raw: string; isApex?: boolean; }
export const validVpa = (value: string) => /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/.test(value);
export const validAmount = (value: string) => /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0 && Number(value) <= 100000;
export function parsePaymentPayload(raw: string): PaymentPayee {
  const uri = new URL(raw.trim());
  if (uri.hostname.toLowerCase() !== 'pay') throw new Error('Not a payment QR.');
  if (uri.protocol.toLowerCase() === 'apex:') {
    const phone = uri.searchParams.get('phone') || '';
    if (!/^[6-9]\d{9}$/.test(phone)) throw new Error('Invalid APEX recipient.');
    return { pa: phone, pn: uri.searchParams.get('name') || 'APEX user', isApex: true, raw };
  }
  if (uri.protocol.toLowerCase() !== 'upi:') throw new Error('Scan an APEX or UPI payment QR.');
  const pa = uri.searchParams.get('pa') || '';
  const cu = uri.searchParams.get('cu') || 'INR';
  const am = uri.searchParams.get('am') || '';
  if (!validVpa(pa) || cu !== 'INR' || (am && !validAmount(am))) throw new Error('Invalid UPI payee, currency or amount.');
  if (uri.searchParams.has('sign')) throw new Error('Signed UPI QR must be scanned directly in your bank or UPI app.');
  return { pa, pn: uri.searchParams.get('pn') || pa, am, cu, tn: uri.searchParams.get('tn') || '', raw };
}
export function makeUpiIntent(payee: PaymentPayee, amount: string, note: string): string {
  if (payee.isApex || !validVpa(payee.pa) || !validAmount(amount)) throw new Error('Valid UPI recipient and amount required.');
  const uri = new URL('upi://pay');
  for (const [key, value] of Object.entries({ pa: payee.pa, pn: payee.pn, am: Number(amount).toFixed(2), cu: 'INR', tn: note.slice(0, 100) })) uri.searchParams.set(key, value);
  const original = new URL(payee.raw);
  for (const key of ['tr', 'mc']) { const value = original.searchParams.get(key); if (value) uri.searchParams.set(key, value); }
  return uri.toString();
}
