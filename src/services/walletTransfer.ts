import { api } from './api';
interface TransferPayload { recipientPhone?: string; amount: number; note?: string; userId?: string; }
interface PendingTransfer { fingerprint: string; key: string; payload: TransferPayload; }
export function pendingWalletTransfer(userId: string) {
  const raw = localStorage.getItem('apex-pending-transfer:' + userId);
  if (!raw) return null;
  try {
    const item = JSON.parse(raw) as PendingTransfer;
    if (!item || !/^[a-zA-Z0-9-]{16,80}$/.test(item.key) || item.payload?.userId !== userId || typeof item.fingerprint !== 'string') throw new Error();
    return item;
  } catch { throw new Error('Saved transfer reference could not be read. Contact support with your APEX history.'); }
}
export async function transferWallet(payload: TransferPayload) {
  const storageKey = 'apex-pending-transfer:' + payload.userId;
  const fingerprint = JSON.stringify({ phone: payload.recipientPhone, amount: payload.amount, note: payload.note || '' });
  const pending = pendingWalletTransfer(String(payload.userId));
  if (!pending) throw new Error('New wallet transfers are paused. Pay directly in your UPI app.');
  if (pending.fingerprint !== fingerprint) throw new Error('A previous transfer needs confirmation. Retry the same details or check transaction history before sending again.');
  try {
    const response = await api.post('/finance/wallet/transfer', { ...payload, idempotencyKey: pending.key });
    if (response.data.success && response.data.transaction?._id) localStorage.removeItem(storageKey);
    return response;
  } catch (error: any) {
    throw error;
  }
}
