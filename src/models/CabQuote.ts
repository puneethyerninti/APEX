import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  pickup: { type: Schema.Types.Mixed, required: true },
  dropoff: { type: Schema.Types.Mixed, required: true },
  fares: { mini: Number, xl: Number },
  distance: Number,
  duration: Number,
  path: Schema.Types.Mixed,
  expiresAt: { type: Date, required: true, expires: 0 }
}, { timestamps: true });

export default mongoose.model('CabQuote', schema);
