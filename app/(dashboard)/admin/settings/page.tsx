import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAllSystemSettings } from '@/app/actions/system-settings-actions';
import { SystemSettingsList } from '@/components/admin/settings/system-settings-list';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Type, Hash, ToggleLeft, Calendar } from 'lucide-react';
import Link from 'next/link';

export default async function SystemSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const result = await getAllSystemSettings();
  const settings = result.success && result.data ? result.data : [];

  const stringCount = settings.filter(s => s.dataType === 'STRING').length;
  const numberCount = settings.filter(s => s.dataType === 'NUMBER').length;
  const booleanCount = settings.filter(s => s.dataType === 'BOOLEAN').length;
  const otherCount = settings.filter(s => !['STRING', 'NUMBER', 'BOOLEAN'].includes(s.dataType)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Configure system-wide settings and preferences
          </p>
        </div>
        {session.user.role === 'ADMIN' && (
          <Link href="/admin/settings/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Setting
            </Button>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Total Settings</p>
          </div>
          <p className="text-2xl font-bold">{settings.length}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Type className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-muted-foreground">String</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{stringCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-medium text-muted-foreground">Number</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{numberCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ToggleLeft className="h-4 w-4 text-orange-600" />
            <p className="text-sm font-medium text-muted-foreground">Boolean</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">{booleanCount}</p>
        </div>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <SystemSettingsList settings={settings} userRole={session.user.role} />
      </Suspense>
    </div>
  );
}
