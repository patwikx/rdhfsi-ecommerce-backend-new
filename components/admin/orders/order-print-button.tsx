'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

type OrderPrintButtonProps = {
  order: {
    id: string
    orderNumber: string
    status: string
    paymentStatus: string
    fulfillmentStatus: string
    subtotal: number
    taxAmount: number
    shippingAmount: number
    discountAmount: number
    totalAmount: number
    customerName: string
    customerEmail: string
    customerPhone: string
    companyName: string | null
    shippingMethod: string | null
    trackingNumber: string | null
    paymentMethod: string | null
    poNumber: string | null
    notes: string | null
    createdAt: Date
    items: {
      id: string
      quantity: number
      unitPrice: number
      subtotal: number
      productName: string
      productSku: string
      productBarcode: string
    }[]
    shippingAddress: {
      fullName: string
      phone: string
      addressLine1: string
      addressLine2: string | null
      city: string
      province: string
      postalCode: string | null
    } | null
  }
}

export function OrderPrintButton({ order }: OrderPrintButtonProps) {
  const handlePrint = () => {
    // Create print window
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
      }).format(amount)
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order ${order.orderNumber}</title>
        <style>
          @page {
            size: letter portrait;
            margin: 0.5in;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #000;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid #000;
          }
          .header h1 {
            font-size: 22px;
            margin-bottom: 5px;
            letter-spacing: 0.5px;
          }
          .header .order-number {
            font-size: 16px;
            font-weight: bold;
          }
          .header .order-date {
            font-size: 11px;
            color: #666;
          }
          .meta-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            gap: 20px;
          }
          .meta-box {
            flex: 1;
            border: 1px solid #000;
            padding: 10px;
          }
          .meta-box h3 {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 8px;
            padding-bottom: 5px;
            border-bottom: 1px solid #ccc;
          }
          .meta-box p {
            margin: 3px 0;
          }
          .meta-box .label {
            color: #666;
            font-size: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background-color: #e0e0e0;
            border: 1px solid #000;
            padding: 8px 6px;
            font-weight: bold;
            font-size: 10px;
            text-align: left;
          }
          td {
            border: 1px solid #999;
            padding: 6px;
            font-size: 10px;
          }
          .text-right {
            text-align: right;
          }
          .totals {
            width: 300px;
            margin-left: auto;
            margin-bottom: 20px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 11px;
          }
          .totals-row.total {
            font-size: 14px;
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 8px;
            margin-top: 5px;
          }
          .totals-row .label {
            color: #666;
          }
          .totals-row.discount {
            color: green;
          }
          .status-section {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            padding: 10px;
            border: 1px solid #000;
          }
          .status-item {
            flex: 1;
          }
          .status-item .label {
            font-size: 10px;
            color: #666;
          }
          .status-item .value {
            font-weight: bold;
            font-size: 12px;
          }
          .notes-section {
            border: 1px solid #000;
            padding: 10px;
            margin-bottom: 20px;
          }
          .notes-section h3 {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .footer {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
          }
          .signature-box {
            text-align: center;
            width: 30%;
          }
          .signature-line {
            border-top: 1px solid #000;
            padding-top: 8px;
            margin-top: 40px;
          }
          .signature-label {
            font-weight: bold;
            font-size: 10px;
          }
          .signature-date {
            font-size: 9px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SALES ORDER</h1>
          <div class="order-number">Order #: ${order.orderNumber}</div>
          <div class="order-date">Date: ${new Date(order.createdAt).toLocaleDateString()}</div>
        </div>

        <div class="meta-section">
          <div class="meta-box">
            <h3>Customer Information</h3>
            <p><strong>${order.customerName}</strong></p>
            <p>${order.customerEmail}</p>
            <p>${order.customerPhone}</p>
            ${order.companyName ? `<p><strong>${order.companyName}</strong></p>` : ''}
            ${order.poNumber ? `<p class="label">PO Number:</p><p><strong>${order.poNumber}</strong></p>` : ''}
          </div>
          <div class="meta-box">
            <h3>Shipping Address</h3>
            ${order.shippingAddress ? `
              <p><strong>${order.shippingAddress.fullName}</strong></p>
              <p>${order.shippingAddress.phone}</p>
              <p>${order.shippingAddress.addressLine1}</p>
              ${order.shippingAddress.addressLine2 ? `<p>${order.shippingAddress.addressLine2}</p>` : ''}
              <p>${order.shippingAddress.city}, ${order.shippingAddress.province} ${order.shippingAddress.postalCode || ''}</p>
            ` : '<p>No shipping address</p>'}
            ${order.shippingMethod ? `<p class="label">Shipping Method:</p><p>${order.shippingMethod}</p>` : ''}
            ${order.trackingNumber ? `<p class="label">Tracking #:</p><p><strong>${order.trackingNumber}</strong></p>` : ''}
          </div>
        </div>

        <div class="status-section">
          <div class="status-item">
            <div class="label">Order Status</div>
            <div class="value">${order.status}</div>
          </div>
          <div class="status-item">
            <div class="label">Payment Status</div>
            <div class="value">${order.paymentStatus}</div>
          </div>
          <div class="status-item">
            <div class="label">Fulfillment Status</div>
            <div class="value">${order.fulfillmentStatus}</div>
          </div>
          ${order.paymentMethod ? `
          <div class="status-item">
            <div class="label">Payment Method</div>
            <div class="value">${order.paymentMethod}</div>
          </div>
          ` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40%">Product</th>
              <th style="width: 15%">SKU</th>
              <th style="width: 15%" class="text-right">Unit Price</th>
              <th style="width: 10%" class="text-right">Qty</th>
              <th style="width: 20%" class="text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td>${item.productName}</td>
                <td>${item.productSku}</td>
                <td class="text-right">${formatCurrency(item.unitPrice)}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right"><strong>${formatCurrency(item.subtotal)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span class="label">Subtotal</span>
            <span>${formatCurrency(order.subtotal)}</span>
          </div>
          ${order.discountAmount > 0 ? `
          <div class="totals-row discount">
            <span>Discount</span>
            <span>-${formatCurrency(order.discountAmount)}</span>
          </div>
          ` : ''}
          <div class="totals-row">
            <span class="label">Tax</span>
            <span>${formatCurrency(order.taxAmount)}</span>
          </div>
          <div class="totals-row">
            <span class="label">Shipping</span>
            <span>${formatCurrency(order.shippingAmount)}</span>
          </div>
          <div class="totals-row total">
            <span>TOTAL</span>
            <span>${formatCurrency(order.totalAmount)}</span>
          </div>
        </div>

        ${order.notes ? `
        <div class="notes-section">
          <h3>Customer Notes</h3>
          <p>${order.notes}</p>
        </div>
        ` : ''}

        <div class="footer">
          <div class="signature-box">
            <div class="signature-line">
              <div class="signature-label">Prepared By</div>
              <div class="signature-date">Date: _______________</div>
            </div>
          </div>
          <div class="signature-box">
            <div class="signature-line">
              <div class="signature-label">Checked By</div>
              <div class="signature-date">Date: _______________</div>
            </div>
          </div>
          <div class="signature-box">
            <div class="signature-line">
              <div class="signature-label">Received By</div>
              <div class="signature-date">Date: _______________</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
      printWindow.close()
    }
  }

  return (
    <Button variant="outline" onClick={handlePrint}>
      <Printer className="w-4 h-4 mr-2" />
      Print Order
    </Button>
  )
}
