"use client"

import React, { useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatPhone, timeAgo } from '@/lib/utils'
import { Search, Users, MessageCircle, ShoppingBag, ArrowUpRight } from 'lucide-react'
import type { Customer } from '@/types'

const mockCustomers: Customer[] = [
  { id: 'c1', name: 'Maria Silva', whatsappNumber: '5571998005678', totalOrders: 12, totalSpent: 890.50, lastOrderAt: new Date(Date.now() - 2 * 3600000).toISOString(), tags: ['recorrente'] },
  { id: 'c2', name: 'João Santos', whatsappNumber: '5571997009012', totalOrders: 3, totalSpent: 330, lastOrderAt: new Date(Date.now() - 24 * 3600000).toISOString(), tags: [] },
  { id: 'c3', name: 'Ana Costa', whatsappNumber: '5571996003456', totalOrders: 8, totalSpent: 620, lastOrderAt: new Date(Date.now() - 5 * 3600000).toISOString(), tags: ['recorrente'] },
  { id: 'c4', name: 'Pedro Lima', whatsappNumber: '5571995007890', totalOrders: 2, totalSpent: 216, lastOrderAt: new Date(Date.now() - 72 * 3600000).toISOString(), tags: ['novo'] },
  { id: 'c5', name: 'Roberto Alves', whatsappNumber: '5571999001234', totalOrders: 5, totalSpent: 450, lastOrderAt: new Date(Date.now() - 48 * 3600000).toISOString(), tags: [] },
  { id: 'c6', pushName: 'Carla M.', whatsappNumber: '5571994001122', totalOrders: 1, totalSpent: 45, lastOrderAt: new Date(Date.now() - 168 * 3600000).toISOString(), tags: ['novo'] },
]

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const customers = mockCustomers.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (c.name?.toLowerCase().includes(q)) ||
      (c.pushName?.toLowerCase().includes(q)) ||
      c.whatsappNumber.includes(q)
  })

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {mockCustomers.length} clientes cadastrados via WhatsApp
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{mockCustomers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-whatsapp/10 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-whatsapp" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recorrentes</p>
              <p className="text-lg font-bold">{mockCustomers.filter(c => c.tags.includes('recorrente')).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ticket médio</p>
              <p className="text-lg font-bold">
                {formatCurrency(mockCustomers.reduce((s, c) => s + c.totalSpent, 0) / Math.max(mockCustomers.reduce((s, c) => s + c.totalOrders, 0), 1))}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer list */}
      <div className="space-y-2">
        {customers.map(customer => (
          <Card key={customer.id} className="border-0 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-slate-500">
                  {(customer.name || customer.pushName || '?').charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {customer.name || customer.pushName || 'Sem nome'}
                  </h3>
                  {customer.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatPhone(customer.whatsappNumber)}
                </p>
              </div>

              <div className="text-center hidden sm:block">
                <p className="text-sm font-bold text-slate-900">{customer.totalOrders}</p>
                <p className="text-[10px] text-muted-foreground">pedidos</p>
              </div>

              <div className="text-center hidden sm:block">
                <p className="text-sm font-bold text-emerald-600">{formatCurrency(customer.totalSpent)}</p>
                <p className="text-[10px] text-muted-foreground">gasto total</p>
              </div>

              <div className="text-right hidden md:block">
                <p className="text-xs text-muted-foreground">
                  Último pedido: {customer.lastOrderAt ? timeAgo(customer.lastOrderAt) : 'nunca'}
                </p>
              </div>

              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  )
}
