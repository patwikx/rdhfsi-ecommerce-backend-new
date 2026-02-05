import { Metadata } from 'next'
import { CashierQueueInterface } from '@/components/cashier/cashier-queue-interface'

export const metadata: Metadata = {
  title: 'Cashier Queue',
  description: 'Process pending orders from salesmen',
}

export default function CashierQueuePage() {
  return <CashierQueueInterface />
}
