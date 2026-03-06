import { Queue, Worker, QueueScheduler } from 'bullmq'
import Redis from 'ioredis'

const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
})

// ============================================
// FILAS
// ============================================

// Fila de expiração de PIX
export const pixExpirationQueue = new Queue('pix-expiration', { connection })

// Fila de notificações WhatsApp
export const whatsappNotifyQueue = new Queue('whatsapp-notify', { connection })

// Fila de campanhas de marketing
export const campaignQueue = new Queue('campaigns', { connection })

// Fila de recorrência (gás, água, etc.)
export const recurrenceQueue = new Queue('recurrence', { connection })

// Fila de faturamento mensal
export const billingQueue = new Queue('billing', { connection })

// ============================================
// WORKERS
// ============================================

// Worker: Expirar pedidos com PIX não pago
export const pixExpirationWorker = new Worker(
  'pix-expiration',
  async (job) => {
    const { orderId } = job.data
    const { expireOrder } = await import('@/services/order.service')
    await expireOrder(orderId)
    console.log(`[PIX Expired] Order ${orderId}`)
  },
  { connection }
)

// Worker: Enviar notificação WhatsApp
export const whatsappNotifyWorker = new Worker(
  'whatsapp-notify',
  async (job) => {
    const { instanceName, to, message, imageBase64, caption } = job.data
    const { default: evolutionService } = await import('@/services/evolution.service')

    if (imageBase64) {
      await evolutionService.sendImageBase64(instanceName, to, imageBase64, caption)
    } else {
      await evolutionService.sendText(instanceName, to, message)
    }
  },
  {
    connection,
    limiter: {
      max: 20,       // Máximo 20 mensagens
      duration: 60000, // por minuto (anti-ban)
    },
  }
)

// Worker: Disparar campanhas
export const campaignWorker = new Worker(
  'campaigns',
  async (job) => {
    const { campaignId } = job.data
    const prisma = (await import('@/lib/prisma')).default
    const { default: evolutionService } = await import('@/services/evolution.service')

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        tenant: {
          include: {
            customers: true,
          },
        },
      },
    })

    if (!campaign || campaign.status === 'CANCELLED') return

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING' },
    })

    // Filtrar audiência
    let recipients = campaign.tenant.customers

    switch (campaign.audience) {
      case 'RECURRENT':
        recipients = recipients.filter(c => c.totalOrders >= 3)
        break
      case 'INACTIVE':
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        recipients = recipients.filter(c => !c.lastOrderAt || c.lastOrderAt < thirtyDaysAgo)
        break
      case 'NEW':
        recipients = recipients.filter(c => c.totalOrders <= 1)
        break
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { totalRecipients: recipients.length },
    })

    // Enviar mensagens (com rate limit via BullMQ)
    let sent = 0
    for (const customer of recipients) {
      try {
        if (campaign.imageUrl) {
          await evolutionService.sendImage(
            campaign.tenant.evolutionInstance!,
            customer.whatsappNumber,
            campaign.imageUrl,
            campaign.message
          )
        } else {
          await evolutionService.sendText(
            campaign.tenant.evolutionInstance!,
            customer.whatsappNumber,
            campaign.message
          )
        }
        sent++

        // Rate limit: 1 mensagem a cada 3 segundos
        await new Promise(resolve => setTimeout(resolve, 3000))
      } catch (err) {
        console.error(`[Campaign] Failed to send to ${customer.whatsappNumber}:`, err)
      }
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        totalSent: sent,
      },
    })

    console.log(`[Campaign] ${campaign.name}: ${sent}/${recipients.length} enviadas`)
  },
  { connection }
)

// Worker: Lembrete de recorrência (gás, água)
export const recurrenceWorker = new Worker(
  'recurrence',
  async (job) => {
    const prisma = (await import('@/lib/prisma')).default
    const { default: evolutionService } = await import('@/services/evolution.service')

    // Buscar clientes com recorrência ativa e próxima
    const now = new Date()
    const customers = await prisma.customer.findMany({
      where: {
        recurrenceActive: true,
        recurrenceNextAt: { lte: now },
      },
      include: {
        tenant: {
          include: { settings: true },
        },
      },
    })

    for (const customer of customers) {
      if (!customer.tenant.evolutionInstance) continue

      try {
        await evolutionService.sendText(
          customer.tenant.evolutionInstance,
          customer.whatsappNumber,
          `Olá${customer.name ? `, ${customer.name}` : ''}! 🔔\n\nJá faz um tempo desde seu último pedido. Precisa de algo?\n\nResponda *Sim* para fazer um novo pedido ou *Parar* para desativar este lembrete.`
        )

        // Agendar próximo lembrete
        const days = customer.tenant.settings?.recurrenceDays || 30
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            recurrenceNextAt: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
          },
        })
      } catch (err) {
        console.error(`[Recurrence] Failed for ${customer.whatsappNumber}:`, err)
      }
    }
  },
  { connection }
)

// ============================================
// HELPER: Agendar expiração de PIX
// ============================================

export async function schedulePixExpiration(orderId: string, expiresInMs: number) {
  await pixExpirationQueue.add(
    'expire',
    { orderId },
    {
      delay: expiresInMs,
      removeOnComplete: true,
      removeOnFail: 100,
      jobId: `pix-expire-${orderId}`, // Evita duplicatas
    }
  )
}

// ============================================
// HELPER: Agendar campanha
// ============================================

export async function scheduleCampaign(campaignId: string, scheduledAt: Date) {
  const delay = scheduledAt.getTime() - Date.now()
  await campaignQueue.add(
    'send',
    { campaignId },
    {
      delay: Math.max(delay, 0),
      removeOnComplete: true,
      jobId: `campaign-${campaignId}`,
    }
  )
}
