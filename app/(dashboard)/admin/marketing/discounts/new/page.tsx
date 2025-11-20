import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { DiscountForm } from '@/components/admin/marketing/discount-form';

export default async function NewDiscountPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <DiscountForm />
    </div>
  );
}
