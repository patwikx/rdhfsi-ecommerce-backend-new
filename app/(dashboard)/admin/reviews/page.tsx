import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAllReviews } from '@/app/actions/review-actions';
import { ReviewList } from '@/components/admin/reviews/review-list';
import { Star, MessageSquare, CheckCircle, Clock } from 'lucide-react';

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: 'pending' | 'approved' | 'all' }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const filter = params.filter || 'all';
  
  const result = await getAllReviews(filter);
  const reviews = result.success && result.data ? result.data : [];

  const pendingCount = reviews.filter(r => !r.isApproved).length;
  const approvedCount = reviews.filter(r => r.isApproved).length;
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
          <p className="text-muted-foreground">
            Manage customer product reviews and ratings
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Total Reviews</p>
          </div>
          <p className="text-2xl font-bold">{reviews.length}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <p className="text-sm font-medium text-muted-foreground">Pending</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-muted-foreground">Approved</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-yellow-600" />
            <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{avgRating}</p>
        </div>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <ReviewList reviews={reviews} userRole={session.user.role} currentFilter={filter} />
      </Suspense>
    </div>
  );
}
