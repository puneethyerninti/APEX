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
          const messaging = getMessaging();
          const permission = await Notification.requestPermission();
          
          if (permission === 'granted') {
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
            if (!vapidKey || vapidKey === 'REPLACE_WITH_VAPID_KEY') {
              console.warn('Web Push Notifications skipped: NEXT_PUBLIC_VAPID_KEY is not configured in environment variables.');
              return;
            }

            const currentToken = await getToken(messaging, {
              vapidKey: vapidKey
            });

            if (currentToken) {
              console.log('Web FCM Token:', currentToken);
              await api.post('/user/fcm-token', {
                phone: currentUser.phoneNumber,
                token: currentToken
              });
            } else {
              console.warn('No registration token available. Request permission to generate one.');
            }

            onMessage(messaging, (payload) => {
              console.log('Message received. ', payload);
              // Handle foreground web notification here
            });
          }
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
