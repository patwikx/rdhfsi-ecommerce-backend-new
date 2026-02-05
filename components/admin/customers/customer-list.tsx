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
import { Building2, Mail, Phone, User, Eye } from 'lucide-react';
import { format } from 'date-fns';
import type { CustomerListItem } from '@/app/actions/customer-actions';
import { UserRole } from '@prisma/client';

type CustomerListProps = {
  customers: CustomerListItem[];
  userRole: string;
};

export function CustomerList({ customers, userRole }: CustomerListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const totalPages = Math.ceil(customers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCustomers = customers.slice(startIndex, endIndex);

  const getRoleBadge = (role: UserRole) => {
    const variants: Record<UserRole, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      CUSTOMER: { variant: 'default', label: 'Customer' },
      CORPORATE: { variant: 'secondary', label: 'Corporate' },
      ADMIN: { variant: 'outline', label: 'Admin' },
      MANAGER: { variant: 'outline', label: 'Manager' },
      STAFF: { variant: 'outline', label: 'Staff' },
    };
    const config = variants[role];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
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
          Showing {startIndex + 1} to {Math.min(endIndex, customers.length)} of {customers.length} customers
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
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead>Credit Terms</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              currentCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {customer.companyName ? (
                          <Building2 className="w-5 h-5 text-primary" />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          {customer.name || 'Unnamed Customer'}
                        </div>
                        {customer.companyName && (
                          <div className="text-sm text-muted-foreground">
                            {customer.companyName}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{customer.email}</span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{customer.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(customer.role)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{customer._count.orders}</div>
                    <div className="text-xs text-muted-foreground">orders</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-semibold">{formatCurrency(customer.totalSpent)}</div>
                  </TableCell>
                  <TableCell>
                    {customer.creditLimit || customer.paymentTerms ? (
                      <div className="text-sm">
                        {customer.creditLimit && (
                          <div className="font-medium">
                            {formatCurrency(customer.creditLimit)}
                          </div>
                        )}
                        {customer.paymentTerms && (
                          <div className="text-muted-foreground">
                            Net {customer.paymentTerms} days
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.isActive ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(customer.createdAt), 'MMM dd, yyyy')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/customers/${customer.id}`}>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                    </Link>
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
