import mongoose, { Document, Schema } from 'mongoose';

export interface IRealEstate extends Document {
  title: string;
  price: number;
  location: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'sold';
  ownerId: mongoose.Types.ObjectId;
}

const RealEstateSchema = new Schema<IRealEstate>(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
    location: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'sold'], default: 'pending' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

export default mongoose.model<IRealEstate>('RealEstate', RealEstateSchema);
