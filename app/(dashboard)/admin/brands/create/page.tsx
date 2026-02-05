import { BrandForm } from '@/components/admin/brands/brand-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function CreateBrandPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    redirect('/admin/brands');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/brands">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Brand</h1>
          <p className="text-muted-foreground">Add a new product brand</p>
        </div>
      </div>

      <BrandForm />
    </div>
  );
}
