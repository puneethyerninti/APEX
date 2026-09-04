import mongoose, { Schema, Document } from 'mongoose';

export type UtilityTransactionStatus =
  | 'created'
  | 'details_validated'
  | 'bill_fetched'
  | 'payment_pending'
  | 'payment_success'
  | 'fulfillment_pending'
  | 'eko_processing'
  | 'eko_success'
  | 'eko_failed'
  | 'refund_pending'
  | 'refunded'
  | 'manual_review'
  | 'Pending'
  | 'Success'
  | 'Failed';

export interface IUtilityTransaction extends Document {
  userId: string;
  type: string; // e.g., 'Mobile Recharge', 'Bill Payment'
  amount: number;
  operator: string;
  mobileOrAccountNumber: string;
  ekoTxId?: string;
  bbpsTxnRefId?: string;
  clientRefId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  planDescription?: string;
  status: UtilityTransactionStatus;
  failureReason?: string;
  refundStatus?: string;
  requestPayload?: any;
  ekoFetchResponse?: any;
  ekoPayResponse?: any;
  statusHistory?: Array<{ status: UtilityTransactionStatus; message?: string; at: Date }>;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const statusValues = [
  'created',
  'details_validated',
  'bill_fetched',
  'payment_pending',
  'payment_success',
  'fulfillment_pending',
  'eko_processing',
  'eko_success',
  'eko_failed',
  'refund_pending',
  'refunded',
  'manual_review',
  // Legacy statuses kept so old documents still hydrate safely.
  'Pending',
  'Success',
  'Failed'
];

const UtilityTransactionSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  operator: { type: String, required: true },
  mobileOrAccountNumber: { type: String, required: true },
  ekoTxId: { type: String, index: true, sparse: true },
  bbpsTxnRefId: { type: String, index: true, sparse: true },
  clientRefId: { type: String, index: true, sparse: true },
  razorpayOrderId: { type: String, index: true, sparse: true },
  razorpayPaymentId: { type: String, index: true, sparse: true },
  planDescription: { type: String },
  status: { type: String, enum: statusValues, default: 'created', index: true },
  failureReason: { type: String },
  refundStatus: { type: String },
  requestPayload: { type: Schema.Types.Mixed },
  ekoFetchResponse: { type: Schema.Types.Mixed },
  ekoPayResponse: { type: Schema.Types.Mixed },
  statusHistory: [{
    status: { type: String, enum: statusValues, required: true },
    message: { type: String },
    at: { type: Date, default: Date.now }
  }],
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

UtilityTransactionSchema.index({ clientRefId: 1 }, { unique: true, sparse: true });
UtilityTransactionSchema.index({ razorpayOrderId: 1 }, { sparse: true });
UtilityTransactionSchema.index({ status: 1, updatedAt: 1 });

export default mongoose.models.UtilityTransaction || mongoose.model<IUtilityTransaction>('UtilityTransaction', UtilityTransactionSchema);
