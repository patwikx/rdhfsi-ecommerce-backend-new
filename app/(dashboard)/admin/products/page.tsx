import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ProductsPageClient } from '@/components/admin/products/products-page-client';

export default async function ProductsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  return <ProductsPageClient userRole={session.user.role} />;
}
