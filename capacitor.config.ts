import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.apex.app',
  appName: 'Apex App',
  webDir: 'out',
  server: {
    hostname: 'rivan-123.web.app',
    androidScheme: 'https'
  }
};

export default config;
