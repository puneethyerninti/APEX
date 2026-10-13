import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.apex.app',
  appName: 'APEX',
  webDir: 'out',
  includePlugins: process.env.NEXT_PUBLIC_NATIVE_PUSH_ENABLED === 'true'
    ? ['@capacitor/geolocation', '@capacitor/push-notifications']
    : ['@capacitor/geolocation'],
  server: {
    hostname: 'www.apextc.shop',
    androidScheme: 'https'
  }
};

export default config;
