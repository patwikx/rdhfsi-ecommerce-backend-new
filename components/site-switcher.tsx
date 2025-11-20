"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { 
  Store, 
  Warehouse, 
  Tag,
  Check, 
  ChevronsUpDown 
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
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

import { useSiteModal } from "@/hooks/use-site-modal"
import { useActiveSite } from "@/hooks/use-active-site"
import type { SiteItem } from "@/types/site-types"

interface SiteSwitcherProps {
  items: SiteItem[]
  className?: string
  userRole?: string
}

// Icon mapping based on site type
const getSiteIcon = (type: string, isMarkdown: boolean) => {
  if (isMarkdown) return Tag
  if (type === 'WAREHOUSE') return Warehouse
  return Store
}

const getSiteTypeLabel = (type: string, isMarkdown: boolean): string => {
  if (isMarkdown) return 'Markdown/Sale Site'
  if (type === 'WAREHOUSE') return 'Warehouse'
  if (type === 'STORE') return 'Store'
  return 'Site'
}

export default function SiteSwitcher({ 
  className, 
  items = [],
  userRole,
}: SiteSwitcherProps) {
  const siteModal = useSiteModal()
  const activeSite = useActiveSite()
  const router = useRouter()
  const { isMobile } = useSidebar()
  const [open, setOpen] = React.useState<boolean>(false)

  // ADMIN, MANAGER, and STAFF can switch sites
  const canSwitchSites = ['ADMIN', 'MANAGER', 'STAFF'].includes(userRole || '')
  const isSwitcherActive = items.length > 1 && canSwitchSites
  
  // Get current site from active site hook or default to first item
  const currentSiteId = activeSite.id || items[0]?.id
  const currentSite = items.find((item) => item.id === currentSiteId) || items[0]

  // Set initial active site
  React.useEffect(() => {
    if (!activeSite.id && items.length > 0) {
      activeSite.set(items[0].id)
    }
  }, [activeSite, items])

  const onSiteSelect = React.useCallback((selectedSiteId: string) => {
    setOpen(false)
    activeSite.set(selectedSiteId)
    // Optionally refresh the page or update URL
    router.refresh()
  }, [activeSite, router])

  const handleAddSite = React.useCallback(() => {
    setOpen(false)
    siteModal.onOpen()
  }, [siteModal])

  // Get current site info
  const CurrentIcon = currentSite ? getSiteIcon(currentSite.type, currentSite.isMarkdown) : Store
  const currentSiteName = currentSite?.name ?? "No Site Selected"
  const currentSiteType = currentSite ? getSiteTypeLabel(currentSite.type, currentSite.isMarkdown) : 'Site'

  // Static display for single site users
  if (!isSwitcherActive) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className={cn(
              "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
              className
            )}
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <CurrentIcon className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                {currentSiteName}
              </span>
              <span className="truncate text-xs">
                {currentSite?.code ? `${currentSite.code} • ${currentSiteType}` : currentSiteType}
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // Interactive dropdown for multi-site users
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <CurrentIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {currentSiteName}
                </span>
                <span className="truncate text-xs">
                  {currentSite?.code ? `${currentSite.code} • ${currentSiteType}` : currentSiteType}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* Active Sites Section */}
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Sites & Locations
            </DropdownMenuLabel>

            {/* Current/Selected item */}
            {currentSite && (
              <DropdownMenuItem
                onClick={() => onSiteSelect(currentSite.id)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm bg-sidebar-primary text-sidebar-primary-foreground">
                  {React.createElement(getSiteIcon(currentSite.type, currentSite.isMarkdown), { className: "size-3" })}
                </div>
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <div className="font-medium truncate">
                    {currentSite.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {currentSite.code} • {getSiteTypeLabel(currentSite.type, currentSite.isMarkdown)}
                  </div>
                </div>
                <Check className="ml-auto size-4" />
              </DropdownMenuItem>
            )}

            {/* Other sites */}
            {items
              .filter((item): item is SiteItem => item.id !== currentSite?.id && item.isActive)
              .map((item) => {
                const SiteIcon = getSiteIcon(item.type, item.isMarkdown)
                return (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => onSiteSelect(item.id)}
                    className="gap-2 p-2"
                  >
                    <div className="flex size-6 items-center justify-center rounded-sm bg-sidebar-primary text-sidebar-primary-foreground">
                      <SiteIcon className="size-3" />
                    </div>
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <div className="font-medium truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.code} • {getSiteTypeLabel(item.type, item.isMarkdown)}
                      </div>
                    </div>
                  </DropdownMenuItem>
                )
              })}

            {userRole === 'ADMIN' && (
              <>
                <DropdownMenuSeparator />
                {/* Add Site Option - Admin only */}
                <DropdownMenuItem
                  onClick={handleAddSite}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border border-dashed">
                    <Store className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <div className="font-medium">Manage Sites</div>
                    <div className="text-xs text-muted-foreground">
                      Add or edit sites
                    </div>
                  </div>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
