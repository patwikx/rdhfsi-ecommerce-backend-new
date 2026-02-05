import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/auth/login',
    signOut: '/',
    error: '/auth/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnAdmin = nextUrl.pathname.startsWith('/admin');
      const isOnSettings = nextUrl.pathname.startsWith('/settings');
      const isOnCheckout = nextUrl.pathname.startsWith('/checkout');
      const isOnOrders = nextUrl.pathname.startsWith('/orders');
      const isOnProfile = nextUrl.pathname.startsWith('/profile');
      const isOnQuotes = nextUrl.pathname.startsWith('/quotes');
      const isOnWishlist = nextUrl.pathname.startsWith('/wishlist');
      
      // Protected routes that require authentication
      if (isOnDashboard || isOnAdmin || isOnSettings || isOnCheckout || isOnOrders || isOnProfile || isOnQuotes || isOnWishlist) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }
      
      return true;
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
