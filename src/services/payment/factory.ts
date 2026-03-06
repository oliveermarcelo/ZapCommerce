import type { IPaymentProvider, PaymentGateway } from './provider.interface'
import { AsaasProvider } from './asaas.provider'
import { MercadoPagoProvider } from './mercadopago.provider'

/**
 * ============================================
 * Payment Provider Factory
 * ============================================
 * 
 * Resolve o gateway correto por tenant.
 * O lojista escolhe nas configurações se usa Asaas ou Mercado Pago.
 * 
 * Diferenças chave:
 * 
 * ASAAS:
 *   - Subconta criada via API (automático)
 *   - Split via walletId no payload da cobrança
 *   - Lojista não precisa ter conta Asaas prévia
 *   - Ideal p/ lojistas pequenos que não têm gateway
 * 
 * MERCADO PAGO:
 *   - Onboarding via OAuth (lojista conecta sua conta MP)
 *   - Split via application_fee no pagamento
 *   - Lojista já pode ter conta MP (vantagem: base grande)
 *   - Ideal p/ lojistas que já usam MP
 */

const providerCache = new Map<PaymentGateway, IPaymentProvider>()

export function getPaymentProvider(gateway: PaymentGateway): IPaymentProvider {
  if (!providerCache.has(gateway)) {
    switch (gateway) {
      case 'asaas':
        providerCache.set(gateway, new AsaasProvider())
        break
      case 'mercadopago':
        providerCache.set(gateway, new MercadoPagoProvider())
        break
      default:
        throw new Error(`Gateway de pagamento desconhecido: ${gateway}`)
    }
  }
  return providerCache.get(gateway)!
}

/** Resolve o provider + configuração para um tenant */
export async function getPaymentProviderForTenant(tenantId: string): Promise<{
  provider: IPaymentProvider
  subAccountId: string
  platformWalletId: string
  platformFeePercent: number
}> {
  const prisma = (await import('@/lib/prisma')).default

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      paymentGateway: true,
      gatewaySubAccountId: true,
      platformFeePercent: true,
      // Asaas
      asaasWalletId: true,
      // Mercado Pago
      mpUserId: true,
      mpAccessToken: true,
    },
  })

  if (!tenant) throw new Error('Tenant não encontrado')

  const gateway = (tenant.paymentGateway || 'asaas') as PaymentGateway
  const provider = getPaymentProvider(gateway)

  const subAccountId = gateway === 'mercadopago'
    ? tenant.mpUserId || ''
    : tenant.gatewaySubAccountId || tenant.asaasWalletId || ''

  if (!subAccountId) {
    throw new Error(`Gateway ${gateway} não configurado para este tenant. Configure em Configurações > Pagamento.`)
  }

  // walletId da conta principal do SaaS
  const platformWalletId = gateway === 'mercadopago'
    ? process.env.MP_COLLECTOR_ID || ''
    : process.env.ASAAS_WALLET_ID || ''

  return {
    provider,
    subAccountId,
    platformWalletId,
    platformFeePercent: tenant.platformFeePercent,
  }
}

// ============================================
// ATALHOS DE ALTO NÍVEL
// ============================================

/** Gerar PIX para um pedido, com split automático */
export async function generatePixForOrder(orderId: string) {
  const prisma = (await import('@/lib/prisma')).default

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tenant: true, customer: true },
  })
  if (!order) throw new Error('Pedido não encontrado')

  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId: order.tenantId },
  })

  const { provider, subAccountId, platformWalletId, platformFeePercent } =
    await getPaymentProviderForTenant(order.tenantId)

  const expirationMinutes = settings?.pixExpirationMinutes || 15

  const result = await provider.createPixCharge({
    subAccountId,
    amount: order.total,
    description: `Pedido ${order.displayNumber} - ${order.tenant.name}`,
    externalReference: order.id,
    payer: {
      name: order.customer.name || order.customer.pushName || undefined,
      phone: order.customer.whatsappNumber,
    },
    expirationMinutes,
    split: {
      platformWalletId,
      type: 'percentage',
      value: platformFeePercent,
    },
  })

  // Salvar dados no pedido
  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentId: result.chargeId,
      pixQrCode: result.qrCodeBase64,
      pixCopyPaste: result.qrCodeText,
      pixExpiresAt: result.expiresAt,
    },
  })

  // Agendar expiração
  const { schedulePixExpiration } = await import('@/lib/queue')
  await schedulePixExpiration(orderId, expirationMinutes * 60 * 1000)

  return result
}

/** Processar webhook de pagamento (Asaas ou MP) */
export async function processPaymentWebhook(
  payload: any,
  headers?: Record<string, string>
) {
  const prisma = (await import('@/lib/prisma')).default

  // Detectar qual gateway enviou
  let gateway: PaymentGateway
  if (payload.event && payload.payment) {
    gateway = 'asaas'
  } else if (payload.action || payload.type === 'payment') {
    gateway = 'mercadopago'
  } else {
    console.warn('[Payment Webhook] Gateway não reconhecido')
    return
  }

  const provider = getPaymentProvider(gateway)

  // Validar assinatura
  if (!provider.isWebhookValid(payload, headers)) {
    console.warn(`[Payment Webhook] Assinatura inválida (${gateway})`)
    return
  }

  // Log
  await prisma.webhookLog.create({
    data: { source: `payment_${gateway}`, event: payload.event || payload.action || 'unknown', payload },
  })

  // Parse
  let webhookData = provider.parseWebhook(payload, headers)
  if (!webhookData) return

  // Se MP enviou apenas o ID, buscar dados completos
  if (gateway === 'mercadopago' && !webhookData.externalReference && webhookData.chargeId) {
    try {
      const status = await provider.getChargeStatus(webhookData.chargeId)
      const { data: fullPayment } = await (await import('axios')).default.get(
        `https://api.mercadopago.com/v1/payments/${webhookData.chargeId}`,
        { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
      )
      webhookData = {
        ...webhookData,
        event: status.status === 'confirmed' ? 'payment_confirmed' : webhookData.event,
        externalReference: fullPayment.external_reference,
        amount: fullPayment.transaction_amount,
        paidAt: status.paidAt,
      }
    } catch (err) {
      console.error('[Payment Webhook] Erro ao buscar pagamento MP:', err)
    }
  }

  // Processar evento
  switch (webhookData.event) {
    case 'payment_confirmed': {
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            { paymentId: webhookData.chargeId },
            { id: webhookData.externalReference || '' },
          ],
        },
      })
      if (order && order.paymentStatus !== 'CONFIRMED') {
        const { confirmPayment } = await import('@/services/order.service')
        await confirmPayment(order.id, webhookData.chargeId)
      }
      break
    }

    case 'payment_expired': {
      const order = await prisma.order.findFirst({
        where: { paymentId: webhookData.chargeId },
      })
      if (order && order.status === 'AWAITING_PAYMENT') {
        const { expireOrder } = await import('@/services/order.service')
        await expireOrder(order.id)
      }
      break
    }

    case 'payment_refunded': {
      const order = await prisma.order.findFirst({
        where: { paymentId: webhookData.chargeId },
      })
      if (order) {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'REFUNDED', status: 'CANCELLED', cancelReason: 'Pagamento estornado', cancelledAt: new Date() },
        })
      }
      break
    }
  }
}

/** Gerar fatura mensal de taxas pendentes */
export async function generateMonthlyInvoice(tenantId: string, month: number, year: number) {
  const prisma = (await import('@/lib/prisma')).default

  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)

  // Pedidos pagos na entrega (taxa pendente)
  const deliveryOrders = await prisma.order.findMany({
    where: {
      tenantId, status: 'DELIVERED',
      paymentMethod: { in: ['ON_DELIVERY_CASH', 'ON_DELIVERY_CARD'] },
      createdAt: { gte: startDate, lte: endDate },
    },
  })

  const totalPendingFees = deliveryOrders.reduce((s, o) => s + o.platformFee, 0)

  // Pedidos PIX (taxa já retida)
  const pixOrders = await prisma.order.findMany({
    where: {
      tenantId, status: 'DELIVERED', paymentMethod: 'PIX',
      createdAt: { gte: startDate, lte: endDate },
    },
  })

  const totalPixFees = pixOrders.reduce((s, o) => s + o.platformFee, 0)
  const totalRevenue = [...deliveryOrders, ...pixOrders].reduce((s, o) => s + o.total, 0)

  const invoice = await prisma.monthlyInvoice.upsert({
    where: { tenantId_month_year: { tenantId, month, year } },
    update: { totalOrders: deliveryOrders.length + pixOrders.length, totalRevenue, totalPixFees, totalPendingFees },
    create: { tenantId, month, year, totalOrders: deliveryOrders.length + pixOrders.length, totalRevenue, totalPixFees, totalPendingFees },
  })

  // Se tem taxas pendentes, gerar cobrança pro lojista
  if (totalPendingFees > 0) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) return invoice

    const gateway = (tenant.paymentGateway || 'asaas') as PaymentGateway
    const provider = getPaymentProvider(gateway)

    try {
      const result = await provider.createInvoice({
        amount: totalPendingFees,
        description: `Taxas ZapCommerce - ${String(month).padStart(2, '0')}/${year}`,
        externalReference: invoice.id,
        dueDate: `${year}-${String(month + 1 > 12 ? 1 : month + 1).padStart(2, '0')}-10`,
        payer: { name: tenant.name, email: tenant.email, document: tenant.document || '' },
      })

      await prisma.monthlyInvoice.update({
        where: { id: invoice.id },
        data: { invoicePixCode: result.pixCopyPaste },
      })
    } catch (err) {
      console.error('[Monthly Invoice] Erro ao gerar cobrança:', err)
    }
  }

  return invoice
}
