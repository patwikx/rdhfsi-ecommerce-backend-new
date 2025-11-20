import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { TaxRateForm } from '@/components/admin/settings/tax-rate-form';

export default async function NewTaxRatePage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }
  
  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  return <TaxRateForm />;
}
