'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

export function SessionValidator() {
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isLoggingOutRef = useRef(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      // Skip if already logging out
      if (isLoggingOutRef.current) {
        return;
      }

      try {
        const response = await fetch('/api/auth/validate-session', {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          // Mark as logging out to prevent multiple logout attempts
          isLoggingOutRef.current = true;

          // Clear the interval to stop further checks
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          // Start graceful transition
          setIsTransitioning(true);

          // Wait for React to render the overlay, then wait 3 seconds
          await new Promise(resolve => setTimeout(resolve, 100)); // Let React render
          await new Promise(resolve => setTimeout(resolve, 3000)); // Show animation

          // Perform logout without redirect
          await signOut({ redirect: false });

          // Small delay before navigation to ensure signOut completes
          await new Promise(resolve => setTimeout(resolve, 100));

          // Navigate to login page
          router.push('/auth/login?error=SessionExpired');
        }
      } catch (error) {
        console.error('Session check failed:', error);
        // Don't logout on network errors, only on invalid sessions
      }
    };

    // Initial check after a short delay to avoid checking during page load
    const initialTimeout = setTimeout(() => {
      checkSession();
    }, 2000);

    // Check every 1 minute (60 seconds)
    // JWT expires in 30 minutes
    intervalRef.current = setInterval(checkSession, 60 * 1000);

    // Cleanup on unmount
    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [router]);

  // Render overlay during transition
  if (isTransitioning) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-300">
        <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-8 shadow-lg">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <h3 className="text-lg font-semibold">Session Expired</h3>
            <p className="text-sm text-muted-foreground mt-2">Logging out...</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
