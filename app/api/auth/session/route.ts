import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(null, { status: 401 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(null, { status: 500 });
  }
}
