'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  ArrowLeft, 
  Download, 
  RefreshCw, 
  Loader,
  Package,
  MapPin,
  Layers,
  Weight,
  Box,
  QrCode as QrCodeIcon,
  Plus,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  Upload
} from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { getShelfById, regenerateQRCode, updateShelf, getAvailableProductsForShelf, addProductToShelf, removeProductFromShelf, importProductsToShelf } from '@/app/actions/shelf-actions'
import { toast } from 'sonner'
import { AisleSelector } from '@/components/admin/inventory/aisle-selector'
import { CSVImportDialog } from '@/components/admin/inventory/csv-import-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import Image from 'next/image'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type ShelfData = {
  id: string
  code: string
  name: string
  description: string | null
  level: number | null
  position: number | null
  maxWeight: { toString: () => string } | null
  maxVolume: { toString: () => string } | null
  qrCode: string
  qrCodeImage: string | null
  isActive: boolean
  isAccessible: boolean
  notes: string | null
  site: {
    id: string
    name: string
    code: string
    type: string
  }
  aisle: {
    id: string
    name: string
    code: string
  } | null
  binInventories: Array<{
    id: string
    quantity: { toString: () => string }
    reservedQty: { toString: () => string }
    availableQty: { toString: () => string }
    isPrimary: boolean
    product: {
      id: string
      name: string
      sku: string
      barcode: string
    }
  }>
  _count: {
    binInventories: number
    movementsFrom: number
    movementsTo: number
  }
}

export default function ShelfDetailPage() {
  const router = useRouter()
  const params = useParams()
  const shelfId = params.id as string

  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [shelfData, setShelfData] = useState<ShelfData | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [availableProducts, setAvailableProducts] = useState<Array<{
    id: string
    quantity: string
    availableQty: string
    product: {
      id: string
      sku: string
      name: string
      barcode: string
      baseUom: string
    }
  }>>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string
    name: string
    sku: string
    availableQty: string
    baseUom: string
  } | null>(null)
  const [quantityToAdd, setQuantityToAdd] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const itemsPerPage = 20
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [binToRemove, setBinToRemove] = useState<{
    id: string
    productName: string
    sku: string
  } | null>(null)
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [selectedBins, setSelectedBins] = useState<string[]>([])
  
  // Form data for editing
  const [formData, setFormData] = useState({
    siteId: '',
    aisleId: '',
    code: '',
    name: '',
    description: '',
    level: '',
    position: '',
    maxWeight: '',
    maxVolume: '',
    isActive: true,
    isAccessible: true,
    notes: '',
  })

  const fetchShelf = async () => {
    try {
      const result = await getShelfById(shelfId)

      if (result.success && result.data) {
        setShelfData(result.data)
        setFormData({
          siteId: result.data.site.id,
          aisleId: result.data.aisle?.id || '',
          code: result.data.code,
          name: result.data.name,
          description: result.data.description || '',
          level: result.data.level?.toString() || '',
          position: result.data.position?.toString() || '',
          maxWeight: result.data.maxWeight?.toString() || '',
          maxVolume: result.data.maxVolume?.toString() || '',
          isActive: result.data.isActive,
          isAccessible: result.data.isAccessible,
          notes: result.data.notes || '',
        })
      } else {
        toast.error(result.error || 'Failed to fetch shelf')
        router.push('/admin/inventory/shelves')
      }
    } catch (error) {
      toast.error('An error occurred while fetching shelf')
      router.push('/admin/inventory/shelves')
    }
  }

  useEffect(() => {
    fetchShelf()
  }, [shelfId])

  const fetchAvailableProducts = async () => {
    setIsLoadingProducts(true)
    try {
      const result = await getAvailableProductsForShelf(
        shelfId, 
        searchQuery || undefined,
        currentPage,
        itemsPerPage
      )
      if (result.success && result.data) {
        setAvailableProducts(result.data)
        setTotalProducts(result.total || 0)
      } else {
        toast.error(result.error || 'Failed to fetch products')
      }
    } catch (error) {
      toast.error('An error occurred while fetching products')
    } finally {
      setIsLoadingProducts(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1) // Reset to first page on search
      fetchAvailableProducts()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, shelfId])

  useEffect(() => {
    fetchAvailableProducts()
  }, [currentPage])

  const handleAddProduct = async () => {
    if (!selectedProduct || !quantityToAdd) return

    const quantity = parseFloat(quantityToAdd)
    const available = parseFloat(selectedProduct.availableQty)

    if (quantity <= 0 || quantity > available) {
      toast.error('Invalid quantity')
      return
    }

    setIsAddingProduct(true)
    try {
      const result = await addProductToShelf({
        shelfId,
        productId: selectedProduct.id,
        quantity,
        isPrimary: false,
      })

      if (result.success) {
        toast.success(result.message)
        setAddDialogOpen(false)
        setSelectedProduct(null)
        setQuantityToAdd('')
        fetchShelf()
        fetchAvailableProducts()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to add product')
    } finally {
      setIsAddingProduct(false)
    }
  }

  const openAddDialog = (product: { id: string; name: string; sku: string; availableQty: string; baseUom: string }) => {
    setSelectedProduct(product)
    setQuantityToAdd('')
    setAddDialogOpen(true)
  }

  const handleRemoveProduct = async () => {
    if (!binToRemove) return

    try {
      const result = await removeProductFromShelf(binToRemove.id)
      if (result.success) {
        toast.success(result.message)
        setRemoveDialogOpen(false)
        setBinToRemove(null)
        fetchShelf()
        fetchAvailableProducts()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to remove product')
    }
  }

  const openRemoveDialog = (binId: string, productName: string, sku: string) => {
    setBinToRemove({ id: binId, productName, sku })
    setRemoveDialogOpen(true)
  }

  const handleCSVImport = async (items: Array<{ barcode: string; quantity: number }>) => {
    return await importProductsToShelf({
      shelfId,
      items,
    })
  }

  const handleImportComplete = () => {
    fetchShelf()
    fetchAvailableProducts()
  }

  const handleSelectBin = (binId: string, checked: boolean) => {
    if (checked) {
      setSelectedBins(prev => [...prev, binId])
    } else {
      setSelectedBins(prev => prev.filter(id => id !== binId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBins(shelfData?.binInventories.map(bin => bin.id) || [])
    } else {
      setSelectedBins([])
    }
  }

  const handleExportInventoryCSV = () => {
    if (!shelfData) return

    try {
      // Create CSV header
      const headers = [
        'Barcode',
        'Product Name',
        'Quantity',
        'Reserved',
        'Available',
      ]

      // Create CSV rows
      const rows = shelfData.binInventories.map(bin => [
        bin.product.barcode,
        `"${bin.product.name.replace(/"/g, '""')}"`, // Escape quotes
        parseFloat(bin.quantity.toString()).toFixed(2),
        parseFloat(bin.reservedQty.toString()).toFixed(2),
        parseFloat(bin.availableQty.toString()).toFixed(2),
      ])

      // Combine header and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `shelf-${shelfData.code}-inventory-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`Exported ${shelfData.binInventories.length} items to CSV`)
    } catch (error) {
      toast.error('Failed to export CSV')
      console.error('Export error:', error)
    }
  }

  const handleRegenerateQR = async () => {
    setIsRegenerating(true)
    try {
      const result = await regenerateQRCode(shelfId)
      if (result.success) {
        toast.success(result.message)
        fetchShelf()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to regenerate QR code')
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleDownloadQR = () => {
    if (!shelfData?.qrCodeImage) return

    const link = document.createElement('a')
    link.href = shelfData.qrCodeImage
    link.download = `shelf-${shelfData.code}-qr.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSaveChanges = async () => {
    if (!shelfData) return
    
    setIsSaving(true)
    try {
      const result = await updateShelf(shelfId, {
        aisleId: formData.aisleId || undefined,
        code: formData.code,
        name: formData.name,
        description: formData.description || undefined,
        level: formData.level ? parseInt(formData.level) : undefined,
        position: formData.position ? parseInt(formData.position) : undefined,
        maxWeight: formData.maxWeight ? parseFloat(formData.maxWeight) : undefined,
        maxVolume: formData.maxVolume ? parseFloat(formData.maxVolume) : undefined,
        isActive: formData.isActive,
        isAccessible: formData.isAccessible,
        notes: formData.notes || undefined,
      })

      if (result.success) {
        toast.success(result.message)
        setIsEditing(false)
        fetchShelf()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to update shelf')
    } finally {
      setIsSaving(false)
    }
  }

  if (!shelfData) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Shelf Details</h1>
          <p className="text-muted-foreground">Manage shelf location and inventory</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={shelfData.isActive ? 'default' : 'secondary'}>
            {shelfData.isActive ? 'Active' : 'Inactive'}
          </Badge>
          {!shelfData.isAccessible && (
            <Badge variant="destructive">Blocked</Badge>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-24 h-24 bg-white rounded border-2 border-border p-1 flex-shrink-0">
              {shelfData.qrCodeImage ? (
                <Image
                  src={shelfData.qrCodeImage}
                  alt={`QR Code for ${shelfData.code}`}
                  width={88}
                  height={88}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <QrCodeIcon className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-4xl font-bold truncate">{shelfData.code}</h2>
              <p className="text-xl text-muted-foreground truncate">{shelfData.name}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" onClick={handleRegenerateQR} disabled={isRegenerating} className="h-8 px-3">
                <RefreshCw className={`w-3 h-3 mr-1 ${isRegenerating ? 'animate-spin' : ''}`} />
                <span className="text-xs">Regenerate</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadQR} className="h-8 px-3">
                <Download className="w-3 h-3 mr-1" />
                <span className="text-xs">Download</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-muted-foreground">Site</div>
            <MapPin className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold">{shelfData.site.code}</div>
          <p className="text-xs text-muted-foreground">{shelfData.site.name}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-muted-foreground">Aisle</div>
            <Layers className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold">{shelfData.aisle?.code || '-'}</div>
          <p className="text-xs text-muted-foreground">{shelfData.aisle?.name || 'No aisle'}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-muted-foreground">Products</div>
            <Package className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold">{shelfData._count.binInventories}</div>
          <p className="text-xs text-muted-foreground">Items on shelf</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-[320px_1fr] gap-6">
        {/* Left Side - Shelf Details */}
        <div className="space-y-4">
          {/* Shelf Details */}
          <div className="border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Shelf Details</h3>
              {!isEditing && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aisleId">Aisle</Label>
                  <AisleSelector
                    siteId={formData.siteId}
                    value={formData.aisleId}
                    onChange={(value) => setFormData({ ...formData, aisleId: value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="level">Level</Label>
                    <Input
                      id="level"
                      type="number"
                      min="1"
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      type="number"
                      min="1"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="maxWeight">Max Weight (kg)</Label>
                    <Input
                      id="maxWeight"
                      type="number"
                      step="0.01"
                      value={formData.maxWeight}
                      onChange={(e) => setFormData({ ...formData, maxWeight: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxVolume">Max Volume (m³)</Label>
                    <Input
                      id="maxVolume"
                      type="number"
                      step="0.01"
                      value={formData.maxVolume}
                      onChange={(e) => setFormData({ ...formData, maxVolume: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, isActive: checked })
                        }
                      />
                      <Label htmlFor="isActive" className="cursor-pointer">
                        {formData.isActive ? 'Active' : 'Inactive'}
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Accessibility</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isAccessible"
                        checked={formData.isAccessible}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, isAccessible: checked })
                        }
                      />
                      <Label htmlFor="isAccessible" className="cursor-pointer">
                        {formData.isAccessible ? 'Accessible' : 'Blocked'}
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveChanges} disabled={isSaving} className="flex-1">
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <Label className="text-muted-foreground">Code</Label>
                  <p className="font-medium">{shelfData.code}</p>
                </div>
                
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{shelfData.name}</p>
                </div>

                {shelfData.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p>{shelfData.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {shelfData.level && (
                    <div>
                      <Label className="text-muted-foreground">Level</Label>
                      <p>{shelfData.level}</p>
                    </div>
                  )}
                  
                  {shelfData.position && (
                    <div>
                      <Label className="text-muted-foreground">Position</Label>
                      <p>{shelfData.position}</p>
                    </div>
                  )}
                </div>

                {(shelfData.maxWeight || shelfData.maxVolume) && (
                  <div className="grid grid-cols-2 gap-2">
                    {shelfData.maxWeight && (
                      <div>
                        <Label className="text-muted-foreground">Max Weight</Label>
                        <p className="flex items-center gap-1">
                          <Weight className="w-3 h-3" />
                          {shelfData.maxWeight.toString()} kg
                        </p>
                      </div>
                    )}
                    
                    {shelfData.maxVolume && (
                      <div>
                        <Label className="text-muted-foreground">Max Volume</Label>
                        <p className="flex items-center gap-1">
                          <Box className="w-3 h-3" />
                          {shelfData.maxVolume.toString()} m³
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {shelfData.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="text-xs">{shelfData.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Tabs */}
        <div>
          <Tabs defaultValue="inventory" className="space-y-4">
            <TabsList>
              <TabsTrigger value="inventory">
                Inventory on Shelf ({shelfData._count.binInventories})
              </TabsTrigger>
              <TabsTrigger value="add">
                Available Products to Add
              </TabsTrigger>
            </TabsList>

            {/* Inventory Tab */}
            <TabsContent value="inventory">
              <div className="border rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-semibold">Current Inventory</h3>
                    <p className="text-sm text-muted-foreground">Products stored on this shelf</p>
                  </div>
                  <div className="flex gap-2">
                    {shelfData.binInventories.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportInventoryCSV}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                      </Button>
                    )}
                    {selectedBins.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          // Handle bulk delete
                          toast.info('Bulk delete coming soon')
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove Selected ({selectedBins.length})
                      </Button>
                    )}
                  </div>
                </div>

                {shelfData.binInventories.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg border-dashed">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No inventory on this shelf</p>
                    <p className="text-sm text-muted-foreground">Switch to "Available Products to Add" tab to add items</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedBins.length === shelfData.binInventories.length}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Barcode</TableHead>
                          <TableHead>Product Name</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Reserved</TableHead>
                          <TableHead className="text-right">Available</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shelfData.binInventories.map((bin) => (
                          <TableRow key={bin.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedBins.includes(bin.id)}
                                onCheckedChange={(checked) => handleSelectBin(bin.id, checked as boolean)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{bin.product.barcode}</TableCell>
                            <TableCell>{bin.product.name}</TableCell>
                            <TableCell className="text-right">{parseFloat(bin.quantity.toString()).toFixed(2)}</TableCell>
                            <TableCell className="text-right">{parseFloat(bin.reservedQty.toString()).toFixed(2)}</TableCell>
                            <TableCell className="text-right">{parseFloat(bin.availableQty.toString()).toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => openRemoveDialog(bin.id, bin.product.name, bin.product.sku)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Add Products Tab */}
            <TabsContent value="add">
              <div className="border rounded-lg p-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Add Products to Shelf</h3>
                      <p className="text-sm text-muted-foreground">Search and add products from site inventory</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setCsvImportOpen(true)}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Import CSV
                    </Button>
                  </div>
                  
                  <div className="relative">
                    <Input
                      placeholder="Search by product name, SKU, or barcode..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                    {isLoadingProducts && (
                      <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>

                {availableProducts.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg border-dashed">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery ? 'No products found matching your search' : 'No available products at this site'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Barcode</TableHead>
                            <TableHead>UOM</TableHead>
                            <TableHead className="text-right">Available Qty</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availableProducts.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.product.sku}</TableCell>
                              <TableCell>{item.product.name}</TableCell>
                              <TableCell>{item.product.barcode}</TableCell>
                              <TableCell>{item.product.baseUom}</TableCell>
                              <TableCell className="text-right">
                                {parseFloat(item.availableQty).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  onClick={() => openAddDialog({
                                    id: item.product.id,
                                    name: item.product.name,
                                    sku: item.product.sku,
                                    availableQty: item.availableQty,
                                    baseUom: item.product.baseUom,
                                  })}
                                  disabled={isAddingProduct}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add to Shelf
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalProducts)} of {totalProducts} products
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => p + 1)}
                          disabled={currentPage * itemsPerPage >= totalProducts}
                        >
                          Next
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product to Shelf</DialogTitle>
            <DialogDescription>
              Enter the quantity to add to this shelf location
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <Label className="text-muted-foreground">SKU</Label>
                    <p className="font-medium">{selectedProduct.sku}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Available</Label>
                    <p className="font-medium">{parseFloat(selectedProduct.availableQty).toFixed(2)} {selectedProduct.baseUom}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Product</Label>
                    <p className="font-medium">{selectedProduct.name}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantity to Add <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedProduct.availableQty}
                  value={quantityToAdd}
                  onChange={(e) => setQuantityToAdd(e.target.value)}
                  placeholder="Enter quantity"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Maximum: {parseFloat(selectedProduct.availableQty).toFixed(2)} {selectedProduct.baseUom}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProduct} disabled={isAddingProduct || !quantityToAdd}>
              {isAddingProduct ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Shelf
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Product Alert Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Product from Shelf?</AlertDialogTitle>
            <AlertDialogDescription>
              {binToRemove && (
                <>
                  Are you sure you want to remove <strong>{binToRemove.productName}</strong> (SKU: {binToRemove.sku}) from this shelf?
                  <br /><br />
                  This action cannot be undone. Products with reserved quantity cannot be removed.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveProduct} className="bg-destructive hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        onImport={handleCSVImport}
        onComplete={handleImportComplete}
      />
    </div>
  )
}
