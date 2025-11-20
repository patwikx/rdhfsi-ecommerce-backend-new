import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Adapter } from 'next-auth/adapters';
import { randomUUID } from 'crypto';
import { createSessionRecord } from '@/lib/actions/session-management-actions';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 60, // 30 minutes (1800 seconds)
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const validatedFields = loginSchema.safeParse(credentials);

        if (!validatedFields.success) {
          return null;
        }

        const { email, password } = validatedFields.data;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            image: true,
            phone: true,
            isActive: true,
            companyName: true,
            taxId: true,
            creditLimit: true,
            paymentTerms: true,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        if (!user.isActive) {
          throw new Error('Account is inactive. Please contact support.');
        }

        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (!passwordsMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          phone: user.phone,
          role: user.role,
          companyName: user.companyName,
          taxId: user.taxId,
          creditLimit: user.creditLimit ? Number(user.creditLimit) : null,
          paymentTerms: user.paymentTerms,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // If user is signing in, add user data to token
      if (user && user.id) {
        token.id = user.id;
        token.role = user.role;
        token.image = user.image;
        token.phone = user.phone;
        token.companyName = user.companyName ?? null;
        token.taxId = user.taxId ?? null;
        token.creditLimit = user.creditLimit ?? null;
        token.paymentTerms = user.paymentTerms ?? null;

        // Create session record in database for tracking
        const sessionToken = randomUUID();
        token.sessionToken = sessionToken;

        try {
          await createSessionRecord(user.id, sessionToken);
        } catch (error) {
          console.error("Failed to create session record:", error);
        }
      }
      
      // Update token on session update or when triggered
      if ((trigger === 'update' || trigger === 'signIn') && token.id) {
        const updatedUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            role: true,
            image: true,
            phone: true,
            companyName: true,
            taxId: true,
            creditLimit: true,
            paymentTerms: true,
          },
        });
        
        if (updatedUser) {
          token.role = updatedUser.role;
          token.image = updatedUser.image;
          token.phone = updatedUser.phone;
          token.companyName = updatedUser.companyName;
          token.taxId = updatedUser.taxId;
          token.creditLimit = updatedUser.creditLimit ? Number(updatedUser.creditLimit) : null;
          token.paymentTerms = updatedUser.paymentTerms;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token && session.user && token.id) {
        // Populate user data from token (JWT strategy doesn't need DB validation on every request)
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.image = token.image as string | null;
        session.user.phone = token.phone as string | null;
        session.user.companyName = token.companyName;
        session.user.taxId = token.taxId;
        session.user.creditLimit = token.creditLimit;
        session.user.paymentTerms = token.paymentTerms;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (user.id) {
        const { logActivity } = await import('@/lib/activity-logger');
        await logActivity(user.id, 'LOGIN', 'User logged in');
      }
    },
  },
});
