'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ArrowLeft, Save, Loader2, Check, ChevronsUpDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type DocCode = {
  docCode: string
  partyName: string
  refCode1: string
  itemCount: number
  docDate: string | null
}

type PurchaseItem = {
  barcode: string
  name: string
  docCode: string
  price: number
  siteCode: string
  partyName: string
  partyTermsText: string
  refCode1: string
}

type CanvassingItem = PurchaseItem & {
  supplier1Name: string
  supplier1Price: string
  supplier1Terms: string
  supplier2Name: string
  supplier2Price: string
  supplier2Terms: string
  supplier3Name: string
  supplier3Price: string
  supplier3Terms: string
}

export default function NewCanvassingPage() {
  const router = useRouter()
  const [docCodes, setDocCodes] = useState<DocCode[]>([])
  const [selectedDocCode, setSelectedDocCode] = useState('')
  const [open, setOpen] = useState(false)
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [items, setItems] = useState<CanvassingItem[]>([])
  const [originalData, setOriginalData] = useState<{
    partyName: string
    partyTermsText: string
  } | null>(null)

  useEffect(() => {
    loadDocCodes()
  }, [])

  const loadDocCodes = async () => {
    setIsLoadingDocs(true)
    try {
      const response = await fetch('/api/canvassing/doc-codes?siteCode=001')
      const result = await response.json()

      if (result.success) {
        setDocCodes(result.data)
      } else {
        toast.error(result.error || 'Failed to load pr numbers')
      }
    } catch (error) {
      toast.error('Failed to load pr numbers')
    } finally {
      setIsLoadingDocs(false)
    }
  }

  const loadItems = async (docCode: string) => {
    setIsLoadingItems(true)
    try {
      const response = await fetch(`/api/canvassing/items?docCode=${docCode}&siteCode=001`)
      const result = await response.json()

      if (result.success && result.data.length > 0) {
        const firstItem = result.data[0]
        setOriginalData({
          partyName: firstItem.partyName,
          partyTermsText: firstItem.partyTermsText
        })

        setItems(result.data.map((item: PurchaseItem) => ({
          ...item,
          supplier1Name: '',
          supplier1Price: '',
          supplier1Terms: '',
          supplier2Name: '',
          supplier2Price: '',
          supplier2Terms: '',
          supplier3Name: '',
          supplier3Price: '',
          supplier3Terms: ''
        })))
      } else {
        toast.error('No items found for this pr number')
      }
    } catch (error) {
      toast.error('Failed to load items')
    } finally {
      setIsLoadingItems(false)
    }
  }

  const handleDocCodeSelect = (docCode: string) => {
    setSelectedDocCode(docCode)
    setOpen(false)
    loadItems(docCode)
  }

  const handleItemChange = (index: number, field: keyof CanvassingItem, value: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error('No items to save')
      return
    }

    // Validate that at least one item has supplier data
    const hasData = items.some(item => 
      item.supplier1Name || item.supplier1Price || item.supplier1Terms ||
      item.supplier2Name || item.supplier2Price || item.supplier2Terms ||
      item.supplier3Name || item.supplier3Price || item.supplier3Terms
    )

    if (!hasData) {
      toast.error('Please enter supplier information for at least one item')
      return
    }

    if (!originalData) {
      toast.error('Missing original data')
      return
    }

    setIsSaving(true)
    try {
      const { saveCanvassing } = await import('@/app/actions/canvassing-simple-actions')
      
      const result = await saveCanvassing({
        legacyDocCode: selectedDocCode,
        legacyRefCode: items[0]?.refCode1 || '',
        siteCode: items[0]?.siteCode || '001',
        partyName: originalData.partyName,
        partyTermsText: originalData.partyTermsText,
        items: items.map(item => ({
          barcode: item.barcode,
          productName: item.name,
          originalPrice: item.price,
          supplier1Name: item.supplier1Name,
          supplier1Price: item.supplier1Price,
          supplier1Terms: item.supplier1Terms,
          supplier2Name: item.supplier2Name,
          supplier2Price: item.supplier2Price,
          supplier2Terms: item.supplier2Terms,
          supplier3Name: item.supplier3Name,
          supplier3Price: item.supplier3Price,
          supplier3Terms: item.supplier3Terms
        }))
      })

      if (result.success) {
        toast.success(result.message)
        router.push('/admin/canvassing')
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to save canvassing')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-6 gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">New Canvassing</h1>
          </div>
          <Button onClick={handleSave} disabled={isSaving || items.length === 0}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Canvassing
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Doc Code Selection */}
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Purchase Request</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>
                Purchase Request # <span className="text-destructive">*</span>
              </Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    disabled={isLoadingDocs}
                  >
                    {isLoadingDocs ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : selectedDocCode ? (
                      selectedDocCode
                    ) : (
                      "Select pr number..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search pr number..." />
                    <CommandEmpty>No pr number found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {docCodes.map((doc) => (
                        <CommandItem
                          key={doc.docCode}
                          value={doc.docCode}
                          onSelect={() => handleDocCodeSelect(doc.docCode)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedDocCode === doc.docCode ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{doc.docCode}</div>
                            <div className="text-xs text-muted-foreground">
                              {doc.partyName} • {doc.itemCount} items
                              {doc.docDate && ` • ${new Date(doc.docDate).toLocaleDateString()}`}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {originalData && (
              <>
                <div className="space-y-2">
                  <Label>Original Supplier</Label>
                  <Input value={originalData.partyName} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Original Terms</Label>
                  <Input value={originalData.partyTermsText} disabled />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Items Table/Cards */}
        {isLoadingItems ? (
          <div className="flex items-center justify-center py-12 border rounded-lg">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length > 0 ? (
          <div className="border rounded-lg">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Items ({items.length})</h3>
              <p className="text-sm text-muted-foreground">
                Enter supplier names and prices (you can add payment terms later)
              </p>
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Barcode</TableHead>
                    <TableHead className="min-w-[200px]">Product Name</TableHead>
                    <TableHead className="text-right w-32">Original Price</TableHead>
                    <TableHead className="w-48">Supplier 1</TableHead>
                    <TableHead className="w-32">Price 1</TableHead>
                    <TableHead className="w-48">Supplier 2</TableHead>
                    <TableHead className="w-32">Price 2</TableHead>
                    <TableHead className="w-48">Supplier 3</TableHead>
                    <TableHead className="w-32">Price 3</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={`${item.barcode}-${index}`}>
                      <TableCell className="font-mono text-xs">{item.barcode}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">₱{item.price.toFixed(2)}</TableCell>
                      
                      {/* Supplier 1 */}
                      <TableCell>
                        <Input
                          placeholder="Supplier 1"
                          value={item.supplier1Name}
                          onChange={(e) => handleItemChange(index, 'supplier1Name', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={item.supplier1Price}
                          onChange={(e) => handleItemChange(index, 'supplier1Price', e.target.value)}
                        />
                      </TableCell>

                      {/* Supplier 2 */}
                      <TableCell>
                        <Input
                          placeholder="Supplier 2"
                          value={item.supplier2Name}
                          onChange={(e) => handleItemChange(index, 'supplier2Name', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={item.supplier2Price}
                          onChange={(e) => handleItemChange(index, 'supplier2Price', e.target.value)}
                        />
                      </TableCell>

                      {/* Supplier 3 */}
                      <TableCell>
                        <Input
                          placeholder="Supplier 3"
                          value={item.supplier3Name}
                          onChange={(e) => handleItemChange(index, 'supplier3Name', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={item.supplier3Price}
                          onChange={(e) => handleItemChange(index, 'supplier3Price', e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y">
              {items.map((item, index) => (
                <div key={`${item.barcode}-${index}`} className="p-4 space-y-4">
                  {/* Product Info */}
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.barcode}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Original</p>
                        <p className="font-semibold">₱{item.price.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Suppliers */}
                  <div className="space-y-3">
                    {/* Supplier 1 */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Supplier 1</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Name"
                          value={item.supplier1Name}
                          onChange={(e) => handleItemChange(index, 'supplier1Name', e.target.value)}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={item.supplier1Price}
                          onChange={(e) => handleItemChange(index, 'supplier1Price', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>

                    {/* Supplier 2 */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Supplier 2</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Name"
                          value={item.supplier2Name}
                          onChange={(e) => handleItemChange(index, 'supplier2Name', e.target.value)}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={item.supplier2Price}
                          onChange={(e) => handleItemChange(index, 'supplier2Price', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>

                    {/* Supplier 3 */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Supplier 3</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Name"
                          value={item.supplier3Name}
                          onChange={(e) => handleItemChange(index, 'supplier3Name', e.target.value)}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={item.supplier3Price}
                          onChange={(e) => handleItemChange(index, 'supplier3Price', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : selectedDocCode ? (
          <div className="text-center py-12 border rounded-lg border-dashed">
            <p className="text-muted-foreground">No items found for this pr number</p>
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg border-dashed">
            <p className="text-muted-foreground">Select a pr number to load items</p>
          </div>
        )}
      </div>
    </div>
  )
}
