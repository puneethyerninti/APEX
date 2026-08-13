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
const serviceAccountPath = path_1.default.resolve(__dirname, '../../firebase-service-account.json');
const initFirebaseAdmin = () => {
    try {
        if ((0, app_1.getApps)().length > 0)
            return;
        if (fs_1.default.existsSync(serviceAccountPath)) {
            const serviceAccount = require(serviceAccountPath);
            (0, app_1.initializeApp)({
                credential: (0, app_1.cert)(serviceAccount)
            });
            console.log('🔥 Firebase Admin initialized successfully from JSON file');
        }
        else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
            const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('ascii'));
            (0, app_1.initializeApp)({
                credential: (0, app_1.cert)(serviceAccount)
            });
            console.log('🔥 Firebase Admin initialized successfully from Base64 env variable');
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
