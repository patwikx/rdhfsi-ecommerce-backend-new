import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { QRScanner } from '@/components/admin/scanner/qr-scanner';

export default async function ScannerPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Product Scanner</h1>
        <p className="text-muted-foreground">
          Scan product QR codes or enter SKU/Barcode to view details
        </p>
      </div>

      <QRScanner />
    </div>
  );
}
