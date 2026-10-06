import mongoose, { Schema } from 'mongoose';

// Unique per-account reservations prevent parallel booking/acceptance races.
export default mongoose.model('RideSlot', new Schema({
  _id: { type: String, required: true },
  rideId: { type: Schema.Types.ObjectId, required: true }
}));
