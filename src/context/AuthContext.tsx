"use client";
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onIdTokenChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import axios from 'axios';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/firebase.config';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import { usePushNotifications, getRegisteredPushToken, clearRegisteredPushToken, unregisterDevicePush } from '@/hooks/usePushNotifications';
import { createSessionGate } from '@/services/sessionGate';
import { resetSessionReadiness, settleSessionReadiness } from '@/services/sessionReadiness';
import { applyApplicationSession, clearApplicationSession } from '@/services/applicationSession';
import { isProfileName } from '@/services/phoneSignIn';

interface AuthContextType {
  isAuthenticated: boolean; isLoading: boolean; error: string;
  registrationRequired: boolean; registrationPhone: string;
  completeRegistration: (name: string) => Promise<void>;
  retrySession: () => void; logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registrationPhone, setRegistrationPhone] = useState('');
  const [retry, setRetry] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const role = useAppStore(state => state.user?.role);
  const path = useRef(pathname); path.current = pathname;
  const gateRef = useRef<ReturnType<typeof createSessionGate<any>> | null>(null);
  const identityRef = useRef<FirebaseUser | null>(null);
  const registering = useRef(false);
  usePushNotifications(isAuthenticated);
  useEffect(() => {
    const recover = () => setRetry(value => value + 1);
    window.addEventListener('apex-session-invalid', recover);
    return () => window.removeEventListener('apex-session-invalid', recover);
  }, []);

  const exchange = async (identity: FirebaseUser, signal: AbortSignal, name?: string) => {
    const proof = await identity.getIdToken();
    if (signal.aborted || auth.currentUser?.uid !== identity.uid) throw new axios.CanceledError('Sign-in changed.');
    const { data } = await api.post('/user/session', {
      ...(name === undefined ? {} : { name }), intent: path.current === '/admin-login' ? 'admin' : 'user'
    }, { headers: { Authorization: 'Bearer ' + proof }, signal, timeout: 30000 });
    if (auth.currentUser?.uid !== identity.uid) throw new axios.CanceledError('Sign-in changed.');
    if (data?.registrationRequired) {
      if (data.phone !== identity.phoneNumber || data.token || data.user) throw new Error('Invalid registration response.');
    } else if (!data?.token || !data?.user?._id) throw new Error('Invalid sign-in response.');
    return data;
  };

  useEffect(() => {
    if (!error) return;
    const recover = () => setRetry(value => value + 1);
    window.addEventListener('online', recover); window.addEventListener('focus', recover);
    return () => { window.removeEventListener('online', recover); window.removeEventListener('focus', recover); };
  }, [error]);

  useEffect(() => {
    resetSessionReadiness();
    const clear = () => { clearApplicationSession(); setAuthenticated(false); setLoading(false); };
    setLoading(true); setError('');
    const gate = createSessionGate<any>({
      loading: () => { resetSessionReadiness(); setLoading(true); setError(''); },
      anonymous: () => { clear(); setRegistrationPhone(''); setError(''); settleSessionReadiness(true); },
      failed: (failure: any) => {
        clear(); setError(failure.response?.data?.error || 'Unable to sign in. Please try again.'); settleSessionReadiness(false);
      },
      verified: data => {
        if (data.registrationRequired) {
          clear(); setRegistrationPhone(data.phone); setError(''); settleSessionReadiness(false); return;
        }
        try {
          applyApplicationSession(data); setRegistrationPhone(''); setAuthenticated(true); setLoading(false); setError(''); settleSessionReadiness(true);
        } catch { clear(); setError('Unable to save sign-in on this device. Allow site storage and try again.'); settleSessionReadiness(false); }
      }
    });
    gateRef.current = gate;
    let unsubscribe = () => {};
    try {
      unsubscribe = onIdTokenChanged(auth, identity => {
        // Account switches must invalidate old private requests before exchanging proof.
        if (identityRef.current?.uid !== identity?.uid) { clearApplicationSession(); setAuthenticated(false); setRegistrationPhone(''); }
        identityRef.current = identity;
        if (!identity) { gate.anonymous(); return; }
        void gate.verify(signal => exchange(identity, signal));
      }, failure => gate.fail(failure));
    } catch (failure) { gate.fail(failure); }
    return () => { gate.dispose(); gateRef.current = null; unsubscribe(); settleSessionReadiness(false); };
  }, [retry]);

  useEffect(() => {
    if (isLoading || error) return;
    if (!isAuthenticated && !['/login', '/admin-login'].includes(pathname)) router.replace('/login');
    if (isAuthenticated && pathname === '/login') router.replace('/');
    if (isAuthenticated && pathname === '/admin-login') router.replace(role === 'admin' ? '/admin-dashboard' : '/');
    if (isAuthenticated && pathname.startsWith('/admin-dashboard') && role !== 'admin') router.replace('/');
  }, [isAuthenticated, isLoading, error, pathname, role, router]);

  const completeRegistration = async (name: string) => {
    const identity = auth.currentUser;
    if (registering.current || !registrationPhone || !identity || !isProfileName(name)) return;
    registering.current = true;
    try { await gateRef.current?.verify(signal => exchange(identity, signal, name.trim())); }
    finally { registering.current = false; }
  };

  const logout = async () => {
    let token: string | null = null;
    try { token = localStorage.getItem('apex_token'); } catch { /* Site storage may be unavailable. */ }
    const fcmToken = getRegisteredPushToken();
    clearRegisteredPushToken();
    gateRef.current?.anonymous(); identityRef.current = null;
    void unregisterDevicePush().catch(() => console.warn('Device notification unregister could not be confirmed.'));
    const revocation = token ? axios.post(api.defaults.baseURL + '/user/logout', { fcmToken }, {
      headers: { Authorization: 'Bearer ' + token }, timeout: 10000
    }).catch(() => { window.dispatchEvent(new CustomEvent('showToast', { detail: { type: 'warning', message: 'Signed out on this device. Server session revocation could not be confirmed.' } })); }) : Promise.resolve();
    try { await signOut(auth); } catch { setError('Unable to clear device sign-in. Please try again.'); }
    await revocation;
  };
  return <AuthContext.Provider value={{ isAuthenticated, isLoading, error, registrationRequired: !!registrationPhone, registrationPhone,
    completeRegistration, retrySession: () => setRetry(value => value + 1), logout }}>
    {error && !['/login', '/admin-login'].includes(pathname) && <div role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">Sign-in is temporarily unavailable. Your account and payments remain protected.</div>}
    {children}
  </AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
