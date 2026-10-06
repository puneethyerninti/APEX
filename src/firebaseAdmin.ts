import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import path from 'path';
import fs from 'fs';
import { parseFirebaseCredentials } from './services/firebaseCredentials';

const serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json');

export const initFirebaseAdmin = () => {
  try {
    if (getApps().length > 0) return;

    const environmentKey = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const file = process.env.GOOGLE_APPLICATION_CREDENTIALS || serviceAccountPath;
    if (environmentKey || fs.existsSync(file)) {
      const account = parseFirebaseCredentials(environmentKey || fs.readFileSync(file, 'utf8'), process.env.FIREBASE_PROJECT_ID);
      initializeApp({ credential: cert(account), projectId: account.projectId });
      console.log('Firebase Admin initialized successfully for project ' + account.projectId);
    } else {
      console.warn('⚠️ FIREBASE ADMIN NOT INITIALIZED: Missing service account JSON or environment variable.');
    }
  } catch (error: any) {
    console.error('Firebase Admin configuration failed:', error.code || 'FIREBASE_CREDENTIAL_INVALID');
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
