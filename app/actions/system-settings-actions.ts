'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { SettingDataType } from '@prisma/client';

const systemSettingSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.string().min(1, 'Value is required'),
  dataType: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'DATE']),
  category: z.string().min(1, 'Category is required'),
  label: z.string().min(1, 'Label is required'),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
  isEditable: z.boolean().default(true),
});

export type SystemSettingListItem = {
  id: string;
  key: string;
  value: string;
  dataType: SettingDataType;
  category: string;
  label: string;
  description: string | null;
  isPublic: boolean;
  isEditable: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function getAllSystemSettings() {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    const settings = await prisma.systemSetting.findMany({
      orderBy: [
        { category: 'asc' },
        { key: 'asc' },
      ],
    });

    return { success: true, data: settings as SystemSettingListItem[] };
  } catch (error) {
    return { success: false, error: 'Failed to fetch system settings' };
  }
}

export async function getSystemSettingsByCategory(category: string) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    const settings = await prisma.systemSetting.findMany({
      where: { category },
      orderBy: { key: 'asc' },
    });

    return { success: true, data: settings as SystemSettingListItem[] };
  } catch (error) {
    return { success: false, error: 'Failed to fetch settings' };
  }
}

export async function createSystemSetting(data: z.infer<typeof systemSettingSchema>) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized - Admin only' };
    }

    const validated = systemSettingSchema.parse(data);

    // Check if key already exists
    const existing = await prisma.systemSetting.findUnique({
      where: { key: validated.key },
    });

    if (existing) {
      return { success: false, error: 'Setting key already exists' };
    }

    await prisma.systemSetting.create({
      data: validated,
    });

    revalidatePath('/admin/settings');
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Failed to create setting' };
  }
}

export async function updateSystemSetting(id: string, data: z.infer<typeof systemSettingSchema>) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { id },
    });

    if (!setting) {
      return { success: false, error: 'Setting not found' };
    }

    if (!setting.isEditable && session.user.role !== 'ADMIN') {
      return { success: false, error: 'This setting cannot be edited' };
    }

    const validated = systemSettingSchema.parse(data);

    await prisma.systemSetting.update({
      where: { id },
      data: validated,
    });

    revalidatePath('/admin/settings');
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Failed to update setting' };
  }
}

export async function deleteSystemSetting(id: string) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized - Admin only' };
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { id },
    });

    if (!setting) {
      return { success: false, error: 'Setting not found' };
    }

    if (!setting.isEditable) {
      return { success: false, error: 'This setting cannot be deleted' };
    }

    await prisma.systemSetting.delete({
      where: { id },
    });

    revalidatePath('/admin/settings');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete setting' };
  }
}
