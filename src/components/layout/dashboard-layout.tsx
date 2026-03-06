"use client"

import React, { useEffect } from 'react'
import { Sidebar, MobileMenuButton } from '@/components/layout/sidebar'
import { useAuthStore, useUIStore } from '@/hooks/use-store'
import { cn } from '@/lib/utils'
import { Bell, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUIStore()
  const { user, tenant } = useAuthStore()

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      {/* Main content */}
      <div className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "lg:pl-[68px]" : "lg:pl-64"
      )}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/80 backdrop-blur-md px-4 md:px-6">
          <div className="flex items-center gap-3">
            <MobileMenuButton />
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pedidos, clientes..."
                className="w-72 pl-9 bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                3
              </span>
            </Button>

            <div className="flex items-center gap-2 pl-3 border-l">
              <div className="h-8 w-8 rounded-full bg-whatsapp/10 flex items-center justify-center">
                <span className="text-sm font-bold text-whatsapp">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{tenant?.name}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
