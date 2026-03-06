"use client"

import React, { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RefreshCw, Save } from 'lucide-react'

type Overview = {
  tenants: {
    total: number
    active: number
    trial: number
    suspended: number
  }
  users: {
    total: number
    superAdmins: number
  }
  orders: {
    total: number
    today: number
    pendingPayment: number
  }
  revenue: {
    confirmedTotal: number
    confirmedMonth: number
  }
}

type TenantRow = {
  id: string
  name: string
  slug: string
  plan: 'FREE' | 'BASIC' | 'PRO' | 'PREMIUM'
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELLED'
  whatsappConnected: boolean
  usersCount: number
  customersCount: number
  ordersCount: number
  confirmedRevenue: number
  lastOrderAt: string | null
  createdAt: string
  owner: {
    id: string
    name: string
    email: string
  } | null
}

type TenantDraft = {
  plan: TenantRow['plan']
  status: TenantRow['status']
}

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const PLAN_OPTIONS: TenantRow['plan'][] = ['FREE', 'BASIC', 'PRO', 'PREMIUM']
const STATUS_OPTIONS: TenantRow['status'][] = ['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED']

const statusLabel: Record<TenantRow['status'], string> = {
  ACTIVE: 'Ativo',
  SUSPENDED: 'Suspenso',
  TRIAL: 'Trial',
  CANCELLED: 'Cancelado',
}

const statusClass: Record<TenantRow['status'], string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  SUSPENDED: 'bg-amber-100 text-amber-700',
  TRIAL: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR')
}

export default function AdminPage() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [drafts, setDrafts] = useState<Record<string, TenantDraft>>({})
  const [loading, setLoading] = useState(true)
  const [updatingTenantId, setUpdatingTenantId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const totals = useMemo(() => {
    if (!overview) return null
    return [
      { label: 'Tenants', value: overview.tenants.total },
      { label: 'Pedidos Hoje', value: overview.orders.today },
      { label: 'Receita Mês', value: currency.format(overview.revenue.confirmedMonth) },
      { label: 'Super Admins', value: overview.users.superAdmins },
    ]
  }, [overview])

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [overviewRes, tenantsRes] = await Promise.all([
        fetch('/api/admin/overview', { cache: 'no-store' }),
        fetch('/api/admin/tenants', { cache: 'no-store' }),
      ])

      const overviewJson = await overviewRes.json()
      const tenantsJson = await tenantsRes.json()

      if (!overviewRes.ok || !overviewJson.success) {
        throw new Error(overviewJson.error || 'Falha ao carregar overview')
      }
      if (!tenantsRes.ok || !tenantsJson.success) {
        throw new Error(tenantsJson.error || 'Falha ao carregar tenants')
      }

      setOverview(overviewJson.data)
      setTenants(tenantsJson.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  function getDraft(tenant: TenantRow): TenantDraft {
    return drafts[tenant.id] || { plan: tenant.plan, status: tenant.status }
  }

  function hasChanges(tenant: TenantRow) {
    const draft = getDraft(tenant)
    return draft.plan !== tenant.plan || draft.status !== tenant.status
  }

  function updateDraft(tenant: TenantRow, field: keyof TenantDraft, value: string) {
    setDrafts((prev) => ({
      ...prev,
      [tenant.id]: {
        ...getDraft(tenant),
        [field]: value,
      } as TenantDraft,
    }))
  }

  async function saveTenant(tenant: TenantRow) {
    const draft = getDraft(tenant)
    if (!hasChanges(tenant)) return

    setUpdatingTenantId(tenant.id)
    setError('')

    try {
      const response = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: draft.plan,
          status: draft.status,
        }),
      })

      const json = await response.json()
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Falha ao atualizar tenant')
      }

      setTenants((prev) =>
        prev.map((item) =>
          item.id === tenant.id
            ? { ...item, plan: draft.plan, status: draft.status }
            : item
        )
      )
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[tenant.id]
        return next
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao atualizar tenant'
      setError(message)
    } finally {
      setUpdatingTenantId(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Super Admin</h1>
            <p className="text-sm text-muted-foreground">Visão global e gestão de tenants</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Atualizar
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {totals?.map((item) => (
            <Card key={item.label}>
              <CardHeader className="pb-2">
                <CardDescription>{item.label}</CardDescription>
                <CardTitle className="text-2xl">{item.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        {overview && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Tenants</CardDescription>
                <CardTitle className="text-base">
                  Ativos: {overview.tenants.active} | Trial: {overview.tenants.trial}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Pedidos</CardDescription>
                <CardTitle className="text-base">
                  Total: {overview.orders.total} | Pendentes: {overview.orders.pendingPayment}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Receita Confirmada</CardDescription>
                <CardTitle className="text-base">
                  Total: {currency.format(overview.revenue.confirmedTotal)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Tenants</CardTitle>
            <CardDescription>Alterar plano e status de cada loja</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-4">Loja</th>
                    <th className="py-3 pr-4">Owner</th>
                    <th className="py-3 pr-4">Plano</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Usuários</th>
                    <th className="py-3 pr-4">Pedidos</th>
                    <th className="py-3 pr-4">Receita</th>
                    <th className="py-3 pr-4">Último Pedido</th>
                    <th className="py-3 pr-0">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => {
                    const draft = getDraft(tenant)
                    const changed = hasChanges(tenant)
                    const saving = updatingTenantId === tenant.id

                    return (
                      <tr key={tenant.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-slate-900">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                        </td>
                        <td className="py-3 pr-4">
                          {tenant.owner ? (
                            <>
                              <p className="font-medium text-slate-900">{tenant.owner.name}</p>
                              <p className="text-xs text-muted-foreground">{tenant.owner.email}</p>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem owner</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <select
                            value={draft.plan}
                            onChange={(event) => updateDraft(tenant, 'plan', event.target.value)}
                            className="h-9 rounded-md border px-2 text-sm"
                          >
                            {PLAN_OPTIONS.map((plan) => (
                              <option key={plan} value={plan}>
                                {plan}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <select
                              value={draft.status}
                              onChange={(event) => updateDraft(tenant, 'status', event.target.value)}
                              className="h-9 rounded-md border px-2 text-sm"
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {statusLabel[status]}
                                </option>
                              ))}
                            </select>
                            <span className={cn('rounded px-2 py-1 text-xs font-medium', statusClass[tenant.status])}>
                              {statusLabel[tenant.status]}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">{tenant.usersCount}</td>
                        <td className="py-3 pr-4">{tenant.ordersCount}</td>
                        <td className="py-3 pr-4">{currency.format(tenant.confirmedRevenue)}</td>
                        <td className="py-3 pr-4">{formatDate(tenant.lastOrderAt)}</td>
                        <td className="py-3 pr-0">
                          <Button
                            size="sm"
                            className="gap-2"
                            disabled={!changed || saving}
                            onClick={() => void saveTenant(tenant)}
                          >
                            <Save className="h-4 w-4" />
                            {saving ? 'Salvando...' : 'Salvar'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
