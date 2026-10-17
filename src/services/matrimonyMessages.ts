import Message from '../models/Message';
import { authorizeChat } from './matrimonyPolicy';
import Notification from '../models/Notification';
import User from '../models/User';
import { sendPushNotification } from '../firebaseAdmin';

export async function persistChatMessage(senderId: string, room: unknown, content: unknown, reference: unknown) {
  const receiverId = await authorizeChat(senderId, room);
  const roomId = room as string;
  const text = typeof content === 'string' ? content.trim() : '';
  if (!text || text.length > 2000) throw Object.assign(new Error('Message must contain 1-2000 characters.'), { httpStatus: 400 });
  if (typeof reference !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(reference)) throw Object.assign(new Error('Message reference required.'), { httpStatus: 400 });
  const key = { senderId, clientMessageId: reference };
  let message;
  try {
    message = await Message.findOneAndUpdate(key, { $setOnInsert: { ...key, receiverId, roomId, text, timestamp: new Date() } }, { upsert: true, returnDocument: 'after', runValidators: true });
  } catch (e: any) {
    // A concurrent retry can race on the unique index; replay the committed message.
    if (e.code !== 11000) throw e;
    message = await Message.findOne(key);
  }
  if (!message) throw new Error('Message save unavailable');
  if (message.roomId !== roomId || message.text !== text) throw Object.assign(new Error('Message reference was reused for different content.'), { httpStatus: 409 });
  return message;
}

export async function publishChatMessage(io: any, message: any) {
  const data = message.toObject();
  io?.to('user_' + message.senderId).emit('receive_message', data);
  try {
    await authorizeChat(message.receiverId, message.roomId);
    io?.to('user_' + message.receiverId).emit('receive_message', data);
  } catch { /* Conversation contents require the same access over sockets as over HTTP. */ }
  try {
    const result = await Notification.updateOne({ sourceMessage: message._id }, { $setOnInsert: {
      sourceMessage: message._id, user: message.receiverId, title: 'New matrimony message',
      message: 'You have a new matrimony message. Open Messages to view it.', type: 'info', isRead: false
    } }, { upsert: true });
    if (result.upsertedCount) {
      const notification = await Notification.findOne({ sourceMessage: message._id });
      io?.to('user_' + message.receiverId).emit('new_notification', notification);
      const receiver = await User.findById(message.receiverId);
      if (receiver?.fcmTokens?.length) void sendPushNotification(receiver.fcmTokens, 'New matrimony message', 'Open APEX Messages to view your conversation.', { notificationId: String(notification?._id) });
    }
  } catch (error: any) {
    // The message is already committed. Never invite a duplicate send because a notification is unavailable.
    if (error.code !== 11000) console.error('Matrimony notification unavailable:', error.code || error.name);
  }
}
