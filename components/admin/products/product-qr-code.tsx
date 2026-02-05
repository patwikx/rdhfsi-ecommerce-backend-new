'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

type ProductQRCodeProps = {
  product: {
    sku: string
    qrCodeImage?: string
  }
}

export function ProductQRCode({ product }: ProductQRCodeProps) {
  const handleDownloadQR = () => {
    if (!product.qrCodeImage) return
    
    const link = document.createElement('a')
    link.href = product.qrCodeImage
    link.download = `product-${product.sku}-qr.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!product.qrCodeImage) {
    return null
  }

  return (
    <div className="relative group">
      <div className="w-20 h-20 bg-white rounded border-2 border-border p-1 flex-shrink-0 cursor-pointer hover:border-primary transition-colors">
        <img
          src={product.qrCodeImage}
          alt={`QR Code for ${product.sku}`}
          className="w-full h-full"
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleDownloadQR}
        title="Download QR Code"
      >
        <Download className="w-3 h-3" />
      </Button>
    </div>
  )
}
