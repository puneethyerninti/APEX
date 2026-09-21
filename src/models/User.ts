import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  phone?: string;
  role: 'user' | 'admin' | 'driver';
  walletBalance: number;
  profilePicture?: string;
  fcmTokens?: string[];
  apexPlan: 'Free' | 'APEX Plus' | 'APEX Prime';
  portfolioInvested: number;
  portfolioReturns: number;
  isOnline?: boolean;
  vehicleDetails?: {
    make: string;
    model: string;
    plate: string;
    color: string;
  };
  currentLocation?: {
    lat: number;
    lng: number;
    heading?: number;
    updatedAt?: Date;
  };
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String },
    name: { type: String, required: true },
    phone: { type: String },
    role: { type: String, enum: ['user', 'admin', 'driver'], default: 'user' },
    walletBalance: { type: Number, default: 0 },
    profilePicture: { type: String },
    fcmTokens: [{ type: String }],
    apexPlan: { type: String, enum: ['Free', 'APEX Plus', 'APEX Prime'], default: 'Free' },
    portfolioInvested: { type: Number, default: 0 },
    portfolioReturns: { type: Number, default: 0 },
    // Driver fields
    isOnline: { type: Boolean, default: false },
    vehicleDetails: {
      make: String,
      model: String,
      plate: String,
      color: String
    },
    currentLocation: {
      lat: Number,
      lng: Number,
      heading: Number,
      updatedAt: Date
    }
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
