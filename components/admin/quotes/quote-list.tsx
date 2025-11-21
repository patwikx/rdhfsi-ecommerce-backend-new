'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Eye, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

type QuoteStatus = 'PENDING' | 'REVIEWED' | 'QUOTED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

type Quote = {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  companyName: string | null;
  status: QuoteStatus;
  subtotal: number | null;
  totalAmount: number | null;
  quotedPrice: number | null;
  validUntil: Date | null;
  createdAt: Date;
  respondedAt: Date | null;
  itemCount: number;
};

type QuoteListProps = {
  quotes: Quote[];
  userRole: string;
};

const statusColors: Record<QuoteStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  REVIEWED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  QUOTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  DECLINED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  EXPIRED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export function QuoteList({ quotes, userRole }: QuoteListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'all');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedStatus !== 'all') params.set('status', selectedStatus);
    
    router.push(`/admin/quotes?${params.toString()}`);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (status !== 'all') params.set('status', status);
    
    router.push(`/admin/quotes?${params.toString()}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name, email, or quote number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-9"
          />
        </div>
        <Select value={selectedStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="REVIEWED">Reviewed</SelectItem>
            <SelectItem value="QUOTED">Quoted</SelectItem>
            <SelectItem value="ACCEPTED">Accepted</SelectItem>
            <SelectItem value="DECLINED">Declined</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {/* Quotes Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Quoted Price</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="text-muted-foreground">
                    <p className="text-lg font-medium mb-2">No quotes found</p>
                    <p className="text-sm">No quote requests match your current filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              quotes.map((quote) => (
                <TableRow key={quote.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-sm font-medium">
                    {quote.quoteNumber}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{quote.customerName}</p>
                      <p className="text-xs text-muted-foreground">{quote.customerEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {quote.companyName || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {quote.itemCount} item{quote.itemCount !== 1 ? 's' : ''}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[quote.status]}>
                      {quote.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {quote.quotedPrice ? (
                      `₱${quote.quotedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {quote.validUntil ? (
                      <span className={new Date(quote.validUntil) < new Date() ? 'text-red-600' : ''}>
                        {new Date(quote.validUntil).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/quotes/${quote.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Showing {quotes.length} quote{quotes.length !== 1 ? 's' : ''}</p>
        <div className="flex items-center gap-4">
          <span>Pending: {quotes.filter(q => q.status === 'PENDING').length}</span>
          <span>Quoted: {quotes.filter(q => q.status === 'QUOTED').length}</span>
          <span>Accepted: {quotes.filter(q => q.status === 'ACCEPTED').length}</span>
        </div>
      </div>
    </div>
  );
}
