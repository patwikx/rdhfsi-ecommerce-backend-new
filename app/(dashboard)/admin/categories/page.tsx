import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { CategoriesPageClient } from '@/components/admin/categories/categories-page-client';

export default async function CategoriesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  return <CategoriesPageClient userRole={session.user.role} />;
}
