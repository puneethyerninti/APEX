"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = exports.initFirebaseAdmin = void 0;
const app_1 = require("firebase-admin/app");
const messaging_1 = require("firebase-admin/messaging");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const serviceAccountPath = path_1.default.resolve(__dirname, '../../firebase-service-account.json');
const initFirebaseAdmin = () => {
    try {
        if ((0, app_1.getApps)().length > 0)
            return;
        if (fs_1.default.existsSync(serviceAccountPath)) {
            process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
            (0, app_1.initializeApp)();
            console.log('🔥 Firebase Admin initialized successfully from JSON file');
        }
        else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
            const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
            const serviceAccount = JSON.parse(decoded);
            if (serviceAccount.private_key) {
                // Fix any escaped newlines just in case
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }
            // Bypass firebase-admin's cert() strictness by using the native Google Auth Library
            // which is usually much more robust across different Node/OpenSSL versions.
            const tempFilePath = path_1.default.join(os_1.default.tmpdir(), 'firebase-service-account.json');
            fs_1.default.writeFileSync(tempFilePath, JSON.stringify(serviceAccount, null, 2));
            process.env.GOOGLE_APPLICATION_CREDENTIALS = tempFilePath;
            try {
                (0, app_1.initializeApp)();
                console.log('🔥 Firebase Admin initialized successfully from Base64 env variable');
            }
            catch (err) {
                console.error('Failed to init Firebase with Base64 key. Key starts with:', serviceAccount.private_key ? serviceAccount.private_key.substring(0, 35) : 'Missing');
                throw err;
            }
        }
        else {
            console.warn('⚠️ FIREBASE ADMIN NOT INITIALIZED: Missing service account JSON or environment variable.');
        }
    }
    catch (error) {
        console.error('🔥 Error initializing Firebase Admin:', error);
    }
};
exports.initFirebaseAdmin = initFirebaseAdmin;
const sendPushNotification = async (tokens, title, body, data) => {
    if ((0, app_1.getApps)().length === 0) {
        console.warn('⚠️ Push notification skipped: Firebase Admin not initialized.');
        return;
    }
    if (!tokens || tokens.length === 0)
        return;
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
        const response = await (0, messaging_1.getMessaging)().sendEachForMulticast(message);
        console.log(`📡 Push notification sent. Success: ${response.successCount}, Failed: ${response.failureCount}`);
    }
    catch (error) {
        console.error('📡 Error sending push notification:', error);
    }
};
exports.sendPushNotification = sendPushNotification;
