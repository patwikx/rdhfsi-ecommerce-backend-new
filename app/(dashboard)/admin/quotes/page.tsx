import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getAllQuotes } from '@/app/actions/quote-actions';
import { QuoteList } from '@/components/admin/quotes/quote-list';
import { FileText, Clock, CheckCircle, XCircle } from 'lucide-react';

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const quotesResult = await getAllQuotes({
    status: params.status as
      | 'PENDING'
      | 'REVIEWED'
      | 'QUOTED'
      | 'ACCEPTED'
      | 'DECLINED'
      | 'EXPIRED'
      | undefined,
    search: params.search,
  });

  const quotes = quotesResult.success ? quotesResult.data || [] : [];

  // Calculate stats
  const pendingCount = quotes.filter((q) => q.status === 'PENDING').length;
  const quotedCount = quotes.filter((q) => q.status === 'QUOTED').length;
  const acceptedCount = quotes.filter((q) => q.status === 'ACCEPTED').length;
  const declinedCount = quotes.filter((q) => q.status === 'DECLINED').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Quote Requests</h1>
        <p className="text-muted-foreground">
          Manage customer quote requests and provide pricing
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">
              Total Quotes
            </p>
          </div>
          <p className="text-2xl font-bold">{quotes.length}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            <p className="text-sm font-medium text-muted-foreground">Pending</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Quoted</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{quotedCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-muted-foreground">Accepted</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{acceptedCount}</p>
        </div>
      </div>

      <QuoteList quotes={quotes} userRole={session.user.role} />
    </div>
  );
}
