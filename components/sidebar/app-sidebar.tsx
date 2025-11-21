// app-sidebar.tsx
"use client"

import * as React from "react"
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText, 
  Settings, 
  Tag, 
  Warehouse,
  TrendingUp,
  MessageSquare,
  BarChart3,
  DollarSign
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { Session } from "next-auth"
import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import SiteSwitcher from "../site-switcher"
import type { SiteItem } from "@/types/site-types"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  session: Session
  sites?: SiteItem[]
  pendingCounts?: {
    orders?: number
    quotes?: number
    lowStock?: number
  }
}

// Type for navigation sub-items
type NavSubItem = {
  title: string
  url: string
  badge?: number
  badgeVariant?: "default" | "secondary" | "destructive" | "outline"
}

// Type for navigation items
type NavItem = {
  title: string
  url: string
  icon: typeof LayoutDashboard
  isActive?: boolean
  badge?: number
  badgeVariant?: "default" | "secondary" | "destructive" | "outline"
  items?: NavSubItem[]
}

// Define navigation items based on e-commerce system
const getNavigationItems = (
  userRole: string,
  pendingCounts?: {
    orders?: number
    quotes?: number
    lowStock?: number
  }
): NavItem[] => {
  const isAdmin = ['ADMIN', 'MANAGER', 'STAFF'].includes(userRole)
  const isCustomer = userRole === 'CUSTOMER' || userRole === 'CORPORATE'

  // Base items for all users
  const baseItems: NavItem[] = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
  ]

  // Admin/Staff navigation
  if (isAdmin) {
    baseItems.push(
                 {
        title: "Working Capital",
        url: "/admin/working-cap",
        icon: DollarSign,
      },
      {
        title: "Products",
        url: "/admin/products",
        icon: Package,
        items: [
          {
            title: "All Products",
            url: "/admin/products",
          },
          {
            title: "Add Product",
            url: "/admin/products/create",
          },
          {
            title: "Categories",
            url: "/admin/categories",
          },
          {
            title: "Brands",
            url: "/admin/brands",
          },
        ],
      },
      {
        title: "Orders",
        url: "/admin/orders",
        icon: ShoppingCart,
        badge: pendingCounts?.orders,
        items: [
          {
            title: "All Orders",
            url: "/admin/orders",
          },
          {
            title: "Pending",
            url: "/admin/orders?status=PENDING",
            badge: pendingCounts?.orders,
          },
          {
            title: "Processing",
            url: "/admin/orders?status=PROCESSING",
          },
          {
            title: "Shipped",
            url: "/admin/orders?status=SHIPPED",
          },
        ],
      },
      {
        title: "Customers",
        url: "/admin/customers",
        icon: Users,
        items: [
          {
            title: "All Customers",
            url: "/admin/customers",
          },
          {
            title: "Retail",
            url: "/admin/customers?role=CUSTOMER",
          },
          {
            title: "Corporate",
            url: "/admin/customers?role=CORPORATE",
          },
        ],
      },
      {
        title: "Marketing",
        url: "/admin/marketing",
        icon: Tag,
        items: [
          {
            title: "Discounts",
            url: "/admin/marketing/discounts",
          },
          {
            title: "Coupons",
            url: "/admin/marketing/coupons",
          },
          {
            title: "Banners",
            url: "/admin/marketing/banners",
          },
        ],
      },
      {
        title: "Inventory",
        url: "/admin/inventory",
        icon: Warehouse,
        badge: pendingCounts?.lowStock,
        badgeVariant: "destructive",
        items: [
          {
            title: "Sync to Barter",
            url: "/admin/inventory/sync",
          },
          {
            title: "Stock Levels",
            url: "/admin/inventory",
          },
          {
            title: "Low Stock Alert",
            url: "/admin/inventory/low-stock",
            badge: pendingCounts?.lowStock,
            badgeVariant: "destructive",
          },
          {
            title: "Stock Transfer",
            url: "/admin/inventory/transfer",
          },
          {
            title: "Sites",
            url: "/admin/sites",
          },
        ],
      },
      {
        title: "Quotes",
        url: "/admin/quotes",
        icon: FileText,
        badge: pendingCounts?.quotes,
        items: [
          {
            title: "All Quotes",
            url: "/admin/quotes",
          },
          {
            title: "Pending Quotes",
            url: "/admin/quotes/pending",
            badge: pendingCounts?.quotes,
          },
        ],
      },
      {
        title: "Reviews",
        url: "/admin/reviews",
        icon: MessageSquare,
      },
      {
        title: "Reports",
        url: "/admin/reports",
        icon: BarChart3,
        items: [
          {
            title: "Sales Report",
            url: "/admin/reports/sales",
          },
          {
            title: "Product Analytics",
            url: "/admin/reports/products",
          },
          {
            title: "Customer Analytics",
            url: "/admin/reports/customers",
          },
        ],
      }
    )
  }

  // Settings for all users
  baseItems.push({
    title: "Settings",
    url: "/settings",
    icon: Settings,
    items: [
      {
        title: "Profile",
        url: "/settings/profile",
      },
      ...(isAdmin ? [
        {
          title: "System Settings",
          url: "/admin/settings",
        },
        {
          title: "Tax Rates",
          url: "/admin/settings/tax",
        }
      ] : []),
    ],
  })

  return baseItems
}

export function AppSidebar({ 
  session, 
  sites = [],
  pendingCounts,
  ...props 
}: AppSidebarProps) {
  const navItems = React.useMemo(() => 
    getNavigationItems(
      session.user.role,
      pendingCounts
    ),
    [session.user.role, pendingCounts]
  )

  const userData = React.useMemo(() => {
    const user = session.user
    return {
      id: user.id,
      name: user.name || 'User',
      email: user.email || '',
      avatar: user.image || '',
      role: user.role,
    }
  }, [session.user])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {sites.length > 0 ? (
          <SiteSwitcher 
            items={sites}
            userRole={session.user.role}
          />
        ) : (
          <div className="flex items-center gap-2 px-4 py-2">
            <Package className="h-6 w-6" />
            <span className="font-semibold">E-Commerce</span>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
