import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // Define auth routes
  const isAuthPage = 
    nextUrl.pathname.startsWith('/auth/login') || 
    nextUrl.pathname.startsWith('/auth/register') ||
    nextUrl.pathname.startsWith('/login') ||
    nextUrl.pathname.startsWith('/register');
  
  // Define protected routes
  const isProtectedRoute = 
    nextUrl.pathname.startsWith('/dashboard') ||
    nextUrl.pathname.startsWith('/admin') ||
    nextUrl.pathname.startsWith('/settings') ||
    nextUrl.pathname.startsWith('/checkout') ||
    nextUrl.pathname.startsWith('/orders') ||
    nextUrl.pathname.startsWith('/quotes') ||
    nextUrl.pathname.startsWith('/wishlist') ||
    nextUrl.pathname.startsWith('/profile');

  // Redirect logged-in users away from auth pages to dashboard
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  // Redirect non-logged-in users to login for protected routes
  if (!isLoggedIn && isProtectedRoute) {
    const redirectUrl = new URL('/auth/login', nextUrl);
    redirectUrl.searchParams.set('redirect', nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
