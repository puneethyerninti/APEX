"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistChatMessage = persistChatMessage;
exports.publishChatMessage = publishChatMessage;
const Message_1 = __importDefault(require("../models/Message"));
const matrimonyPolicy_1 = require("./matrimonyPolicy");
async function persistChatMessage(senderId, room, content, reference) {
    const receiverId = await (0, matrimonyPolicy_1.authorizeChat)(senderId, room);
    const roomId = room;
    const text = typeof content === 'string' ? content.trim() : '';
    if (!text || text.length > 2000)
        throw Object.assign(new Error('Message must contain 1-2000 characters.'), { httpStatus: 400 });
    if (typeof reference !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(reference))
        throw Object.assign(new Error('Message reference required.'), { httpStatus: 400 });
    const key = { senderId, clientMessageId: reference };
    let message;
    try {
        message = await Message_1.default.findOneAndUpdate(key, { $setOnInsert: { ...key, receiverId, roomId, text, timestamp: new Date() } }, { upsert: true, new: true, runValidators: true });
    }
    catch (e) {
        // A concurrent retry can race on the unique index; replay the committed message.
        if (e.code !== 11000)
            throw e;
        message = await Message_1.default.findOne(key);
    }
    if (!message)
        throw new Error('Message save unavailable');
    if (message.roomId !== roomId || message.text !== text)
        throw Object.assign(new Error('Message reference was reused for different content.'), { httpStatus: 409 });
    return message;
}
function publishChatMessage(io, message) {
    const data = message.toObject();
    io?.to('user_' + message.senderId).emit('receive_message', data);
    io?.to('user_' + message.receiverId).emit('receive_message', data);
}
