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
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination'
import { Badge } from '@/components/ui/badge'
import { 
  UserPlus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Power,
  Loader,
  Users,
  UserCheck,
  UserX,
  Shield
} from 'lucide-react'
import { getUsers, toggleUserStatus, deleteUser, getUserStats } from '@/app/actions/user-management'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
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

type User = {
  id: string
  name: string | null
  email: string
  phone: string | null
  companyName: string | null
  role: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count: {
    orders: number
  }
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    adminCount: 0,
    managerCount: 0,
    staffCount: 0,
  })

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const result = await getUsers({
        page: currentPage,
        limit: 10,
        search: searchQuery || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      })

      if (result.success && result.data) {
        setUsers(result.data.users)
        setTotalPages(result.data.pagination.totalPages)
        setTotal(result.data.pagination.total)
      } else {
        toast.error(result.error || 'Failed to fetch users')
      }
    } catch (error) {
      toast.error('An error occurred while fetching users')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const result = await getUserStats()
      if (result.success && result.data) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchStats()
  }, [currentPage, searchQuery, roleFilter, statusFilter])

  const handleToggleStatus = async (userId: string) => {
    try {
      const result = await toggleUserStatus(userId)
      if (result.success) {
        toast.success(result.message)
        fetchUsers()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to toggle user status')
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUserId) return

    try {
      const result = await deleteUser(selectedUserId)
      if (result.success) {
        toast.success(result.message)
        fetchUsers()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to delete user')
    } finally {
      setDeleteDialogOpen(false)
      setSelectedUserId(null)
    }
  }

  const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (role) {
      case 'ADMIN':
        return 'destructive'
      case 'MANAGER':
        return 'default'
      case 'STAFF':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage users, roles, and permissions
          </p>
        </div>
        <Button onClick={() => router.push('/admin/users/new')}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Total Users</p>
          </div>
          <p className="text-2xl font-bold">{stats.totalUsers}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-muted-foreground">Active</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.activeUsers}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserX className="h-4 w-4 text-red-600" />
            <p className="text-sm font-medium text-muted-foreground">Inactive</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.inactiveUsers}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-medium text-muted-foreground">Admins</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{stats.adminCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10"
            />
          </div>
        </div>

        <Select
          value={roleFilter}
          onValueChange={(value) => {
            setRoleFilter(value)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="STAFF">Staff</SelectItem>
            <SelectItem value="MANAGER">Manager</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value)
            setCurrentPage(1)
          }}
        >
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
        Showing {users.length} of {total} users
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader className="w-6 h-6 animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No users found</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || '-'}</TableCell>
                    <TableCell>{user.companyName || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user._count.orders}</TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
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
                            onClick={() => router.push(`/admin/users/${user.id}`)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(user.id)}
                          >
                            <Power className="w-4 h-4 mr-2" />
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUserId(user.id)
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

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={(e) => {
                      if (currentPage === 1) {
                        e.preventDefault()
                        return
                      }
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }}
                    className={
                      currentPage === 1
                        ? 'pointer-events-none opacity-50'
                        : 'cursor-pointer'
                    }
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={(e) => {
                      if (currentPage === totalPages) {
                        e.preventDefault()
                        return
                      }
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }}
                    className={
                      currentPage === totalPages
                        ? 'pointer-events-none opacity-50'
                        : 'cursor-pointer'
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the user account. This action can be reversed by
              reactivating the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
