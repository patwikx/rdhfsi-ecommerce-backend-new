import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAllTaxRates } from '@/app/actions/tax-actions';
import { TaxRateList } from '@/components/admin/settings/tax-rate-list';
import { Button } from '@/components/ui/button';
import { Plus, Receipt, Globe, CheckCircle, Percent } from 'lucide-react';
import Link from 'next/link';

export default async function TaxRatesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const result = await getAllTaxRates();
  const taxRates = result.success && result.data ? result.data : [];

  const activeCount = taxRates.filter(t => t.isActive).length;
  const countryCount = new Set(taxRates.map(t => t.country)).size;
  const avgRate = taxRates.length > 0
    ? (taxRates.reduce((sum, t) => sum + t.rate, 0) / taxRates.length).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Rates</h1>
          <p className="text-muted-foreground">
            Manage tax rates and rules for your store
          </p>
        </div>
        <Link href="/admin/settings/tax/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Tax Rate
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Total Tax Rates</p>
          </div>
          <p className="text-2xl font-bold">{taxRates.length}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-muted-foreground">Active</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-medium text-muted-foreground">Countries</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{countryCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="h-4 w-4 text-orange-600" />
            <p className="text-sm font-medium text-muted-foreground">Average Rate</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">{avgRate}%</p>
        </div>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <TaxRateList taxRates={taxRates} userRole={session.user.role} />
      </Suspense>
    </div>
  );
}
