"use server";

import { prisma } from "@/lib/prisma";

/**
 * Create a session record in the database
 * Session expires in 30 minutes
 */
export async function createSessionRecord(userId: string, sessionToken: string) {
  try {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minutes

    await prisma.session.upsert({
      where: {
        sessionToken,
      },
      update: {
        expires: expiresAt,
      },
      create: {
        sessionToken,
        userId,
        expires: expiresAt,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error creating session record:", error);
    return { success: false };
  }
}

/**
 * Validate if a session is still active
 */
export async function validateSession(userId: string): Promise<boolean> {
  try {
    const session = await prisma.session.findFirst({
      where: {
        userId,
        expires: {
          gt: new Date(), // Session not expired
        },
      },
    });

    return !!session;
  } catch (error) {
    console.error("Error validating session:", error);
    return false;
  }
}

/**
 * Update session expiration (refresh on activity)
 */
export async function refreshSession(userId: string) {
  try {
    const newExpiration = new Date();
    newExpiration.setMinutes(newExpiration.getMinutes() + 30); // Extend by 30 minutes

    await prisma.session.updateMany({
      where: {
        userId,
        expires: {
          gt: new Date(), // Only update active sessions
        },
      },
      data: {
        expires: newExpiration,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error refreshing session:", error);
    return { success: false };
  }
}

/**
 * Delete user sessions (force logout)
 */
export async function deleteUserSessions(userId: string) {
  try {
    await prisma.session.deleteMany({
      where: { userId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting sessions:", error);
    return { success: false };
  }
}

/**
 * Clean up expired sessions (run periodically)
 */
export async function cleanupExpiredSessions() {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });

    return { success: true, deletedCount: result.count };
  } catch (error) {
    console.error("Error cleaning up sessions:", error);
    return { success: false, deletedCount: 0 };
  }
}
