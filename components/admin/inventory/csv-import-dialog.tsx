'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Upload, FileText, AlertCircle, CheckCircle, XCircle, Loader } from 'lucide-react'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

type ImportResult = {
  barcode: string
  quantity: number
  status: 'success' | 'error' | 'warning'
  message: string
  productName?: string
  availableQty?: number
  requestedQty?: number
}

type CSVImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (items: Array<{ barcode: string; quantity: number }>) => Promise<{
    success: boolean
    data?: ImportResult[]
    summary?: {
      total: number
      success: number
      errors: number
      warnings: number
    }
    error?: string
  }>
  onComplete: () => void
}

export function CSVImportDialog({ open, onOpenChange, onImport, onComplete }: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentItem, setCurrentItem] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [results, setResults] = useState<ImportResult[]>([])
  const [summary, setSummary] = useState<{
    total: number
    success: number
    errors: number
    warnings: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file')
        return
      }
      setFile(selectedFile)
      setResults([])
      setSummary(null)
      setProgress(0)
      setCurrentItem(0)
      setTotalItems(0)
    }
  }

  const parseCSV = (text: string): Array<{ barcode: string; quantity: number }> => {
    const lines = text.split('\n').filter(line => line.trim())
    const items: Array<{ barcode: string; quantity: number }> = []

    // Skip header if it exists (checks if first line contains 'barcode' or 'quantity')
    const firstLine = lines[0]?.toLowerCase() || ''
    const startIndex = (firstLine.includes('barcode') || firstLine.includes('quantity')) ? 1 : 0

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Split by comma and handle potential quotes
      const parts = line.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''))
      const [barcode, quantityStr] = parts
      const quantity = parseFloat(quantityStr)

      if (!barcode || isNaN(quantity) || quantity <= 0) {
        toast.error(`Invalid data at line ${i + 1}: ${line}`)
        continue
      }

      items.push({ barcode, quantity })
    }

    return items
  }

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file')
      return
    }

    setIsImporting(true)
    setResults([])
    setSummary(null)
    setProgress(0)
    setCurrentItem(0)

    try {
      const text = await file.text()
      const items = parseCSV(text)

      if (items.length === 0) {
        toast.error('No valid items found in CSV')
        setIsImporting(false)
        return
      }

      setTotalItems(items.length)

      // Process items one by one for animation
      const allResults: ImportResult[] = []
      
      for (let i = 0; i < items.length; i++) {
        setCurrentItem(i + 1)
        setProgress(((i + 1) / items.length) * 100)

        // Import single item
        const result = await onImport([items[i]])
        
        if (result.success && result.data) {
          allResults.push(...result.data)
          setResults([...allResults])
        }

        // Small delay for animation visibility
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Calculate final summary
      const finalSummary = {
        total: allResults.length,
        success: allResults.filter(r => r.status === 'success').length,
        errors: allResults.filter(r => r.status === 'error').length,
        warnings: allResults.filter(r => r.status === 'warning').length,
      }

      setSummary(finalSummary)

      if (finalSummary.success > 0) {
        toast.success(`Import completed: ${finalSummary.success} products added`)
        onComplete()
      }

      if (finalSummary.errors > 0) {
        toast.error(`${finalSummary.errors} items failed to import`)
      }

      if (finalSummary.warnings > 0) {
        toast.warning(`${finalSummary.warnings} items exceeded available quantity`)
      }

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import CSV')
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    if (!isImporting) {
      setFile(null)
      setResults([])
      setSummary(null)
      setProgress(0)
      setCurrentItem(0)
      setTotalItems(0)
      onOpenChange(false)
    }
  }

  const downloadTemplate = () => {
    const template = 'Barcode,Quantity\n8850123456789,10\n8850987654321,5'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'shelf-import-template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Products from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with barcode and quantity to add products to this shelf
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* File Upload Section */}
          {!isImporting && !summary && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {file ? (
                  <div className="space-y-2">
                    <FileText className="w-12 h-12 text-green-600 mx-auto" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose Different File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
                    <p className="font-medium">Click to upload CSV file</p>
                    <p className="text-sm text-muted-foreground">
                      CSV format: Barcode, Quantity
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Select File
                    </Button>
                  </div>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm space-y-1">
                    <p className="font-medium">CSV Format Requirements:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>First column: Barcode (product barcode)</li>
                      <li>Second column: Quantity (number to add)</li>
                      <li>Optional header row (will be skipped)</li>
                      <li>System will validate against available inventory</li>
                    </ul>
                  </div>
                </div>
                <Button
                  variant="link"
                  size="sm"
                  onClick={downloadTemplate}
                  className="h-auto p-0"
                >
                  Download CSV Template
                </Button>
              </div>
            </div>
          )}

          {/* Progress Section */}
          {isImporting && (
            <div className="bg-muted p-4 rounded-md space-y-3">
              <div className="flex items-center gap-3">
                <Loader className="w-5 h-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="font-medium">Importing products...</p>
                  <p className="text-sm text-muted-foreground">
                    Processing item {currentItem} of {totalItems}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">
                    {currentItem} / {totalItems}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(progress)}%
                  </p>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Results Summary */}
          {summary && !isImporting && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Import Complete</h4>
                <div className="flex gap-2">
                  {summary.success > 0 && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {summary.success} Success
                    </Badge>
                  )}
                  {summary.warnings > 0 && (
                    <Badge variant="secondary" className="bg-yellow-600 text-white">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {summary.warnings} Warnings
                    </Badge>
                  )}
                  {summary.errors > 0 && (
                    <Badge variant="destructive">
                      <XCircle className="w-3 h-3 mr-1" />
                      {summary.errors} Errors
                    </Badge>
                  )}
                </div>
              </div>

              {(summary.warnings > 0 || summary.errors > 0) && (
                <div className="bg-muted/50 border rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {results
                      .filter(r => r.status !== 'success')
                      .map((result, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          {result.status === 'warning' ? (
                            <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{result.barcode} {result.productName && `- ${result.productName}`}</p>
                            <p className="text-muted-foreground">{result.message}</p>
                            {result.status === 'warning' && result.availableQty !== undefined && (
                              <p className="text-xs text-muted-foreground">
                                Available: {result.availableQty.toFixed(2)} | Requested: {result.requestedQty}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            {summary ? 'Close' : 'Cancel'}
          </Button>
          {!summary && (
            <Button onClick={handleImport} disabled={!file || isImporting}>
              {isImporting ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Products
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
