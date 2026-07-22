import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  user: mongoose.Types.ObjectId;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  status: 'pending' | 'completed' | 'failed';
  referenceId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  webhookPayload?: any;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    category: { type: String, required: true }, // e.g. 'recharge', 'add_money', 'cab_ride'
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed', index: true },
    referenceId: { type: String },
    razorpayOrderId: { type: String, index: true, sparse: true },
    razorpayPaymentId: { type: String, index: true, sparse: true },
    razorpaySignature: { type: String },
    webhookPayload: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
