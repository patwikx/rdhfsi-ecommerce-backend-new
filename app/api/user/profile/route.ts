import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { 
      name, 
      phone, 
      alternativePhone, 
      streetAddress, 
      city, 
      province, 
      postalCode, 
      companyName, 
      taxId 
    } = await request.json();

    // Update user profile in database
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name,
        phone: phone || null,
        alternativePhone: alternativePhone || null,
        streetAddress: streetAddress || null,
        city: city || null,
        province: province || null,
        postalCode: postalCode || null,
        companyName: companyName || null,
        taxId: taxId || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
