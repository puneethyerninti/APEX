import mongoose, { Document, Schema } from 'mongoose';

export interface IMutualFund extends Document {
  id: string; // The original MF_001 string identifier
  name: string;
  category: string;
  nav: number;
  oneYearReturn: number;
  threeYearReturn: number;
  minSipAmount: number;
  riskLevel: string;
  fundHouse: string;
  createdAt: Date;
  updatedAt: Date;
}

const MutualFundSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  nav: { type: Number, required: true },
  oneYearReturn: { type: Number, required: true },
  threeYearReturn: { type: Number, required: true },
  minSipAmount: { type: Number, required: true },
  riskLevel: { type: String, required: true },
  fundHouse: { type: String, required: true }
}, {
  timestamps: true
});

export default mongoose.model<IMutualFund>('MutualFund', MutualFundSchema);
