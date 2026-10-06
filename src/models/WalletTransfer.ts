import mongoose, { Schema } from 'mongoose';
const schema = new Schema({
  user: { type: Schema.Types.ObjectId, required: true },
  key: { type: String, required: true },
  recipientPhone: { type: String, required: true },
  amount: { type: Number, required: true },
  note: String,
  result: Schema.Types.Mixed
}, { timestamps: true });
schema.index({ user: 1, key: 1 }, { unique: true });
export default mongoose.model('WalletTransfer', schema);
