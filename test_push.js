const mongoose = require('mongoose');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

// 1. Initialize Firebase
const serviceAccountPath = path.resolve(__dirname, './firebase-service-account.json');
try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error.message);
  process.exit(1);
}

// 2. Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/apex')
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    // Load User Model
    const userSchema = new mongoose.Schema({ phone: String, fcmTokens: [String] }, { strict: false });
    const User = mongoose.model('User', userSchema);

    // Find a user who has an FCM token
    const user = await User.findOne({ fcmTokens: { $exists: true, $not: { $size: 0 } } });

    if (!user) {
      console.log('⚠️ No users found with an FCM token. Please log into the app first and accept notification permissions!');
      process.exit(0);
    }

    console.log(`📱 Found user with phone: ${user.phone}. Sending test notification...`);

    // 3. Send Push Notification
    const message = {
      notification: {
        title: "Test Notification! 🎉",
        body: "If you are reading this, your push notification system is working perfectly!"
      },
      tokens: user.fcmTokens
    };

    try {
      const response = await admin.messaging().sendMulticast(message);
      console.log(`✅ Push notification sent successfully!`);
      console.log(`Success count: ${response.successCount}`);
      console.log(`Failure count: ${response.failureCount}`);
      
      if (response.failureCount > 0) {
        console.log('Errors:', response.responses.map(r => r.error));
      }
    } catch (err) {
      console.error('❌ Error sending message:', err);
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });
