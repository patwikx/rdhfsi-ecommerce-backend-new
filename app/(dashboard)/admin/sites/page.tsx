import { getAllSites } from '@/app/actions/site-actions';
import { SiteList } from '@/components/admin/sites/site-list';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function SitesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const sitesResult = await getAllSites();

  if (!sitesResult.success) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">Error Loading Sites</h2>
          <p className="text-muted-foreground">{sitesResult.error}</p>
        </div>
      </div>
    );
  }

  const sites = sitesResult.data || [];

  // Calculate stats
  const activeCount = sites.filter(s => s.isActive).length;
  const storeCount = sites.filter(s => s.type === 'STORE').length;
  const warehouseCount = sites.filter(s => s.type === 'WAREHOUSE').length;
  const markdownCount = sites.filter(s => s.type === 'MARKDOWN').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sites</h1>
          <p className="text-muted-foreground">
            Manage warehouse and store locations
          </p>
        </div>
        {session.user.role === 'ADMIN' && (
          <Button asChild>
            <Link href="/admin/sites/create">
              <Plus className="h-4 w-4 mr-2" />
              Add Site
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Total Sites</p>
          </div>
          <p className="text-2xl font-bold">{sites.length}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-muted-foreground">Stores</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{storeCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-medium text-muted-foreground">Warehouses</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{warehouseCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="h-4 w-4 text-orange-600" />
            <p className="text-sm font-medium text-muted-foreground">Markdown</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">{markdownCount}</p>
        </div>
      </div>

      <SiteList sites={sites} userRole={session.user.role} />
    </div>
  );
}
