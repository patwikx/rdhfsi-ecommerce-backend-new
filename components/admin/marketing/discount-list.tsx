'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, Trash2, Power, Percent, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { toggleDiscountStatus, deleteDiscountType } from '@/app/actions/discount-actions';
import { toast } from 'sonner';
import type { DiscountTypeListItem } from '@/app/actions/discount-actions';

type DiscountListProps = {
  discounts: DiscountTypeListItem[];
  userRole: string;
};

export function DiscountList({ discounts, userRole }: DiscountListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const totalPages = Math.ceil(discounts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDiscounts = discounts.slice(startIndex, endIndex);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const result = await toggleDiscountStatus(id, !currentStatus);
    if (result.success) {
      toast.success(`Discount ${!currentStatus ? 'activated' : 'deactivated'}`);
      window.location.reload();
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    const result = await deleteDiscountType(id);
    if (result.success) {
      toast.success('Discount deleted successfully');
      window.location.reload();
    } else {
      toast.error(result.error || 'Failed to delete discount');
    }
  };

  const getStatusBadge = (discount: DiscountTypeListItem) => {
    if (!discount.isActive) {
      return <Badge variant="outline" className="bg-gray-50">Inactive</Badge>;
    }
    
    const now = new Date();
    if (discount.validFrom && new Date(discount.validFrom) > now) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700">Scheduled</Badge>;
    }
    if (discount.validUntil && new Date(discount.validUntil) < now) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    return <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>;
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
          Showing {startIndex + 1} to {Math.min(endIndex, discounts.length)} of {discounts.length} discounts
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
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Verification</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Valid Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentDiscounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No discounts found
                </TableCell>
              </TableRow>
            ) : (
              currentDiscounts.map((discount) => (
                <TableRow key={discount.id}>
                  <TableCell>
                    <div className="font-mono font-semibold">{discount.code}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{discount.name}</div>
                    {discount.description && (
                      <div className="text-sm text-muted-foreground">{discount.description}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {discount.discountPercent ? (
                      <div className="flex items-center gap-2">
                        <Percent className="w-4 h-4 text-green-600" />
                        <span className="font-semibold">{discount.discountPercent}%</span>
                      </div>
                    ) : discount.discountAmount ? (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold">₱{discount.discountAmount}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {discount.requiresVerification ? (
                      <Badge variant="outline">Required</Badge>
                    ) : (
                      <Badge variant="secondary">Not Required</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{discount.usageCount}</div>
                      {discount.usageLimit && (
                        <div className="text-muted-foreground">/ {discount.usageLimit} limit</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {discount.validFrom && (
                        <div>From: {format(new Date(discount.validFrom), 'MMM dd, yyyy')}</div>
                      )}
                      {discount.validUntil && (
                        <div>Until: {format(new Date(discount.validUntil), 'MMM dd, yyyy')}</div>
                      )}
                      {!discount.validFrom && !discount.validUntil && (
                        <span className="text-muted-foreground">No limit</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(discount)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/marketing/discounts/${discount.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(discount.id, discount.isActive)}
                      >
                        <Power className="w-4 h-4" />
                      </Button>
                      {userRole === 'ADMIN' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(discount.id, discount.name)}
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
