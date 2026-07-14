"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import BottomNav from './BottomNav';

export default function NavigationWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // BottomNav should be hidden on specific auth/admin routes
    const hiddenBottomNavRoutes = ['/login', '/admin-login', '/admin-dashboard'];
    const isBottomNavHidden = hiddenBottomNavRoutes.some(route => pathname?.startsWith(route));

    return (
        <>
            {children}
            {!isBottomNavHidden && <BottomNav />}
        </>
    );
}
