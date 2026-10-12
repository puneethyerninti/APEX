// Restore only after the bank-transfer integration is approved and verified.
export const APEX_PAY_ENABLED = false;
export const APEX_TV_CHANNEL_URL = 'https://www.youtube.com/@Apexstore007';
export const APEX_ACADEMY_CHANNEL_URL = 'https://www.youtube.com/@APEXGROUPS';

export function isPublicApexTvPath(pathname: string): boolean {
  return pathname === '/apex-tv' || (!APEX_PAY_ENABLED && pathname === '/payment');
}
