'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Eye, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getCanvassings } from '@/app/actions/canvassing-simple-actions'

type Canvassing = {
  id: string
  legacyDocCode: string
  legacyRefCode: string | null
  siteCode: string
  partyName: string | null
  partyTermsText: string | null
  status: string
  itemCount: number
  createdAt: Date
}

const statusColors = {
  IN_PROGRESS: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-gray-500'
}

const statusLabels = {
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
}

export default function CanvassingPage() {
  const router = useRouter()
  const [canvassings, setCanvassings] = useState<Canvassing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadCanvassings()
  }, [page, status])

  const loadCanvassings = async () => {
    setIsLoading(true)
    try {
      const result = await getCanvassings({
        page,
        limit: 20,
        search: search || undefined,
        status: status === 'all' ? undefined : status
      })

      if (result.success && result.data) {
        setCanvassings(result.data.data)
        setTotal(result.data.total)
        setTotalPages(result.data.totalPages)
      }
    } catch (error) {
      console.error('Failed to load canvassings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    loadCanvassings()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-6 gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Canvassing</h1>
            <p className="text-sm text-muted-foreground">
              Compare supplier prices for purchase requests
            </p>
          </div>
          <Button onClick={() => router.push('/admin/canvassing/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New Canvassing
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Search by PR# or supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="max-w-sm"
            />
            <Button onClick={handleSearch} variant="secondary">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : canvassings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No canvassings found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push('/admin/canvassing/new')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Canvassing
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PR #</TableHead>
                    <TableHead>Ref Code</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {canvassings.map((canvassing) => (
                    <TableRow key={canvassing.id}>
                      <TableCell className="font-medium">
                        {canvassing.legacyDocCode}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {canvassing.legacyRefCode || '-'}
                      </TableCell>
                      <TableCell>{canvassing.partyName || '-'}</TableCell>
                      <TableCell>{canvassing.siteCode}</TableCell>
                      <TableCell className="text-center">
                        {canvassing.itemCount}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={statusColors[canvassing.status as keyof typeof statusColors]}
                        >
                          {statusLabels[canvassing.status as keyof typeof statusLabels]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(canvassing.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/admin/canvassing/${canvassing.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {canvassings.length} of {total} canvassings
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-2 px-4">
                      <span className="text-sm">
                        Page {page} of {totalPages}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
