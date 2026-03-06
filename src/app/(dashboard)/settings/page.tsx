"use client"

import React, { useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/hooks/use-store'
import {
  MessageCircle, Wifi, WifiOff, QrCode, RefreshCw,
  Clock, Truck, DollarSign, Bell, Save, Loader2, Settings2
} from 'lucide-react'

export default function SettingsPage() {
  const { tenant } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'delivery' | 'messages' | 'advanced'>('whatsapp')

  const tabs = [
    { id: 'whatsapp' as const, label: 'WhatsApp', icon: MessageCircle },
    { id: 'delivery' as const, label: 'Entrega', icon: Truck },
    { id: 'messages' as const, label: 'Mensagens', icon: Bell },
    { id: 'advanced' as const, label: 'Avançado', icon: Settings2 },
  ]

  return (
    <DashboardLayout>
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Configurações</h1>

        {/* Tab navigation */}
        <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center",
                activeTab === tab.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* WhatsApp Tab */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            {/* Connection Status */}
            <Card className={cn(
              "border-2",
              tenant?.whatsappConnected ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"
            )}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-14 w-14 rounded-2xl flex items-center justify-center",
                    tenant?.whatsappConnected
                      ? "bg-emerald-100 notification-pulse"
                      : "bg-red-100"
                  )}>
                    {tenant?.whatsappConnected
                      ? <Wifi className="h-7 w-7 text-emerald-600" />
                      : <WifiOff className="h-7 w-7 text-red-500" />
                    }
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">
                      {tenant?.whatsappConnected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {tenant?.whatsappConnected
                        ? `Número: ${tenant?.whatsappNumber || 'N/A'}`
                        : 'Escaneie o QR Code para conectar seu WhatsApp Business'
                      }
                    </p>
                  </div>
                  {tenant?.whatsappConnected ? (
                    <Button variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
                      Desconectar
                    </Button>
                  ) : (
                    <Button variant="whatsapp" className="gap-2">
                      <QrCode className="h-4 w-4" /> Conectar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* QR Code area (when disconnected) */}
            {!tenant?.whatsappConnected && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 flex flex-col items-center">
                  <div className="h-64 w-64 rounded-2xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center mb-4">
                    <div className="text-center">
                      <QrCode className="h-16 w-16 text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">QR Code aparecerá aqui</p>
                    </div>
                  </div>
                  <Button variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Gerar novo QR Code
                  </Button>
                  <p className="text-xs text-muted-foreground mt-4 text-center max-w-sm">
                    Abra o WhatsApp no seu celular &gt; Menu &gt; Dispositivos conectados &gt; Conectar dispositivo &gt; Escaneie o QR Code
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Delivery Tab */}
        {activeTab === 'delivery' && (
          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Configurações de Entrega</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div>
                    <Label>Entrega habilitada</Label>
                    <p className="text-xs text-muted-foreground">Permitir pedidos com entrega</p>
                  </div>
                  <ToggleSwitch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div>
                    <Label>Retirada no local</Label>
                    <p className="text-xs text-muted-foreground">Permitir retirada no estabelecimento</p>
                  </div>
                  <ToggleSwitch defaultChecked />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Taxa de entrega fixa</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                      <Input type="number" step="0.01" defaultValue="5.00" className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tempo estimado (min)</Label>
                    <Input type="number" defaultValue="40" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pedido mínimo</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                      <Input type="number" step="0.01" defaultValue="0" className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Raio máximo (km)</Label>
                    <Input type="number" step="0.5" defaultValue="10" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Horário de Funcionamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((day, i) => (
                    <div key={day} className="flex items-center gap-3 py-2">
                      <span className="text-sm font-medium w-24">{day}</span>
                      <Input type="time" defaultValue={i < 6 ? "08:00" : "09:00"} className="w-28 text-sm" />
                      <span className="text-xs text-muted-foreground">até</span>
                      <Input type="time" defaultValue={i < 5 ? "22:00" : i === 5 ? "23:00" : "18:00"} className="w-28 text-sm" />
                      <ToggleSwitch defaultChecked={i < 6} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Mensagens Automáticas</CardTitle>
              <CardDescription>Personalize as mensagens enviadas pelo bot</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {[
                { label: 'Boas-vindas', key: 'welcome', default: 'Olá! Bem-vindo ao nosso estabelecimento. O que deseja pedir?' },
                { label: 'Estabelecimento fechado', key: 'closed', default: 'Estamos fechados no momento. Nosso horário de funcionamento é:' },
                { label: 'Pedido confirmado', key: 'confirmed', default: '✅ Pedido confirmado! Estamos preparando.' },
                { label: 'Saiu para entrega', key: 'delivery', default: '🛵 Seu pedido saiu para entrega!' },
                { label: 'Pedido entregue', key: 'completed', default: '✅ Pedido entregue! Obrigado pela preferência.' },
                { label: 'PIX expirado', key: 'expired', default: '⏰ Seu pagamento expirou. Deseja fazer um novo pedido?' },
              ].map(msg => (
                <div key={msg.key} className="space-y-2">
                  <Label>{msg.label}</Label>
                  <textarea
                    defaultValue={msg.default}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[70px] resize-none"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Pedidos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div>
                    <Label>Aceitar automaticamente após pagamento</Label>
                    <p className="text-xs text-muted-foreground">Mover para "Recebido" quando PIX confirmar</p>
                  </div>
                  <ToggleSwitch defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label>Expiração do PIX (minutos)</Label>
                  <Input type="number" defaultValue="15" className="max-w-[120px]" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div>
                    <Label>Recorrência automática</Label>
                    <p className="text-xs text-muted-foreground">Lembrar clientes de pedir novamente (ideal para gás/água)</p>
                  </div>
                  <ToggleSwitch />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Notificações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div>
                    <Label>Som de notificação</Label>
                    <p className="text-xs text-muted-foreground">Tocar som ao receber novo pedido</p>
                  </div>
                  <ToggleSwitch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div>
                    <Label>Push notifications</Label>
                    <p className="text-xs text-muted-foreground">Receber notificação mesmo com tela fechada</p>
                  </div>
                  <ToggleSwitch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Save button */}
        <div className="mt-6 flex justify-end">
          <Button variant="whatsapp" className="gap-2 px-8" onClick={async () => {
            setSaving(true)
            await new Promise(r => setTimeout(r, 1000))
            setSaving(false)
          }}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar configurações
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}

// Simple toggle switch component
function ToggleSwitch({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked)
  return (
    <button
      onClick={() => setChecked(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors shrink-0",
        checked ? "bg-whatsapp" : "bg-slate-300"
      )}
    >
      <span className={cn(
        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
        checked ? "translate-x-5" : "translate-x-0.5"
      )} />
    </button>
  )
}
