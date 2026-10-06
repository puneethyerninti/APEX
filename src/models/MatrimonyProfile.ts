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
  community?: string;
  ownerVerified?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  subscription: {
    plan: 'Free' | 'Silver' | 'Gold' | 'Premium' | 'Diamond';
    isActive: boolean;
    expiresAt?: Date;
    paymentTransactionId?: mongoose.Types.ObjectId;
  };
}

const MatrimonyProfileSchema = new Schema<IMatrimonyProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ownerVerified: { type: Boolean, default: true },
    community: String,
    age: { type: Number, required: true },
    height: { type: String },
    religion: { type: String },
    profession: { type: String },
    location: { type: String },
    bio: { type: String },
    images: [{ type: String }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    subscription: {
      plan: { type: String, enum: ['Free', 'Silver', 'Gold', 'Premium', 'Diamond'], default: 'Free' },
      isActive: { type: Boolean, default: false },
      expiresAt: Date,
      paymentTransactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' }
    }
  },
  { timestamps: true }
);
MatrimonyProfileSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { ownerVerified: true } });

export default mongoose.model<IMatrimonyProfile>('MatrimonyProfile', MatrimonyProfileSchema);
