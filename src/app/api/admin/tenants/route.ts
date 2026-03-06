import { PaymentStatus } from '@prisma/client'
import { apiSuccess, withErrorHandler } from '@/lib/api-response'
import { requireSuperAdmin } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const GET = withErrorHandler(async () => {
  await requireSuperAdmin()

  const [tenants, revenueByTenant, lastOrderByTenant] = await Promise.all([
    prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
            orders: true,
          },
        },
        users: {
          where: { isActive: true, role: 'OWNER' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          take: 1,
        },
      },
      take: 200,
    }),
    prisma.order.groupBy({
      by: ['tenantId'],
      where: { paymentStatus: PaymentStatus.CONFIRMED },
      _sum: { total: true },
    }),
    prisma.order.groupBy({
      by: ['tenantId'],
      _max: { createdAt: true },
    }),
  ])

  const revenueMap = new Map<string, number>(
    revenueByTenant.map((row) => [row.tenantId, row._sum.total || 0])
  )

  const lastOrderMap = new Map<string, Date | null>(
    lastOrderByTenant.map((row) => [row.tenantId, row._max.createdAt || null])
  )

  const data = tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    plan: tenant.plan,
    status: tenant.status,
    whatsappConnected: tenant.whatsappConnected,
    usersCount: tenant._count.users,
    customersCount: tenant._count.customers,
    ordersCount: tenant._count.orders,
    confirmedRevenue: revenueMap.get(tenant.id) || 0,
    lastOrderAt: lastOrderMap.get(tenant.id) || null,
    createdAt: tenant.createdAt,
    owner: tenant.users[0]?.user || null,
  }))

  return apiSuccess(data)
})
