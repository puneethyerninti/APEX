import mongoose, { Document, Schema } from 'mongoose';

export interface ICharityDonation extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  cause: string;
  status: 'completed' | 'failed' | 'pending';
}

const CharityDonationSchema = new Schema<ICharityDonation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    cause: { type: String, required: true },
    status: { type: String, enum: ['completed', 'failed', 'pending'], default: 'completed' },
  },
  { timestamps: true }
);

export default mongoose.model<ICharityDonation>('CharityDonation', CharityDonationSchema);
