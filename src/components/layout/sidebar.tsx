"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore, useUIStore } from '@/hooks/use-store'
import {
  LayoutDashboard,
  Columns3,
  ShoppingBag,
  Tag,
  Users,
  Megaphone,
  Settings,
  DollarSign,
  LogOut,
  ChevronLeft,
  MessageCircle,
  Wifi,
  WifiOff,
  Menu,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Pedidos', icon: Columns3, badge: true },
  { href: '/catalog/products', label: 'Produtos', icon: ShoppingBag },
  { href: '/catalog/categories', label: 'Categorias', icon: Tag },
  { href: '/customers', label: 'Clientes', icon: Users },
  { href: '/campaigns', label: 'Campanhas', icon: Megaphone },
  { href: '/financials', label: 'Financeiro', icon: DollarSign },
  { href: '/settings', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { tenant, logout } = useAuthStore()
  const { sidebarOpen, sidebarCollapsed, toggleSidebar, toggleSidebarCollapse } = useUIStore()

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 text-white transition-all duration-300",
        sidebarCollapsed ? "w-[68px]" : "w-64",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-700/50">
          {!sidebarCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-whatsapp">
                <MessageCircle className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                Zap<span className="text-whatsapp">Commerce</span>
              </span>
            </Link>
          )}
          {sidebarCollapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-whatsapp mx-auto">
              <MessageCircle className="h-4.5 w-4.5 text-white" />
            </div>
          )}
          <button
            onClick={toggleSidebarCollapse}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md hover:bg-slate-700/50 transition-colors"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", sidebarCollapsed && "rotate-180")} />
          </button>
          <button onClick={toggleSidebar} className="lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* WhatsApp Status */}
        <div className={cn(
          "mx-3 mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
          tenant?.whatsappConnected
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-red-500/10 text-red-400"
        )}>
          {tenant?.whatsappConnected
            ? <><Wifi className="h-3.5 w-3.5 shrink-0" />{!sidebarCollapsed && "WhatsApp Conectado"}</>
            : <><WifiOff className="h-3.5 w-3.5 shrink-0" />{!sidebarCollapsed && "WhatsApp Desconectado"}</>
          }
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 mt-4 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => sidebarOpen && toggleSidebar()}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-whatsapp/15 text-whatsapp"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Tenant Info + Logout */}
        <div className="border-t border-slate-700/50 p-3">
          {!sidebarCollapsed && tenant && (
            <div className="mb-3 rounded-lg bg-slate-800/50 px-3 py-2">
              <p className="text-sm font-medium truncate">{tenant.name}</p>
              <p className="text-xs text-slate-400 truncate">{tenant.slug}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && "Sair"}
          </button>
        </div>
      </aside>
    </>
  )
}

export function MobileMenuButton() {
  const { toggleSidebar } = useUIStore()
  return (
    <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar}>
      <Menu className="h-5 w-5" />
    </Button>
  )
}
