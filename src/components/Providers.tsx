"use client";

import React, { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { useAppStore } from '@/store/useAppStore';

function AccountProviders({ children }: { children: React.ReactNode }) {
  const accountId = useAppStore(state => state.user?.uid || 'anonymous');
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }), [accountId]);
  return <QueryClientProvider client={queryClient}>
    <SocketProvider key={accountId}>{children}</SocketProvider>
  </QueryClientProvider>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider><AccountProviders>{children}</AccountProviders></AuthProvider>
  );
}
