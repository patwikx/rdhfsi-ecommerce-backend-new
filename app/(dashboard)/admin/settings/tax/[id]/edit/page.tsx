import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { getAllTaxRates } from '@/app/actions/tax-actions';
import { TaxRateForm } from '@/components/admin/settings/tax-rate-form';

export default async function EditTaxRatePage({
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
  const result = await getAllTaxRates();
  const taxRate = result.data?.find((t) => t.id === id);

  if (!taxRate) {
    notFound();
  }

  return <TaxRateForm taxRate={taxRate} />;
}
