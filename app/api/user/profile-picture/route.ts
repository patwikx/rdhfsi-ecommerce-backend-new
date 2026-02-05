import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { imageUrl } = await request.json();

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'Invalid image key' },
        { status: 400 }
      );
    }

    // imageUrl is actually the fileName (MinIO key) from the upload response
    // Store it directly in the database
    await prisma.user.update({
      where: { email: session.user.email },
      data: { image: imageUrl },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    return NextResponse.json(
      { error: 'Failed to update profile picture' },
      { status: 500 }
    );
  }
}
