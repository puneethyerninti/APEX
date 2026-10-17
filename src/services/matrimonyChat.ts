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

export async function fetchChatWindow(fetchPage: (after?: string) => Promise<ChatMessage[]>, cursor: string | null) {
  const latest = await fetchPage();
  if (!cursor || latest.length < 200 || latest.some(message => message._id === cursor)) {
    return { messages: latest, cursor: latest.at(-1)?._id || cursor, initialWindowFull: latest.length === 200 };
  }
  let after = cursor;
  const recovered: ChatMessage[] = [];
  // Backfill a suspended conversation without skipping directly to the latest 200 messages.
  for (let page = 0; page < 5; page++) {
    const batch = await fetchPage(after);
    recovered.push(...batch);
    after = batch.at(-1)?._id || after;
    if (batch.length < 200 || batch.some(message => message._id === latest[0]._id)) {
      return { messages: [...recovered, ...latest], cursor: latest.at(-1)?._id || after, initialWindowFull: latest.length === 200 };
    }
  }
  return { messages: recovered, cursor: after, initialWindowFull: latest.length === 200 };
}

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
