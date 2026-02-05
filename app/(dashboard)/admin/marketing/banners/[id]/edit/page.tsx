import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { getAllBanners } from '@/app/actions/banner-actions';
import { BannerForm } from '@/components/admin/marketing/banner-form';

export default async function EditBannerPage({
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
  const result = await getAllBanners();
  const banner = result.data?.find((b) => b.id === id);

  if (!banner) {
    notFound();
  }

  return <BannerForm banner={banner} />;
}
