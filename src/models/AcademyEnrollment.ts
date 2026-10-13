import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  transaction: { type: Schema.Types.ObjectId, ref: 'Transaction', required: true, unique: true },
  title: { type: String, required: true },
  accessUrl: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('AcademyEnrollment', schema);
