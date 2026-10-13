import mongoose, { Schema } from 'mongoose';
const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  blocked: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
schema.index({ user: 1, blocked: 1 }, { unique: true });
export default mongoose.model('UserBlock', schema);
