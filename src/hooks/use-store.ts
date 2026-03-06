import { create } from 'zustand'
import type { User, Tenant, KanbanColumn, Order } from '@/types'

// ============================================
// Auth Store
// ============================================
interface AuthState {
  user: User | null
  tenant: Tenant | null
  token: string | null
  isLoading: boolean
  setAuth: (user: User, tenant: Tenant | null, token: string) => void
  setTenant: (tenant: Tenant) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  token: null,
  isLoading: true,
  setAuth: (user, tenant, token) => set({ user, tenant, token, isLoading: false }),
  setTenant: (tenant) => set({ tenant }),
  logout: () => {
    set({ user: null, tenant: null, token: null })
    document.cookie = 'token=; Max-Age=0; path=/'
    document.cookie = 'refreshToken=; Max-Age=0; path=/'
    window.location.href = '/login'
  },
}))

// ============================================
// Kanban Store
// ============================================
interface KanbanState {
  columns: KanbanColumn[]
  isLoading: boolean
  setColumns: (columns: KanbanColumn[]) => void
  moveOrder: (orderId: string, fromColumnId: string, toColumnId: string) => void
  addOrder: (order: Order, columnId: string) => void
  removeOrder: (orderId: string) => void
  updateOrder: (orderId: string, updates: Partial<Order>) => void
}

export const useKanbanStore = create<KanbanState>((set) => ({
  columns: [],
  isLoading: true,
  setColumns: (columns) => set({ columns, isLoading: false }),
  moveOrder: (orderId, fromColumnId, toColumnId) =>
    set((state) => {
      const columns = state.columns.map(col => {
        if (col.id === fromColumnId) {
          return { ...col, orders: col.orders.filter(o => o.id !== orderId) }
        }
        if (col.id === toColumnId) {
          const fromCol = state.columns.find(c => c.id === fromColumnId)
          const order = fromCol?.orders.find(o => o.id === orderId)
          if (order) {
            return { ...col, orders: [...col.orders, { ...order, kanbanColumnId: toColumnId }] }
          }
        }
        return col
      })
      return { columns }
    }),
  addOrder: (order, columnId) =>
    set((state) => ({
      columns: state.columns.map(col =>
        col.id === columnId ? { ...col, orders: [order, ...col.orders] } : col
      ),
    })),
  removeOrder: (orderId) =>
    set((state) => ({
      columns: state.columns.map(col => ({
        ...col,
        orders: col.orders.filter(o => o.id !== orderId),
      })),
    })),
  updateOrder: (orderId, updates) =>
    set((state) => ({
      columns: state.columns.map(col => ({
        ...col,
        orders: col.orders.map(o => o.id === orderId ? { ...o, ...updates } : o),
      })),
    })),
}))

// ============================================
// UI Store (sidebar, modals, notifications)
// ============================================
interface UIState {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  notificationSound: boolean
  orderDetailId: string | null
  toggleSidebar: () => void
  toggleSidebarCollapse: () => void
  setOrderDetail: (id: string | null) => void
  setNotificationSound: (enabled: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  notificationSound: true,
  orderDetailId: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleSidebarCollapse: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setOrderDetail: (id) => set({ orderDetailId: id }),
  setNotificationSound: (enabled) => set({ notificationSound: enabled }),
}))
