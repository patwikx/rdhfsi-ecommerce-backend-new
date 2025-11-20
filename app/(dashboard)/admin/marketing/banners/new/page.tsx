import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { BannerForm } from '@/components/admin/marketing/banner-form';

export default async function NewBannerPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/login');
  }
  
  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  return <BannerForm />;
}
