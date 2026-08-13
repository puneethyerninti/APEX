import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import path from 'path';
import fs from 'fs';

const serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json');

export const initFirebaseAdmin = () => {
  try {
    if (getApps().length > 0) return;

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('🔥 Firebase Admin initialized successfully from JSON file');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
      );
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      initializeApp({
        credential: cert(serviceAccount)
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
  if (getApps().length === 0) {
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

    const response = await getMessaging().sendEachForMulticast(message);
    console.log(`📡 Push notification sent. Success: ${response.successCount}, Failed: ${response.failureCount}`);
  } catch (error) {
    console.error('📡 Error sending push notification:', error);
  }
};
