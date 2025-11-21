'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoreHorizontal, Edit, Trash2, Power, Search, ChevronLeft, ChevronRight, QrCode, CheckCircle2, Filter } from 'lucide-react';
import { deleteProduct, toggleProductStatus, generateProductQRCodes } from '@/app/actions/product-actions';
import { toast } from 'sonner';
import Image from 'next/image';

type Product = {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  slug: string;
  retailPrice: number;
  isActive: boolean;
  isFeatured: boolean;
  qrCodeImage?: string | null;
  category: { name: string };
  brand: { name: string } | null;
  images: { url: string; sortOrder: number }[];
  _count: { inventories: number };
};

type ProductListProps = {
  products: Product[];
  userRole: string;
};

export function ProductList({ products: initialProducts, userRole }: ProductListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedCount, setGeneratedCount] = useState(0);

  // Get unique categories
  const categories = Array.from(new Set(initialProducts.map(p => p.category.name))).sort();

  const filteredProducts = initialProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when search or filter changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  const handleGenerateQRCodes = async () => {
    setIsGeneratingQR(true);
    setGenerationProgress(0);
    setGeneratedCount(0);

    // Simulate progress animation
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const result = await generateProductQRCodes();
      clearInterval(progressInterval);
      
      if (result.success) {
        setGenerationProgress(100);
        setGeneratedCount(result.data?.generated || 0);
        
        // Show completion for a moment before closing
        setTimeout(() => {
          toast.success(`Generated QR codes for ${result.data?.generated} products`);
          setQrDialogOpen(false);
          setGenerationProgress(0);
          setGeneratedCount(0);
          router.refresh();
        }, 1000);
      } else {
        toast.error(result.error || 'Failed to generate QR codes');
        setGenerationProgress(0);
      }
    } catch (error) {
      clearInterval(progressInterval);
      toast.error('An error occurred while generating QR codes');
      setGenerationProgress(0);
    } finally {
      setIsGeneratingQR(false);
    }
  };

  // Count products without QR codes
  const productsWithoutQR = initialProducts.filter(p => !p.qrCodeImage).length;

  const handleToggleStatus = async (id: string) => {
    setLoading(id);
    const result = await toggleProductStatus(id);
    setLoading(null);

    if (result.success) {
      toast.success('Product status updated');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    setLoading(id);
    const result = await deleteProduct(id);
    setLoading(null);

    if (result.success) {
      toast.success('Product deleted');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to delete product');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {['ADMIN', 'MANAGER'].includes(userRole) && (
          <Button variant="outline" onClick={() => setQrDialogOpen(true)}>
            <QrCode className="h-4 w-4 mr-2" />
            Generate QR Codes
            {productsWithoutQR > 0 && (
              <Badge variant="destructive" className="ml-2">
                {productsWithoutQR}
              </Badge>
            )}
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Image</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              {['ADMIN', 'MANAGER'].includes(userRole) && <TableHead className="w-[70px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              paginatedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.images[0]?.url ? (
                      <div className="relative h-10 w-10 rounded overflow-hidden bg-muted">
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{product.barcode || '-'}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {product.category.name}
                  </TableCell>
                  <TableCell className="font-semibold">
                    ₱{Number(product.retailPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant={product.isActive ? 'default' : 'secondary'}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {product.isFeatured && <Badge variant="outline">Featured</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {product._count.inventories > 0 ? (
                      <span className="text-sm">{product._count.inventories} sites</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">No stock</span>
                    )}
                  </TableCell>
                  {['ADMIN', 'MANAGER'].includes(userRole) && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={loading === product.id}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/admin/products/${product.id}`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(product.id)}>
                            <Power className="h-4 w-4 mr-2" />
                            {product.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          {userRole === 'ADMIN' && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(product.id, product.name)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filteredProducts.length > itemsPerPage && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
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
            <div className="flex items-center gap-2">
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* QR Code Generation Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Product QR Codes</DialogTitle>
            <DialogDescription>
              Generate QR codes for products that don't have them yet
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {isGeneratingQR ? (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <QrCode className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
                  <p className="text-sm font-medium mb-2">Generating QR Codes...</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {generationProgress === 100 
                      ? `Successfully generated ${generatedCount} QR codes!`
                      : 'Please wait while we generate QR codes for your products'
                    }
                  </p>
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{generationProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-300 ease-out"
                      style={{ width: `${generationProgress}%` }}
                    />
                  </div>
                  {generationProgress === 100 && (
                    <div className="flex items-center justify-center gap-2 text-green-600 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete!</span>
                    </div>
                  )}
                </div>
              </div>
            ) : productsWithoutQR === 0 ? (
              <div className="text-center py-6">
                <QrCode className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <p className="text-sm font-medium">All products have QR codes!</p>
                <p className="text-xs text-muted-foreground mt-2">
                  No QR codes need to be generated
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Products without QR codes</p>
                      <p className="text-xs text-muted-foreground">
                        QR codes will be generated for these products
                      </p>
                    </div>
                    <div className="text-2xl font-bold">{productsWithoutQR}</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  This will generate QR codes containing product information (SKU, name, barcode) 
                  that can be scanned for quick product lookup.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
              Cancel
            </Button>
            {productsWithoutQR > 0 && (
              <Button onClick={handleGenerateQRCodes} disabled={isGeneratingQR}>
                {isGeneratingQR ? (
                  <>Generating...</>
                ) : (
                  <>
                    <QrCode className="w-4 h-4 mr-2" />
                    Generate QR Codes
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
