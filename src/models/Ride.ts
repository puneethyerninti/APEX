import mongoose, { Document, Schema } from 'mongoose';

export interface IRide extends Document {
  userId: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  pickup: {
    address: string;
    lat: number;
    lng: number;
  };
  dropoff: {
    address: string;
    lat: number;
    lng: number;
  };
  fare: number;
  distance: number; // in meters
  duration: number; // in seconds
  status: 'searching' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  path?: any; // To store Mapbox route geometry if needed
  createdAt: Date;
  updatedAt: Date;
}

const RideSchema = new Schema<IRide>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'User' },
    pickup: {
      address: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    dropoff: {
      address: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    fare: { type: Number, required: true },
    distance: { type: Number, required: true },
    duration: { type: Number, required: true },
    status: {
      type: String,
      enum: ['searching', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled'],
      default: 'searching'
    },
    path: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

export default mongoose.model<IRide>('Ride', RideSchema);
