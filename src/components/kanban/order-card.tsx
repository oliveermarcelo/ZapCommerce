"use client"

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Order } from '@/types'
import { formatCurrency, timeAgo } from '@/lib/utils'
import { PAYMENT_METHOD_LABELS } from '@/types'
import { cn } from '@/lib/utils'
import {
  Clock,
  MapPin,
  CreditCard,
  QrCode,
  Banknote,
  Phone,
  ChevronRight
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useUIStore } from '@/hooks/use-store'

interface OrderCardProps {
  order: Order
}

const paymentIcons: Record<string, React.ElementType> = {
  PIX: QrCode,
  ON_DELIVERY_CASH: Banknote,
  ON_DELIVERY_CARD: CreditCard,
}

export function OrderCard({ order }: OrderCardProps) {
  const { setOrderDetail } = useUIStore()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: order.id,
    data: { type: 'order', order },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const PaymentIcon = paymentIcons[order.paymentMethod] || CreditCard
  const customerName = order.customer?.name || order.customer?.pushName || 'Cliente'
  const itemCount = order.items?.length || 0
  const itemsSummary = order.items?.slice(0, 2).map(i => `${i.quantity}x ${i.productName}`).join(', ')

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setOrderDetail(order.id)}
      className={cn(
        "group relative rounded-xl border bg-white p-3.5 shadow-sm cursor-grab active:cursor-grabbing",
        "hover:shadow-md hover:border-slate-300 transition-all",
        isDragging && "opacity-50 rotate-1 scale-105 shadow-xl z-50"
      )}
    >
      {/* Header: Number + Time + Payment */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">{order.displayNumber}</span>
          {order.paymentMethod === 'PIX' && order.paymentStatus === 'PENDING' && (
            <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">
              Aguardando PIX
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {timeAgo(order.createdAt)}
        </div>
      </div>

      {/* Customer */}
      <div className="flex items-center gap-2 mb-2">
        <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-slate-500">
            {customerName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 truncate">{customerName}</p>
          {order.customer?.whatsappNumber && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Phone className="h-2.5 w-2.5" />
              {order.customer.whatsappNumber}
            </div>
          )}
        </div>
      </div>

      {/* Items summary */}
      <div className="mb-2.5 py-2 px-2.5 rounded-lg bg-slate-50 text-xs text-slate-600">
        <p className="truncate">{itemsSummary}</p>
        {itemCount > 2 && (
          <p className="text-muted-foreground mt-0.5">+{itemCount - 2} item(ns)</p>
        )}
      </div>

      {/* Footer: Payment + Delivery + Total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <PaymentIcon className="h-3 w-3" />
            {PAYMENT_METHOD_LABELS[order.paymentMethod]}
          </div>
          {order.deliveryType === 'DELIVERY' && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              Entrega
            </div>
          )}
        </div>
        <span className="text-sm font-bold text-slate-900">
          {formatCurrency(order.total)}
        </span>
      </div>

      {/* Hover indicator */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  )
}
