'use server'

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  userRole: z.enum(['CUSTOMER', 'CORPORATE', 'ADMIN', 'MANAGER', 'STAFF']).optional(),
});

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    const result = await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/dashboard',
    });
    
    // Activity logging is handled in auth.ts events
    return 'success';
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

export async function register(formData: {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  password: string;
  userRole?: 'CUSTOMER' | 'CORPORATE' | 'ADMIN' | 'MANAGER' | 'STAFF';
}) {
  try {
    const validatedFields = registerSchema.safeParse(formData);

    if (!validatedFields.success) {
      return {
        success: false,
        error: validatedFields.error.issues[0].message,
      };
    }

    const { name, email, phone, companyName, password, userRole } = validatedFields.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        success: false,
        error: 'Email already registered',
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await prisma.user.create({
      data: {
        name,
        email,
        phone,
        companyName,
        password: hashedPassword,
        role: userRole || 'CUSTOMER',
      },
    });

    return {
      success: true,
      message: 'Account created successfully',
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: 'Failed to create account',
    };
  }
}

export async function logout() {
  try {
    // Get current session to log the user ID before signing out
    const { auth } = await import('@/auth');
    const session = await auth();
    
    if (session?.user?.id) {
      const { logActivity } = await import('@/lib/activity-logger');
      await logActivity(session.user.id, 'LOGOUT', 'User logged out');
    }
    
    await signOut({ redirectTo: '/' });
  } catch (error) {
    console.error('Logout error:', error);
    await signOut({ redirectTo: '/' });
  }
}
