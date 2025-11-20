'use server'

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const requestResetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function requestPasswordReset(email: string) {
  try {
    const validatedFields = requestResetSchema.safeParse({ email });

    if (!validatedFields.success) {
      return {
        success: false,
        error: validatedFields.error.issues[0].message,
      };
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: validatedFields.data.email },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return {
        success: true,
        message: 'If an account exists with this email, you will receive an OTP.',
      };
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP in verification token table
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: email,
          token: 'password-reset',
        },
      },
      create: {
        identifier: email,
        token: otp,
        expires: expiresAt,
      },
      update: {
        token: otp,
        expires: expiresAt,
      },
    });

    // TODO: Send email with OTP
    // For now, we'll just return success
    // In production, integrate with email service (SendGrid, Resend, etc.)
    console.log(`OTP for ${email}: ${otp}`);

    return {
      success: true,
      message: 'OTP sent to your email',
      otp, // Remove this in production!
    };
  } catch (error) {
    console.error('Password reset request error:', error);
    return {
      success: false,
      error: 'Failed to process request',
    };
  }
}

export async function verifyOTP(email: string, otp: string) {
  try {
    const validatedFields = verifyOtpSchema.safeParse({ email, otp });

    if (!validatedFields.success) {
      return {
        success: false,
        error: validatedFields.error.issues[0].message,
      };
    }

    // Find the OTP token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        token: otp,
      },
    });

    if (!verificationToken) {
      return {
        success: false,
        error: 'Invalid OTP',
      };
    }

    // Check if OTP is expired
    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: email,
            token: otp,
          },
        },
      });

      return {
        success: false,
        error: 'OTP has expired',
      };
    }

    return {
      success: true,
      message: 'OTP verified successfully',
    };
  } catch (error) {
    console.error('OTP verification error:', error);
    return {
      success: false,
      error: 'Failed to verify OTP',
    };
  }
}

export async function resetPassword(email: string, otp: string, newPassword: string) {
  try {
    const validatedFields = resetPasswordSchema.safeParse({ email, otp, newPassword });

    if (!validatedFields.success) {
      return {
        success: false,
        error: validatedFields.error.issues[0].message,
      };
    }

    // Verify OTP first
    const otpVerification = await verifyOTP(email, otp);
    if (!otpVerification.success) {
      return otpVerification;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    // Delete the used OTP
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token: otp,
        },
      },
    });

    // Log activity
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (user) {
      const { logActivity } = await import('@/lib/activity-logger');
      await logActivity(user.id, 'PASSWORD_RESET', 'User reset their password');
    }

    return {
      success: true,
      message: 'Password reset successfully',
    };
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      error: 'Failed to reset password',
    };
  }
}
