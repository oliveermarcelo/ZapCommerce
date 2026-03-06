"use client"

import React from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ShoppingBag,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  ArrowUpRight,
  MessageCircle,
  Columns3,
  Megaphone,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/hooks/use-store'
import { formatCurrency } from '@/lib/utils'

// Dados mockados — substituir por React Query + API
const mockStats = {
  todayOrders: 24,
  todayRevenue: 1847.50,
  pendingOrders: 5,
  activeCustomers: 142,
  weeklyGrowth: 12.5,
  topProducts: [
    { name: 'X-Burguer Especial', qty: 38, revenue: 760 },
    { name: 'Gás P13', qty: 25, revenue: 2750 },
    { name: 'Coca-Cola 2L', qty: 42, revenue: 378 },
    { name: 'Água 20L', qty: 18, revenue: 216 },
  ],
  recentOrders: [
    { id: '1', number: '#042', customer: 'Maria Silva', total: 89.90, status: 'PREPARING', time: '5min' },
    { id: '2', number: '#041', customer: 'João Santos', total: 110.00, status: 'RECEIVED', time: '12min' },
    { id: '3', number: '#040', customer: 'Ana Costa', total: 45.00, status: 'OUT_FOR_DELIVERY', time: '28min' },
    { id: '4', number: '#039', customer: 'Pedro Lima', total: 67.50, status: 'DELIVERED', time: '45min' },
  ],
}

const statusColors: Record<string, string> = {
  RECEIVED: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-orange-100 text-orange-700',
  OUT_FOR_DELIVERY: 'bg-cyan-100 text-cyan-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
}

const statusLabels: Record<string, string> = {
  RECEIVED: 'Recebido',
  PREPARING: 'Preparando',
  OUT_FOR_DELIVERY: 'Em entrega',
  DELIVERED: 'Entregue',
}

export default function DashboardPage() {
  const { tenant } = useAuthStore()

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão geral do seu negócio hoje
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/orders">
            <Button variant="outline" className="gap-2">
              <Columns3 className="h-4 w-4" /> Ver Kanban
            </Button>
          </Link>
        </div>
      </div>

      {/* WhatsApp alert if disconnected */}
      {!tenant?.whatsappConnected && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">WhatsApp não conectado</p>
            <p className="text-xs text-amber-600">Conecte seu WhatsApp para começar a receber pedidos.</p>
          </div>
          <Link href="/settings">
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">
              Conectar
            </Button>
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-whatsapp/5 to-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pedidos hoje</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{mockStats.todayOrders}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-whatsapp/10 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-whatsapp" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3">
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-600">+{mockStats.weeklyGrowth}%</span>
              <span className="text-xs text-muted-foreground">vs semana passada</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Faturamento hoje</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{formatCurrency(mockStats.todayRevenue)}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pedidos pendentes</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{mockStats.pendingOrders}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clientes ativos</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{mockStats.activeCustomers}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">Pedidos recentes</CardTitle>
            <Link href="/orders">
              <Button variant="ghost" size="sm" className="text-xs">
                Ver todos <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockStats.recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-slate-600">{order.number}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{order.customer}</p>
                      <p className="text-xs text-muted-foreground">{order.time} atrás</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={statusColors[order.status] || ''}>
                      {statusLabels[order.status]}
                    </Badge>
                    <span className="text-sm font-semibold text-slate-900 w-20 text-right">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Mais vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockStats.topProducts.map((product, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.qty} vendas</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        <Link href="/catalog/products">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingBag className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Cadastrar produto</p>
                <p className="text-xs text-muted-foreground">Adicionar ao catálogo</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/campaigns">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-pink-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Megaphone className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Nova campanha</p>
                <p className="text-xs text-muted-foreground">Disparar promoção</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-whatsapp/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageCircle className="h-5 w-5 text-whatsapp" />
              </div>
              <div>
                <p className="text-sm font-medium">WhatsApp</p>
                <p className="text-xs text-muted-foreground">Configurar bot</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financials">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Relatórios</p>
                <p className="text-xs text-muted-foreground">Ver financeiro</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </DashboardLayout>
  )
}
