// ============================================
// ZapCommerce - Frontend Types
// ============================================

export type BusinessType =
  | 'RESTAURANT' | 'GAS_WATER' | 'PHARMACY' | 'PET_SHOP'
  | 'CONVENIENCE' | 'CLOTHING' | 'CONSTRUCTION' | 'BAKERY'
  | 'MARKET' | 'SERVICES' | 'GENERIC'

export type OrderStatus =
  | 'AWAITING_PAYMENT' | 'RECEIVED' | 'PREPARING' | 'READY'
  | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'EXPIRED'

export type PaymentMethod = 'PIX' | 'ON_DELIVERY_CASH' | 'ON_DELIVERY_CARD'
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'REFUNDED' | 'EXPIRED'
export type DeliveryType = 'DELIVERY' | 'PICKUP'

export interface User {
  id: string
  name: string
  email: string
  isSuperAdmin: boolean
}

export interface Tenant {
  id: string
  name: string
  slug: string
  businessType: BusinessType
  logoUrl?: string
  primaryColor: string
  whatsappConnected: boolean
  plan: string
  status: string
}

export interface KanbanColumn {
  id: string
  name: string
  slug: string
  color: string
  icon?: string
  position: number
  isDefault: boolean
  isFinal: boolean
  mappedStatus?: OrderStatus
  autoMessage?: string
  orders: Order[]
}

export interface Customer {
  id: string
  name?: string
  pushName?: string
  whatsappNumber: string
  totalOrders: number
  totalSpent: number
  lastOrderAt?: string
  tags: string[]
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  imageUrl?: string
  position: number
  isActive: boolean
  productsCount?: number
}

export interface Product {
  id: string
  name: string
  slug: string
  description?: string
  imageUrl?: string
  price: number
  promotionalPrice?: number
  position: number
  isActive: boolean
  stockEnabled: boolean
  stockQuantity?: number
  categoryId: string
  category?: Category
  optionGroups?: ProductOptionGroup[]
}

export interface ProductOptionGroup {
  id: string
  productId: string
  optionGroupId: string
  position: number
  optionGroup: OptionGroup
}

export interface OptionGroup {
  id: string
  name: string
  type: 'SINGLE' | 'MULTIPLE'
  isRequired: boolean
  minSelect: number
  maxSelect: number
  options: Option[]
}

export interface Option {
  id: string
  name: string
  price: number
  isActive: boolean
  isDefault: boolean
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  notes?: string
  options: OrderItemOption[]
}

export interface OrderItemOption {
  id: string
  optionName: string
  groupName: string
  price: number
}

export interface Order {
  id: string
  orderNumber: number
  displayNumber: string
  status: OrderStatus
  kanbanColumnId?: string
  customer: Customer
  items: OrderItem[]
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
  deliveryType: DeliveryType
  deliveryAddress?: string
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  notes?: string
  createdAt: string
  receivedAt?: string
  preparingAt?: string
  readyAt?: string
  outForDeliveryAt?: string
  deliveredAt?: string
}

export interface DashboardStats {
  todayOrders: number
  todayRevenue: number
  pendingOrders: number
  activeCustomers: number
  weeklyOrders: number[]
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
}

export const BUSINESS_TYPE_CONFIG: Record<BusinessType, { label: string; icon: string; description: string }> = {
  RESTAURANT: { label: 'Lanchonete / Restaurante', icon: '🍔', description: 'Hamburguerias, pizzarias, restaurantes' },
  GAS_WATER: { label: 'Depósito de Gás / Água', icon: '🔥', description: 'Distribuidoras de gás e água' },
  PHARMACY: { label: 'Farmácia', icon: '💊', description: 'Farmácias e drogarias' },
  PET_SHOP: { label: 'Pet Shop', icon: '🐾', description: 'Pet shops e agropecuárias' },
  CONVENIENCE: { label: 'Conveniência / Adega', icon: '🍺', description: 'Conveniências e adegas' },
  CLOTHING: { label: 'Loja de Roupas', icon: '👕', description: 'Roupas, calçados e acessórios' },
  CONSTRUCTION: { label: 'Mat. de Construção', icon: '🔨', description: 'Materiais de construção' },
  BAKERY: { label: 'Padaria / Confeitaria', icon: '🍰', description: 'Padarias, confeitarias e docerias' },
  MARKET: { label: 'Mercado / Mercearia', icon: '🛒', description: 'Mercados e mercearias' },
  SERVICES: { label: 'Serviços', icon: '✂️', description: 'Barbearias, lavanderias, estéticas' },
  GENERIC: { label: 'Outro', icon: '🏪', description: 'Qualquer tipo de negócio' },
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
  AWAITING_PAYMENT: { label: 'Aguardando Pgto', color: '#F59E0B', bgColor: 'bg-amber-100 text-amber-800' },
  RECEIVED: { label: 'Recebido', color: '#3B82F6', bgColor: 'bg-blue-100 text-blue-800' },
  PREPARING: { label: 'Preparando', color: '#F97316', bgColor: 'bg-orange-100 text-orange-800' },
  READY: { label: 'Pronto', color: '#8B5CF6', bgColor: 'bg-violet-100 text-violet-800' },
  OUT_FOR_DELIVERY: { label: 'Em Entrega', color: '#06B6D4', bgColor: 'bg-cyan-100 text-cyan-800' },
  DELIVERED: { label: 'Entregue', color: '#10B981', bgColor: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelado', color: '#EF4444', bgColor: 'bg-red-100 text-red-800' },
  EXPIRED: { label: 'Expirado', color: '#6B7280', bgColor: 'bg-gray-100 text-gray-800' },
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  ON_DELIVERY_CASH: 'Dinheiro',
  ON_DELIVERY_CARD: 'Cartão',
}
