'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import { Loader2, Package, MapPin, Camera, X } from 'lucide-react';
import { getProductByQRCode } from '@/app/actions/product-actions';
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
  costPrice: number | null;
  compareAtPrice: number | null;
  isActive: boolean;
  category: { name: string };
  brand: { name: string } | null;
  images: { url: string; sortOrder: number }[];
  inventories: {
    id: string;
    quantity: number;
    site: { id: string; name: string; code: string };
    shelf: { id: string; code: string; aisle: { code: string } } | null;
  }[];
  totalQuantity: number;
};

export function QRScanner() {
  const [isLoading, setIsLoading] = useState(false);
  const [product, setProduct] = useState<ProductDetails | null>(null);
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
    setProduct(null);

    try {
      const result = await getProductByQRCode(searchTerm);

      if (result.success && result.data) {
        setProduct(result.data);
        toast.success('Product found!');
      } else {
        toast.error(result.error || 'Product not found');
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

      {product && (
        <div className="space-y-6">
          <div className="border-b pb-6">
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                {product.images[0]?.url ? (
                  <div className="relative h-32 w-32 rounded border-2 border-border overflow-hidden bg-muted">
                    <Image
                      src={product.images[0].url}
                      alt={product.name}
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
                  <h2 className="text-2xl font-bold text-foreground">{product.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {product.category.name}
                    {product.brand && ` • ${product.brand.name}`}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <Badge variant={product.isActive ? 'default' : 'secondary'}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">SKU:</span> {product.sku}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Barcode:</span> {product.barcode}
                  </div>
                </div>

                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">Pricing</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Retail Price</p>
                <p className="text-2xl font-bold">
                  ₱{product.retailPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              {product.compareAtPrice && (
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Compare At Price</p>
                  <p className="text-2xl font-bold text-muted-foreground line-through">
                    ₱{product.compareAtPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              {product.costPrice && (
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Cost Price</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ₱{product.costPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Inventory</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Total Stock:</span>
                <Badge variant={product.totalQuantity > 0 ? 'default' : 'secondary'} className="text-base px-3 py-1">
                  {product.totalQuantity} units
                </Badge>
              </div>
            </div>

            {product.inventories.length === 0 ? (
              <div className="border rounded-lg p-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No inventory available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {product.inventories.map((inventory) => (
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
    </div>
  );
}
