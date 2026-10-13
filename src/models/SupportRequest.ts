import mongoose, { Schema } from 'mongoose';
const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  kind: { type: String, enum: ['account_deletion', 'content_report', 'support'], required: true },
  targetUser: { type: Schema.Types.ObjectId, ref: 'User' },
  reason: { type: String, required: true, maxlength: 2000 },
  status: { type: String, enum: ['open', 'in_review', 'resolved'], default: 'open' },
  resolution: { type: String, maxlength: 2000 },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
schema.index({ user: 1, kind: 1, status: 1 });
export default mongoose.model('SupportRequest', schema);
