import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  isPremium: boolean;
}

interface AppState {
  walletBalance: number;
  user: UserProfile | null;
  cartCount: number;
  
  // Actions
  setWalletBalance: (balance: number) => void;
  setUser: (user: UserProfile | null) => void;
  setCartCount: (count: number) => void;
  addMoney: (amount: number) => void;
  deductMoney: (amount: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      walletBalance: 4250.00, // Default for UI purposes, will be overridden by real API
      user: null,
      cartCount: 3,

      setWalletBalance: (balance) => set({ walletBalance: balance }),
      setUser: (user) => set({ user }),
      setCartCount: (count) => set({ cartCount: count }),
      
      addMoney: (amount) => set((state) => ({ walletBalance: state.walletBalance + amount })),
      deductMoney: (amount) => set((state) => ({ walletBalance: Math.max(0, state.walletBalance - amount) })),
    }),
    {
      name: 'apex-storage', // Saves to localStorage
    }
  )
);
