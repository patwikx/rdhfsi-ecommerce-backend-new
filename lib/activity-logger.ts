'use server'

import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export async function logActivity(
  userId: string,
  action: string,
  description?: string,
  metadata?: Record<string, unknown>
) {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    await prisma.activityLog.create({
      data: {
        userId,
        action,
        description,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to prevent breaking the main flow
  }
}

export async function cleanupExpiredSessions() {
  try {
    // With JWT strategy, sessions are stored in cookies, not database
    // Clean up any OAuth sessions that might exist
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    await prisma.session.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });
  } catch (error) {
    console.error('Failed to cleanup sessions:', error);
  }
}
