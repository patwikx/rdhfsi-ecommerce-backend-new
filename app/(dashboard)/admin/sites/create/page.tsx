import { SiteForm } from '@/components/admin/sites/site-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function CreateSitePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/admin/sites');
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
          <h1 className="text-3xl font-bold text-foreground">Create Site</h1>
          <p className="text-muted-foreground">Add a new warehouse or store location</p>
        </div>
      </div>

      <SiteForm />
    </div>
  );
}
