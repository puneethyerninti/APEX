import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import type { PluginListenerHandle } from '@capacitor/core';
import { auth } from '@/firebase.config';
import { api } from '@/services/api';

let registeredPushToken: string | null = null;
export const getRegisteredPushToken = () => registeredPushToken;
export const clearRegisteredPushToken = () => { registeredPushToken = null; };
export const unregisterDevicePush = async () => {
  if (Capacitor.isNativePlatform()) await PushNotifications.unregister();
};

export const usePushNotifications = (isAuthenticated: boolean) => {
  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    const listeners: PluginListenerHandle[] = [];

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

          if (!active || auth.currentUser?.uid !== currentUser.uid) return;
          const listener = await PushNotifications.addListener('registration', token => {
            if (!active || auth.currentUser?.uid !== currentUser.uid) return;
            registeredPushToken = token.value;
            void api.post('/user/fcm-token', { token: token.value }).catch(() => {
              if (active) console.warn('Could not register device notifications.');
            });
          });
          if (!active) { await listener.remove(); return; }
          listeners.push(listener);
          await PushNotifications.register();

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
    return () => { active = false; for (const listener of listeners) void listener.remove(); };
  }, [isAuthenticated]);
};
