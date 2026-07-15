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
            setUser({
              uid: firebaseUser.uid,
              phone: firebaseUser.phoneNumber,
              name: userData.name,
              email: userData.email,
              isPremium: userData.isPremium,
            });
          } else {
            // First time login, create user doc
            await setDoc(userDocRef, {
              phone: firebaseUser.phoneNumber,
              createdAt: serverTimestamp(),
            });
            setUser({
              uid: firebaseUser.uid,
              phone: firebaseUser.phoneNumber,
            });
          }
        } catch (error) {
          console.error("Error fetching/creating user doc:", error);
          // Fallback if firestore fails
          setUser({
            uid: firebaseUser.uid,
            phone: firebaseUser.phoneNumber,
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
