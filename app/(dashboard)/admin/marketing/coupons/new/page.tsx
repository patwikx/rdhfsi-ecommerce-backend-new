import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { CouponForm } from '@/components/admin/marketing/coupon-form';

export default async function NewCouponPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/login');
  }
  
  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <CouponForm />
    </div>
  );
}
