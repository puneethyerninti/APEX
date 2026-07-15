"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { auth, db } from '@/firebase.config';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';

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
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        try {
          // Check if user exists in Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const currentUser = useAppStore.getState().user;
            // Merge firestore data with current local state to prevent wiping
            setUser({
              uid: firebaseUser.uid,
              phone: firebaseUser.phoneNumber,
              name: userData.name || currentUser?.name,
              email: userData.email || currentUser?.email,
              isPremium: userData.isPremium || currentUser?.isPremium,
            });
          } else {
            // First time login, create user doc but KEEP local state if it exists
            const currentUser = useAppStore.getState().user;
            await setDoc(userDocRef, {
              phone: firebaseUser.phoneNumber,
              name: currentUser?.name || null,
              email: currentUser?.email || null,
              createdAt: serverTimestamp(),
            });
            setUser({
              uid: firebaseUser.uid,
              phone: firebaseUser.phoneNumber,
              name: currentUser?.name,
              email: currentUser?.email,
              isPremium: currentUser?.isPremium,
            });
          }
        } catch (error) {
          console.error("Error fetching/creating user doc:", error);
          // Fallback if firestore fails
          const currentUser = useAppStore.getState().user;
          setUser({
            uid: firebaseUser.uid,
            phone: firebaseUser.phoneNumber,
            ...(currentUser?.uid === firebaseUser.uid ? {
              name: currentUser.name,
              email: currentUser.email,
              isPremium: currentUser.isPremium
            } : {})
          });
        }
        
        setIsAuthenticated(true);
        if (pathname === '/login') {
          router.push('/');
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
