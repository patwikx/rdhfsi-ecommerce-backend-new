'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Users, 
  FileText, 
  ChartBar as BarChart3, 
  Settings, 
  Building2, 
  FolderOpen, 
  UserCheck, 
  Activity, 
  Home, 
  Calculator, 
  Calendar, 
  Plus, 
  Eye, 
  UserPlus, 
  HelpCircle, 
  Mail, 
  Phone, 
  User,
  Package,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  Edit,
  UserCog,
  Shield
} from 'lucide-react';
import { SystemUpdateNotes } from "@/components/ui/system-update-notes";
import { AdminNotifications } from "@/components/admin-notifications";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isCurrentPage?: boolean;
}

const routeConfig: Record<string, { label: string; icon?: React.ComponentType<{ className?: string }>; isClickable?: boolean }> = {
  'dashboard': { label: 'Dashboard', icon: Home },
  
  // Admin routes
  'admin': { label: 'Admin', icon: Shield, isClickable: false },
  'admin/products': { label: 'Products', icon: Package },
  'admin/orders': { label: 'Orders', icon: FileText },
  'admin/customers': { label: 'Customers', icon: Users },
  'admin/users': { label: 'User Management', icon: UserCog },
  'admin/inventory': { label: 'Inventory', icon: Package },
  'admin/inventory/shelves': { label: 'Shelf Management', icon: Package },
  'admin/sites': { label: 'Sites', icon: Building2 },
  'admin/working-cap': { label: 'Working Capital', icon: Calculator },
  'admin/quotes': { label: 'Quotes', icon: FileText },
  'admin/scanner': { label: 'Scanner', icon: Package },
  
  // Staff routes
  'staff': { label: 'Staff', icon: UserCog, isClickable: false },
  'staff/order-taker': { label: 'Order Taker', icon: ClipboardCheck },
  
  // Cashier routes
  'cashier': { label: 'Cashier', icon: Calculator, isClickable: false },
  'cashier/queue': { label: 'Cashier Queue', icon: Clock },
  
  // Leave Management
  'leave-requests': { label: 'Leave Requests', icon: Calendar },
  'leave-requests/create': { label: 'Submit Leave Request', icon: Plus },
  'leave-balances': { label: 'Leave Balances', icon: Calculator },
  
  // Overtime Management
  'overtime-requests': { label: 'Overtime Requests', icon: Clock },
  'overtime-requests/create': { label: 'Submit Overtime Request', icon: Plus },
  
  // Material Request System (MRS)
  'material-requests': { label: 'Material Requests', icon: Package },
  'material-requests/create': { label: 'Create Material Request', icon: Plus },
  
  // MRS Coordinator (parent route doesn't have a page)
  'mrs-coordinator': { label: 'MRS Coordinator', icon: UserCog, isClickable: false },
  'mrs-coordinator/for-serving': { label: 'For Serving', icon: Package },
  'mrs-coordinator/for-posting': { label: 'For Posting', icon: FileText },
  'mrs-coordinator/acknowledgement': { label: 'Acknowledgements', icon: Edit },
  'mrs-coordinator/done-requests': { label: 'Done Requests', icon: CheckCircle2 },
  
  // Approvals (parent routes don't have pages)
  'approvals': { label: 'Approvals', icon: ClipboardCheck, isClickable: false },
  'approvals/leave': { label: 'Leave Approvals', icon: Calendar, isClickable: false },
  'approvals/leave/pending': { label: 'Pending Leave', icon: Clock },
  'approvals/overtime': { label: 'Overtime Approvals', icon: Clock, isClickable: false },
  'approvals/overtime/pending': { label: 'Pending Overtime', icon: Clock },
  'approvals/material-requests': { label: 'Material Request Approvals', icon: Package, isClickable: false },
  'approvals/material-requests/pending': { label: 'Pending Material Requests', icon: Clock },
  'approvals/history': { label: 'Approval History', icon: FileText },
  
  // Reports
  'reports': { label: 'Reports', icon: FileText, isClickable: false },
  'reports/leave': { label: 'Leave Reports', icon: Calendar },
  'reports/overtime': { label: 'Overtime Reports', icon: Clock },
  'reports/employees': { label: 'Employee Reports', icon: Users },
  'reports/material-requests': { label: 'MRS Reports', icon: Package },
  'reports/depreciation': { label: 'Depreciation Reports', icon: Calculator },
  'reports/deployments': { label: 'Deployment Reports', icon: User },
  'reports/damaged-loss': { label: 'Damaged & Loss Reports', icon: FileText },
  
  // Asset Management
  'asset-management': { label: 'Asset Management', icon: Package },
  'asset-management/assets': { label: 'All Assets', icon: Package },
  'asset-management/deployments': { label: 'Deployments', icon: User },
  'asset-management/returns': { label: 'Asset Returns', icon: Package },
  'asset-management/asset-printing': { label: 'Asset QR Printing', icon: Package },
  'asset-management/transfers': { label: 'Transfers', icon: Package },
  'asset-management/retirements': { label: 'Retirements & Disposals', icon: Package },
  'asset-management/disposals': { label: 'Disposals', icon: Package },
  'asset-management/categories': { label: 'Categories', icon: FolderOpen },
  'asset-management/depreciation': { label: 'Depreciation', icon: Calculator },
  'asset-management/inventory': { label: 'Inventory Verification', icon: ClipboardCheck },
  
  // Profile
  'profile': { label: 'Profile', icon: UserCheck },
  
  // Unauthorized
  'unauthorized': { label: 'Unauthorized Access', icon: Shield },
};

export function DynamicBreadcrumbs() {
  const pathname = usePathname();
  
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];
    
    // Always start with Dashboard
    breadcrumbs.push({
      label: 'Dashboard',
      href: '/dashboard',
      icon: Home
    });

    let currentPath = '';
    let actualPath = ''; // Track the actual path with UUIDs for href generation
    
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      
      // Build the actual path (including UUIDs)
      actualPath = actualPath ? `${actualPath}/${segment}` : segment;
      
      // Check if this is a dynamic route (UUID or CUID pattern)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const cuidPattern = /^c[a-z0-9]{24}$/i
      const isIdPattern = uuidPattern.test(segment) || cuidPattern.test(segment);
      
      if (isIdPattern) {
        // For UUID segments, use the parent route's label + "Details"
        const parentPath = currentPath;
        const parentConfig = routeConfig[parentPath];
        
        breadcrumbs.push({
          label: parentConfig ? `${parentConfig.label} Details` : 'Details',
          href: i === pathSegments.length - 1 ? undefined : `/${actualPath}`,
          icon: parentConfig?.icon || Eye,
          isCurrentPage: i === pathSegments.length - 1
        });
      } else {
        // For non-UUID segments, build the currentPath for config lookup
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        
        // Regular route handling
        const config = routeConfig[currentPath];
        const isLastSegment = i === pathSegments.length - 1;
        
        // Determine if this breadcrumb should have a link
        // Don't link if: it's the last segment, or config says it's not clickable
        const shouldHaveLink = !isLastSegment && (config?.isClickable !== false);
        
        breadcrumbs.push({
          label: config?.label || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
          href: shouldHaveLink ? `/${actualPath}` : undefined,
          icon: config?.icon,
          isCurrentPage: isLastSegment
        });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <div className="flex items-center justify-between w-full">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem className={crumb.isCurrentPage ? "" : "hidden md:block"}>
                {crumb.isCurrentPage ? (
                  <BreadcrumbPage className="flex items-center gap-2">
                    {crumb.icon && <crumb.icon className="h-4 w-4" />}
                    {crumb.label}
                  </BreadcrumbPage>
                ) : crumb.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href} className="flex items-center gap-2">
                      {crumb.icon && <crumb.icon className="h-4 w-4" />}
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {crumb.icon && <crumb.icon className="h-4 w-4" />}
                    {crumb.label}
                  </span>
                )}
              </BreadcrumbItem>
              {index < breadcrumbs.length - 1 && (
                <BreadcrumbSeparator className="hidden md:block" />
              )}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="flex items-center gap-2">
        <AdminNotifications />
        <SystemUpdateNotes />
      </div>
    </div>
  );
}