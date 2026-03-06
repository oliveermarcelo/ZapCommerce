import prisma from '@/lib/prisma'
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client'
import { formatCurrency, formatOrderNumber } from '@/lib/utils'
import evolutionService from './evolution.service'

interface SessionData {
  tenantId: string
  customerId: string
  cart: Array<{
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    options: Array<{
      optionId: string
      optionName: string
      groupName: string
      price: number
    }>
  }>
  deliveryType?: 'DELIVERY' | 'PICKUP'
  deliveryAddress?: string
  paymentMethod?: string
}

// ============================================
// CRIAR PEDIDO A PARTIR DA SESSÃO
// ============================================

export async function createOrderFromSession(session: SessionData) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    include: { settings: true },
  })

  if (!tenant) throw new Error('Tenant não encontrado')

  // Calcular totais
  const subtotal = session.cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity, 0
  )
  const deliveryFee = session.deliveryType === 'DELIVERY'
    ? (tenant.settings?.deliveryFee || 0)
    : 0
  const total = subtotal + deliveryFee

  // Calcular split financeiro
  const platformFee = total * (tenant.platformFeePercent / 100)
  const tenantReceives = total - platformFee

  // Gerar número sequencial do pedido
  const lastOrder = await prisma.order.findFirst({
    where: { tenantId: session.tenantId },
    orderBy: { orderNumber: 'desc' },
  })
  const orderNumber = (lastOrder?.orderNumber || 0) + 1

  // Determinar status inicial
  const paymentMethod = session.paymentMethod as PaymentMethod
  const isPayOnDelivery = paymentMethod !== 'PIX'

  const initialStatus: OrderStatus = isPayOnDelivery
    ? 'RECEIVED'           // Pagamento na entrega → já vai pra recebido
    : 'AWAITING_PAYMENT'   // PIX → aguarda pagamento

  // Buscar coluna Kanban correspondente
  const kanbanColumn = await prisma.kanbanColumn.findFirst({
    where: {
      tenantId: session.tenantId,
      mappedStatus: initialStatus,
    },
    orderBy: { position: 'asc' },
  })

  // Criar pedido com itens
  const order = await prisma.order.create({
    data: {
      tenantId: session.tenantId,
      customerId: session.customerId,
      orderNumber,
      displayNumber: formatOrderNumber(orderNumber),
      status: initialStatus,
      kanbanColumnId: kanbanColumn?.id,

      subtotal,
      deliveryFee,
      total,
      discount: 0,

      deliveryType: session.deliveryType === 'PICKUP' ? 'PICKUP' : 'DELIVERY',
      deliveryAddress: session.deliveryAddress,

      paymentMethod,
      paymentStatus: isPayOnDelivery ? 'PENDING' : 'PENDING',

      platformFee,
      tenantReceives,

      receivedAt: isPayOnDelivery ? new Date() : null,

      items: {
        create: session.cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
          options: {
            create: item.options.map(opt => ({
              optionId: opt.optionId,
              optionName: opt.optionName,
              groupName: opt.groupName,
              price: opt.price,
            })),
          },
        })),
      },
    },
    include: {
      items: { include: { options: true } },
      customer: true,
    },
  })

  // Atualizar métricas do cliente
  if (isPayOnDelivery) {
    await prisma.customer.update({
      where: { id: session.customerId },
      data: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: total },
        lastOrderAt: new Date(),
      },
    })
  }

  // TODO: Emitir evento WebSocket para o Kanban atualizar em tempo real
  // io.to(`tenant_${session.tenantId}`).emit('new_order', order)

  return order
}

// ============================================
// ATUALIZAR STATUS (Manual ou Automático)
// ============================================

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  options?: {
    cancelReason?: string
    sendWhatsAppNotification?: boolean
  }
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      tenant: { include: { settings: true } },
      customer: true,
    },
  })

  if (!order) throw new Error('Pedido não encontrado')

  // Buscar coluna Kanban
  const kanbanColumn = await prisma.kanbanColumn.findFirst({
    where: {
      tenantId: order.tenantId,
      mappedStatus: newStatus,
    },
  })

  // Timestamps por status
  const timestamps: Record<string, any> = {}
  switch (newStatus) {
    case 'RECEIVED': timestamps.receivedAt = new Date(); break
    case 'PREPARING': timestamps.preparingAt = new Date(); break
    case 'READY': timestamps.readyAt = new Date(); break
    case 'OUT_FOR_DELIVERY': timestamps.outForDeliveryAt = new Date(); break
    case 'DELIVERED': timestamps.deliveredAt = new Date(); break
    case 'CANCELLED':
      timestamps.cancelledAt = new Date()
      timestamps.cancelReason = options?.cancelReason
      break
  }

  // Atualizar pedido
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: newStatus,
      kanbanColumnId: kanbanColumn?.id,
      ...timestamps,
    },
  })

  // Enviar notificação WhatsApp automática
  const shouldNotify = options?.sendWhatsAppNotification !== false
  if (shouldNotify && order.tenant.evolutionInstance && order.customer.whatsappNumber) {
    const message = getStatusMessage(newStatus, order.tenant.settings, order.displayNumber)
    if (message) {
      try {
        await evolutionService.sendText(
          order.tenant.evolutionInstance,
          order.customer.whatsappNumber,
          message
        )
      } catch (err) {
        console.error('[WhatsApp Notify Error]', err)
      }
    }
  }

  // TODO: Emitir WebSocket
  // io.to(`tenant_${order.tenantId}`).emit('order_updated', updatedOrder)

  return updatedOrder
}

// ============================================
// CONFIRMAR PAGAMENTO (chamado pelo webhook do gateway)
// ============================================

export async function confirmPayment(orderId: string, paymentId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tenant: { include: { settings: true } } },
  })

  if (!order) throw new Error('Pedido não encontrado')
  if (order.paymentStatus === 'CONFIRMED') return order // Já confirmado

  // Atualizar pagamento
  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: 'CONFIRMED',
      paymentId,
      paidAt: new Date(),
    },
  })

  // Mover automaticamente para RECEIVED no Kanban
  const updatedOrder = await updateOrderStatus(orderId, 'RECEIVED', {
    sendWhatsAppNotification: true,
  })

  // Atualizar métricas do cliente
  await prisma.customer.update({
    where: { id: order.customerId },
    data: {
      totalOrders: { increment: 1 },
      totalSpent: { increment: order.total },
      lastOrderAt: new Date(),
    },
  })

  return updatedOrder
}

// ============================================
// EXPIRAR PEDIDO (PIX não pago)
// ============================================

export async function expireOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      tenant: { include: { settings: true } },
      customer: true,
    },
  })

  if (!order) return
  if (order.status !== 'AWAITING_PAYMENT') return

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'EXPIRED',
      paymentStatus: 'EXPIRED',
    },
  })

  // Notificar cliente
  if (order.tenant.evolutionInstance && order.customer.whatsappNumber) {
    const msg = order.tenant.settings?.expiredMessage ||
      '⏰ O prazo para pagamento expirou. Deseja fazer um novo pedido? Basta enviar "Oi"!'
    try {
      await evolutionService.sendText(
        order.tenant.evolutionInstance,
        order.customer.whatsappNumber,
        msg
      )
    } catch (err) {
      console.error('[WhatsApp Expire Notify Error]', err)
    }
  }
}

// ============================================
// HELPERS
// ============================================

function getStatusMessage(
  status: OrderStatus,
  settings: any,
  displayNumber: string
): string | null {
  switch (status) {
    case 'RECEIVED':
      return settings?.orderConfirmMessage || `✅ Pedido ${displayNumber} confirmado!`
    case 'PREPARING':
      return `👨‍🍳 Pedido ${displayNumber} está sendo preparado!`
    case 'READY':
      return `✅ Pedido ${displayNumber} está pronto!`
    case 'OUT_FOR_DELIVERY':
      return settings?.outForDeliveryMsg || `🛵 Pedido ${displayNumber} saiu para entrega!`
    case 'DELIVERED':
      return settings?.completedMessage || `✅ Pedido ${displayNumber} entregue! Obrigado! 🙏`
    case 'CANCELLED':
      return `❌ Pedido ${displayNumber} foi cancelado.`
    default:
      return null
  }
}
