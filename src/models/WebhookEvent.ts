import mongoose, { Document, Schema } from 'mongoose';

export interface IWebhookEvent extends Document {
  provider: 'razorpay';
  eventId: string;
  event: string;
  processedAt: Date;
  payload?: any;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    provider: { type: String, enum: ['razorpay'], required: true },
    eventId: { type: String, required: true },
    event: { type: String, required: true },
    processedAt: { type: Date, default: Date.now },
    payload: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

WebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

export default mongoose.models.WebhookEvent || mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);
