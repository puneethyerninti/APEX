import mongoose, { Schema, Document } from 'mongoose';

export interface IUtilityTransaction extends Document {
  userId: string;
  type: string; // e.g., 'Mobile Recharge', 'Electricity'
  amount: number;
  operator: string;
  mobileOrAccountNumber: string;
  ekoTxId?: string;
  status: 'Pending' | 'Success' | 'Failed';
  createdAt: Date;
  updatedAt: Date;
}

const UtilityTransactionSchema: Schema = new Schema({
  userId: { type: String, required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  operator: { type: String, required: true },
  mobileOrAccountNumber: { type: String, required: true },
  ekoTxId: { type: String },
  status: { type: String, enum: ['Pending', 'Success', 'Failed'], default: 'Pending' },
}, { timestamps: true });

export default mongoose.models.UtilityTransaction || mongoose.model<IUtilityTransaction>('UtilityTransaction', UtilityTransactionSchema);
