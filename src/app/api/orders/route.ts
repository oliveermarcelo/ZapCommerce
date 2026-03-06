import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireTenant } from '@/lib/auth'
import { apiSuccess, apiError, apiNotFound, withErrorHandler } from '@/lib/api-response'
import { updateOrderStatus } from '@/services/order.service'
import { z } from 'zod'

/**
 * GET /api/orders
 * Lista pedidos do tenant (com filtros)
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await requireTenant()
  const { searchParams } = new URL(req.url)

  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const search = searchParams.get('search')

  const where: any = { tenantId: session.tenantId }

  if (status && status !== 'all') {
    where.status = status
  }

  if (search) {
    where.OR = [
      { displayNumber: { contains: search } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { customer: { whatsappNumber: { contains: search } } },
    ]
  }

  // Excluir expirados e cancelados por padrão
  if (!status) {
    where.status = { notIn: ['EXPIRED', 'CANCELLED'] }
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, pushName: true, whatsappNumber: true },
        },
        items: {
          include: { options: true },
        },
        kanbanColumn: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ])

  return apiSuccess({
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

/**
 * PATCH /api/orders
 * Atualizar status do pedido (mover no Kanban)
 */
const updateSchema = z.object({
  orderId: z.string(),
  status: z.enum([
    'RECEIVED', 'PREPARING', 'READY',
    'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED',
  ]),
  kanbanColumnId: z.string().optional(),
  cancelReason: z.string().optional(),
})

export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const session = await requireTenant()
  const body = await req.json()
  const data = updateSchema.parse(body)

  // Verificar se o pedido pertence ao tenant
  const order = await prisma.order.findFirst({
    where: { id: data.orderId, tenantId: session.tenantId },
  })

  if (!order) return apiNotFound('Pedido não encontrado')

  // Se está movendo para coluna específica do Kanban
  if (data.kanbanColumnId) {
    const column = await prisma.kanbanColumn.findFirst({
      where: { id: data.kanbanColumnId, tenantId: session.tenantId },
    })

    if (column?.mappedStatus) {
      data.status = column.mappedStatus as any
    }
  }

  const updated = await updateOrderStatus(data.orderId, data.status as any, {
    cancelReason: data.cancelReason,
    sendWhatsAppNotification: true,
  })

  return apiSuccess(updated)
})
