import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAllCustomers } from '@/app/actions/customer-actions';
import { CustomerList } from '@/components/admin/customers/customer-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Search, Filter } from 'lucide-react';

type SearchParams = Promise<{
  search?: string;
  role?: string;
  status?: string;
}>;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const params = await searchParams;

  const result = await getAllCustomers({
    search: params.search,
    role: params.role as 'CUSTOMER' | 'CORPORATE' | undefined,
    isActive: params.status === 'active' ? true : params.status === 'inactive' ? false : undefined,
  });

  const customers = result.success && result.data ? result.data : [];

  // Calculate stats
  const activeCount = customers.filter(c => c.isActive).length;
  const corporateCount = customers.filter(c => c.role === 'CORPORATE').length;
  const retailCount = customers.filter(c => c.role === 'CUSTOMER').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage customer accounts and view order history
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
          </div>
          <p className="text-2xl font-bold">{customers.length}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-muted-foreground">Active</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-medium text-muted-foreground">Corporate</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{corporateCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-orange-600" />
            <p className="text-sm font-medium text-muted-foreground">Retail</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">{retailCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, or company..."
            className="pl-10"
            defaultValue={params.search}
            name="search"
          />
        </div>
        <Select defaultValue={params.role || 'all'} name="role">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Customer Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="CUSTOMER">Customer</SelectItem>
            <SelectItem value="CORPORATE">Corporate</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue={params.status || 'all'} name="status">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </div>

      {/* Customer List */}
      <Suspense fallback={<div>Loading...</div>}>
        <CustomerList customers={customers} userRole={session.user.role} />
      </Suspense>
    </div>
  );
}
