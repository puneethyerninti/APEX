const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected for seeding...'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define schemas dynamically for the seed script
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

const seedDB = async () => {
  try {
    // Clear existing
    await User.deleteMany({});
    await MatrimonyProfile.deleteMany({});
    
    // Create Users
    const user1 = await User.create({
      name: 'Priya Sharma',
      email: 'priya@example.com',
      phone: '9876543210',
      passwordHash: 'hashedpassword',
      walletBalance: 15000
    });

    const user2 = await User.create({
      name: 'Rahul Verma',
      email: 'rahul@example.com',
      phone: '9876543211',
      passwordHash: 'hashedpassword',
      walletBalance: 5000
    });

    const user3 = await User.create({
      name: 'Sneha Patel',
      email: 'sneha@example.com',
      phone: '9876543212',
      passwordHash: 'hashedpassword',
      walletBalance: 25000
    });

    // Create Matrimony Profiles
    await MatrimonyProfile.create({
      user: user1._id,
      age: 26,
      height: "5'5\"",
      religion: "Hindu",
      profession: "Software Engineer",
      location: "Bangalore",
      bio: "Looking for a caring partner.",
      images: ["https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80"],
      status: "approved"
    });

    await MatrimonyProfile.create({
      user: user2._id,
      age: 29,
      height: "5'11\"",
      religion: "Hindu",
      profession: "Business Analyst",
      location: "Mumbai",
      bio: "Loves traveling and reading.",
      images: ["https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80"],
      status: "approved"
    });
    
    await MatrimonyProfile.create({
      user: user3._id,
      age: 27,
      height: "5'6\"",
      religion: "Hindu",
      profession: "Doctor",
      location: "Delhi",
      bio: "Dedicated professional, family-oriented.",
      images: ["https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80"],
      status: "pending"
    });

    console.log('Database successfully seeded with users and matrimony profiles!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding DB:', error);
    process.exit(1);
  }
};

seedDB();
