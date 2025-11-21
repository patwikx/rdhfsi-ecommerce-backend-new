'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Package, MapPin, Camera, X } from 'lucide-react';
import { getProductByQRCode } from '@/app/actions/product-actions';
import { toast } from 'sonner';
import Image from 'next/image';
import { BrowserQRCodeReader } from '@zxing/browser';

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
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showUploadOption, setShowUploadOption] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleSearch = async (value?: string) => {
    const searchTerm = value || searchValue.trim();
    
    if (!searchTerm) {
      toast.error('Please enter a SKU or Barcode');
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
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        
        if (protocol !== 'https:' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
          toast.error('Camera requires HTTPS. Please access via https://' + hostname, {
            duration: 6000,
            description: 'Or use the "Upload QR Image" option below'
          });
          setShowUploadOption(true);
        } else {
          toast.error('Camera not supported on this browser. Use the "Upload QR Image" option below.', {
            duration: 5000
          });
          setShowUploadOption(true);
        }
        return;
      }

      // Check if running on HTTPS (required for camera on mobile)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        toast.error('Camera requires HTTPS. Please access the site via https://', {
          duration: 6000,
          description: 'Or use the "Upload QR Image" option below'
        });
        setShowUploadOption(true);
        return;
      }

      setIsCameraOpen(true);
      setIsScanning(true);

      // Try with environment camera first (back camera on mobile)
      let constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      let stream: MediaStream;
      
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        // If environment camera fails, try with any camera
        console.log('Environment camera failed, trying any camera:', err);
        constraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().then(() => resolve());
            };
          }
        });

        const codeReader = new BrowserQRCodeReader();
        const controls = await codeReader.decodeFromVideoElement(
          videoRef.current,
          (result) => {
            if (result) {
              const text = result.getText();
              setSearchValue(text);
              stopCamera();
              handleSearch(text);
            }
          }
        );
        
        controlsRef.current = controls;
      }
    } catch (error) {
      console.error('Camera error:', error);
      
      let errorMessage = 'Failed to access camera';
      
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        
        if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
          errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
        } else if (error.name === 'NotFoundError' || error.message.includes('Requested device not found')) {
          errorMessage = 'No camera found on this device';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = 'Camera does not meet requirements. Trying with basic settings...';
        } else if (error.name === 'SecurityError') {
          errorMessage = 'Camera access blocked. Please use HTTPS or localhost.';
        } else {
          errorMessage = `Camera error: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
      setIsCameraOpen(false);
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsCameraOpen(false);
    setIsScanning(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const codeReader = new BrowserQRCodeReader();
      const result = await codeReader.decodeFromImageUrl(URL.createObjectURL(file));
      
      if (result) {
        const text = result.getText();
        setSearchValue(text);
        toast.success('QR code detected!');
        handleSearch(text);
      }
    } catch (error) {
      console.error('QR decode error:', error);
      toast.error('Could not read QR code from image. Please try again.');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter SKU or Barcode..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
              disabled={isLoading || isCameraOpen}
            />
          </div>
          <Button 
            variant="outline" 
            onClick={isCameraOpen ? stopCamera : startCamera}
            disabled={isLoading}
          >
            {isCameraOpen ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Close Camera
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Scan QR
              </>
            )}
          </Button>
          <Button onClick={() => handleSearch()} disabled={isLoading || !searchValue.trim() || isCameraOpen}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>

        {/* Upload QR Image Option */}
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">OR</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isLoading}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full"
          >
            <Package className="h-4 w-4 mr-2" />
            Upload QR Image
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Take a photo of the QR code and upload it
          </p>
        </div>
      </div>

      {isCameraOpen && (
        <div className="border rounded-lg overflow-hidden bg-black">
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full h-auto"
              style={{ maxHeight: '400px' }}
              playsInline
              muted
              autoPlay
            />
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-4 border-primary rounded-lg w-64 h-64 animate-pulse" />
              </div>
            )}
          </div>
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
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">Site</th>
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">Location</th>
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {product.inventories.map((inventory) => (
                      <tr key={inventory.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{inventory.site.name}</p>
                              <p className="text-xs text-muted-foreground">{inventory.site.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          {inventory.shelf ? (
                            <div className="font-mono text-sm">
                              <span className="text-muted-foreground">Aisle:</span> {inventory.shelf.aisle.code}
                              <span className="text-muted-foreground mx-2">•</span>
                              <span className="text-muted-foreground">Shelf:</span> {inventory.shelf.code}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">No location assigned</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <Badge variant={inventory.quantity > 10 ? 'default' : inventory.quantity > 0 ? 'secondary' : 'outline'}>
                            {inventory.quantity} units
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
