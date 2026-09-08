import mongoose, { Document, Schema } from 'mongoose';

export interface IProperty extends Document {
  user: mongoose.Types.ObjectId;
  listingType: 'sell' | 'rent';
  propertyType: 'apartment' | 'villa' | 'plot' | 'commercial';
  title: string;
  price: number;
  description: string;
  phone: string;
  location?: {
    type: string;
    coordinates: number[];
  };
  status: 'pending' | 'active' | 'sold' | 'rented' | 'inactive';
}

const PropertySchema = new Schema<IProperty>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    listingType: { type: String, enum: ['sell', 'rent'], required: true },
    propertyType: { type: String, enum: ['apartment', 'villa', 'plot', 'commercial'], required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    phone: { type: String, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: false } // [longitude, latitude]
    },
    status: { type: String, enum: ['pending', 'active', 'sold', 'rented', 'inactive'], default: 'pending' }
  },
  { timestamps: true }
);

// GEOSPATIAL INDEX
PropertySchema.index({ location: '2dsphere' });

export default mongoose.model<IProperty>('Property', PropertySchema);
