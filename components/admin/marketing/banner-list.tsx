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
import { Edit, Trash2, Power, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toggleBannerStatus, deleteBanner } from '@/app/actions/banner-actions';
import { toast } from 'sonner';
import { HeroBanner } from '@prisma/client';

type BannerListProps = {
  banners: HeroBanner[];
  userRole: string;
};

export function BannerList({ banners, userRole }: BannerListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const totalPages = Math.ceil(banners.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBanners = banners.slice(startIndex, endIndex);

  const handleToggleStatus = async (id: string) => {
    const result = await toggleBannerStatus(id);
    if (result.success) {
      toast.success('Banner status updated');
      window.location.reload();
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    const result = await deleteBanner(id);
    if (result.success) {
      toast.success('Banner deleted successfully');
      window.location.reload();
    } else {
      toast.error(result.error || 'Failed to delete banner');
    }
  };

  const getPlacementLabel = (placement: string) => {
    const labels: Record<string, string> = {
      HOME: 'Home',
      TRENDING: 'Trending',
      SALE: 'Sale',
      CLEARANCE: 'Clearance',
      FEATURED: 'Featured',
      NEW_ARRIVALS: 'New Arrivals',
      BRANDS: 'Brands',
      CATEGORY: 'Category',
      SEARCH: 'Search',
    };
    return labels[placement] || placement;
  };

  const getStatusBadge = (banner: HeroBanner) => {
    if (!banner.isActive) {
      return <Badge variant="outline" className="bg-gray-50">Inactive</Badge>;
    }
    
    if (!banner.startDate || !banner.endDate) {
      return <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>;
    }

    const now = new Date();
    if (new Date(banner.startDate) > now) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700">Scheduled</Badge>;
    }
    if (new Date(banner.endDate) < now) {
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
          Showing {startIndex + 1} to {Math.min(endIndex, banners.length)} of {banners.length} banners
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
              <TableHead>Banner</TableHead>
              <TableHead>Placement</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead>Valid Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentBanners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No banners found
                </TableCell>
              </TableRow>
            ) : (
              currentBanners.map((banner) => (
                <TableRow key={banner.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded border overflow-hidden bg-muted flex items-center justify-center">
                        {banner.image ? (
                          <img
                            src={banner.image}
                            alt={banner.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{banner.title}</div>
                        {banner.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {banner.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getPlacementLabel(banner.placement)}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono">{banner.sortOrder}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {banner.startDate && banner.endDate ? (
                        <>
                          <div>From: {format(new Date(banner.startDate), 'MMM dd, yyyy')}</div>
                          <div>Until: {format(new Date(banner.endDate), 'MMM dd, yyyy')}</div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Always active</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(banner)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/marketing/banners/${banner.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(banner.id)}
                      >
                        <Power className="w-4 h-4" />
                      </Button>
                      {userRole === 'ADMIN' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(banner.id, banner.title)}
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
