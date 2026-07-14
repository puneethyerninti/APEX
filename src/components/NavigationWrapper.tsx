"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import BottomNav from './BottomNav';

export default function NavigationWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Global Header should ONLY be visible on the home page (pathname === '/')
    const isHeaderHidden = pathname !== '/';

    // BottomNav should be hidden on specific auth/admin routes
    const hiddenBottomNavRoutes = ['/login', '/admin-login', '/admin-dashboard'];
    const isBottomNavHidden = hiddenBottomNavRoutes.some(route => pathname?.startsWith(route));

    return (
        <>
            {!isHeaderHidden && <Header />}
            {children}
            {!isBottomNavHidden && <BottomNav />}
        </>
    );
}
