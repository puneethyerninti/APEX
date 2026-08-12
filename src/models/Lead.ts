import mongoose, { Document, Schema } from 'mongoose';

export interface ILead extends Document {
  name: string;
  mobile: string;
  serviceType: string;
  status: 'new' | 'contacted' | 'converted' | 'closed';
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    serviceType: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['new', 'contacted', 'converted', 'closed'], 
      default: 'new' 
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<ILead>('Lead', LeadSchema);
