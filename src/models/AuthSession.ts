import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  tokenId: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('AuthSession', schema);
