const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected for test profile insertion...'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  passwordHash: String,
  walletBalance: { type: Number, default: 0 }
}, { timestamps: true });

const matrimonyProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  age: Number,
  height: String,
  religion: String,
  profession: String,
  location: String,
  bio: String,
  images: [String],
  status: { type: String, default: 'pending' },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const MatrimonyProfile = mongoose.models.MatrimonyProfile || mongoose.model('MatrimonyProfile', matrimonyProfileSchema);

const insertTestProfile = async () => {
  try {
    console.log('Finding or creating test user Priya Sharma...');
    let priya = await User.findOne({ email: 'priyatest@apex.local' });
    
    if (!priya) {
        priya = await User.create({
            name: 'Priya Sharma',
            email: 'priyatest@apex.local',
            phone: '+919876543210',
            walletBalance: 5000
        });
    }

    const existingProfile = await MatrimonyProfile.findOne({ user: priya._id });
    if (!existingProfile) {
        console.log('Creating matrimony profile for Priya...');
        await MatrimonyProfile.create({
          user: priya._id,
          age: 25,
          height: "5'5\"",
          religion: "Hindu",
          profession: "Marketing Executive",
          location: "Bangalore",
          bio: "Looking for a kind-hearted and understanding partner.",
          images: ["https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80"],
          status: "approved"
        });
        console.log('Test Profile created successfully!');
    } else {
        console.log('Profile already exists.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error inserting test profile:', error);
    process.exit(1);
  }
};

insertTestProfile();
