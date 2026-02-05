import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type DraftItem = {
  id: string
  productId: string
  productName: string
  productSku: string
  productImage: string | null
  quantity: number
  unitPrice: number
  subtotal: number
  notes?: string
}

type Draft = {
  id: string
  draftNumber: string
  salesmanId: string
  siteId: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  status: 'IN_PROGRESS' | 'SENT_TO_CASHIER' | 'COMPLETED' | 'CANCELLED'
  items: DraftItem[]
  subtotal: number
  totalAmount: number
  createdAt: string
  updatedAt: string
  isSynced: boolean // Track if synced to server
}

type PendingAction = {
  id: string
  type: 'CREATE_DRAFT' | 'ADD_ITEM' | 'UPDATE_ITEM' | 'REMOVE_ITEM' | 'SEND_TO_CASHIER' | 'UPDATE_CUSTOMER'
  draftId: string
  payload: Record<string, unknown>
  timestamp: string
  retryCount: number
}

type OrderDraftStore = {
  // State
  drafts: Draft[]
  currentDraftId: string | null
  pendingActions: PendingAction[]
  isOnline: boolean
  isSyncing: boolean

  // Draft actions
  setDrafts: (drafts: Draft[]) => void
  addDraft: (draft: Draft) => void
  updateDraft: (draftId: string, updates: Partial<Draft>) => void
  removeDraft: (draftId: string) => void
  setCurrentDraft: (draftId: string | null) => void
  getCurrentDraft: () => Draft | null

  // Item actions
  addItem: (draftId: string, item: DraftItem) => void
  updateItem: (draftId: string, itemId: string, updates: Partial<DraftItem>) => void
  removeItem: (draftId: string, itemId: string) => void
  updateItemQuantity: (draftId: string, itemId: string, quantity: number) => void

  // Customer actions
  updateCustomer: (draftId: string, customer: { name?: string; phone?: string; email?: string }) => void

  // Sync actions
  addPendingAction: (action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>) => void
  removePendingAction: (actionId: string) => void
  getPendingActions: () => PendingAction[]
  setOnlineStatus: (isOnline: boolean) => void
  setIsSyncing: (isSyncing: boolean) => void
  markDraftAsSynced: (draftId: string) => void

  // Utility
  calculateTotals: (draftId: string) => void
  clearAll: () => void
}

export const useOrderDraftStore = create<OrderDraftStore>()(
  persist(
    (set, get) => ({
      // Initial state
      drafts: [],
      currentDraftId: null,
      pendingActions: [],
      isOnline: true,
      isSyncing: false,

      // Draft actions
      setDrafts: (drafts) => set({ drafts }),

      addDraft: (draft) =>
        set((state) => ({
          drafts: [...state.drafts, draft],
        })),

      updateDraft: (draftId, updates) =>
        set((state) => ({
          drafts: state.drafts.map((draft) =>
            draft.id === draftId
              ? { ...draft, ...updates, updatedAt: new Date().toISOString() }
              : draft
          ),
        })),

      removeDraft: (draftId) =>
        set((state) => ({
          drafts: state.drafts.filter((draft) => draft.id !== draftId),
          currentDraftId: state.currentDraftId === draftId ? null : state.currentDraftId,
        })),

      setCurrentDraft: (draftId) => set({ currentDraftId: draftId }),

      getCurrentDraft: () => {
        const state = get()
        return state.drafts.find((d) => d.id === state.currentDraftId) || null
      },

      // Item actions
      addItem: (draftId, item) =>
        set((state) => {
          const draft = state.drafts.find((d) => d.id === draftId)
          if (!draft) return state

          // Check if item already exists
          const existingItemIndex = draft.items.findIndex((i) => i.productId === item.productId)

          let updatedItems
          if (existingItemIndex >= 0) {
            // Update existing item quantity
            updatedItems = draft.items.map((i, idx) =>
              idx === existingItemIndex
                ? {
                    ...i,
                    quantity: i.quantity + item.quantity,
                    subtotal: (i.quantity + item.quantity) * i.unitPrice,
                  }
                : i
            )
          } else {
            // Add new item
            updatedItems = [...draft.items, item]
          }

          const subtotal = updatedItems.reduce((sum, i) => sum + i.subtotal, 0)

          return {
            drafts: state.drafts.map((d) =>
              d.id === draftId
                ? {
                    ...d,
                    items: updatedItems,
                    subtotal,
                    totalAmount: subtotal,
                    updatedAt: new Date().toISOString(),
                    isSynced: false,
                  }
                : d
            ),
          }
        }),

      updateItem: (draftId, itemId, updates) =>
        set((state) => {
          const draft = state.drafts.find((d) => d.id === draftId)
          if (!draft) return state

          const updatedItems = draft.items.map((item) => {
            if (item.id !== itemId) return item

            const updatedItem = { ...item, ...updates }
            // Recalculate subtotal if quantity or price changed
            if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
              updatedItem.subtotal = updatedItem.quantity * updatedItem.unitPrice
            }
            return updatedItem
          })

          const subtotal = updatedItems.reduce((sum, i) => sum + i.subtotal, 0)

          return {
            drafts: state.drafts.map((d) =>
              d.id === draftId
                ? {
                    ...d,
                    items: updatedItems,
                    subtotal,
                    totalAmount: subtotal,
                    updatedAt: new Date().toISOString(),
                    isSynced: false,
                  }
                : d
            ),
          }
        }),

      removeItem: (draftId, itemId) =>
        set((state) => {
          const draft = state.drafts.find((d) => d.id === draftId)
          if (!draft) return state

          const updatedItems = draft.items.filter((item) => item.id !== itemId)
          const subtotal = updatedItems.reduce((sum, i) => sum + i.subtotal, 0)

          return {
            drafts: state.drafts.map((d) =>
              d.id === draftId
                ? {
                    ...d,
                    items: updatedItems,
                    subtotal,
                    totalAmount: subtotal,
                    updatedAt: new Date().toISOString(),
                    isSynced: false,
                  }
                : d
            ),
          }
        }),

      updateItemQuantity: (draftId, itemId, quantity) =>
        set((state) => {
          if (quantity < 1) return state

          const draft = state.drafts.find((d) => d.id === draftId)
          if (!draft) return state

          const updatedItems = draft.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  quantity,
                  subtotal: quantity * item.unitPrice,
                }
              : item
          )

          const subtotal = updatedItems.reduce((sum, i) => sum + i.subtotal, 0)

          return {
            drafts: state.drafts.map((d) =>
              d.id === draftId
                ? {
                    ...d,
                    items: updatedItems,
                    subtotal,
                    totalAmount: subtotal,
                    updatedAt: new Date().toISOString(),
                    isSynced: false,
                  }
                : d
            ),
          }
        }),

      // Customer actions
      updateCustomer: (draftId, customer) =>
        set((state) => ({
          drafts: state.drafts.map((d) =>
            d.id === draftId
              ? {
                  ...d,
                  customerName: customer.name,
                  customerPhone: customer.phone,
                  customerEmail: customer.email,
                  updatedAt: new Date().toISOString(),
                  isSynced: false,
                }
              : d
          ),
        })),

      // Sync actions
      addPendingAction: (action) =>
        set((state) => ({
          pendingActions: [
            ...state.pendingActions,
            {
              ...action,
              id: `action-${Date.now()}-${Math.random()}`,
              timestamp: new Date().toISOString(),
              retryCount: 0,
            },
          ],
        })),

      removePendingAction: (actionId) =>
        set((state) => ({
          pendingActions: state.pendingActions.filter((a) => a.id !== actionId),
        })),

      getPendingActions: () => get().pendingActions,

      setOnlineStatus: (isOnline) => set({ isOnline }),

      setIsSyncing: (isSyncing) => set({ isSyncing }),

      markDraftAsSynced: (draftId) =>
        set((state) => ({
          drafts: state.drafts.map((d) =>
            d.id === draftId ? { ...d, isSynced: true } : d
          ),
        })),

      // Utility
      calculateTotals: (draftId) =>
        set((state) => {
          const draft = state.drafts.find((d) => d.id === draftId)
          if (!draft) return state

          const subtotal = draft.items.reduce((sum, item) => sum + item.subtotal, 0)

          return {
            drafts: state.drafts.map((d) =>
              d.id === draftId
                ? {
                    ...d,
                    subtotal,
                    totalAmount: subtotal,
                  }
                : d
            ),
          }
        }),

      clearAll: () =>
        set({
          drafts: [],
          currentDraftId: null,
          pendingActions: [],
        }),
    }),
    {
      name: 'order-draft-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        drafts: state.drafts,
        currentDraftId: state.currentDraftId,
        pendingActions: state.pendingActions,
      }),
    }
  )
)
