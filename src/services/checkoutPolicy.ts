import { Capacitor } from '@capacitor/core';

export const digitalCheckoutCategories = ['matrimony', 'subscription', 'academy_enrollment'];
export const digitalCheckoutUnavailable = 'Membership and digital-course purchases are unavailable in this Android version.';

export function usesNativeBilling(): boolean {
  return process.env.NEXT_PUBLIC_DISTRIBUTION === 'google-play' || Capacitor.isNativePlatform();
}

export function canUseServiceCheckout(category: string): boolean {
  return !digitalCheckoutCategories.includes(category) || !usesNativeBilling();
}

export function assertServiceCheckoutAllowed(category: string): void {
  if (!canUseServiceCheckout(category)) throw new Error(digitalCheckoutUnavailable);
}
