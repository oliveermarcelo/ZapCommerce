import { PaymentStatus, TenantStatus } from '@prisma/client'
import { apiSuccess, withErrorHandler } from '@/lib/api-response'
import { requireSuperAdmin } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const GET = withErrorHandler(async () => {
  await requireSuperAdmin()

  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalTenants,
    activeTenants,
    trialTenants,
    suspendedTenants,
    totalUsers,
    superAdminUsers,
    totalOrders,
    todayOrders,
    pendingOrders,
    totalRevenue,
    monthlyRevenue,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: TenantStatus.ACTIVE } }),
    prisma.tenant.count({ where: { status: TenantStatus.TRIAL } }),
    prisma.tenant.count({ where: { status: TenantStatus.SUSPENDED } }),
    prisma.user.count(),
    prisma.user.count({ where: { isSuperAdmin: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.order.count({ where: { paymentStatus: PaymentStatus.PENDING } }),
    prisma.order.aggregate({
      where: { paymentStatus: PaymentStatus.CONFIRMED },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: {
        paymentStatus: PaymentStatus.CONFIRMED,
        createdAt: { gte: startOfMonth },
      },
      _sum: { total: true },
    }),
  ])

  return apiSuccess({
    tenants: {
      total: totalTenants,
      active: activeTenants,
      trial: trialTenants,
      suspended: suspendedTenants,
    },
    users: {
      total: totalUsers,
      superAdmins: superAdminUsers,
    },
    orders: {
      total: totalOrders,
      today: todayOrders,
      pendingPayment: pendingOrders,
    },
    revenue: {
      confirmedTotal: totalRevenue._sum.total || 0,
      confirmedMonth: monthlyRevenue._sum.total || 0,
    },
  })
})
