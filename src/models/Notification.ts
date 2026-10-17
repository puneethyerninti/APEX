import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  sourceMessage?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
    isRead: { type: Boolean, default: false },
    sourceMessage: { type: Schema.Types.ObjectId, ref: 'Message' }
  },
  { timestamps: true }
);

NotificationSchema.index({ sourceMessage: 1 }, { unique: true, partialFilterExpression: { sourceMessage: { $type: 'objectId' } } });
export default mongoose.model<INotification>('Notification', NotificationSchema);
