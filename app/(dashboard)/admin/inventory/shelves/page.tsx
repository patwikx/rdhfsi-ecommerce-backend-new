'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  QrCode,
  Package,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { getShelves, getSites, deleteShelf } from '@/app/actions/shelf-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useCurrentSite } from '@/hooks/use-current-site'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type Shelf = {
  id: string
  code: string
  name: string
  level: number | null
  position: number | null
  isActive: boolean
  isAccessible: boolean
  site: {
    id: string
    name: string
    code: string
  }
  aisle: {
    id: string
    name: string
    code: string
  } | null
  _count: {
    binInventories: number
  }
}

type Site = {
  id: string
  code: string
  name: string
  type: string
}

export default function ShelvesPage() {
  const router = useRouter()
  const { siteId } = useCurrentSite()
  const [shelves, setShelves] = useState<Shelf[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [siteFilter, setSiteFilter] = useState<string>('current')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null)

  const fetchShelves = async () => {
    try {
      // Determine which site to filter by
      let filterSiteId: string | undefined
      if (siteFilter === 'current') {
        filterSiteId = siteId || undefined
      } else if (siteFilter !== 'all') {
        filterSiteId = siteFilter
      }

      const result = await getShelves({
        siteId: filterSiteId,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
        search: searchQuery || undefined,
      })

      if (result.success && result.data) {
        setShelves(result.data)
      } else {
        toast.error(result.error || 'Failed to fetch shelves')
      }
    } catch (error) {
      toast.error('An error occurred while fetching shelves')
    }
  }

  const fetchSites = async () => {
    try {
      const result = await getSites()
      if (result.success && result.data) {
        setSites(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch sites:', error)
    }
  }

  useEffect(() => {
    if (siteId || siteFilter !== 'current') {
      fetchShelves()
    }
  }, [siteFilter, statusFilter, searchQuery, siteId])

  useEffect(() => {
    fetchSites()
  }, [])

  const handleDeleteShelf = async () => {
    if (!selectedShelfId) return

    try {
      const result = await deleteShelf(selectedShelfId)
      if (result.success) {
        toast.success(result.message)
        fetchShelves()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to delete shelf')
    } finally {
      setDeleteDialogOpen(false)
      setSelectedShelfId(null)
    }
  }

  // Calculate stats
  const totalShelves = shelves.length
  const activeShelves = shelves.filter(s => s.isActive).length
  const shelvesWithInventory = shelves.filter(s => s._count.binInventories > 0).length

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Shelf Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage warehouse shelves and bin locations
          </p>
        </div>
        <Button onClick={() => router.push('/admin/inventory/shelves/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Shelf
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Total Shelves</p>
          </div>
          <p className="text-2xl font-bold">{totalShelves}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-muted-foreground">Active</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{activeShelves}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm font-medium text-muted-foreground">Inactive</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{totalShelves - activeShelves}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-medium text-muted-foreground">With Inventory</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{shelvesWithInventory}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={siteFilter} onValueChange={setSiteFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by site" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Current Site</SelectItem>
            <SelectItem value="all">All Sites</SelectItem>
            {sites.map((site) => (
              <SelectItem key={site.id} value={site.id}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        Showing {shelves.length} shelves
      </div>

      {/* Table */}
      {shelves.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No shelves found</p>
          <p className="text-sm text-muted-foreground mt-2">Create your first shelf to get started</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Aisle</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Inventory Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shelves.map((shelf) => (
                <TableRow key={shelf.id}>
                  <TableCell className="font-medium">{shelf.code}</TableCell>
                  <TableCell>{shelf.name}</TableCell>
                  <TableCell>{shelf.site.name}</TableCell>
                  <TableCell>{shelf.aisle?.code || '-'}</TableCell>
                  <TableCell>{shelf.level || '-'}</TableCell>
                  <TableCell>{shelf.position || '-'}</TableCell>
                  <TableCell>{shelf._count.binInventories}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant={shelf.isActive ? 'default' : 'secondary'}>
                        {shelf.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {!shelf.isAccessible && (
                        <Badge variant="destructive">Blocked</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/inventory/shelves/${shelf.id}`)}
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedShelfId(shelf.id)
                            setDeleteDialogOpen(true)
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the shelf. This action cannot be undone.
              Shelves with inventory cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteShelf}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
