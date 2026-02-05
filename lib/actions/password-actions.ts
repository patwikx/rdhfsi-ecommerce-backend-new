'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';

/**
 * Change user password
 */
export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, password: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Verify current password
    const isValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Validate new password
    if (data.newPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters' };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return { success: true };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, error: 'Failed to change password' };
  }
}
