import mongoose, { Document, Schema } from 'mongoose';

export interface IMatrimonyProfile extends Document {
  user: mongoose.Types.ObjectId;
  age: number;
  height: string;
  religion: string;
  profession: string;
  location: string;
  bio: string;
  images: string[];
  status: 'pending' | 'approved' | 'rejected';
}

const MatrimonyProfileSchema = new Schema<IMatrimonyProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    age: { type: Number, required: true },
    height: { type: String },
    religion: { type: String },
    profession: { type: String },
    location: { type: String },
    bio: { type: String },
    images: [{ type: String }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

export default mongoose.model<IMatrimonyProfile>('MatrimonyProfile', MatrimonyProfileSchema);
