'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ShoppingCart, Loader2, User, Clock, Package, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { getCashierQueue } from '@/app/actions/order-draft-actions'
import { useCurrentSite } from '@/hooks/use-current-site'
import { formatDistanceToNow } from 'date-fns'

type QueueItem = {
  id: string
  draftNumber: string
  customerName: string | null
  customerPhone: string | null
  subtotal: string
  totalAmount: string
  sentToCashierAt: Date | null
  salesman: {
    id: string
    name: string | null
  }
  site: {
    id: string
    name: string
    code: string
  }
  items: {
    id: string
    quantity: number
    unitPrice: string
    subtotal: string
    product: {
      id: string
      name: string
      sku: string
      retailPrice: string
    }
  }[]
  _count: {
    items: number
  }
}

export function CashierQueueInterface() {
  const { siteId } = useCurrentSite()
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDraft, setSelectedDraft] = useState<QueueItem | null>(null)

  useEffect(() => {
    loadQueue()
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadQueue, 30000)
    return () => clearInterval(interval)
  }, [siteId])

  const loadQueue = async () => {
    setIsLoading(true)
    const result = await getCashierQueue(siteId || undefined)
    if (result.success && result.data) {
      setQueue(result.data as QueueItem[])
    }
    setIsLoading(false)
  }

  const handleProcessOrder = (draft: QueueItem) => {
    setSelectedDraft(draft)
    // TODO: Open payment dialog or navigate to payment page
    toast.info('Payment processing coming soon!')
  }

  const handlePrint = (draft: QueueItem) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow pop-ups to print')
      return
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${draft.draftNumber}</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 1cm; }
            }
            body {
              font-family: 'Courier New', monospace;
              width: 80mm;
              margin: 0 auto;
              padding: 10px;
              font-size: 12px;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .header h1 {
              margin: 0;
              font-size: 18px;
            }
            .header p {
              margin: 2px 0;
              font-size: 11px;
            }
            .section {
              margin: 10px 0;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            .item {
              margin: 8px 0;
            }
            .item-name {
              font-weight: bold;
            }
            .item-details {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              margin-top: 2px;
            }
            .total {
              font-size: 16px;
              font-weight: bold;
              text-align: right;
              margin-top: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${draft.site.name}</h1>
            <p>${draft.site.code}</p>
            <p>Order: ${draft.draftNumber}</p>
            <p>${new Date().toLocaleString()}</p>
          </div>

          <div class="section">
            <div class="row">
              <span>Salesman:</span>
              <span>${draft.salesman.name || 'Unknown'}</span>
            </div>
            ${draft.customerName ? `
              <div class="row">
                <span>Customer:</span>
                <span>${draft.customerName}</span>
              </div>
              ${draft.customerPhone ? `
                <div class="row">
                  <span>Phone:</span>
                  <span>${draft.customerPhone}</span>
                </div>
              ` : ''}
            ` : `
              <div class="row">
                <span>Customer:</span>
                <span>Walk-in</span>
              </div>
            `}
          </div>

          <div class="section">
            ${draft.items.map(item => `
              <div class="item">
                <div class="item-name">${item.product.name}</div>
                <div class="item-details">
                  <span>${item.quantity} x ₱${parseFloat(item.unitPrice).toFixed(2)}</span>
                  <span>₱${parseFloat(item.subtotal).toFixed(2)}</span>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="total">
            TOTAL: ₱${parseFloat(draft.totalAmount).toFixed(2)}
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>This is a draft order receipt</p>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
    
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Queue List */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Cashier Queue</h1>
            <p className="text-sm text-muted-foreground">
              {queue.length} {queue.length === 1 ? 'order' : 'orders'} waiting
            </p>
          </div>
          <Button onClick={loadQueue} variant="outline" size="sm">
            <Loader2 className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto border rounded-lg">
          {isLoading && queue.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : queue.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No orders in queue</p>
                <p className="text-sm">Orders sent by salesmen will appear here</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Salesman</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Waiting</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map((draft) => (
                  <TableRow
                    key={draft.id}
                    className={selectedDraft?.id === draft.id ? 'bg-muted' : ''}
                  >
                    <TableCell className="font-medium">{draft.draftNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{draft.salesman.name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {draft.customerName ? (
                        <div>
                          <p className="font-medium">{draft.customerName}</p>
                          {draft.customerPhone && (
                            <p className="text-xs text-muted-foreground">{draft.customerPhone}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Walk-in</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{draft._count.items}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      ₱{parseFloat(draft.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {draft.sentToCashierAt && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {formatDistanceToNow(new Date(draft.sentToCashierAt), { addSuffix: true })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={() => handleProcessOrder(draft)}
                        size="sm"
                      >
                        Process
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Order Details Panel */}
      {selectedDraft && (
        <div className="w-96 border-l pl-6 flex flex-col">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">{selectedDraft.draftNumber}</h2>
            <p className="text-sm text-muted-foreground">
              By {selectedDraft.salesman.name || 'Unknown'}
            </p>
          </div>

          {selectedDraft.customerName && (
            <div className="mb-4 p-3 border rounded-lg">
              <p className="text-sm font-medium mb-1">Customer Information</p>
              <p className="text-sm">{selectedDraft.customerName}</p>
              {selectedDraft.customerPhone && (
                <p className="text-sm text-muted-foreground">{selectedDraft.customerPhone}</p>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            <p className="text-sm font-medium mb-2">Order Items</p>
            {selectedDraft.items.map((item) => (
              <div key={item.id} className="border rounded p-2">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{item.product.sku}</p>
                  </div>
                  <p className="font-bold text-sm">
                    ₱{parseFloat(item.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Qty: {item.quantity}</span>
                  <span>@ ₱{parseFloat(item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between text-xl font-bold mb-4">
              <span>Total:</span>
              <span>
                ₱{parseFloat(selectedDraft.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handlePrint(selectedDraft)} variant="outline" className="flex-1" size="lg">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button onClick={() => handleProcessOrder(selectedDraft)} className="flex-1" size="lg">
                <Package className="w-4 h-4 mr-2" />
                Process
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
