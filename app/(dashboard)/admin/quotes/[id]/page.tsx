import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { getQuoteById } from '@/app/actions/quote-actions';
import { QuoteDetails } from '@/components/admin/quotes/quote-details';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function QuoteDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    redirect('/admin/quotes');
  }

  const quoteResult = await getQuoteById(id);

  if (!quoteResult.success || !quoteResult.data) {
    notFound();
  }

  const quote = quoteResult.data;

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    REVIEWED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    QUOTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    DECLINED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    EXPIRED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/quotes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{quote.quoteNumber}</h1>
          <p className="text-muted-foreground">{quote.customerName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColors[quote.status]}>
            {quote.status}
          </Badge>
          {quote.validUntil && new Date(quote.validUntil) < new Date() && (
            <Badge variant="destructive">Expired</Badge>
          )}
        </div>
      </div>

      <QuoteDetails quote={quote} userRole={session.user.role} />
    </div>
  );
}
