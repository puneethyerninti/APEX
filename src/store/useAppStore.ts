import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';

interface UserProfile {
  uid: string;
  phone: string | null;
  name?: string;
  email?: string;
  isPremium?: boolean;
}

interface AppState {
  walletBalance: number;
  user: UserProfile | null;
  cartCount: number;
  
  // Actions
  setWalletBalance: (balance: number) => void;
  setUser: (user: UserProfile | null) => void;
  updateUserProfile: (data: Partial<UserProfile>) => void;
  setCartCount: (count: number) => void;
  addMoney: (amount: number) => void;
  deductMoney: (amount: number) => void;
}

const cookieStorage = {
  getItem: (name: string) => {
    return Cookies.get(name) || null;
  },
  setItem: (name: string, value: string) => {
    Cookies.set(name, value, { expires: 365, path: '/' });
  },
  removeItem: (name: string) => {
    Cookies.remove(name, { path: '/' });
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      walletBalance: 0, // Default to 0 for real app
      user: null,
      cartCount: 0, // Default to 0 for real app

      setWalletBalance: (balance) => set({ walletBalance: balance }),
      setUser: (user) => set({ user }),
      updateUserProfile: (data) => set((state) => ({
        user: state.user ? { ...state.user, ...data } : null
      })),
      setCartCount: (count) => set({ cartCount: count }),
      
      addMoney: (amount) => set((state) => ({ walletBalance: state.walletBalance + amount })),
      deductMoney: (amount) => set((state) => ({ walletBalance: Math.max(0, state.walletBalance - amount) })),
    }),
    {
      name: 'apex-storage', // Saves to cookies now
      storage: createJSONStorage(() => cookieStorage),
    }
  )
);
