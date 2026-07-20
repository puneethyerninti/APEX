import mongoose, { Document, Schema } from 'mongoose';

export interface IStoreOrder extends Document {
  userId: mongoose.Types.ObjectId;
  items: Array<{ name: string, quantity: number, price: number }>;
  totalAmount: number;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
}

const StoreOrderSchema = new Schema<IStoreOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{ name: String, quantity: Number, price: Number }],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  },
  { timestamps: true }
);

export default mongoose.model<IStoreOrder>('StoreOrder', StoreOrderSchema);
