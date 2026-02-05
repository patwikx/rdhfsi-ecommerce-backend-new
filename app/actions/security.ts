'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await auth();
  
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, password: true },
  });

  if (!user || !user.password) {
    throw new Error('User not found');
  }

  // Verify current password
  const passwordsMatch = await bcrypt.compare(currentPassword, user.password);
  
  if (!passwordsMatch) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  return { success: true };
}
