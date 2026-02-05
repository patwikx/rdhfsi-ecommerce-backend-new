'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Mail, Phone, Building, Package, MessageSquare, FileText, Send } from 'lucide-react';
import { respondToQuote } from '@/app/actions/quote-actions';
import { toast } from 'sonner';
import { format } from 'date-fns';

type QuoteStatus = 'PENDING' | 'REVIEWED' | 'QUOTED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

type Quote = {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName: string | null;
  status: QuoteStatus;
  message: string | null;
  adminNotes: string | null;
  quotedPrice: number | null;
  validUntil: Date | null;
  createdAt: Date;
  respondedAt: Date | null;
  items: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    notes: string | null;
  }[];
};

type QuoteDetailsProps = {
  quote: Quote;
  userRole: string;
};

export function QuoteDetails({ quote, userRole }: QuoteDetailsProps) {
  const router = useRouter();
  const [isResponding, setIsResponding] = useState(false);
  const [responseStatus, setResponseStatus] = useState<QuoteStatus>(quote.status);
  const [quotedPrice, setQuotedPrice] = useState(quote.quotedPrice?.toString() || '');
  const [validUntil, setValidUntil] = useState(
    quote.validUntil ? format(new Date(quote.validUntil), 'yyyy-MM-dd') : ''
  );
  const [adminNotes, setAdminNotes] = useState(quote.adminNotes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canRespond = ['ADMIN', 'MANAGER'].includes(userRole) && quote.status === 'PENDING';

  const handleRespond = async () => {
    if (!quotedPrice && responseStatus === 'QUOTED') {
      toast.error('Please enter a quoted price');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await respondToQuote(quote.id, {
        status: responseStatus,
        quotedPrice: quotedPrice ? parseFloat(quotedPrice) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        adminNotes: adminNotes || undefined,
      });

      if (result.success) {
        toast.success('Quote response sent successfully');
        setIsResponding(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to send response');
      }
    } catch (error) {
      toast.error('An error occurred while sending response');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Customer Information */}
      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{quote.customerEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{quote.customerPhone}</p>
            </div>
          </div>
          {quote.companyName && (
            <div className="flex items-center gap-3">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium">{quote.companyName}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Requested</p>
              <p className="font-medium">{format(new Date(quote.createdAt), 'PPP')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Message */}
      {quote.message && (
        <div className="border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Customer Message</h3>
          </div>
          <p className="text-sm bg-muted p-3 rounded">{quote.message}</p>
        </div>
      )}

      {/* Requested Items */}
      <div className="border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">Requested Items</h3>
        </div>
        <div className="space-y-3">
          {quote.items.map((item) => (
            <div key={item.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium">{item.productName}</p>
                  {item.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                  )}
                </div>
                <Badge variant="outline" className="text-base px-3 py-1">
                  Qty: {item.quantity}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quote Response */}
      {quote.quotedPrice && (
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Quote Response</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Quoted Price</p>
              <p className="text-2xl font-bold text-green-600">
                ₱{quote.quotedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            {quote.validUntil && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Valid Until</p>
                <p className="font-medium">{format(new Date(quote.validUntil), 'PPP')}</p>
              </div>
            )}
          </div>
          {quote.adminNotes && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Admin Notes</p>
              <p className="text-sm bg-muted p-3 rounded">{quote.adminNotes}</p>
            </div>
          )}
          {quote.respondedAt && (
            <p className="text-xs text-muted-foreground mt-4">
              Responded on {format(new Date(quote.respondedAt), 'PPP')}
            </p>
          )}
        </div>
      )}

      {/* Response Form */}
      {canRespond && (
        <div className="border rounded-lg p-6">
          {!isResponding ? (
            <div className="text-center">
              <Button onClick={() => setIsResponding(true)}>
                <Send className="h-4 w-4 mr-2" />
                Respond to Quote
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Send Quote Response</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Response Status</Label>
                  <Select value={responseStatus} onValueChange={(value) => setResponseStatus(value as QuoteStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="QUOTED">Provide Quote</SelectItem>
                      <SelectItem value="DECLINED">Decline Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {responseStatus === 'QUOTED' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="quotedPrice">Quoted Price (₱)</Label>
                      <Input
                        id="quotedPrice"
                        type="number"
                        step="0.01"
                        value={quotedPrice}
                        onChange={(e) => setQuotedPrice(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="validUntil">Valid Until</Label>
                      <Input
                        id="validUntil"
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminNotes">Notes (Optional)</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any additional notes or terms..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleRespond} disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send Response'}
                </Button>
                <Button variant="outline" onClick={() => setIsResponding(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
