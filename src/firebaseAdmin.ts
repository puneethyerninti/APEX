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
        let pk = serviceAccount.private_key;
        pk = pk.replace(/\\n/g, '\n'); // Handle literal \n
        pk = pk.replace(/"/g, ''); // Remove stray quotes
        pk = pk.replace(/\r/g, ''); // Remove carriage returns

        // OpenSSL 3.0 STRICTLY rejects spaces in the PEM body. 
        // We extract the body, remove all spaces, and reconstruct it.
        let body = pk.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '');
        body = body.replace(/ /g, ''); // Remove all spaces
        // Re-wrap to 64 characters per line just to be perfectly compliant
        body = body.replace(/\n/g, ''); 
        const match = body.match(/.{1,64}/g);
        if (match) {
            body = match.join('\n');
        }
        
        serviceAccount.private_key = `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`;
      }
      try {
        initializeApp({
          credential: cert(serviceAccount)
        });
        console.log('🔥 Firebase Admin initialized successfully from Base64 env variable');
      } catch (err) {
        console.error('Failed to init Firebase with Base64 key. Key starts with:', serviceAccount.private_key.substring(0, 35));
        console.error('Key ends with:', serviceAccount.private_key.substring(serviceAccount.private_key.length - 35));
        throw err;
      }
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
