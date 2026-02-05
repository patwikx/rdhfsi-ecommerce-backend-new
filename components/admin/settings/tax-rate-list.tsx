'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Power, Star } from 'lucide-react';
import { format } from 'date-fns';
import { deleteTaxRate, toggleTaxRateStatus } from '@/app/actions/tax-actions';
import { toast } from 'sonner';
import type { TaxRateListItem } from '@/app/actions/tax-actions';

type TaxRateListProps = {
  taxRates: TaxRateListItem[];
  userRole: string;
};

export function TaxRateList({ taxRates, userRole }: TaxRateListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const totalPages = Math.ceil(taxRates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTaxRates = taxRates.slice(startIndex, endIndex);

  const handleToggleStatus = async (id: string) => {
    const result = await toggleTaxRateStatus(id);
    if (result.success) {
      toast.success('Tax rate status updated');
      window.location.reload();
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    const result = await deleteTaxRate(id);
    if (result.success) {
      toast.success('Tax rate deleted successfully');
      window.location.reload();
    } else {
      toast.error(result.error || 'Failed to delete tax rate');
    }
  };

  const getStatusBadge = (taxRate: TaxRateListItem) => {
    if (!taxRate.isActive) {
      return <Badge variant="outline" className="bg-gray-50">Inactive</Badge>;
    }
    
    if (!taxRate.validFrom || !taxRate.validUntil) {
      return <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>;
    }

    const now = new Date();
    if (new Date(taxRate.validFrom) > now) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700">Scheduled</Badge>;
    }
    if (new Date(taxRate.validUntil) < now) {
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
          Showing {startIndex + 1} to {Math.min(endIndex, taxRates.length)} of {taxRates.length} tax rates
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
              <TableHead>Rate</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Valid Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentTaxRates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No tax rates found
                </TableCell>
              </TableRow>
            ) : (
              currentTaxRates.map((taxRate) => (
                <TableRow key={taxRate.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-semibold">{taxRate.code}</code>
                      {taxRate.isDefault && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{taxRate.name}</div>
                    {taxRate.description && (
                      <div className="text-sm text-muted-foreground">{taxRate.description}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{taxRate.rate}%</span>
                  </TableCell>
                  <TableCell>{taxRate.country}</TableCell>
                  <TableCell>{taxRate.priority}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {taxRate.validFrom && taxRate.validUntil ? (
                        <>
                          <div>From: {format(new Date(taxRate.validFrom), 'MMM dd, yyyy')}</div>
                          <div>Until: {format(new Date(taxRate.validUntil), 'MMM dd, yyyy')}</div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Always active</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(taxRate)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/settings/tax/${taxRate.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(taxRate.id)}
                      >
                        <Power className="w-4 h-4" />
                      </Button>
                      {userRole === 'ADMIN' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(taxRate.id, taxRate.name)}
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
