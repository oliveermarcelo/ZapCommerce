import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getProvider, verifyMetaWebhook } from '@/services/whatsapp'
import type { WhatsAppProvider } from '@/services/whatsapp'
import { handleIncomingMessage } from '@/services/conversation.service'

/**
 * GET /api/webhooks/evolution
 * Verificação do webhook (necessário para Meta Cloud API)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  // Meta Cloud API webhook verification
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode && token) {
    const result = verifyMetaWebhook(mode, token, challenge)
    if (result) {
      return new NextResponse(result, { status: 200 })
    }
    return new NextResponse('Forbidden', { status: 403 })
  }

  return new NextResponse('OK', { status: 200 })
}

/**
 * POST /api/webhooks/evolution
 * Recebe webhooks de AMBOS os providers:
 *   - Evolution API (event-based)
 *   - Meta Cloud API (object: whatsapp_business_account)
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()

    // ============================================
    // DETECTAR QUAL PROVIDER ENVIOU O WEBHOOK
    // ============================================
    let providerType: WhatsAppProvider
    let tenantId: string | null = null

    if (payload.object === 'whatsapp_business_account') {
      // === META CLOUD API ===
      providerType = 'meta_cloud'

      // Validar assinatura HMAC
      const signature = req.headers.get('x-hub-signature-256')
      const provider = getProvider('meta_cloud')
      if (!provider.isWebhookValid(payload, signature || undefined)) {
        console.warn('[Webhook] Assinatura Meta inválida')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }

      // Identificar tenant pelo Phone Number ID
      const phoneNumberId = payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id
      if (phoneNumberId) {
        const tenant = await prisma.tenant.findFirst({
          where: { metaPhoneNumberId: phoneNumberId },
        })
        tenantId = tenant?.id || null
      }
    } else if (payload.event || payload.instance) {
      // === EVOLUTION API ===
      providerType = 'evolution'

      // Identificar tenant pela instância
      const instanceName = payload.instance || ''
      if (instanceName) {
        const tenant = await prisma.tenant.findFirst({
          where: { evolutionInstance: instanceName },
        })
        tenantId = tenant?.id || null
      }
    } else {
      console.warn('[Webhook] Provider não reconhecido:', JSON.stringify(payload).slice(0, 200))
      return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
    }

    // ============================================
    // LOG DO WEBHOOK
    // ============================================
    await prisma.webhookLog.create({
      data: {
        tenantId,
        source: providerType,
        event: providerType === 'meta_cloud'
          ? payload.entry?.[0]?.changes?.[0]?.field || 'messages'
          : payload.event || 'unknown',
        payload,
      },
    })

    // ============================================
    // PROCESSAR WEBHOOK USANDO O PROVIDER CORRETO
    // ============================================
    const provider = getProvider(providerType)

    // --- Mensagem recebida ---
    const message = provider.parseMessageWebhook(payload)
    if (message && tenantId) {
      // Atualizar push name do contato
      if (message.fromName) {
        await prisma.customer.updateMany({
          where: { tenantId, whatsappNumber: message.from },
          data: {
            pushName: message.fromName,
            name: message.fromName,
          },
        })
      }

      // Processar no motor de conversação
      await handleIncomingMessage(
        tenantId,
        message.from,
        message.text || '',
        message.type,
        message.listReplyId,
        message.buttonReplyId
      )
    }

    // --- Atualização de conexão ---
    const connectionUpdate = provider.parseConnectionWebhook(payload)
    if (connectionUpdate && tenantId) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          whatsappConnected: connectionUpdate.status === 'connected',
          whatsappNumber: connectionUpdate.phoneNumber || undefined,
        },
      })

      // Se tem QR Code, emitir via WebSocket pro painel
      if (connectionUpdate.qrCode) {
        // TODO: io.to(`setup_${tenantId}`).emit('qrcode', connectionUpdate.qrCode)
      }
    }

    // --- Status de mensagem (entregue, lida) ---
    if (providerType === 'meta_cloud') {
      const statuses = payload.entry?.[0]?.changes?.[0]?.value?.statuses
      if (statuses) {
        // Atualizar métricas de campanhas (delivered, read)
        for (const status of statuses) {
          if (status.status === 'delivered' || status.status === 'read') {
            // TODO: Atualizar campaign metrics
          }
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Webhook Error]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
