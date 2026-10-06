"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/firebase.config';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  usePushNotifications(isAuthenticated);
  useEffect(() => {
    let alive = true;
    const unsubscribe = onIdTokenChanged(auth, async firebaseUser => {
      setLoading(true);
      setError('');
      if (!firebaseUser) {
        localStorage.removeItem('apex_token');
        useAppStore.getState().setUser(null);
        setAuthenticated(false);
        setLoading(false);
        return;
      }
      try {
        const proof = await firebaseUser.getIdToken();
        const { data } = await api.post('/user/session', { name: useAppStore.getState().user?.name }, { headers: { Authorization: 'Bearer ' + proof } });
        if (!alive) return;
        localStorage.setItem('apex_token', data.token);
        const profile = data.user;
        useAppStore.getState().setUser({
          uid: profile._id, phone: profile.phone, name: profile.name, email: profile.email,
          role: profile.role, profilePicture: profile.profilePicture, isPremium: profile.isPremium
        });
        useAppStore.getState().setWalletBalance(profile.walletBalance || 0);
        setAuthenticated(true);
      } catch (e: any) {
        if (alive) {
          setAuthenticated(false);
          useAppStore.getState().setUser(null);
          localStorage.removeItem('apex_token');
          setError(e.response?.data?.error || 'Unable to verify your session. Please retry.');
        }
      } finally { if (alive) setLoading(false); }
    });
    return () => { alive = false; unsubscribe(); };
  }, [retry]);
  useEffect(() => {
    if (isLoading || error) return;
    if (!isAuthenticated && !['/login', '/admin-login'].includes(pathname)) router.replace('/login');
    if (isAuthenticated && pathname === '/login') router.replace('/');
    if (isAuthenticated && pathname === '/admin-login') {
      router.replace(useAppStore.getState().user?.role === 'admin' ? '/admin-dashboard' : '/');
    }
  }, [isAuthenticated, isLoading, error, pathname, router]);
  const logout = async () => { await signOut(auth); };
  if (isLoading) return <main className="p-6 text-center" role="status">Verifying session...</main>;
  return <AuthContext.Provider value={{ isAuthenticated, isLoading, logout }}>
    {error ? <main className="p-6 text-center"><p role="alert">{error}</p><button className="mt-4 p-3 border rounded-lg" onClick={() => setRetry(v => v + 1)}>Retry</button><button className="ml-3 p-3" onClick={logout}>Sign out</button></main> : children}
  </AuthContext.Provider>;
}
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
