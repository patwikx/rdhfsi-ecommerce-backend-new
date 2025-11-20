'use client';

import { useState } from 'react';
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
import { ArrowRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';

type Transfer = {
  id: string;
  movementType: string;
  quantityChange: number;
  notes: string | null;
  createdAt: Date;
  fromSiteId: string | null;
  toSiteId: string | null;
  inventory: {
    product: {
      sku: string;
      name: string;
      baseUom: string;
    };
    site: {
      code: string;
      name: string;
    };
  };
  user: {
    name: string | null;
    email: string;
  } | null;
};

type StockTransferListProps = {
  transfers: Transfer[];
};

export function StockTransferList({ transfers }: StockTransferListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const totalPages = Math.ceil(transfers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransfers = transfers.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Transfer Route</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Initiated By</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No transfers found
                </TableCell>
              </TableRow>
            ) : (
              paginatedTransfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {format(new Date(transfer.createdAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{transfer.inventory.product.name}</div>
                      <div className="text-sm text-muted-foreground font-mono">
                        {transfer.inventory.product.sku}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{transfer.inventory.site.code}</Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline">
                        {transfer.notes?.match(/to: ([A-Z0-9]+)/)?.[1] || 'Unknown'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {Math.abs(transfer.quantityChange)} {transfer.inventory.product.baseUom}
                  </TableCell>
                  <TableCell>
                    {transfer.notes?.includes('PENDING') ? (
                      <Badge variant="secondary">Pending</Badge>
                    ) : (
                      <Badge variant="default">Completed</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {transfer.user?.name || transfer.user?.email || 'System'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground max-w-xs truncate">
                      {transfer.notes || '-'}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, transfers.length)} of {transfers.length} transfers
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant={currentPage === 1 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(1)}
                className="w-9"
              >
                1
              </Button>

              {currentPage > 3 && (
                <span className="px-2 text-muted-foreground">...</span>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  if (page === 1 || page === totalPages) return false;
                  return Math.abs(page - currentPage) <= 1;
                })
                .map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-9"
                  >
                    {page}
                  </Button>
                ))}

              {currentPage < totalPages - 2 && (
                <span className="px-2 text-muted-foreground">...</span>
              )}

              {totalPages > 1 && (
                <Button
                  variant={currentPage === totalPages ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-9"
                >
                  {totalPages}
                </Button>
              )}
            </div>
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
      )}
    </div>
  );
}
