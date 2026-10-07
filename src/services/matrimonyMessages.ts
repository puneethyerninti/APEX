import Message from '../models/Message';
import { authorizeChat } from './matrimonyPolicy';

export async function persistChatMessage(senderId: string, room: unknown, content: unknown, reference: unknown) {
  const receiverId = await authorizeChat(senderId, room);
  const roomId = room as string;
  const text = typeof content === 'string' ? content.trim() : '';
  if (!text || text.length > 2000) throw Object.assign(new Error('Message must contain 1-2000 characters.'), { httpStatus: 400 });
  if (typeof reference !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(reference)) throw Object.assign(new Error('Message reference required.'), { httpStatus: 400 });
  const key = { senderId, clientMessageId: reference };
  let message;
  try {
    message = await Message.findOneAndUpdate(key, { $setOnInsert: { ...key, receiverId, roomId, text, timestamp: new Date() } }, { upsert: true, new: true, runValidators: true });
  } catch (e: any) {
    // A concurrent retry can race on the unique index; replay the committed message.
    if (e.code !== 11000) throw e;
    message = await Message.findOne(key);
  }
  if (!message) throw new Error('Message save unavailable');
  if (message.roomId !== roomId || message.text !== text) throw Object.assign(new Error('Message reference was reused for different content.'), { httpStatus: 409 });
  return message;
}

export function publishChatMessage(io: any, message: any) {
  const data = message.toObject();
  io?.to('user_' + message.senderId).emit('receive_message', data);
  io?.to('user_' + message.receiverId).emit('receive_message', data);
}
