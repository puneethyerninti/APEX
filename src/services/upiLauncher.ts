import { Capacitor, registerPlugin } from '@capacitor/core';
import { parsePaymentPayload } from './paymentPayload';
const UpiLauncher = registerPlugin<{ open(options: { uri: string }): Promise<{ opened: boolean }> }>('UpiLauncher');
export async function openUpiApp(uri: string) {
  parsePaymentPayload(uri);
  if (Capacitor.isNativePlatform()) {
    if (Capacitor.getPlatform() !== 'android') throw new Error('Use your bank or UPI app to scan this QR.');
    if (!Capacitor.isPluginAvailable('UpiLauncher')) throw new Error('Update the APEX Android app to open UPI payments, or pay directly in your bank app.');
    const result = await UpiLauncher.open({ uri });
    if (!result.opened) throw new Error('No UPI app was opened. Your payment is not confirmed.');
  } else {
    if (!/Android/i.test(navigator.userAgent)) throw new Error('Scan the payment QR directly in your bank or UPI app on another device.');
    window.location.assign(uri);
  }
}
