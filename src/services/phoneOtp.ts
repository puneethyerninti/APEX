import axios from 'axios';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '@/firebase.config';
import { api } from '@/services/api';
import { isIndianMobile } from '@/services/phoneSignIn';

export async function requestPhoneOtp(phone: string, adminPortal: boolean,
  createVerifier: () => RecaptchaVerifier, isCurrent: () => boolean) {
  if (!isIndianMobile(phone)) throw { code: 'auth/invalid-phone-number' };
  if (adminPortal) {
    try {
      // Pre-login requests must not use the authenticated API interceptor.
      const { data } = await axios.post(api.defaults.baseURL + '/user/admin-otp/eligibility',
        { phone: '+91' + phone }, { timeout: 10000 });
      if (data?.success !== true) throw { code: 'admin/not-authorized' };
    } catch (failure: any) {
      if (failure.code === 'admin/not-authorized' || failure.response?.status === 403) throw { code: 'admin/not-authorized' };
      if (failure.response?.status === 429) throw { code: 'auth/too-many-requests' };
      throw { code: 'admin/unavailable' };
    }
  }
  if (!isCurrent()) throw new axios.CanceledError('Sign-in changed.');
  return signInWithPhoneNumber(auth, '+91' + phone, createVerifier());
}
