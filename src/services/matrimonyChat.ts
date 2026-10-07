export interface ChatMessage {
  _id: string;
  roomId: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}
export interface PendingMessage { key: string; text: string; room: string }

export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[], room: string) {
  const byId = new Map<string, ChatMessage>();
  for (const message of [...current, ...incoming]) {
    if (message.roomId !== room) continue;
    const previous = byId.get(message._id);
    byId.set(message._id, { ...message, isRead: !!(previous?.isRead || message.isRead) });
  }
  return [...byId.values()].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime() || a._id.localeCompare(b._id));
}

export function readPending(storage: Pick<Storage, 'getItem' | 'removeItem'>, key: string, room: string): PendingMessage | null {
  try {
    const value = JSON.parse(storage.getItem(key) || 'null');
    if (value && value.room === room && /^[a-zA-Z0-9-]{16,80}$/.test(value.key) && typeof value.text === 'string' && value.text.trim() && value.text.length <= 2000) return value;
    if (value) storage.removeItem(key);
  } catch { /* Browser storage can be unavailable or contain an interrupted write. */ }
  return null;
}
