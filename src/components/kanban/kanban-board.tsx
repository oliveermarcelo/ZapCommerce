"use client"

import React, { useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { KanbanColumn } from './kanban-column'
import { OrderCard } from './order-card'
import { useKanbanStore } from '@/hooks/use-store'
import type { Order } from '@/types'

export function KanbanBoard() {
  const { columns, moveOrder } = useKanbanStore()
  const [activeOrder, setActiveOrder] = React.useState<Order | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    if (active.data.current?.type === 'order') {
      setActiveOrder(active.data.current.order)
    }
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveOrder(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find source column
    const sourceColumn = columns.find(col =>
      col.orders.some(o => o.id === activeId)
    )
    if (!sourceColumn) return

    // Determine target column
    let targetColumnId: string

    if (over.data.current?.type === 'column') {
      targetColumnId = overId
    } else if (over.data.current?.type === 'order') {
      // Dropped on another order — find its column
      const targetCol = columns.find(col =>
        col.orders.some(o => o.id === overId)
      )
      targetColumnId = targetCol?.id || sourceColumn.id
    } else {
      targetColumnId = overId
    }

    if (sourceColumn.id === targetColumnId) return

    // Optimistic update
    moveOrder(activeId, sourceColumn.id, targetColumnId)

    // Call API to persist
    try {
      const targetColumn = columns.find(c => c.id === targetColumnId)
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeId,
          kanbanColumnId: targetColumnId,
          status: targetColumn?.mappedStatus || 'RECEIVED',
        }),
      })
    } catch (err) {
      console.error('Failed to update order status:', err)
      // TODO: Rollback optimistic update
    }
  }, [columns, moveOrder])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-10rem)]">
        {columns.map(column => (
          <KanbanColumn key={column.id} column={column} />
        ))}
      </div>

      {/* Drag Overlay (ghost card) */}
      <DragOverlay>
        {activeOrder ? (
          <div className="rotate-2 scale-105">
            <OrderCard order={activeOrder} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
