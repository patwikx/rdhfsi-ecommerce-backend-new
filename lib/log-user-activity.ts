'use server'

import { auth } from '@/auth';
import { logActivity } from './activity-logger';

export async function logUserActivity(
  action: string,
  description?: string,
  metadata?: Record<string, unknown>
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return; // Don't log if user is not authenticated
    }

    await logActivity(session.user.id, action, description, metadata);
  } catch (error) {
    console.error('Failed to log user activity:', error);
  }
}

// Predefined activity types for consistency
export const ActivityType = {
  // Auth
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  
  // Products
  VIEW_PRODUCT: 'VIEW_PRODUCT',
  SEARCH_PRODUCTS: 'SEARCH_PRODUCTS',
  VIEW_CATEGORY: 'VIEW_CATEGORY',
  
  // Cart
  ADD_TO_CART: 'ADD_TO_CART',
  REMOVE_FROM_CART: 'REMOVE_FROM_CART',
  UPDATE_CART_QUANTITY: 'UPDATE_CART_QUANTITY',
  
  // Wishlist
  ADD_TO_WISHLIST: 'ADD_TO_WISHLIST',
  REMOVE_FROM_WISHLIST: 'REMOVE_FROM_WISHLIST',
  
  // Orders
  PLACE_ORDER: 'PLACE_ORDER',
  VIEW_ORDER: 'VIEW_ORDER',
  CANCEL_ORDER: 'CANCEL_ORDER',
  
  // Profile
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  CHANGE_PASSWORD: 'CHANGE_PASSWORD',
  ADD_ADDRESS: 'ADD_ADDRESS',
  
  // Reviews
  SUBMIT_REVIEW: 'SUBMIT_REVIEW',
  
  // Quotes
  REQUEST_QUOTE: 'REQUEST_QUOTE',
} as const;
