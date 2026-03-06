"use client"

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { KanbanColumn as KanbanColumnType } from '@/types'
import { OrderCard } from './order-card'
import { cn } from '@/lib/utils'
import {
  Inbox, Flame, Package, Truck, CheckCircle, Clock,
  PackageCheck, Calendar, ShoppingCart, User
} from 'lucide-react'

const iconMap: Record<string, React.ElementType> = {
  inbox: Inbox,
  flame: Flame,
  package: Package,
  truck: Truck,
  check: CheckCircle,
  clock: Clock,
  'package-check': PackageCheck,
  'check-circle': CheckCircle,
  calendar: Calendar,
  'shopping-cart': ShoppingCart,
  user: User,
}

interface KanbanColumnProps {
  column: KanbanColumnType
}

export function KanbanColumn({ column }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', column },
  })

  const Icon = iconMap[column.icon || 'inbox'] || Inbox
  const orderIds = column.orders.map(o => o.id)

  return (
    <div className="flex flex-col h-full min-w-[300px] max-w-[340px]">
      {/* Column Header */}
      <div className="flex items-center gap-2.5 px-3 py-3 mb-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ backgroundColor: column.color + '20' }}
        >
          <Icon className="h-4 w-4" style={{ color: column.color }} />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">{column.name}</h3>
        <span
          className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
          style={{ backgroundColor: column.color }}
        >
          {column.orders.length}
        </span>
      </div>

      {/* Droppable Area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2.5 overflow-y-auto rounded-xl p-2 transition-colors scrollbar-thin",
          isOver ? "bg-slate-100 ring-2 ring-dashed ring-slate-300" : "bg-slate-50/50"
        )}
      >
        <SortableContext items={orderIds} strategy={verticalListSortingStrategy}>
          {column.orders.map(order => (
            <OrderCard key={order.id} order={order} />
          ))}
        </SortableContext>

        {column.orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
              <Icon className="h-5 w-5 text-slate-300" />
            </div>
            <p className="text-xs text-muted-foreground">
              Nenhum pedido
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
