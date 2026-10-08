import { useAppStore } from '@/store/useAppStore';

let generation = 0;
export const sessionGeneration = () => generation;
export function clearApplicationSession() {
  generation++;
  try { localStorage.removeItem('apex_token'); } catch { /* Unavailable storage must not retain authenticated UI. */ }
  useAppStore.getState().setUser(null);
  useAppStore.getState().setWalletBalance(0);
}

export function applyApplicationSession(data: any) {
  if (typeof data?.token !== 'string' || !data?.user?._id || typeof data.user.name !== 'string') throw new Error('Invalid sign-in response.');
  localStorage.setItem('apex_token', data.token);
  const profile = data.user;
  useAppStore.getState().setUser({ uid: profile._id, phone: profile.phone, name: profile.name,
    email: profile.email, role: profile.role, profilePicture: profile.profilePicture, isPremium: profile.isPremium });
  useAppStore.getState().setWalletBalance(profile.walletBalance || 0);
}
