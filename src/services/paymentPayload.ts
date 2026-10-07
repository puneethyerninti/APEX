export interface PaymentPayee { pa: string; pn: string; am?: string; tn?: string; cu?: string; raw: string; isApex?: boolean; }
export const validVpa = (value: string) => /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/.test(value);
export const validAmount = (value: string) => /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0 && Number(value) <= 100000;
export function parsePaymentPayload(raw: string): PaymentPayee {
  const uri = new URL(raw.trim());
  if (uri.protocol.toLowerCase() === 'apex:') {
    throw new Error('This is an old APEX wallet QR. Ask the recipient for their bank UPI QR or UPI ID.');
  }
  if (uri.protocol.toLowerCase() !== 'upi:') throw new Error('Scan a bank UPI payment QR.');
  if (uri.hostname.toLowerCase() !== 'pay' || uri.username || uri.password || uri.port || uri.hash || !['', '/'].includes(uri.pathname)) throw new Error('Not a payment QR.');
  for (const key of uri.searchParams.keys()) if (uri.searchParams.getAll(key).length !== 1) throw new Error('Ambiguous payment QR. Scan directly in your bank app.');
  const pa = uri.searchParams.get('pa') || '';
  const cu = uri.searchParams.get('cu') || 'INR';
  const am = uri.searchParams.get('am') || '';
  if (!validVpa(pa) || cu !== 'INR' || (am && !validAmount(am))) throw new Error('Invalid UPI payee, currency or amount.');
  const minimum = uri.searchParams.get('mam');
  if (minimum && (!validAmount(minimum) || (am && Number(am) < Number(minimum)))) throw new Error('Invalid minimum payment amount.');
  if (uri.searchParams.has('sign')) throw new Error('Signed UPI QR must be scanned directly in your bank or UPI app.');
  return { pa, pn: uri.searchParams.get('pn') || pa, am, cu, tn: uri.searchParams.get('tn') || '', raw };
}
export function makeUpiIntent(payee: PaymentPayee, amount: string, note: string): string {
  if (payee.isApex || !validVpa(payee.pa) || !validAmount(amount)) throw new Error('Valid UPI recipient and amount required.');
  const original = parsePaymentPayload(payee.raw);
  if (original.pa !== payee.pa || (original.am && Number(original.am) !== Number(amount))) throw new Error('Recipient or fixed QR amount changed. Scan the QR again.');
  const uri = new URL(original.raw);
  if (uri.searchParams.get('mam') && Number(amount) < Number(uri.searchParams.get('mam'))) throw new Error('Amount is below the QR minimum.');
  // Keep merchant routing and reference fields intact rather than rebuilding a QR.
  uri.searchParams.set('am', Number(amount).toFixed(2));
  uri.searchParams.set('cu', 'INR');
  uri.searchParams.set('tn', note.slice(0, 100));
  return uri.toString();
}

export function makeReceiveQr(vpa: string): string {
  if (!validVpa(vpa.trim())) throw new Error('Enter your bank-issued UPI ID.');
  const uri = new URL('upi://pay');
  uri.searchParams.set('pa', vpa.trim());
  uri.searchParams.set('cu', 'INR');
  return uri.toString();
}
