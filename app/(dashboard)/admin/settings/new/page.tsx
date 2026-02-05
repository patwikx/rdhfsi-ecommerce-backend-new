import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { SystemSettingForm } from '@/components/admin/settings/system-settings-form';

export default async function NewSystemSettingPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }
  
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return <SystemSettingForm />;
}
