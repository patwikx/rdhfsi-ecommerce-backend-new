'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import { Loader2, Package, MapPin, Camera, X } from 'lucide-react';
import { getProductByQRCode } from '@/app/actions/product-actions';
import { getShelfByQRCode } from '@/app/actions/shelf-actions';
import { toast } from 'sonner';
import Image from 'next/image';
import { Html5Qrcode } from 'html5-qrcode';

type ProductDetails = {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description: string | null;
  retailPrice: number;
  wholesalePrice: number | null;
  poPrice: number | null;
  costPrice: number | null;
  compareAtPrice: number | null;
  markdownPrice: number | null;
  isActive: boolean;
  category: { name: string };
  brand: { name: string } | null;
  images: { url: string; sortOrder: number }[];
  inventories: {
    id: string;
    quantity: number;
    site: { id: string; name: string; code: string; isMarkdown: boolean };
    shelf: { id: string; code: string; aisle: { code: string } } | null;
  }[];
  totalQuantity: number;
};

type ShelfDetails = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  level: number | null;
  position: number | null;
  isActive: boolean;
  isAccessible: boolean;
  site: {
    id: string;
    name: string;
    code: string;
  };
  aisle: {
    id: string;
    name: string;
    code: string;
  } | null;
  products: Array<{
    id: string;
    productId: string;
    sku: string;
    barcode: string;
    name: string;
    category: string;
    brand: string | null;
    retailPrice: number;
    quantity: string;
    reservedQty: string;
    availableQty: string;
    isPrimary: boolean;
  }>;
  totalProducts: number;
};

type ScanResult = 
  | { type: 'product'; data: ProductDetails }
  | { type: 'shelf'; data: ShelfDetails }
  | null;

export function QRScanner() {
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm) {
      return;
    }

    setIsLoading(true);
    setScanResult(null);

    try {
      // Try to detect if it's a shelf QR code
      let isShelfQR = false;
      try {
        const parsed = JSON.parse(searchTerm);
        if (parsed.type === 'SHELF') {
          isShelfQR = true;
        }
      } catch {
        // Not JSON, continue with product search
      }

      if (isShelfQR) {
        // Search for shelf
        const result = await getShelfByQRCode(searchTerm);
        if (result.success && result.data) {
          setScanResult({ type: 'shelf', data: result.data });
          toast.success('Shelf found!');
        } else {
          toast.error(result.error || 'Shelf not found');
        }
      } else {
        // Search for product
        const result = await getProductByQRCode(searchTerm);
        if (result.success && result.data) {
          setScanResult({ type: 'product', data: result.data });
          toast.success('Product found!');
        } else {
          toast.error(result.error || 'Product not found');
        }
      }
    } catch (error) {
      toast.error('An error occurred while searching');
    } finally {
      setIsLoading(false);
    }
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    setIsScanning(true);

    // Wait for DOM to render
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          stopCamera();
          handleSearch(decodedText);
        },
        (errorMessage) => {
          // Ignore scanning errors (no QR code in frame)
        }
      );
    } catch (error) {
      console.error('Camera error:', error);
      
      let errorMessage = 'Failed to access camera';
      
      if (error instanceof Error) {
        if (error.message.includes('NotAllowedError') || error.message.includes('Permission denied')) {
          errorMessage = 'Camera permission denied. Please allow camera access.';
        } else if (error.message.includes('NotFoundError')) {
          errorMessage = 'No camera found on this device';
        } else if (error.message.includes('NotReadableError')) {
          errorMessage = 'Camera is already in use';
        } else if (error.message.includes('HTTPS')) {
          errorMessage = 'Camera requires HTTPS. Please use https://';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      setIsCameraOpen(false);
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (error) {
        console.error('Error stopping camera:', error);
      }
    }
    
    setIsCameraOpen(false);
    setIsScanning(false);
  };



  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <Button 
          size="lg"
          onClick={isCameraOpen ? stopCamera : startCamera}
          disabled={isLoading}
        >
          {isCameraOpen ? (
            <>
              <X className="h-5 w-5 mr-2" />
              Close Camera
            </>
          ) : (
            <>
              <Camera className="h-5 w-5 mr-2" />
              Start Scanning
            </>
          )}
        </Button>
      </div>

      {isCameraOpen && (
        <div className="border rounded-lg overflow-hidden">
          <div id="qr-reader" className="w-full" />
          <div className="bg-muted p-3 text-center">
            <p className="text-sm text-muted-foreground">
              Position the QR code within the frame to scan
            </p>
          </div>
        </div>
      )}

      {scanResult?.type === 'product' && (
        <div className="space-y-6">
          <div className="border-b pb-6">
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                {scanResult.data.images[0]?.url ? (
                  <div className="relative h-32 w-32 rounded border-2 border-border overflow-hidden bg-muted">
                    <Image
                      src={scanResult.data.images[0].url}
                      alt={scanResult.data.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-32 w-32 rounded border-2 border-border bg-muted flex items-center justify-center">
                    <Package className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{scanResult.data.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {scanResult.data.category.name}
                    {scanResult.data.brand && ` • ${scanResult.data.brand.name}`}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <Badge variant={scanResult.data.isActive ? 'default' : 'secondary'}>
                    {scanResult.data.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">SKU:</span> {scanResult.data.sku}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Barcode:</span> {scanResult.data.barcode}
                  </div>
                </div>

                {scanResult.data.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {scanResult.data.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">Pricing</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Retail Price (SRP)</p>
                <p className="text-2xl font-bold">
                  ₱{scanResult.data.retailPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              {scanResult.data.wholesalePrice && (
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Wholesale Price</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ₱{scanResult.data.wholesalePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              {scanResult.data.poPrice && (
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">PO Price</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ₱{scanResult.data.poPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              {scanResult.data.compareAtPrice && (
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Compare At Price</p>
                  <p className="text-2xl font-bold text-muted-foreground line-through">
                    ₱{scanResult.data.compareAtPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              {scanResult.data.costPrice && (
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Cost Price</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ₱{scanResult.data.costPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              {scanResult.data.markdownPrice && (
                <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-950">
                  <p className="text-sm text-muted-foreground mb-1">Markdown Price (026)</p>
                  <p className="text-2xl font-bold text-red-600">
                    ₱{scanResult.data.markdownPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">SANTIAGO - MARKDOWN SITE</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Inventory</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Total Stock:</span>
                <Badge variant={scanResult.data.totalQuantity > 0 ? 'default' : 'secondary'} className="text-base px-3 py-1">
                  {scanResult.data.totalQuantity} units
                </Badge>
              </div>
            </div>

            {scanResult.data.inventories.length === 0 ? (
              <div className="border rounded-lg p-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No inventory available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scanResult.data.inventories.map((inventory) => (
                  <div key={inventory.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-foreground">{inventory.site.name}</p>
                            <p className="text-xs text-muted-foreground">{inventory.site.code}</p>
                          </div>
                        </div>
                        
                        {inventory.shelf ? (
                          <div className="ml-6 flex gap-2">
                            <div className="font-mono text-sm bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded px-3 py-2">
                              <span className="text-muted-foreground text-xs">Aisle</span>
                              <p className="font-bold text-blue-700 dark:text-blue-300">{inventory.shelf.aisle.code}</p>
                            </div>
                            <div className="font-mono text-sm bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded px-3 py-2">
                              <span className="text-muted-foreground text-xs">Shelf</span>
                              <p className="font-bold text-green-700 dark:text-green-300">{inventory.shelf.code}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="ml-6 text-sm text-muted-foreground italic">No location assigned</p>
                        )}
                      </div>
                      
                      <div className="flex-shrink-0">
                        <Badge 
                          variant={inventory.quantity > 10 ? 'default' : inventory.quantity > 0 ? 'secondary' : 'outline'}
                          className="text-lg px-4 py-2"
                        >
                          {inventory.quantity} units
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {scanResult?.type === 'shelf' && (
        <div className="space-y-6">
          <div className="border-b pb-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <MapPin className="h-8 w-8 text-green-600" />
                  <div>
                    <h2 className="text-3xl font-bold text-foreground">{scanResult.data.code}</h2>
                    <p className="text-lg text-muted-foreground">{scanResult.data.name}</p>
                  </div>
                </div>
                {scanResult.data.description && (
                  <p className="text-sm text-muted-foreground ml-11">{scanResult.data.description}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Badge variant={scanResult.data.isActive ? 'default' : 'secondary'}>
                  {scanResult.data.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {!scanResult.data.isAccessible && (
                  <Badge variant="destructive">Blocked</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Site</p>
              <p className="text-lg font-bold">{scanResult.data.site.code}</p>
              <p className="text-xs text-muted-foreground">{scanResult.data.site.name}</p>
            </div>
            {scanResult.data.aisle && (
              <div className="border rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Aisle</p>
                <p className="text-lg font-bold">{scanResult.data.aisle.code}</p>
                <p className="text-xs text-muted-foreground">{scanResult.data.aisle.name}</p>
              </div>
            )}
            {scanResult.data.level && (
              <div className="border rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Level</p>
                <p className="text-lg font-bold">{scanResult.data.level}</p>
              </div>
            )}
            {scanResult.data.position && (
              <div className="border rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Position</p>
                <p className="text-lg font-bold">{scanResult.data.position}</p>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Products on Shelf</h3>
              <Badge variant="default" className="text-base px-3 py-1">
                {scanResult.data.totalProducts} {scanResult.data.totalProducts === 1 ? 'product' : 'products'}
              </Badge>
            </div>

            {scanResult.data.products.length === 0 ? (
              <div className="border rounded-lg p-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No products on this shelf</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scanResult.data.products.map((product) => (
                  <div key={product.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div>
                          <h4 className="font-semibold text-foreground">{product.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {product.category}
                            {product.brand && ` • ${product.brand}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">SKU:</span>{' '}
                            <span className="font-medium">{product.sku}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Barcode:</span>{' '}
                            <span className="font-medium">{product.barcode}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Price:</span>{' '}
                            <span className="font-medium">
                              ₱{product.retailPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Quantity:</span>
                          <span className="font-medium">{parseFloat(product.quantity).toFixed(2)}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">Available:</span>
                          <span className="font-medium text-green-600">{parseFloat(product.availableQty).toFixed(2)}</span>
                          {parseFloat(product.reservedQty) > 0 && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground">Reserved:</span>
                              <span className="font-medium text-orange-600">{parseFloat(product.reservedQty).toFixed(2)}</span>
                            </>
                          )}
                          {product.isPrimary && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <Badge variant="default" className="text-xs">Primary Location</Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
