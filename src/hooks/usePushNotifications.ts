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
            // NOTE: Replace with your actual VAPID key from Firebase Console
            const currentToken = await getToken(messaging, {
              vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY || 'REPLACE_WITH_VAPID_KEY'
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
      } catch (error) {
        console.error('Error registering push notifications:', error);
      }
    };

    registerPush();
  }, [isAuthenticated]);
};
