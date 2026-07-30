import mongoose from 'mongoose';

const travelBookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driverName: {
    type: String,
    default: 'Unassigned'
  },
  type: {
    type: String,
    enum: ['Cab', 'Bus', 'Train', 'Flight'],
    required: true
  },
  vehicleType: {
    type: String
  },
  origin: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['searching', 'en_route', 'completed', 'cancelled'],
    default: 'searching'
  }
}, {
  timestamps: true
});

export default mongoose.model('TravelBooking', travelBookingSchema);
