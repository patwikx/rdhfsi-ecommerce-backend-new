import { getSiteById } from '@/app/actions/site-actions';
import { SiteForm } from '@/components/admin/sites/site-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';

export default async function EditSitePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/admin/sites');
  }

  const siteResult = await getSiteById(id);

  if (!siteResult.success || !siteResult.data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/sites">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Site</h1>
          <p className="text-muted-foreground">Update site information</p>
        </div>
      </div>

      <SiteForm site={siteResult.data} />
    </div>
  );
}
