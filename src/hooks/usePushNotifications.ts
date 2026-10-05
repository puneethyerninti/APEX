import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { auth } from '@/firebase.config';
import { api } from '@/services/api';

export const usePushNotifications = (isAuthenticated: boolean) => {
  useEffect(() => {
    if (!isAuthenticated) return;

    const registerPush = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser?.phoneNumber) return;

        if (Capacitor.isNativePlatform()) {
          // --- ANDROID PUSH NOTIFICATIONS ---
          let permStatus = await PushNotifications.checkPermissions();

          if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
          }

          if (permStatus.receive !== 'granted') {
            console.warn('User denied push notification permissions');
            return;
          }

          await PushNotifications.register();

          PushNotifications.addListener('registration', async (token) => {
            console.log('Android FCM Token:', token.value);
            // Save to backend
            await api.post('/user/fcm-token', {
              phone: currentUser.phoneNumber,
              token: token.value
            });
          });

          PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push received: ', notification);
          });

          PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('Push action performed: ', notification);
          });

        } else {
          // --- WEB PUSH NOTIFICATIONS ---
          // Skipping Web Push FCM registration to prevent 401 credential errors in console
          // since the primary target is Android Native Push.
        }
      } catch (error: any) {
        if (error?.message?.includes('authentication credential')) {
          console.warn('Web Push Notifications skipped: FCM authentication credential missing or invalid.');
        } else {
          console.warn('Could not register push notifications:', error);
        }
      }
    };

    registerPush();
  }, [isAuthenticated]);
};
