'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface DataTableProps<TData> {
  columns: {
    accessorKey: string
    header: string
    cell?: (context: { row: { getValue: (key: string) => any } }) => React.ReactNode
  }[]
  data: TData[]
}

export function DataTable<TData>({
  columns,
  data,
}: DataTableProps<TData>) {
  const [sortColumn, setSortColumn] = useState('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0
    const aValue = a[sortColumn as keyof TData]
    const bValue = b[sortColumn as keyof TData]
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (column: string) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.accessorKey}
                onClick={() => handleSort(column.accessorKey)}
                className="cursor-pointer"
              >
                {column.header}
                {sortColumn === column.accessorKey && (
                  <span className="ml-2">
                    {sortDirection === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((column) => {
                const cellValue = row[column.accessorKey as keyof TData]
                const cellContent = column.cell 
                  ? column.cell({ 
                      row: { 
                        getValue: (key: string) => row[key as keyof TData] 
                      } 
                    })
                  : cellValue?.toString()
                
                return (
                  <TableCell key={column.accessorKey}>
                    {cellContent}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}