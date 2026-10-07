"use client";
import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { api } from '@/services/api';
import { ChatMessage, PendingMessage, mergeMessages, readPending } from '@/services/matrimonyChat';

export default function MatrimonyChat({ uid, profile, socket, onClose }: { uid: string; profile: any; socket?: Socket | null; onClose: () => void }) {
  const other = String(profile.user?._id || profile.user);
  const room = 'match_' + [uid, other].sort().join('_');
  const storageKey = `apex_pending_message:${uid}:${room}`;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [pending, setPending] = useState<PendingMessage | null>(null);
  const pendingRef = useRef<PendingMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const alive = useRef(false);
  const list = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const sendingRef = useRef(false);

  useEffect(() => {
    alive.current = true;
    try {
      const item = readPending(sessionStorage, storageKey, room);
      pendingRef.current = item; setPending(item); setText(item?.text || '');
    } catch { /* Session storage is optional; in-memory retries still work. */ }
    return () => { alive.current = false; };
  }, [storageKey, room]);

  useEffect(() => {
    let active = true, running = false, queued = false, first = true;
    const sync = async () => {
      if (!active || document.hidden) return;
      if (running) { queued = true; return; }
      running = true;
      do {
        queued = false;
        try {
          const { data } = await api.get<ChatMessage[]>('/matrimony/messages/' + room);
          if (!active) break;
          setMessages(old => mergeMessages(old, data, room)); setLoaded(true);
          if (first) { setHasOlder(data.length === 200); first = false; }
          const ids = data.filter(m => m.receiverId === uid && !m.isRead).map(m => m._id);
          if (ids.length && !document.hidden) {
            await api.put('/matrimony/messages/' + room + '/read', { messageIds: ids });
            if (active) setMessages(old => old.map(m => ids.includes(m._id) ? { ...m, isRead: true } : m));
          }
        } catch (e: any) { if (active) setError(e.response?.data?.error || 'Could not refresh messages.'); }
      } while (active && queued);
      running = false;
    };
    const event = (data: { roomId: string }) => { if (data.roomId === room) void sync(); };
    const read = (data: { roomId: string; readerId: string; messageIds?: string[] }) => {
      if (data.roomId !== room) return;
      if (data.readerId === other && Array.isArray(data.messageIds)) setMessages(old => old.map(m => m.senderId === uid && data.messageIds!.includes(m._id) ? { ...m, isRead: true } : m));
      void sync();
    };
    const reconnect = () => void sync();
    void sync();
    socket?.on('receive_message', event); socket?.on('messages_read', read); socket?.on('connect', reconnect);
    document.addEventListener('visibilitychange', reconnect);
    const timer = setInterval(reconnect, 5000);
    return () => {
      active = false; clearInterval(timer); document.removeEventListener('visibilitychange', reconnect);
      socket?.off('receive_message', event); socket?.off('messages_read', read); socket?.off('connect', reconnect);
    };
  }, [room, uid, other, socket]);

  useEffect(() => {
    if (follow.current && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages]);

  async function older() {
    if (loadingOlder || !messages.length) return;
    setLoadingOlder(true); setError(''); follow.current = false;
    const height = list.current?.scrollHeight || 0;
    try {
      const { data } = await api.get<ChatMessage[]>('/matrimony/messages/' + room, { params: { before: messages[0]._id } });
      if (!alive.current) return;
      setMessages(old => mergeMessages(old, data, room)); setHasOlder(data.length === 200);
      requestAnimationFrame(() => { if (list.current) list.current.scrollTop += list.current.scrollHeight - height; });
      const ids = data.filter(m => m.receiverId === uid && !m.isRead).map(m => m._id);
      if (ids.length && !document.hidden) await api.put('/matrimony/messages/' + room + '/read', { messageIds: ids });
    } catch (e: any) { if (alive.current) setError(e.response?.data?.error || 'Could not load older messages.'); }
    finally { if (alive.current) setLoadingOlder(false); }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault(); if (!text.trim() || sendingRef.current) return;
    const item = pendingRef.current || { key: crypto.randomUUID(), text: text.trim(), room };
    pendingRef.current = item; setPending(item);
    try { sessionStorage.setItem(storageKey, JSON.stringify(item)); } catch { /* Keep the same reference in memory. */ }
    sendingRef.current = true; setSending(true); setError('');
    try {
      const { data } = await api.post<ChatMessage>('/matrimony/messages/' + room, { text: item.text, clientMessageId: item.key });
      try { sessionStorage.removeItem(storageKey); } catch { /* Optional storage. */ }
      if (!alive.current) return;
      follow.current = true; setMessages(old => mergeMessages(old, [data], room));
      pendingRef.current = null; setPending(null); setText('');
    } catch (e: any) {
      if (alive.current) setError(e.response?.data?.error || 'Message not confirmed. Retry to check the same message safely.');
    } finally { sendingRef.current = false; if (alive.current) setSending(false); }
  }

  return <div role="dialog" aria-label="Conversation" aria-modal="true" className="fixed inset-0 z-50 flex flex-col bg-[#F4F6FB]">
    <header className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
      <div className="min-w-0"><h2 className="truncate text-sm font-bold">{profile.user?.name || 'APEX Member'}</h2><p className="text-[11px] text-gray-500">{profile.location}</p></div>
      <button disabled={sending} onClick={onClose} aria-label="Close chat" title="Close chat" className="h-10 w-10 shrink-0 rounded-full text-gray-500 disabled:opacity-40"><i className="fas fa-times" /></button>
    </header>
    {error && <p role="alert" className="mx-auto w-full max-w-xl px-4 py-2 text-xs text-red-700">{error}</p>}
    {pending && !sending && <p role="status" className="mx-auto w-full max-w-xl px-4 py-2 text-xs text-amber-800">Unconfirmed message saved. Retry before sending another.</p>}
    <div ref={list} onScroll={() => { if (list.current) follow.current = list.current.scrollHeight - list.current.scrollTop - list.current.clientHeight < 80; }} className="mx-auto w-full max-w-xl flex-1 overflow-y-auto p-4">
      {hasOlder && <button onClick={() => void older()} disabled={loadingOlder} className="mb-4 block w-full text-xs font-semibold text-rose-600">{loadingOlder ? 'Loading...' : 'Earlier messages'}</button>}
      {loaded && !messages.length && <p className="py-8 text-center text-xs text-gray-500">No messages yet.</p>}
      {messages.map(m => <div key={m._id} className={'mb-2 w-fit max-w-[85%] rounded-lg px-3 py-2 ' + (m.senderId === uid ? 'ml-auto bg-rose-100' : 'bg-white')}>
        <p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{m.text}</p><p className="mt-1 text-[10px] text-gray-500">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{m.senderId === uid && <span className="ml-2">{m.isRead ? 'Read' : 'Sent'}</span>}</p>
      </div>)}
    </div>
    <form onSubmit={send} className="shrink-0 border-t border-gray-100 bg-white p-3 pb-[max(12px,env(safe-area-inset-bottom))]"><div className="mx-auto flex max-w-xl gap-2">
      <input autoFocus aria-label="Message" placeholder="Message" className="h-11 min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:ring-2 focus:ring-rose-200" maxLength={2000} value={text} disabled={sending || !!pending} onChange={e => setText(e.target.value)} />
      <button disabled={sending || !text.trim()} aria-label={sending ? 'Sending message' : pending ? 'Retry message' : 'Send message'} title={pending ? 'Retry message' : 'Send message'} className="h-11 w-11 shrink-0 rounded-lg bg-rose-600 text-white disabled:opacity-40"><i className={'fas ' + (sending ? 'fa-spinner fa-spin' : pending ? 'fa-rotate-right' : 'fa-paper-plane')} /></button>
    </div></form>
  </div>;
}
