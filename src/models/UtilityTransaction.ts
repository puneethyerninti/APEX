import mongoose, { Schema, Document } from 'mongoose';

export interface IUtilityTransaction extends Document {
  userId: string;
  type: string; // e.g., 'Mobile Recharge', 'Bill Payment'
  amount: number;
  operator: string;
  mobileOrAccountNumber: string;
  ekoTxId?: string;
  clientRefId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  planDescription?: string;
  status: 'Pending' | 'Success' | 'Failed';
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const UtilityTransactionSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  operator: { type: String, required: true },
  mobileOrAccountNumber: { type: String, required: true },
  ekoTxId: { type: String, index: true, sparse: true },
  clientRefId: { type: String, index: true, sparse: true },
  razorpayOrderId: { type: String, index: true, sparse: true },
  razorpayPaymentId: { type: String, index: true, sparse: true },
  planDescription: { type: String },
  status: { type: String, enum: ['Pending', 'Success', 'Failed'], default: 'Pending', index: true },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

export default mongoose.models.UtilityTransaction || mongoose.model<IUtilityTransaction>('UtilityTransaction', UtilityTransactionSchema);
