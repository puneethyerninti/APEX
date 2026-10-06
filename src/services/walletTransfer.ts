import { api } from './api';
export function pendingWalletTransfer(userId: string) {
  const raw = localStorage.getItem('apex-pending-transfer:' + userId);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { throw new Error('Saved transfer reference could not be read. Contact support before transferring again.'); }
}
export async function transferWallet(payload: { recipientPhone?: string; amount: number; note?: string; userId?: string }) {
  const storageKey = 'apex-pending-transfer:' + payload.userId;
  const fingerprint = JSON.stringify({ phone: payload.recipientPhone, amount: payload.amount, note: payload.note || '' });
  const pending = pendingWalletTransfer(String(payload.userId)) || { fingerprint, key: crypto.randomUUID(), payload };
  if (pending.fingerprint !== fingerprint) throw new Error('A previous transfer needs confirmation. Retry the same details or check transaction history before sending again.');
  localStorage.setItem(storageKey, JSON.stringify(pending));
  try {
    const response = await api.post('/finance/wallet/transfer', { ...payload, idempotencyKey: pending.key });
    if (response.data.success && response.data.transaction?._id) localStorage.removeItem(storageKey);
    return response;
  } catch (error: any) {
    if ([400, 403, 404].includes(error.response?.status)) localStorage.removeItem(storageKey);
    throw error;
  }
}
