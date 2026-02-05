import { NextResponse } from 'next/server';
import { cleanupExpiredSessions } from '@/lib/activity-logger';

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await cleanupExpiredSessions();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Expired sessions cleaned up successfully' 
    });
  } catch (error) {
    console.error('Session cleanup error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to cleanup sessions' 
    }, { status: 500 });
  }
}
