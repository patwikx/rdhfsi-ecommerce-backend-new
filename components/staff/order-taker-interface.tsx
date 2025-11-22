'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Trash2, Send, ShoppingCart, Search, Loader2, X, Package } from 'lucide-react'
import { toast } from 'sonner'
import {
  createOrderDraft,
  getSalesmanDrafts,
  getOrderDraftById,
  addItemToDraft,
  updateDraftItem,
  removeItemFromDraft,
  sendDraftToCashier,
  updateDraftCustomer,
  searchProductsForOrder,
} from '@/app/actions/order-draft-actions'
import { useCurrentSite } from '@/hooks/use-current-site'
import Image from 'next/image'

type DraftListItem = NonNullable<Awaited<ReturnType<typeof getSalesmanDrafts>>['data']>[number]
type Draft = NonNullable<Awaited<ReturnType<typeof getOrderDraftById>>['data']>

type Product = {
  id: string
  name: string
  sku: string
  barcode: string
  retailPrice: number
  wholesalePrice: number | null
  images: { url: string }[]
  category: { name: string }
  availableQty: number
  shelfCode: string | null
  aisleCode: string | null
}

export function OrderTakerInterface() {
  const { siteId } = useCurrentSite()
  const [drafts, setDrafts] = useState<DraftListItem[]>([])
  const [currentDraft, setCurrentDraft] = useState<Draft | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isNewDraftOpen, setIsNewDraftOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)

  // Customer info for new draft
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  useEffect(() => {
    loadDrafts()
    loadProducts()
  }, [])

  const loadProducts = async () => {
    if (!siteId) return
    
    setIsLoadingProducts(true)
    const result = await searchProductsForOrder('', siteId) // Empty query loads all
    if (result.success && result.data) {
      setAllProducts(result.data)
    }
    setIsLoadingProducts(false)
  }

  const loadDrafts = async () => {
    setIsLoading(true)
    const result = await getSalesmanDrafts('IN_PROGRESS')
    if (result.success && result.data) {
      setDrafts(result.data)
      // Auto-select first draft if none selected
      if (!currentDraft && result.data.length > 0) {
        loadDraft(result.data[0].id)
      }
    }
    setIsLoading(false)
  }

  const loadDraft = async (draftId: string) => {
    const result = await getOrderDraftById(draftId)
    if (result.success && result.data) {
      setCurrentDraft(result.data)
    }
  }

  const handleCreateDraft = async () => {
    if (!siteId) {
      toast.error('Please select a site first')
      return
    }

    const result = await createOrderDraft({
      siteId,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
    })

    if (result.success && result.data) {
      toast.success(result.message)
      setIsNewDraftOpen(false)
      setCustomerName('')
      setCustomerPhone('')
      await loadDrafts()
      loadDraft(result.data.id)
    } else {
      toast.error(result.error)
    }
  }

  // Filter products based on search query
  const filteredProducts = allProducts.filter(product => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    return (
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      product.barcode.toLowerCase().includes(query)
    )
  })

  const handleAddProduct = async (product: Product) => {
    if (!currentDraft) {
      toast.error('Please create or select a draft first')
      return
    }

    const result = await addItemToDraft({
      draftId: currentDraft.id,
      productId: product.id,
      quantity: 1,
      unitPrice: product.retailPrice,
    })

    if (result.success) {
      toast.success(result.message)
      await loadDraft(currentDraft.id)
    } else {
      toast.error(result.error)
    }
  }

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    const result = await updateDraftItem(itemId, { quantity: newQuantity })
    if (result.success && currentDraft) {
      await loadDraft(currentDraft.id)
    } else {
      toast.error(result.error)
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    const result = await removeItemFromDraft(itemId)
    if (result.success && currentDraft) {
      toast.success(result.message)
      await loadDraft(currentDraft.id)
    } else {
      toast.error(result.error)
    }
  }

  const handleSendToCashier = async () => {
    if (!currentDraft) return

    if (currentDraft.items.length === 0) {
      toast.error('Cannot send empty order to cashier')
      return
    }

    const result = await sendDraftToCashier(currentDraft.id)
    if (result.success) {
      toast.success(result.message)
      setCurrentDraft(null)
      await loadDrafts()
    } else {
      toast.error(result.error)
    }
  }

  const handleUpdateCustomer = async () => {
    if (!currentDraft) return

    const result = await updateDraftCustomer(currentDraft.id, {
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
    })

    if (result.success) {
      toast.success(result.message)
      await loadDraft(currentDraft.id)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Left Sidebar - Draft List */}
      <div className="w-64 border-r pr-6 flex flex-col">
        <div className="mb-4">
          <Button onClick={() => setIsNewDraftOpen(true)} className="w-full" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No active orders</p>
            </div>
          ) : (
            drafts.map((draft) => (
              <button
                key={draft.id}
                onClick={() => loadDraft(draft.id)}
                className={`w-full text-left p-2 border rounded hover:bg-muted/50 transition-colors text-sm ${
                  currentDraft?.id === draft.id ? 'bg-muted border-primary' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-medium text-xs">{draft.draftNumber}</span>
                  <Badge variant="secondary" className="text-xs h-4 px-1">
                    {draft._count.items}
                  </Badge>
                </div>
                {draft.customerName && (
                  <p className="text-xs text-muted-foreground truncate">{draft.customerName}</p>
                )}
                <p className="font-bold mt-1">
                  ₱{parseFloat(draft.totalAmount.toString()).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex flex-col min-w-0">
        {!currentDraft ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select an order or create a new one</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-6 h-full">
            {/* Left: Product Browser */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Products</h2>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {isLoadingProducts ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>{searchQuery ? 'No products found' : 'No products available'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredProducts.map((product) => {
                      const isOutOfStock = product.availableQty <= 0
                      return (
                        <button
                          key={product.id}
                          onClick={() => !isOutOfStock && handleAddProduct(product)}
                          disabled={isOutOfStock}
                          className={`border rounded-lg p-3 transition-all text-left ${
                            isOutOfStock
                              ? 'opacity-50 cursor-not-allowed bg-muted/50'
                              : 'hover:border-primary hover:shadow-sm'
                          }`}
                        >
                          {product.images[0]?.url ? (
                            <div className="relative w-full aspect-square rounded mb-2 overflow-hidden bg-muted">
                              <Image
                                src={product.images[0].url}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                              {isOutOfStock && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <span className="text-white text-xs font-medium">Not Available</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-full aspect-square rounded mb-2 bg-muted flex items-center justify-center">
                              <Package className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <p className="font-medium text-sm line-clamp-2 mb-1">{product.name}</p>
                          <p className="text-xs text-muted-foreground mb-2">{product.sku}</p>
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-bold text-primary">
                              ₱{product.retailPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                            {isOutOfStock ? (
                              <Badge variant="destructive" className="text-xs">Not Available</Badge>
                            ) : (
                              <Badge className="text-xs bg-green-600 text-white hover:bg-green-700">
                                Qty: {product.availableQty}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {product.aisleCode && product.shelfCode ? (
                              <>
                                <span className="font-medium">Location:</span> {product.aisleCode}-{product.shelfCode}
                              </>
                            ) : (
                              <span className="italic">No location assigned</span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="w-96 border-l pl-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold">{currentDraft.draftNumber}</h2>
                  <p className="text-xs text-muted-foreground">{currentDraft.items.length} items</p>
                </div>
                <Button onClick={handleSendToCashier} disabled={currentDraft.items.length === 0} size="sm">
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <Input
                  placeholder="Customer name"
                  value={customerName || currentDraft.customerName || ''}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onBlur={handleUpdateCustomer}
                  className="text-sm"
                />
                <Input
                  placeholder="Phone"
                  value={customerPhone || currentDraft.customerPhone || ''}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  onBlur={handleUpdateCustomer}
                  className="text-sm"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {currentDraft.items.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    <div className="text-center">
                      <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No items yet</p>
                    </div>
                  </div>
                ) : (
                  currentDraft.items.map((item) => (
                    <div key={item.id} className="border rounded p-2">
                      <div className="flex gap-2">
                        {item.product.images[0]?.url ? (
                          <div className="relative w-12 h-12 rounded border flex-shrink-0">
                            <Image
                              src={item.product.images[0].url}
                              alt={item.product.name}
                              fill
                              className="object-cover rounded"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-1">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">{item.product.sku}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              -
                            </Button>
                            <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            >
                              +
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 ml-auto"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <X className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-sm">
                            ₱{parseFloat(item.subtotal.toString()).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span>
                    ₱{parseFloat(currentDraft.totalAmount.toString()).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Draft Dialog */}
      <Dialog open={isNewDraftOpen} onOpenChange={setIsNewDraftOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
            <DialogDescription>
              Start a new order. Customer information is optional for walk-in customers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newCustomerName">Customer Name (Optional)</Label>
              <Input
                id="newCustomerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in customer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newCustomerPhone">Phone (Optional)</Label>
              <Input
                id="newCustomerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Contact number"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsNewDraftOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDraft}>
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  )
}
