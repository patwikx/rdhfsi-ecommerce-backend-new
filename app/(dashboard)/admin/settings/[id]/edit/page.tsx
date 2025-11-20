import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { getAllSystemSettings } from '@/app/actions/system-settings-actions';
import { SystemSettingForm } from '@/components/admin/settings/system-settings-form';

export default async function EditSystemSettingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }
  
  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const { id } = await params;
  const result = await getAllSystemSettings();
  const setting = result.data?.find((s) => s.id === id);

  if (!setting) {
    notFound();
  }

  return <SystemSettingForm setting={setting} />;
}
