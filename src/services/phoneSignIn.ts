export const isIndianMobile = (phone: string) => /^[6-9]\d{9}$/.test(phone);
export const isProfileName = (name: string) => name.trim().length >= 2 && name.length <= 100 && !/[\x00-\x1f\x7f]/.test(name);
export const resendSeconds = (deadline: number, now = Date.now()) => Math.max(0, Math.ceil((deadline - now) / 1000));

export function phoneSignInError(error: { code?: string }) {
  switch (error.code) {
    case 'auth/invalid-verification-code': return 'That OTP is incorrect. Please try again.';
    case 'auth/code-expired': case 'auth/session-expired': return 'Your OTP has expired. Request a new one.';
    case 'auth/too-many-requests': case 'auth/quota-exceeded': return 'Too many attempts. Please wait before trying again.';
    case 'auth/network-request-failed': return 'Check your internet connection and try again.';
    case 'auth/invalid-phone-number': return 'Enter a valid Indian mobile number.';
    case 'auth/captcha-check-failed': return 'Security check expired. Please try again.';
    case 'auth/operation-not-allowed': case 'auth/unauthorized-domain': case 'auth/invalid-app-credential': return 'Phone sign-in is unavailable. Please contact APEX support.';
    default: return 'Unable to sign in. Please try again.';
  }
}
