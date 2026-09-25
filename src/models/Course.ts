import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  category: string;
  price: number;
  description: string;
  thumbnailUrl: string;
  instructor: string;
  status: 'active' | 'inactive';
}

const CourseSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String },
    thumbnailUrl: { type: String },
    instructor: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.model<ICourse>('Course', CourseSchema);
