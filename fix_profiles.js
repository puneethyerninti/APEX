const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected for profile fix...'))
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

const fixProfiles = async () => {
  try {
    console.log('Finding dummy users...');
    const dummyUsers = await User.find({ email: { $in: ['priya@example.com', 'rahul@example.com'] } });
    const dummyUserIds = dummyUsers.map(u => u._id);
    
    if (dummyUserIds.length > 0) {
      console.log('Deleting dummy matrimony profiles...');
      await MatrimonyProfile.deleteMany({ user: { $in: dummyUserIds } });
      console.log('Dummy matrimony profiles deleted.');
    }

    console.log('Finding user 6303210224...');
    let puneeth = await User.findOne({ phone: '+916303210224' });
    if (!puneeth) {
        // Try without country code just in case
        puneeth = await User.findOne({ phone: '6303210224' });
    }

    if (puneeth) {
        // Make sure name is correct
        puneeth.name = 'Puneeth Yerninti';
        await puneeth.save();

        console.log('User found! Checking for existing matrimony profile...');
        const existingProfile = await MatrimonyProfile.findOne({ user: puneeth._id });
        if (!existingProfile) {
            console.log('Creating matrimony profile for Puneeth...');
            await MatrimonyProfile.create({
              user: puneeth._id,
              age: 26,
              height: "5'10\"",
              religion: "Hindu",
              profession: "Software Engineer",
              location: "Bangalore",
              bio: "Software Engineer passionate about building scalable solutions.",
              images: ["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80"],
              status: "approved"
            });
            console.log('Profile created successfully!');
        } else {
            console.log('Profile already exists, updating it...');
            existingProfile.profession = 'Software Engineer';
            existingProfile.status = 'approved';
            await existingProfile.save();
            console.log('Profile updated successfully!');
        }
    } else {
        console.log('User +916303210224 not found in database! Creating...');
        const newUser = await User.create({
            name: 'Puneeth Yerninti',
            email: 'puneeth@apex.local',
            phone: '+916303210224',
            walletBalance: 10000
        });

        await MatrimonyProfile.create({
            user: newUser._id,
            age: 26,
            height: "5'10\"",
            religion: "Hindu",
            profession: "Software Engineer",
            location: "Bangalore",
            bio: "Software Engineer passionate about building scalable solutions.",
            images: ["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80"],
            status: "approved"
        });
        console.log('User and Profile created successfully!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error fixing DB:', error);
    process.exit(1);
  }
};

fixProfiles();
