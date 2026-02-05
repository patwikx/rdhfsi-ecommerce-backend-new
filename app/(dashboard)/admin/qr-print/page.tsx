'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { QrCode, Printer, Search, Package, Warehouse, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { getAllProducts } from '@/app/actions/product-actions'
import { getShelves } from '@/app/actions/shelf-actions'
import { useCurrentSite } from '@/hooks/use-current-site'
import Image from 'next/image'

type Product = {
  id: string
  sku: string
  barcode: string
  name: string
  qrCodeImage: string | null
}

type Shelf = {
  id: string
  code: string
  name: string
  qrCodeImage: string | null
  site: {
    name: string
    code: string
  }
  aisle: {
    code: string
  } | null
}

export default function QRPrintPage() {
  const { siteId } = useCurrentSite()
  const [activeTab, setActiveTab] = useState<'products' | 'shelves'>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [shelves, setShelves] = useState<Shelf[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [selectedShelves, setSelectedShelves] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    loadData()
  }, [siteId, activeTab])

  const loadData = async () => {
    if (!siteId) return
    
    setIsLoading(true)
    try {
      if (activeTab === 'products') {
        const result = await getAllProducts({ siteId })
        if (result.success && result.data) {
          // Filter products that have QR codes
          const productsWithQR = result.data
            .filter(p => p.qrCodeImage)
            .map(p => ({
              id: p.id,
              sku: p.sku,
              barcode: p.barcode,
              name: p.name,
              qrCodeImage: p.qrCodeImage || null
            }))
          setProducts(productsWithQR)
        }
      } else {
        const result = await getShelves({ siteId })
        if (result.success && result.data) {
          // Filter shelves that have QR codes
          const shelvesWithQR = result.data
            .filter(s => s.qrCodeImage)
            .map(s => ({
              id: s.id,
              code: s.code,
              name: s.name,
              qrCodeImage: s.qrCodeImage || null,
              site: s.site,
              aisle: s.aisle
            }))
          setShelves(shelvesWithQR)
        }
      }
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId])
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId))
    }
  }

  const handleSelectAllProducts = (checked: boolean) => {
    if (checked) {
      const filtered = filteredProducts.map(p => p.id)
      setSelectedProducts(filtered)
    } else {
      setSelectedProducts([])
    }
  }

  const handleSelectShelf = (shelfId: string, checked: boolean) => {
    if (checked) {
      setSelectedShelves(prev => [...prev, shelfId])
    } else {
      setSelectedShelves(prev => prev.filter(id => id !== shelfId))
    }
  }

  const handleSelectAllShelves = (checked: boolean) => {
    if (checked) {
      const filtered = filteredShelves.map(s => s.id)
      setSelectedShelves(filtered)
    } else {
      setSelectedShelves([])
    }
  }

  const handlePrint = () => {
    const selectedItems = activeTab === 'products' 
      ? products.filter(p => selectedProducts.includes(p.id))
      : shelves.filter(s => selectedShelves.includes(s.id))

    if (selectedItems.length === 0) {
      toast.error('Please select items to print')
      return
    }

    // Create print window
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow popups to print')
      return
    }

    const itemType = activeTab === 'products' ? 'Product' : 'Shelf'
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Codes - ${itemType}s</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 10mm;
              }
              body {
                margin: 0;
                padding: 0;
              }
              .page-break {
                page-break-after: always;
              }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            .qr-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-bottom: 20px;
            }
            .qr-item {
              border: 2px solid #e5e7eb;
              border-radius: 8px;
              padding: 16px;
              text-align: center;
              break-inside: avoid;
            }
            .qr-image {
              width: 200px;
              height: 200px;
              margin: 0 auto 12px;
              border: 1px solid #d1d5db;
            }
            .qr-code {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 8px;
              color: #111827;
            }
            .qr-name {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 4px;
            }
            .qr-meta {
              font-size: 12px;
              color: #9ca3af;
            }
            .qr-type {
              display: inline-block;
              background: #3b82f6;
              color: white;
              padding: 4px 12px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
              margin-bottom: 12px;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="qr-grid">
            ${selectedItems.map((item, index) => {
              const isProduct = 'sku' in item
              const code = isProduct ? item.sku : item.code
              const name = item.name
              const meta = isProduct 
                ? `Barcode: ${item.barcode}`
                : item.site.name
              
              return `
                <div class="qr-item">
                  <div class="qr-type">${itemType}</div>
                  <img src="${item.qrCodeImage}" alt="QR Code" class="qr-image" />
                  <div class="qr-code">${code}</div>
                  <div class="qr-name">${name}</div>
                  <div class="qr-meta">${meta}</div>
                </div>
              `
            }).join('')}
          </div>
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
    
    // Wait for images to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }

    toast.success(`Preparing to print ${selectedItems.length} QR code${selectedItems.length > 1 ? 's' : ''}`)
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredShelves = shelves.filter(s =>
    s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.site.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Pagination
  const totalPages = activeTab === 'products' 
    ? Math.ceil(filteredProducts.length / itemsPerPage)
    : Math.ceil(filteredShelves.length / itemsPerPage)

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const paginatedShelves = filteredShelves.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Reset to page 1 when search changes or tab changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, activeTab])

  const selectedCount = activeTab === 'products' ? selectedProducts.length : selectedShelves.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">QR Code Printing</h1>
          <p className="text-muted-foreground">
            Select and print QR codes for products or shelves
          </p>
        </div>
        <Button
          onClick={handlePrint}
          disabled={selectedCount === 0}
          size="lg"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Selected ({selectedCount})
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Products with QR</p>
          </div>
          <p className="text-2xl font-bold">{products.length}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Warehouse className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-medium text-muted-foreground">Shelves with QR</p>
          </div>
          <p className="text-2xl font-bold">{shelves.length}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <QrCode className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-muted-foreground">Selected</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{selectedCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'products' | 'shelves')}>
        <TabsList>
          <TabsTrigger value="products">
            <Package className="w-4 h-4 mr-2" />
            Products ({products.length})
          </TabsTrigger>
          <TabsTrigger value="shelves">
            <Warehouse className="w-4 h-4 mr-2" />
            Shelves ({shelves.length})
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, SKU, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 border rounded-lg border-dashed">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No products found matching your search' : 'No products with QR codes'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedProducts.length === filteredProducts.length}
                        onCheckedChange={handleSelectAllProducts}
                      />
                    </TableHead>
                    <TableHead>QR Code</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Product Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map((product) => (
                    <TableRow 
                      key={product.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSelectProduct(product.id, !selectedProducts.includes(product.id))}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        {product.qrCodeImage && (
                          <Image
                            src={product.qrCodeImage}
                            alt={`QR Code for ${product.sku}`}
                            width={48}
                            height={48}
                            className="border rounded"
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.sku}</TableCell>
                      <TableCell>{product.barcode}</TableCell>
                      <TableCell>{product.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {filteredProducts.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
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
                  disabled={currentPage >= totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Shelves Tab */}
        <TabsContent value="shelves" className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by code, name, or site..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredShelves.length === 0 ? (
            <div className="text-center py-12 border rounded-lg border-dashed">
              <Warehouse className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No shelves found matching your search' : 'No shelves with QR codes'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedShelves.length === filteredShelves.length}
                        onCheckedChange={handleSelectAllShelves}
                      />
                    </TableHead>
                    <TableHead>QR Code</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Aisle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedShelves.map((shelf) => (
                    <TableRow 
                      key={shelf.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSelectShelf(shelf.id, !selectedShelves.includes(shelf.id))}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedShelves.includes(shelf.id)}
                          onCheckedChange={(checked) => handleSelectShelf(shelf.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        {shelf.qrCodeImage && (
                          <Image
                            src={shelf.qrCodeImage}
                            alt={`QR Code for ${shelf.code}`}
                            width={48}
                            height={48}
                            className="border rounded"
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{shelf.code}</TableCell>
                      <TableCell>{shelf.name}</TableCell>
                      <TableCell>{shelf.site.name}</TableCell>
                      <TableCell>{shelf.aisle?.code || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {filteredShelves.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredShelves.length)} of {filteredShelves.length} shelves
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
                  disabled={currentPage >= totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
