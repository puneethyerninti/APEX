const admin = require('firebase-admin');
import path from 'path';
import fs from 'fs';

const serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json');

export const initFirebaseAdmin = () => {
  try {
    // @ts-ignore
    if (admin.apps.length > 0) return;

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        // @ts-ignore
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('🔥 Firebase Admin initialized successfully from JSON file');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('ascii')
      );
      admin.initializeApp({
        // @ts-ignore
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('🔥 Firebase Admin initialized successfully from Base64 env variable');
    } else {
      console.warn('⚠️ FIREBASE ADMIN NOT INITIALIZED: Missing service account JSON or environment variable.');
    }
  } catch (error) {
    console.error('🔥 Error initializing Firebase Admin:', error);
  }
};

export const sendPushNotification = async (tokens: string[], title: string, body: string, data?: any) => {
  // @ts-ignore
  if (admin.apps.length === 0) {
    console.warn('⚠️ Push notification skipped: Firebase Admin not initialized.');
    return;
  }

  if (!tokens || tokens.length === 0) return;

  try {
    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      tokens: tokens
    };

    // @ts-ignore
    const response = await admin.messaging().sendMulticast(message);
    console.log(`📡 Push notification sent. Success: ${response.successCount}, Failed: ${response.failureCount}`);
  } catch (error) {
    console.error('📡 Error sending push notification:', error);
  }
};
