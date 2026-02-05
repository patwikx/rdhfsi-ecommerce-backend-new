import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import "../globals.css";
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { SidebarWrapper } from '@/components/sidebar/sidebar-wrapper';
import { AppSidebar } from '@/components/sidebar/app-sidebar';
import { Separator } from '@/components/ui/separator';
import { SessionProvider } from 'next-auth/react';
import { SiteProvider } from '@/components/context/site-context';
import { DynamicBreadcrumbs } from '@/components/dynamic-breadcrumbs';
import type { SiteItem } from '@/types/site-types';

export const metadata = {
  title: "Dashboard | E-Commerce Platform",
  description: "E-Commerce Management Platform",
};

// Helper function to check if user is admin based on role
function isUserAdmin(role: string): boolean {
  const adminRoles = ['ADMIN', 'MANAGER'] as const;
  return adminRoles.includes(role as typeof adminRoles[number]);
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth();

  // Redirect to sign-in if there's no session or user
  if (!session?.user) {
    redirect("/auth/login");
  }

  // Check if user is active (if the field exists in your User model)
  // Note: Add isActive field to User model if you need this functionality

  // Check if user is admin based on their role
  const isAdmin = isUserAdmin(session.user.role);

  // Fetch complete user data
  let completeUserData = null;
  try {
    completeUserData = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
      },
    });
  } catch (error) {
    console.error("Failed to fetch complete user data:", error);
  }

  // Create enhanced session
  const enhancedSession = {
    ...session,
    user: {
      ...session.user,
      image: completeUserData?.image || null,
    },
  };

  // Fetch sites for site switcher
  let sites: SiteItem[] = [];
  
  if (isAdmin || session.user.role === 'MANAGER' || session.user.role === 'STAFF') {
    try {
      const sitesData = await prisma.site.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          name: 'asc',
        },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          isMarkdown: true,
          isActive: true,
        },
      });

      sites = sitesData;
    } catch (error) {
      console.error("Failed to fetch sites:", error);
    }
  }

  // Fetch pending counts for admins/managers
  let pendingCounts = undefined;
  
  if (isAdmin || session.user.role === 'MANAGER' || session.user.role === 'STAFF') {
    try {
      const [pendingOrders, pendingQuotes, lowStockCount] = await Promise.all([
        prisma.order.count({ 
          where: { 
            status: 'PENDING'
          } 
        }),
        prisma.quote.count({ 
          where: { 
            status: 'PENDING'
          } 
        }),
        prisma.inventory.count({
          where: {
            availableQty: {
              lte: prisma.inventory.fields.minStockLevel
            },
            minStockLevel: {
              not: null
            }
          }
        })
      ]);

      pendingCounts = {
        orders: pendingOrders,
        quotes: pendingQuotes,
        lowStock: lowStockCount,
      };
    } catch (error) {
      console.error("Failed to fetch pending counts:", error);
    }
  }

  // Get active site ID (default to first site if available)
  const activeSiteId = sites.length > 0 ? sites[0].id : null;

  return (
    <SessionProvider>
      <SiteProvider siteId={activeSiteId}>
        <SidebarWrapper>
          <div className="min-h-screen flex w-full">
            {/* App Sidebar */}
            <AppSidebar 
              session={enhancedSession}
              sites={sites}
              pendingCounts={pendingCounts}
            />
            
            {/* Main Content Area */}
            <SidebarInset className="flex-1">
              {/* Header */}
              <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <DynamicBreadcrumbs />
              </header>

              {/* Main Content */}
              <main className="flex-1 p-4">
                {children}
              </main>
            </SidebarInset>
          </div>
        </SidebarWrapper>
      </SiteProvider>
    </SessionProvider>
  )
}