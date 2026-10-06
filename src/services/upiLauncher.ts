import { Capacitor, registerPlugin } from '@capacitor/core';
const UpiLauncher = registerPlugin<{ open(options: { uri: string }): Promise<{ opened: boolean }> }>('UpiLauncher');
export async function openUpiApp(uri: string) {
  if (Capacitor.isNativePlatform()) {
    if (Capacitor.getPlatform() !== 'android') throw new Error('Use your bank or UPI app to scan this QR.');
    await UpiLauncher.open({ uri });
  } else {
    if (!/Android|iPhone|iPad/i.test(navigator.userAgent)) throw new Error('Open this payment on your phone in a UPI app.');
    window.location.assign(uri);
  }
}
