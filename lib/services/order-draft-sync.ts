import { useOrderDraftStore } from '@/lib/stores/order-draft-store'
import {
  createOrderDraft,
  addItemToDraft,
  updateDraftItem,
  removeItemFromDraft,
  sendDraftToCashier,
  updateDraftCustomer,
  getSalesmanDrafts,
} from '@/app/actions/order-draft-actions'
import { toast } from 'sonner'

export class OrderDraftSyncService {
  private static syncInterval: NodeJS.Timeout | null = null
  private static isProcessing = false

  // Start monitoring online/offline status
  static startMonitoring() {
    if (typeof window === 'undefined') return

    // Set initial online status
    useOrderDraftStore.getState().setOnlineStatus(navigator.onLine)

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)

    // Start periodic sync
    this.startPeriodicSync()
  }

  static stopMonitoring() {
    if (typeof window === 'undefined') return

    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)

    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  private static handleOnline = () => {
    console.log('🟢 Back online')
    useOrderDraftStore.getState().setOnlineStatus(true)
    toast.success('Connection restored - syncing data...')
    this.syncPendingActions()
  }

  private static handleOffline = () => {
    console.log('🔴 Gone offline')
    useOrderDraftStore.getState().setOnlineStatus(false)
    toast.warning('Working offline - changes will sync when online')
  }

  private static startPeriodicSync() {
    // Sync every 30 seconds if online
    this.syncInterval = setInterval(() => {
      const { isOnline } = useOrderDraftStore.getState()
      if (isOnline) {
        this.syncPendingActions()
      }
    }, 30000)
  }

  // Sync all pending actions to server
  static async syncPendingActions() {
    const { pendingActions, isSyncing, setIsSyncing, removePendingAction, markDraftAsSynced } =
      useOrderDraftStore.getState()

    if (this.isProcessing || isSyncing || pendingActions.length === 0) {
      return
    }

    this.isProcessing = true
    setIsSyncing(true)

    console.log(`🔄 Syncing ${pendingActions.length} pending actions...`)

    for (const action of pendingActions) {
      try {
        let result

        switch (action.type) {
          case 'CREATE_DRAFT':
            result = await createOrderDraft(action.payload as Parameters<typeof createOrderDraft>[0])
            if (result.success && result.data) {
              // Update local draft with server ID
              markDraftAsSynced(action.draftId)
            }
            break

          case 'ADD_ITEM':
            result = await addItemToDraft(action.payload as Parameters<typeof addItemToDraft>[0])
            break

          case 'UPDATE_ITEM':
            result = await updateDraftItem(
              action.payload.itemId as string,
              action.payload.updates as Parameters<typeof updateDraftItem>[1]
            )
            break

          case 'REMOVE_ITEM':
            result = await removeItemFromDraft(action.payload.itemId as string)
            break

          case 'SEND_TO_CASHIER':
            result = await sendDraftToCashier(action.draftId)
            break

          case 'UPDATE_CUSTOMER':
            result = await updateDraftCustomer(
              action.draftId,
              action.payload as Parameters<typeof updateDraftCustomer>[1]
            )
            break
        }

        if (result?.success) {
          removePendingAction(action.id)
          console.log(`✅ Synced action: ${action.type}`)
        } else {
          console.error(`❌ Failed to sync action: ${action.type}`, result?.error)
          // Keep action in queue for retry
        }
      } catch (error) {
        console.error(`❌ Error syncing action: ${action.type}`, error)
        // Keep action in queue for retry
      }
    }

    setIsSyncing(false)
    this.isProcessing = false

    const remaining = useOrderDraftStore.getState().pendingActions.length
    if (remaining === 0) {
      console.log('✅ All actions synced')
      toast.success('All changes synced to server')
    } else {
      console.log(`⚠️ ${remaining} actions still pending`)
    }
  }

  // Pull latest drafts from server
  static async pullFromServer(status?: 'IN_PROGRESS' | 'SENT_TO_CASHIER' | 'COMPLETED' | 'CANCELLED' | 'ALL') {
    const { isOnline, setDrafts } = useOrderDraftStore.getState()

    if (!isOnline) {
      console.log('⚠️ Offline - using local data')
      return
    }

    try {
      const result = await getSalesmanDrafts(status)
      if (result.success && result.data) {
        // Convert server data to store format
        const drafts = result.data.map((draft) => ({
          id: draft.id,
          draftNumber: draft.draftNumber,
          salesmanId: draft.salesman.id,
          siteId: draft.site.id,
          customerName: draft.customerName || undefined,
          customerPhone: draft.customerPhone || undefined,
          customerEmail: draft.customerEmail || undefined,
          status: draft.status as 'IN_PROGRESS' | 'SENT_TO_CASHIER' | 'COMPLETED' | 'CANCELLED',
          items: draft.items.map((item) => ({
            id: item.id,
            productId: item.product.id,
            productName: item.product.name,
            productSku: item.product.sku,
            productImage: item.product.images[0]?.url || null,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unitPrice.toString()),
            subtotal: parseFloat(item.subtotal.toString()),
            notes: item.notes || undefined,
          })),
          subtotal: parseFloat(draft.subtotal.toString()),
          totalAmount: parseFloat(draft.totalAmount.toString()),
          createdAt: draft.createdAt.toISOString(),
          updatedAt: draft.updatedAt.toISOString(),
          isSynced: true,
        }))

        setDrafts(drafts)
        console.log(`✅ Pulled ${drafts.length} drafts from server`)
      }
    } catch (error) {
      console.error('❌ Failed to pull from server:', error)
    }
  }

  // Generate temporary ID for offline drafts
  static generateTempId(): string {
    return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}
