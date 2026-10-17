import mongoose, { Schema } from 'mongoose';

const MatrimonyPhotoSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  data: { type: Buffer, required: true, select: false },
  contentType: { type: String, enum: ['image/jpeg'], default: 'image/jpeg', required: true },
}, { timestamps: true });

export default mongoose.model('MatrimonyPhoto', MatrimonyPhotoSchema);
