'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Trash2, Star, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { approveReview, rejectReview, deleteReview, bulkApproveReviews, bulkDeleteReviews } from '@/app/actions/review-actions';
import { toast } from 'sonner';
import type { ReviewListItem } from '@/app/actions/review-actions';
import { useRouter } from 'next/navigation';

type ReviewListProps = {
  reviews: ReviewListItem[];
  userRole: string;
  currentFilter: string;
};

export function ReviewList({ reviews, userRole, currentFilter }: ReviewListProps) {
  const router = useRouter();
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const totalPages = Math.ceil(reviews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReviews = reviews.slice(startIndex, endIndex);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReviews(currentReviews.map(r => r.id));
    } else {
      setSelectedReviews([]);
    }
  };

  const handleSelectReview = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedReviews([...selectedReviews, id]);
    } else {
      setSelectedReviews(selectedReviews.filter(rid => rid !== id));
    }
  };

  const handleApprove = async (id: string) => {
    const result = await approveReview(id);
    if (result.success) {
      toast.success('Review approved');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to approve review');
    }
  };

  const handleReject = async (id: string) => {
    const result = await rejectReview(id);
    if (result.success) {
      toast.success('Review rejected');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to reject review');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    const result = await deleteReview(id);
    if (result.success) {
      toast.success('Review deleted');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to delete review');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedReviews.length === 0) return;

    const result = await bulkApproveReviews(selectedReviews);
    if (result.success) {
      toast.success(`${selectedReviews.length} reviews approved`);
      setSelectedReviews([]);
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to approve reviews');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedReviews.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedReviews.length} reviews?`)) return;

    const result = await bulkDeleteReviews(selectedReviews);
    if (result.success) {
      toast.success(`${selectedReviews.length} reviews deleted`);
      setSelectedReviews([]);
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to delete reviews');
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: (number | string)[] = [];
    const showEllipsis = totalPages > 7;

    if (showEllipsis) {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    } else {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    }

    return (
      <div className="flex items-center justify-between border-t pt-4">
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1} to {Math.min(endIndex, reviews.length)} of {reviews.length} reviews
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          {pages.map((page, index) =>
            typeof page === 'number' ? (
              <Button
                key={index}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ) : (
              <span key={index} className="px-3 py-2 text-muted-foreground">
                {page}
              </span>
            )
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <Tabs value={currentFilter} onValueChange={(value) => router.push(`/admin/reviews?filter=${value}`)}>
        <TabsList>
          <TabsTrigger value="all">All Reviews</TabsTrigger>
          <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Bulk Actions */}
      {selectedReviews.length > 0 && (
        <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/50">
          <span className="text-sm font-medium">{selectedReviews.length} selected</span>
          <Button size="sm" onClick={handleBulkApprove}>
            <Check className="w-4 h-4 mr-2" />
            Approve Selected
          </Button>
          {userRole === 'ADMIN' && (
            <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </Button>
          )}
        </div>
      )}

      {/* Reviews Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedReviews.length === currentReviews.length && currentReviews.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentReviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No reviews found
                </TableCell>
              </TableRow>
            ) : (
              currentReviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedReviews.includes(review.id)}
                      onCheckedChange={(checked) => handleSelectReview(review.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{review.product.name}</div>
                    <div className="text-sm text-muted-foreground">{review.product.sku}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium">{review.user.name}</div>
                        <div className="text-sm text-muted-foreground">{review.user.email}</div>
                      </div>
                      {review.isVerified && (
                        <div title="Verified Purchase">
                          <ShieldCheck className="w-4 h-4 text-green-600" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {renderStars(review.rating)}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md">
                      {review.title && (
                        <div className="font-medium mb-1">{review.title}</div>
                      )}
                      {review.comment && (
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {review.comment}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(review.createdAt), 'MMM dd, yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>
                    {review.isApproved ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!review.isApproved ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApprove(review.id)}
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReject(review.id)}
                        >
                          <X className="w-4 h-4 text-orange-600" />
                        </Button>
                      )}
                      {userRole === 'ADMIN' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(review.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {renderPagination()}
    </div>
  );
}
