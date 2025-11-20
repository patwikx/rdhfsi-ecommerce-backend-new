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
import { Edit, Trash2, Power, Percent, DollarSign, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { toggleCouponStatus, deleteCoupon } from '@/app/actions/coupon-actions';
import { toast } from 'sonner';
import type { CouponListItem } from '@/app/actions/coupon-actions';
import { CouponType } from '@prisma/client';

type CouponListProps = {
  coupons: CouponListItem[];
  userRole: string;
};

export function CouponList({ coupons, userRole }: CouponListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const totalPages = Math.ceil(coupons.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCoupons = coupons.slice(startIndex, endIndex);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const result = await toggleCouponStatus(id, !currentStatus);
    if (result.success) {
      toast.success(`Coupon ${!currentStatus ? 'activated' : 'deactivated'}`);
      window.location.reload();
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete coupon "${code}"?`)) return;

    const result = await deleteCoupon(id);
    if (result.success) {
      toast.success('Coupon deleted successfully');
      window.location.reload();
    } else {
      toast.error(result.error || 'Failed to delete coupon');
    }
  };

  const getTypeBadge = (type: CouponType) => {
    const config = {
      PERCENTAGE: { icon: Percent, label: 'Percentage', color: 'bg-green-50 text-green-700' },
      FIXED_AMOUNT: { icon: DollarSign, label: 'Fixed Amount', color: 'bg-blue-50 text-blue-700' },
      FREE_SHIPPING: { icon: Truck, label: 'Free Shipping', color: 'bg-purple-50 text-purple-700' },
    };
    const { icon: Icon, label, color } = config[type];
    return (
      <Badge variant="outline" className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const getStatusBadge = (coupon: CouponListItem) => {
    if (!coupon.isActive) {
      return <Badge variant="outline" className="bg-gray-50">Inactive</Badge>;
    }
    
    const now = new Date();
    if (new Date(coupon.validFrom) > now) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700">Scheduled</Badge>;
    }
    if (new Date(coupon.validUntil) < now) {
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
          Showing {startIndex + 1} to {Math.min(endIndex, coupons.length)} of {coupons.length} coupons
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
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Valid Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentCoupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No coupons found
                </TableCell>
              </TableRow>
            ) : (
              currentCoupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <div className="font-mono font-semibold">{coupon.code}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{coupon.name}</div>
                    {coupon.description && (
                      <div className="text-sm text-muted-foreground">{coupon.description}</div>
                    )}
                  </TableCell>
                  <TableCell>{getTypeBadge(coupon.discountType)}</TableCell>
                  <TableCell>
                    {coupon.discountType === 'PERCENTAGE' ? (
                      <span className="font-semibold">{coupon.discountValue}%</span>
                    ) : coupon.discountType === 'FIXED_AMOUNT' ? (
                      <span className="font-semibold">₱{coupon.discountValue}</span>
                    ) : (
                      <span className="font-semibold">Free</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{coupon.usageCount}</div>
                      {coupon.usageLimit && (
                        <div className="text-muted-foreground">/ {coupon.usageLimit} limit</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>From: {format(new Date(coupon.validFrom), 'MMM dd, yyyy')}</div>
                      <div>Until: {format(new Date(coupon.validUntil), 'MMM dd, yyyy')}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(coupon)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/marketing/coupons/${coupon.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(coupon.id, coupon.isActive)}
                      >
                        <Power className="w-4 h-4" />
                      </Button>
                      {userRole === 'ADMIN' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(coupon.id, coupon.code)}
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
