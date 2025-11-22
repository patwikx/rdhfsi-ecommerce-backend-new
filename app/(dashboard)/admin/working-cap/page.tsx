'use client'

import { useState, useEffect, useMemo } from 'react'
import { DateRange } from 'react-day-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/ui/data-table'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination"
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { File, Loader, Calendar as CalendarIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import * as XLSX from 'xlsx'

// Import the actual types from your action file
import { DataType, fetchData, InvoiceItem, InventoryItem } from '@/lib/working-cap-actions'

// Union type for the data items
type DataItemType = InvoiceItem | InventoryItem

export default function Page() {
  useTheme()
  const [allData, setAllData] = useState<DataItemType[]>([])
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [dataType, setDataType] = useState<DataType>('invoices')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const itemsPerPage = 10
  
  // Create dateRange from startDate and endDate
  // Normalize dates to avoid timezone issues
  const dateRange: DateRange | undefined = useMemo(() => {
    if (!startDate) return undefined
    
    // Create new Date objects at noon local time to avoid timezone edge cases
    const normalizedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 12, 0, 0)
    const normalizedEnd = endDate 
      ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 12, 0, 0)
      : undefined
    
    return { from: normalizedStart, to: normalizedEnd }
  }, [startDate, endDate])

  // Load data only when date range is selected
  useEffect(() => {
    async function getData() {
      if (!dateRange?.from) {
        // No date range selected, clear data
        console.log('No date range selected, clearing data')
        setAllData([])
        setError(null)
        return
      }

      console.log('Loading data for date range:', dateRange)
      setIsLoading(true)
      setError(null)
      
      try {
        // Fetch data with the selected date range
        const result = await fetchData(dataType, dateRange)
        console.log('Raw data received:', result.length, 'records')
        
        // Sort by date (most recent first)
        const sortedData = result.sort((a, b) => {
          const dateA = getItemDate(a)
          const dateB = getItemDate(b)
          return dateB.getTime() - dateA.getTime()
        })
        
        console.log('Data sorted, setting state...')
        setAllData(sortedData)
        setCurrentPage(1)
        console.log('State set successfully')
      } catch (error) {
        console.error('Failed to fetch data:', error)
        setError(`Failed to fetch data: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setAllData([]) // Clear data on error
      } finally {
        console.log('Setting loading to false')
        setIsLoading(false)
      }
    }
    
    getData()
  }, [dataType, dateRange])

  // Helper function to get date from either invoice or inventory item
  const getItemDate = (item: DataItemType): Date => {
    if (dataType === 'invoices' && 'Invoice Date' in item) {
      // Invoice Date is a string in MM-dd-yyyy format, convert to Date
      const dateStr = item['Invoice Date']
      
      // Handle MM-dd-yyyy format properly
      const [month, day, year] = dateStr.split('-').map(Number)
      const date = new Date(year, month - 1, day) // month is 0-indexed in Date constructor
      
      console.log('Parsing invoice date:', { original: dateStr, parsed: date })
      return date
    } else if (dataType === 'inventory' && 'Posting Date' in item) {
      // Posting Date should be a Date object
      const date = item['Posting Date'] instanceof Date ? item['Posting Date'] : new Date(item['Posting Date'])
      return date
    }
    
    // Fallback
    return new Date()
  }

  const formatDate = (date: Date | string): string => {
    if (typeof date === 'string') {
      // If it's already formatted as MM-dd-yyyy, return as is
      return date
    }
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    }).replace(/\//g, '-')
  }

  // Apply filters on the frontend
  const filteredData = useMemo(() => {
    return allData.filter(item => {      
      // Category filter
      const matchesCategory = categoryFilter === 'all' || 
        ('Category' in item && item.Category === categoryFilter)
      
      // Payment type filter
      const matchesPaymentType = paymentTypeFilter === 'all' || 
        ('Payment Type' in item && item['Payment Type'] === paymentTypeFilter)
      
      // Search filter
      const matchesSearch = searchQuery === '' || Object.values(item).some(value => 
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
      
      return matchesCategory && matchesPaymentType && matchesSearch
    })
  }, [allData, categoryFilter, paymentTypeFilter, searchQuery])

  const columns = useMemo(() => {
    if (allData.length === 0) return []
    return Object.keys(allData[0]).map(key => ({
      accessorKey: key,
      header: key,
      cell: ({ row }: { row: { getValue: (key: string) => any } }) => {
        const value = row.getValue(key)
        
        // Handle date formatting
        if (value instanceof Date) {
          return formatDate(value)
        }
        
        // Handle string dates (MM-dd-yyyy format from SQL)
        if (typeof value === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(value)) {
          return value // Already formatted
        }
        
        // Handle numbers (currency formatting)
        if (typeof value === 'number') {
          return value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        }
        
        // Truncate Name and Party Name fields
        if ((key === 'Name' || key === 'Party Name') && typeof value === 'string') {
          const maxLength = 30
          if (value.length > maxLength) {
            return (
              <span title={value} className="truncate block max-w-[200px]">
                {value.substring(0, maxLength)}...
              </span>
            )
          }
        }
        
        return value
      }
    }))
  }, [allData])

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredData.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredData, currentPage])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)

  const totalAmount = useMemo(() => {
    return filteredData.reduce((sum, item) => {
      let amount = 0
      
      if (dataType === 'invoices' && 'Amount Paid' in item) {
        amount = item['Amount Paid']
      } else if (dataType === 'inventory' && 'Total Gross' in item) {
        amount = item['Total Gross']
      }
      
      return sum + (typeof amount === 'number' ? amount : 0)
    }, 0)
  }, [filteredData, dataType])

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date)
    setCurrentPage(1)
    // Reset filters when date changes
    setCategoryFilter('all')
    setPaymentTypeFilter('all')
    setSearchQuery('')
  }
  
  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date)
    setCurrentPage(1)
    // Reset filters when date changes
    setCategoryFilter('all')
    setPaymentTypeFilter('all')
    setSearchQuery('')
  }

  // Get unique categories from all data
  const uniqueCategories = useMemo(() => {
    const categories = allData
      .map(item => 'Category' in item ? item.Category : '')
      .filter(Boolean)
      .filter((category): category is string => typeof category === 'string')
    
    return ['all', ...new Set(categories)]
  }, [allData])

  // Get unique payment types from all data
  const uniquePaymentTypes = useMemo(() => {
    const paymentTypes = allData
      .map(item => 'Payment Type' in item ? item['Payment Type'] : '')
      .filter(Boolean)
      .filter((paymentType): paymentType is string => typeof paymentType === 'string')
    
    return ['all', ...new Set(paymentTypes)]
  }, [allData])

  const exportToExcel = () => {
    if (typeof window === 'undefined') return

    // Create a new workbook
    const wb = XLSX.utils.book_new()

    // Convert the filtered data to a worksheet
    const ws = XLSX.utils.json_to_sheet(filteredData)

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Data')

    // Generate a buffer
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })

    // Create a Blob from the buffer
    const blob = new Blob([buf], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })

    // Create a download link
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    
    const dateRangeStr = dateRange?.from 
      ? dateRange.to 
        ? `${formatDate(dateRange.from)}_to_${formatDate(dateRange.to)}`
        : formatDate(dateRange.from)
      : 'all_dates'
    
    link.download = `${dataType}_export_${dateRangeStr}.xlsx`

    // Trigger the download
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [categoryFilter, paymentTypeFilter, searchQuery])

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold mb-4">Working Capital Sales</h1>
      
      <div className="flex space-x-4 flex-wrap gap-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Data Type</label>
          <Select value={dataType} onValueChange={(value: DataType) => setDataType(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select data type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="invoices">Invoices</SelectItem>
              <SelectItem value="inventory">Inventory</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Start Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[200px] justify-start text-left font-normal',
                  !startDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'MMM dd, yyyy') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={handleStartDateChange}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">End Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[200px] justify-start text-left font-normal',
                  !endDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'MMM dd, yyyy') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={handleEndDateChange}
                disabled={(date) => startDate ? date < startDate : false}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Category</label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent>
              {uniqueCategories.map(category => (
                <SelectItem key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Payment Type</label>
          <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Payment Type" />
            </SelectTrigger>
            <SelectContent>
              {uniquePaymentTypes.map(paymentType => (
                <SelectItem key={paymentType} value={paymentType}>
                  {paymentType === 'all' ? 'All Payment Types' : paymentType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {filteredData.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium invisible">Export</label>
            <Button onClick={exportToExcel} variant='outline'>
              <File className='w-4 h-4 mr-1' />
              Export to Excel
            </Button>
          </div>
        )}
      </div>

      {/* Show filter summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredData.length} of {allData.length} records
        {dateRange?.from && (
          <span> • Date range: {formatDate(dateRange.from)}{dateRange.to && ` to ${formatDate(dateRange.to)}`}</span>
        )}
        {categoryFilter !== 'all' && <span> • Category: {categoryFilter}</span>}
        {paymentTypeFilter !== 'all' && <span> • Payment: {paymentTypeFilter}</span>}
        {searchQuery && <span> • Search: "{searchQuery}"</span>}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center" style={{ height: '200px' }}>
          <Loader className="animate-spin h-6 w-6" />
        </div>
      )}
      
      {/* Error state */}
      {error && <div className="text-red-500">{error}</div>}
      
      {/* No date range selected state */}
      {!startDate && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Select a start date to view data</h3>
          <p className="text-muted-foreground">
            Choose a start date (and optionally an end date) using the date pickers above to load {dataType} data.
          </p>
        </div>
      )}
      
      {/* Search box and total - show when data is loaded */}
      {!isLoading && !error && allData.length > 0 && (
        <div className="flex justify-between items-center mb-2">
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[300px]"
          />
          <div className="font-bold">
            Total Amount: {totalAmount.toLocaleString('en-PH', { 
              style: 'currency', 
              currency: 'PHP' 
            })}
          </div>
        </div>
      )}
      
      {/* Data table - only show when filtered data exists */}
      {!isLoading && !error && filteredData.length > 0 && (
        <>
          <DataTable columns={columns} data={paginatedData} />
          
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={(e) => {
                    if (currentPage === 1) {
                      e.preventDefault()
                      return
                    }
                    setCurrentPage(prev => Math.max(prev - 1, 1))
                  }}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {/* Show only a reasonable number of page links */}
              {(() => {
                const maxVisiblePages = 10
                const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
                const adjustedStartPage = Math.max(1, endPage - maxVisiblePages + 1)
                
                return Array.from(
                  { length: endPage - adjustedStartPage + 1 }, 
                  (_, i) => adjustedStartPage + i
                ).map(pageNum => (
                  <PaginationItem key={pageNum}>
                    <PaginationLink 
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                ))
              })()}
              
              {totalPages > 10 && currentPage < totalPages - 5 && (
                <>
                  <PaginationItem>
                    <span className="px-3 py-2">...</span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink 
                      onClick={() => setCurrentPage(totalPages)}
                      isActive={false}
                      className="cursor-pointer"
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                </>
              )}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={(e) => {
                    if (currentPage === totalPages) {
                      e.preventDefault()
                      return
                    }
                    setCurrentPage(prev => Math.min(prev + 1, totalPages))
                  }}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </>
      )}
      
      {/* Data loaded but no results after filtering */}
      {!isLoading && !error && allData.length > 0 && filteredData.length === 0 && (
        <div className="text-center py-8">
          <p>No data matches the current filters.</p>
          <Button 
            variant="outline" 
            className="mt-2"
            onClick={() => {
              setCategoryFilter('all')
              setPaymentTypeFilter('all')
              setSearchQuery('')
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  )
}