import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the token from cookies or wherever you store it (in this example we check a dummy cookie or header)
  // Note: localStorage isn't accessible in Next.js Edge Middleware.
  // In a real app with NextAuth or JWT, you'd check cookies here.
  
  const token = request.cookies.get('apex_token')?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/admin-login');
  
  // We let AuthContext handle redirections client-side
  // to avoid aggressive Next.js edge middleware conflicts with Firebase Auth.

  if (isAuthPage && token) {
    // Redirect to home if already logged in and trying to access login page
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
