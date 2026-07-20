"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { auth } from '@/firebase.config';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const setUser = useAppStore((state) => state.setUser);
  const setWalletBalance = useAppStore((state) => state.setWalletBalance);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        try {
          // Check if user exists in Node.js backend
          const response = await api.get(`/user/profile?phone=${encodeURIComponent(firebaseUser.phoneNumber || '')}`);
          
          if (response.data) {
            const userData = response.data;
            const currentUser = useAppStore.getState().user;
            
            setUser({
              uid: userData._id || firebaseUser.uid,
              phone: firebaseUser.phoneNumber,
              name: userData.name || currentUser?.name,
              email: userData.email || currentUser?.email,
              isPremium: userData.isPremium || currentUser?.isPremium,
              profilePicture: userData.profilePicture || currentUser?.profilePicture,
              role: userData.role || currentUser?.role,
            });
            if (userData.walletBalance !== undefined) {
              setWalletBalance(userData.walletBalance);
            }
          }
        } catch (error: any) {
          if (error.response?.status === 404) {
            // First time login, create user doc in backend but KEEP local state if it exists
            const currentUser = useAppStore.getState().user;
            let dbId = firebaseUser.uid;
            try {
              const res = await api.post('/user/profile', {
                phone: firebaseUser.phoneNumber,
                name: currentUser?.name || 'User',
                email: currentUser?.email || '',
              });
              if (res.data?.user?._id) {
                dbId = res.data.user._id;
              }
            } catch (createErr) {
              console.error("Error creating user profile in backend:", createErr);
            }
            setUser({
              uid: dbId,
              phone: firebaseUser.phoneNumber,
              name: currentUser?.name || 'User',
              email: currentUser?.email || '',
              isPremium: currentUser?.isPremium,
              profilePicture: currentUser?.profilePicture,
              role: currentUser?.role,
            });
            if (currentUser?.walletBalance !== undefined) {
              setWalletBalance(currentUser.walletBalance);
            }
          } else {
            console.error("Error fetching user profile:", error);
          // Fallback if firestore fails
          const currentUser = useAppStore.getState().user;
          setUser({
            uid: firebaseUser.uid,
            phone: firebaseUser.phoneNumber,
            ...(currentUser?.uid === firebaseUser.uid ? {
              name: currentUser.name,
              email: currentUser.email,
              isPremium: currentUser.isPremium,
              role: currentUser.role,
            } : {})
          });
          if (currentUser?.walletBalance !== undefined) {
            setWalletBalance(currentUser.walletBalance);
          }
        } // End of else
        } // End of catch block
        
        setIsAuthenticated(true);
        if (pathname === '/login') {
          router.push('/');
        } else if (pathname === '/admin-login') {
          router.push('/admin-dashboard');
        }
      } else {
        // User is logged out
        setUser(null);
        setIsAuthenticated(false);
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, router, pathname]);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
