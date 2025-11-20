import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { getAllCoupons } from '@/app/actions/coupon-actions';
import { CouponForm } from '@/components/admin/marketing/coupon-form';

export default async function EditCouponPage({
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
  const result = await getAllCoupons();
  const coupon = result.data?.find((c) => c.id === id);

  if (!coupon) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <CouponForm coupon={coupon} />
    </div>
  );
}
