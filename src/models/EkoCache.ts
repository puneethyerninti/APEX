import mongoose, { Document, Schema } from 'mongoose';

export interface IEkoCache extends Document {
  key: string;
  data: any;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EkoCacheSchema = new Schema<IEkoCache>(
  {
    key: { type: String, required: true, unique: true, index: true },
    data: { type: Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

EkoCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.EkoCache || mongoose.model<IEkoCache>('EkoCache', EkoCacheSchema);
