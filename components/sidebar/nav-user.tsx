// nav-user.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  LogOut,
  Settings,
  User,
  Moon,
  Sun,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { useTheme } from "next-themes"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { toast } from "sonner"

interface NavUserProps {
  user: {
    id?: string
    name: string
    email: string
    avatar: string
    role: string
  }
}

// Helper function to get user initials for avatar fallback
function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar()
  const { setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Handle hydration
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleSignOut = React.useCallback(async () => {
    try {
      await signOut({ 
        callbackUrl: '/auth/login',
        redirect: true 
      })
    } catch (error) {
      // Ignore NEXT_REDIRECT errors - they're expected during signOut
      const isRedirectError = 
        error instanceof Error && 
        ('digest' in error && typeof error.digest === 'string' && error.digest.includes('NEXT_REDIRECT'))
      
      if (isRedirectError) {
        return // This is expected, not an error
      }
      
      toast.error(`Sign out error: ${error}`)
    }
  }, [])

  const userInitials = React.useMemo(() => getUserInitials(user.name), [user.name])

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage 
                  src={user.avatar || undefined}
                  alt={user.name}
                />
                <AvatarFallback className="rounded-lg">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground capitalize">
                  {user.role.toLowerCase()}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage 
                    src={user.avatar || undefined}
                    alt={user.name}
                  />
                  <AvatarFallback className="rounded-lg">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            {/* User Info Section */}
            <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-3 w-3" />
                <span className="capitalize">{user.role.toLowerCase()} Account</span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/settings/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell className="mr-2 h-4 w-4" />
                <span>Notifications</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Theme Toggle Section */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Theme
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2 h-4 w-4" />
                <span>Light</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2 h-4 w-4" />
                <span>Dark</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>System</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
