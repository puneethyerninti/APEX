import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  senderId: string;
  receiverId: string;
  roomId: string;
  text: string;
  timestamp: Date;
  isRead: boolean;
  clientMessageId?: string;
}

const MessageSchema = new Schema<IMessage>(
  {
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    roomId: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false },
    clientMessageId: String,
  },
  { timestamps: true }
);
MessageSchema.index({ senderId: 1, clientMessageId: 1 }, { unique: true, partialFilterExpression: { clientMessageId: { $type: 'string' } } });
MessageSchema.index({ roomId: 1, timestamp: -1, _id: -1 });
MessageSchema.index({ receiverId: 1, isRead: 1, timestamp: -1 });
MessageSchema.index({ senderId: 1, timestamp: -1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
