"use client"

import React, { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { useKanbanStore, useUIStore } from '@/hooks/use-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Volume2, VolumeX, Filter, Maximize2 } from 'lucide-react'
import type { KanbanColumn, Order } from '@/types'
import { cn } from '@/lib/utils'

// Mock data — substituir por fetch real
const mockColumns: KanbanColumn[] = [
  {
    id: 'col-1', name: 'Aguardando Pgto', slug: 'awaiting-payment', color: '#F59E0B',
    icon: 'clock', position: 0, isDefault: false, isFinal: false, mappedStatus: 'AWAITING_PAYMENT',
    orders: [
      {
        id: 'ord-1', orderNumber: 43, displayNumber: '#043', status: 'AWAITING_PAYMENT',
        customer: { id: 'c1', name: 'Roberto Alves', whatsappNumber: '5571999001234', totalOrders: 5, totalSpent: 450, tags: [] },
        items: [
          { id: 'i1', productId: 'p1', productName: 'X-Burguer Especial', quantity: 2, unitPrice: 28.90, totalPrice: 57.80, options: [{ id: 'o1', optionName: 'Bacon Extra', groupName: 'Adicionais', price: 5 }] },
          { id: 'i2', productId: 'p2', productName: 'Coca-Cola 600ml', quantity: 2, unitPrice: 7.50, totalPrice: 15.00, options: [] },
        ],
        subtotal: 72.80, deliveryFee: 5, discount: 0, total: 77.80,
        deliveryType: 'DELIVERY', deliveryAddress: 'Rua das Flores, 123 - Centro',
        paymentMethod: 'PIX', paymentStatus: 'PENDING',
        createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
      },
    ],
  },
  {
    id: 'col-2', name: 'Recebido', slug: 'received', color: '#3B82F6',
    icon: 'inbox', position: 1, isDefault: true, isFinal: false, mappedStatus: 'RECEIVED',
    orders: [
      {
        id: 'ord-2', orderNumber: 42, displayNumber: '#042', status: 'RECEIVED',
        customer: { id: 'c2', name: 'Maria Silva', whatsappNumber: '5571998005678', totalOrders: 12, totalSpent: 890, tags: [] },
        items: [
          { id: 'i3', productId: 'p3', productName: 'Pizza Calabresa G', quantity: 1, unitPrice: 45, totalPrice: 45, options: [{ id: 'o2', optionName: 'Borda Catupiry', groupName: 'Borda', price: 8 }] },
        ],
        subtotal: 53, deliveryFee: 6, discount: 0, total: 59,
        deliveryType: 'DELIVERY', deliveryAddress: 'Av. Principal, 456',
        paymentMethod: 'PIX', paymentStatus: 'CONFIRMED',
        createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
        receivedAt: new Date(Date.now() - 7 * 60000).toISOString(),
      },
      {
        id: 'ord-3', orderNumber: 41, displayNumber: '#041', status: 'RECEIVED',
        customer: { id: 'c3', name: 'João Santos', whatsappNumber: '5571997009012', totalOrders: 3, totalSpent: 230, tags: [] },
        items: [
          { id: 'i4', productId: 'p4', productName: 'Gás P13', quantity: 1, unitPrice: 110, totalPrice: 110, options: [] },
        ],
        subtotal: 110, deliveryFee: 0, discount: 0, total: 110,
        deliveryType: 'DELIVERY', deliveryAddress: 'Rua do Comércio, 78',
        paymentMethod: 'ON_DELIVERY_CASH', paymentStatus: 'PENDING',
        createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
        receivedAt: new Date(Date.now() - 12 * 60000).toISOString(),
      },
    ],
  },
  {
    id: 'col-3', name: 'Preparando', slug: 'preparing', color: '#F97316',
    icon: 'flame', position: 2, isDefault: false, isFinal: false, mappedStatus: 'PREPARING',
    orders: [
      {
        id: 'ord-4', orderNumber: 40, displayNumber: '#040', status: 'PREPARING',
        customer: { id: 'c4', name: 'Ana Costa', whatsappNumber: '5571996003456', totalOrders: 8, totalSpent: 620, tags: [] },
        items: [
          { id: 'i5', productId: 'p5', productName: 'Combo Família', quantity: 1, unitPrice: 89.90, totalPrice: 89.90, options: [] },
          { id: 'i6', productId: 'p6', productName: 'Suco Natural 1L', quantity: 2, unitPrice: 12, totalPrice: 24, options: [] },
        ],
        subtotal: 113.90, deliveryFee: 5, discount: 0, total: 118.90,
        deliveryType: 'DELIVERY',
        paymentMethod: 'PIX', paymentStatus: 'CONFIRMED',
        createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
        preparingAt: new Date(Date.now() - 18 * 60000).toISOString(),
      },
    ],
  },
  {
    id: 'col-4', name: 'Pronto', slug: 'ready', color: '#8B5CF6',
    icon: 'package-check', position: 3, isDefault: false, isFinal: false, mappedStatus: 'READY',
    orders: [],
  },
  {
    id: 'col-5', name: 'Saiu p/ Entrega', slug: 'out-delivery', color: '#06B6D4',
    icon: 'truck', position: 4, isDefault: false, isFinal: false, mappedStatus: 'OUT_FOR_DELIVERY',
    orders: [
      {
        id: 'ord-5', orderNumber: 39, displayNumber: '#039', status: 'OUT_FOR_DELIVERY',
        customer: { id: 'c5', name: 'Pedro Lima', whatsappNumber: '5571995007890', totalOrders: 2, totalSpent: 180, tags: [] },
        items: [
          { id: 'i7', productId: 'p7', productName: 'Água 20L', quantity: 3, unitPrice: 12, totalPrice: 36, options: [{ id: 'o3', optionName: 'Com troca vasilhame', groupName: 'Vasilhame', price: 0 }] },
        ],
        subtotal: 36, deliveryFee: 0, discount: 0, total: 36,
        deliveryType: 'DELIVERY', deliveryAddress: 'Rua da Paz, 200',
        paymentMethod: 'ON_DELIVERY_CASH', paymentStatus: 'PENDING',
        createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
        outForDeliveryAt: new Date(Date.now() - 10 * 60000).toISOString(),
      },
    ],
  },
  {
    id: 'col-6', name: 'Entregue', slug: 'delivered', color: '#10B981',
    icon: 'check', position: 5, isDefault: false, isFinal: true, mappedStatus: 'DELIVERED',
    orders: [],
  },
]

export default function OrdersPage() {
  const { columns, setColumns, isLoading } = useKanbanStore()
  const { notificationSound, setNotificationSound } = useUIStore()
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    // TODO: Substituir por fetch real + WebSocket
    setColumns(mockColumns)
  }, [setColumns])

  const totalOrders = columns.reduce((sum, col) => sum + col.orders.length, 0)
  const pendingOrders = columns
    .filter(c => !c.isFinal && c.mappedStatus !== 'DELIVERED' && c.mappedStatus !== 'CANCELLED')
    .reduce((sum, col) => sum + col.orders.length, 0)

  const handleRefresh = async () => {
    // TODO: Re-fetch from API
    setColumns(mockColumns)
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Pedidos</h1>
          <Badge variant="secondary" className="text-xs">
            {totalOrders} total
          </Badge>
          {pendingOrders > 0 && (
            <Badge className="bg-amber-100 text-amber-800 text-xs">
              {pendingOrders} pendentes
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNotificationSound(!notificationSound)}
            className={cn(notificationSound && "text-whatsapp")}
            title={notificationSound ? "Som ativado" : "Som desativado"}
          >
            {notificationSound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>

          <Button variant="ghost" size="icon" onClick={handleRefresh} title="Atualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="sm" className="gap-2 hidden md:flex">
            <Filter className="h-3.5 w-3.5" /> Filtrar
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard />
    </DashboardLayout>
  )
}
