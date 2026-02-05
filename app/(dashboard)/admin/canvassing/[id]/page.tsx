'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, TrendingDown, TrendingUp, Minus, Edit, Save, X, Printer } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { getCanvassingById } from '@/app/actions/canvassing-simple-actions'

type CanvassingItem = {
  id: string
  barcode: string
  productName: string
  originalPrice: number | null
  supplier1Name: string | null
  supplier1Price: number | null
  supplier1Terms: string | null
  supplier2Name: string | null
  supplier2Price: number | null
  supplier2Terms: string | null
  supplier3Name: string | null
  supplier3Price: number | null
  supplier3Terms: string | null
}

type Canvassing = {
  id: string
  legacyDocCode: string
  legacyRefCode: string | null
  siteCode: string
  partyName: string | null
  partyTermsText: string | null
  status: string
  notes: string | null
  createdAt: Date
  items: CanvassingItem[]
}

const statusColors = {
  IN_PROGRESS: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-gray-500'
}

const statusLabels = {
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
}

export default function CanvassingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [canvassing, setCanvassing] = useState<Canvassing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedItems, setEditedItems] = useState<CanvassingItem[]>([])

  useEffect(() => {
    loadCanvassing()
  }, [id])

  useEffect(() => {
    if (canvassing) {
      setEditedItems(canvassing.items)
    }
  }, [canvassing])

  const loadCanvassing = async () => {
    setIsLoading(true)
    try {
      const result = await getCanvassingById(id)

      if (result.success && result.data) {
        setCanvassing(result.data)
        setEditedItems(result.data.items)
      } else {
        toast.error(result.error || 'Failed to load canvassing')
        router.push('/admin/canvassing')
      }
    } catch (error) {
      toast.error('Failed to load canvassing')
      router.push('/admin/canvassing')
    } finally {
      setIsLoading(false)
    }
  }

  const handleItemChange = (index: number, field: keyof CanvassingItem, value: string) => {
    const newItems = [...editedItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setEditedItems(newItems)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { updateCanvassingItems } = await import('@/app/actions/canvassing-simple-actions')
      
      const result = await updateCanvassingItems(id, editedItems)

      if (result.success) {
        toast.success('Canvassing updated successfully')
        setIsEditing(false)
        loadCanvassing()
      } else {
        toast.error(result.error || 'Failed to update canvassing')
      }
    } catch (error) {
      toast.error('Failed to update canvassing')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedItems(canvassing?.items || [])
    setIsEditing(false)
  }

  const handlePrint = () => {
    window.print()
  }

  const calculateSavings = (original: number | null, supplier: number | null) => {
    if (!original || !supplier) return null
    const diff = original - supplier
    const percent = (diff / original) * 100
    return { amount: diff, percent }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!canvassing) {
    return null
  }

  // Calculate best prices (lowest from all suppliers)
  const totalOriginal = canvassing.items.reduce(
    (sum, item) => sum + (item.originalPrice || 0),
    0
  )
  
  const totalBestSupplier = canvassing.items.reduce((sum, item) => {
    const prices = [
      item.supplier1Price || Infinity,
      item.supplier2Price || Infinity,
      item.supplier3Price || Infinity
    ]
    const bestPrice = Math.min(...prices)
    return sum + (bestPrice === Infinity ? 0 : bestPrice)
  }, 0)
  
  const totalSavings = totalOriginal - totalBestSupplier
  const totalSavingsPercent = totalOriginal > 0 ? (totalSavings / totalOriginal) * 100 : 0

  return (
    <>
      {/* Print Document */}
      <div id="print-content" className="print:block hidden">
        <div className="print-header">
          <div className="print-title">SUPPLIER PRICE COMPARISON REPORT</div>
          <div className="print-meta">
            <div className="print-meta-row">
              <div className="print-meta-item">
                <span className="print-label">Purchase Request #:</span>
                <span className="print-value">{canvassing.legacyDocCode}</span>
              </div>
              <div className="print-meta-item">
                <span className="print-label">Reference:</span>
                <span className="print-value">{canvassing.legacyRefCode || 'N/A'}</span>
              </div>
              <div className="print-meta-item">
                <span className="print-label">Site:</span>
                <span className="print-value">{canvassing.siteCode}</span>
              </div>
              <div className="print-meta-item">
                <span className="print-label">Date:</span>
                <span className="print-value">{new Date(canvassing.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="print-meta-row">
              <div className="print-meta-item">
                <span className="print-label">Original Supplier:</span>
                <span className="print-value">{canvassing.partyName || 'N/A'}</span>
              </div>
              <div className="print-meta-item">
                <span className="print-label">Payment Terms:</span>
                <span className="print-value">{canvassing.partyTermsText || 'N/A'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Items Table */}
        <table>
          <thead>
            <tr>
              <th style={{width: '7%'}}>Barcode</th>
              <th style={{width: '18%'}}>Product</th>
              <th style={{width: '6%'}}>Original</th>
              <th style={{width: '10%'}}>Supplier 1</th>
              <th style={{width: '6%'}}>Price 1</th>
              <th style={{width: '7%'}}>Terms 1</th>
              <th style={{width: '10%'}}>Supplier 2</th>
              <th style={{width: '6%'}}>Price 2</th>
              <th style={{width: '7%'}}>Terms 2</th>
              <th style={{width: '10%'}}>Supplier 3</th>
              <th style={{width: '6%'}}>Price 3</th>
              <th style={{width: '7%'}}>Terms 3</th>
            </tr>
          </thead>
          <tbody>
            {editedItems.map((item) => (
              <tr key={item.id}>
                <td>{item.barcode}</td>
                <td>{item.productName}</td>
                <td style={{textAlign: 'right'}}>₱{item.originalPrice?.toFixed(2) || '-'}</td>
                <td>{item.supplier1Name || '-'}</td>
                <td style={{textAlign: 'right'}}>{item.supplier1Price ? `₱${item.supplier1Price.toFixed(2)}` : '-'}</td>
                <td>{item.supplier1Terms || '-'}</td>
                <td>{item.supplier2Name || '-'}</td>
                <td style={{textAlign: 'right'}}>{item.supplier2Price ? `₱${item.supplier2Price.toFixed(2)}` : '-'}</td>
                <td>{item.supplier2Terms || '-'}</td>
                <td>{item.supplier3Name || '-'}</td>
                <td style={{textAlign: 'right'}}>{item.supplier3Price ? `₱${item.supplier3Price.toFixed(2)}` : '-'}</td>
                <td>{item.supplier3Terms || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Supplier Summary */}
        <div className="print-supplier-summary">
          <div style={{fontSize: '11px', fontWeight: 'bold', marginBottom: '8px'}}>SUPPLIER SUMMARY</div>
          {(() => {
            const suppliers = [
              {
                name: canvassing.partyName || 'Original',
                total: totalOriginal,
                items: editedItems.length,
                label: 'Original'
              },
              ...[1, 2, 3].map(num => {
                const key = `supplier${num}` as 'supplier1' | 'supplier2' | 'supplier3'
                const items = editedItems.filter(i => i[`${key}Name`] || i[`${key}Price`])
                if (items.length === 0) return null
                const total = items.reduce((sum, i) => sum + (i[`${key}Price`] || 0), 0)
                const savings = items.reduce((sum, i) => sum + ((i.originalPrice || 0) - (i[`${key}Price`] || 0)), 0)
                return {
                  name: items[0]?.[`${key}Name`] || `Supplier ${num}`,
                  total,
                  items: items.length,
                  savings
                }
              }).filter(Boolean)
            ]
            
            return suppliers.map((s, i) => s && (
              <div key={i} className="print-supplier-card">
                <div style={{fontWeight: 'bold', marginBottom: '4px'}}>{s.name}</div>
                <div>Items: {s.items}</div>
                <div>Total: ₱{s.total.toFixed(2)}</div>
                {'savings' in s && <div style={{color: s.savings > 0 ? 'green' : 'red'}}>
                  Savings: ₱{s.savings.toFixed(2)}
                </div>}
              </div>
            ))
          })()}
        </div>
      </div>

    <div className="min-h-screen bg-background">

      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden">
        <div className="flex h-16 items-center px-6 gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <Loader2 className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Canvassing Details</h1>
            <p className="text-sm text-muted-foreground">{canvassing.legacyDocCode}</p>
          </div>
          <Badge className={statusColors[canvassing.status as keyof typeof statusColors]}>
            {statusLabels[canvassing.status as keyof typeof statusLabels]}
          </Badge>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Terms
              </Button>
            ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Original Total</p>
            <p className="text-2xl font-bold">₱{totalOriginal.toFixed(2)}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Best Supplier Total</p>
            <p className="text-2xl font-bold">₱{totalBestSupplier.toFixed(2)}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Savings</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-2xl font-bold ${totalSavings > 0 ? 'text-green-600' : totalSavings < 0 ? 'text-red-600' : ''}`}>
                ₱{Math.abs(totalSavings).toFixed(2)}
              </p>
              {totalSavings !== 0 && (
                <span className={`text-sm ${totalSavings > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ({totalSavingsPercent.toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Information */}
        <div className="border rounded-lg p-6 print:hidden">
          <h3 className="text-lg font-semibold mb-4">Purchase Request Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Purchase Request #</Label>
              <Input value={canvassing.legacyDocCode} disabled />
            </div>
            <div className="space-y-2">
              <Label>Ref Code</Label>
              <Input value={canvassing.legacyRefCode || '-'} disabled />
            </div>
            <div className="space-y-2">
              <Label>Site Code</Label>
              <Input value={canvassing.siteCode} disabled />
            </div>
            <div className="space-y-2">
              <Label>Original Supplier</Label>
              <Input value={canvassing.partyName || '-'} disabled />
            </div>
            <div className="space-y-2">
              <Label>Original Terms</Label>
              <Input value={canvassing.partyTermsText || '-'} disabled />
            </div>
            <div className="space-y-2">
              <Label>Created Date</Label>
              <Input value={new Date(canvassing.createdAt).toLocaleString()} disabled />
            </div>
            {canvassing.notes && (
              <div className="space-y-2 md:col-span-3">
                <Label>Notes</Label>
                <Textarea value={canvassing.notes} disabled rows={3} />
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="border rounded-lg">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Items ({canvassing.items.length})</h3>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Barcode</TableHead>
                  <TableHead className="min-w-[200px]">Product Name</TableHead>
                  <TableHead className="text-right w-32">Original Price</TableHead>
                  <TableHead className="w-40">Supplier 1</TableHead>
                  <TableHead className="text-right w-32">Price 1</TableHead>
                  <TableHead className="w-32">Terms 1</TableHead>
                  <TableHead className="w-40">Supplier 2</TableHead>
                  <TableHead className="text-right w-32">Price 2</TableHead>
                  <TableHead className="w-32">Terms 2</TableHead>
                  <TableHead className="w-40">Supplier 3</TableHead>
                  <TableHead className="text-right w-32">Price 3</TableHead>
                  <TableHead className="w-32">Terms 3</TableHead>
                  <TableHead className="text-right w-40">Best Savings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editedItems.map((item, index) => {
                  const prices = [
                    { price: item.supplier1Price, name: item.supplier1Name },
                    { price: item.supplier2Price, name: item.supplier2Name },
                    { price: item.supplier3Price, name: item.supplier3Name }
                  ].filter(s => s.price !== null)
                  
                  const bestSupplier = prices.length > 0 
                    ? prices.reduce((min, curr) => (curr.price! < min.price! ? curr : min))
                    : null
                  
                  const bestSavings = bestSupplier 
                    ? calculateSavings(item.originalPrice, bestSupplier.price)
                    : null
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.barcode}</TableCell>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {item.originalPrice ? `₱${item.originalPrice.toFixed(2)}` : '-'}
                      </TableCell>
                      
                      <TableCell>{item.supplier1Name || '-'}</TableCell>
                      <TableCell className="text-right">
                        {item.supplier1Price ? `₱${item.supplier1Price.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {isEditing ? (
                          <Input
                            placeholder="e.g., Net 30"
                            value={item.supplier1Terms || ''}
                            onChange={(e) => handleItemChange(index, 'supplier1Terms', e.target.value)}
                            className="text-xs h-8"
                          />
                        ) : (
                          item.supplier1Terms || '-'
                        )}
                      </TableCell>

                      <TableCell>{item.supplier2Name || '-'}</TableCell>
                      <TableCell className="text-right">
                        {item.supplier2Price ? `₱${item.supplier2Price.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {isEditing ? (
                          <Input
                            placeholder="e.g., Net 30"
                            value={item.supplier2Terms || ''}
                            onChange={(e) => handleItemChange(index, 'supplier2Terms', e.target.value)}
                            className="text-xs h-8"
                          />
                        ) : (
                          item.supplier2Terms || '-'
                        )}
                      </TableCell>

                      <TableCell>{item.supplier3Name || '-'}</TableCell>
                      <TableCell className="text-right">
                        {item.supplier3Price ? `₱${item.supplier3Price.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {isEditing ? (
                          <Input
                            placeholder="e.g., Net 30"
                            value={item.supplier3Terms || ''}
                            onChange={(e) => handleItemChange(index, 'supplier3Terms', e.target.value)}
                            className="text-xs h-8"
                          />
                        ) : (
                          item.supplier3Terms || '-'
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {bestSavings ? (
                          <div className="flex items-center justify-end gap-1">
                            {bestSavings.amount > 0 ? (
                              <TrendingDown className="w-4 h-4 text-green-600" />
                            ) : bestSavings.amount < 0 ? (
                              <TrendingUp className="w-4 h-4 text-red-600" />
                            ) : (
                              <Minus className="w-4 h-4 text-muted-foreground" />
                            )}
                            <div className="flex flex-col items-end">
                              <span className={bestSavings.amount > 0 ? 'text-green-600 font-semibold' : bestSavings.amount < 0 ? 'text-red-600' : ''}>
                                ₱{Math.abs(bestSavings.amount).toFixed(2)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({bestSavings.percent.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Supplier Summary */}
        <div className="border rounded-lg p-6 print:hidden">
          <h3 className="text-lg font-semibold mb-4">Supplier Summary</h3>
          
          {(() => {
            // Calculate supplier data including original
            const allSuppliers = [
              // Original supplier
              {
                num: 0,
                name: canvassing.partyName || 'Original Supplier',
                items: editedItems.length,
                total: editedItems.reduce((sum, item) => sum + (item.originalPrice || 0), 0),
                originalTotal: editedItems.reduce((sum, item) => sum + (item.originalPrice || 0), 0),
                savings: 0,
                savingsPercent: 0,
                avgPrice: editedItems.reduce((sum, item) => sum + (item.originalPrice || 0), 0) / editedItems.length,
                isOriginal: true
              },
              // New suppliers
              ...[1, 2, 3].map(num => {
                const supplierKey = `supplier${num}` as 'supplier1' | 'supplier2' | 'supplier3'
                const items = editedItems.filter(item => item[`${supplierKey}Name`] || item[`${supplierKey}Price`])
                
                if (items.length === 0) return null
                
                const total = items.reduce((sum, item) => sum + (item[`${supplierKey}Price`] || 0), 0)
                const originalTotal = items.reduce((sum, item) => sum + (item.originalPrice || 0), 0)
                const savings = originalTotal - total
                const savingsPercent = originalTotal > 0 ? (savings / originalTotal) * 100 : 0
                const name = items[0]?.[`${supplierKey}Name`] || `Supplier ${num}`
                const avgPrice = total / items.length
                
                return {
                  num,
                  name,
                  items: items.length,
                  total,
                  originalTotal,
                  savings,
                  savingsPercent,
                  avgPrice,
                  isOriginal: false
                }
              }).filter(Boolean)
            ]

            const suppliers = allSuppliers.filter(s => s !== null)

            if (suppliers.length === 0) return null

            // Find cheapest and most expensive
            const cheapest = suppliers.reduce((min, curr) => curr!.total < min!.total ? curr : min)
            const mostExpensive = suppliers.reduce((max, curr) => curr!.total > max!.total ? curr : max)

            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {suppliers.map(supplier => {
                    if (!supplier) return null
                    const isCheapest = supplier.num === cheapest?.num && suppliers.length > 1
                    const isMostExpensive = supplier.num === mostExpensive?.num && suppliers.length > 1
                    
                    return (
                      <div 
                        key={supplier.num} 
                        className={`border rounded-lg p-4 relative ${
                          supplier.isOriginal ? 'border-blue-500 dark:border-blue-700' : 
                          isCheapest ? 'border-green-500 dark:border-green-700' : 
                          isMostExpensive ? 'border-red-500 dark:border-red-700' : ''
                        }`}
                      >
                        {supplier.isOriginal && (
                          <Badge className="absolute -top-2 -right-2 bg-blue-600">
                            Original
                          </Badge>
                        )}
                        {!supplier.isOriginal && isCheapest && (
                          <Badge className="absolute -top-2 -right-2 bg-green-600">
                            Cheapest
                          </Badge>
                        )}
                        {!supplier.isOriginal && isMostExpensive && suppliers.length > 1 && cheapest?.num !== mostExpensive?.num && (
                          <Badge className="absolute -top-2 -right-2 bg-red-600">
                            Most Expensive
                          </Badge>
                        )}
                        
                        <h4 className="font-semibold mb-3">{supplier.name}</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Items Quoted:</span>
                            <span className="font-medium">{supplier.items}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Quote:</span>
                            <span className="font-semibold">₱{supplier.total.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg per Item:</span>
                            <span className="font-medium">₱{supplier.avgPrice.toFixed(2)}</span>
                          </div>
                          {!supplier.isOriginal && (
                            <div className="pt-2 border-t">
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">vs Original:</span>
                                <div className="flex items-center gap-1">
                                  {supplier.savings > 0 ? (
                                    <TrendingDown className="w-3 h-3 text-green-600 dark:text-green-400" />
                                  ) : supplier.savings < 0 ? (
                                    <TrendingUp className="w-3 h-3 text-red-600 dark:text-red-400" />
                                  ) : null}
                                  <span className={`font-semibold ${supplier.savings > 0 ? 'text-green-600 dark:text-green-400' : supplier.savings < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                                    {supplier.savings > 0 ? '-' : supplier.savings < 0 ? '+' : ''} ₱{Math.abs(supplier.savings).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-end mt-1">
                                <span className={`text-xs ${supplier.savings > 0 ? 'text-green-600 dark:text-green-400' : supplier.savings < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                                  ({supplier.savingsPercent > 0 ? '-' : supplier.savingsPercent < 0 ? '+' : ''}{Math.abs(supplier.savingsPercent).toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Comparison Summary */}
                {suppliers.length > 1 && cheapest && mostExpensive && (
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center flex-shrink-0">
                          <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Best Value</p>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{cheapest.name}</span> offers the lowest total at{' '}
                            <span className="font-semibold text-green-600 dark:text-green-400">₱{cheapest.total.toFixed(2)}</span>
                            {cheapest.savings > 0 && (
                              <span> with ₱{cheapest.savings.toFixed(2)} in savings</span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      {cheapest.num !== mostExpensive.num && (
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">Price Difference</p>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">{mostExpensive.name}</span> is{' '}
                              <span className="font-semibold text-red-600 dark:text-red-400">
                                ₱{(mostExpensive.total - cheapest.total).toFixed(2)} more expensive
                              </span>
                              {' '}than {cheapest.name}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      </div>
    </div>
    </>
  )
}
