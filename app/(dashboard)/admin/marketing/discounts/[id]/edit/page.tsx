import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { getAllDiscountTypes } from '@/app/actions/discount-actions';
import { DiscountForm } from '@/components/admin/marketing/discount-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function EditDiscountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const { id } = await params;
  const result = await getAllDiscountTypes();
  const discount = result.data?.find((d) => d.id === id);

  if (!discount) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <DiscountForm discount={discount} />
    </div>
  );
}
