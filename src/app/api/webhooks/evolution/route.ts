import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { handleIncomingMessage } from '@/services/conversation.service'

/**
 * POST /api/webhooks/evolution
 * Recebe eventos da Evolution API (mensagens, conexão, etc.)
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()

    // Log do webhook
    await prisma.webhookLog.create({
      data: {
        source: 'evolution',
        event: payload.event || 'unknown',
        payload: payload,
      },
    })

    const { event, instance, data } = payload

    switch (event) {
      // ============================================
      // MENSAGEM RECEBIDA
      // ============================================
      case 'messages.upsert': {
        const message = data?.message || data
        if (!message) break

        // Ignorar mensagens do próprio bot
        if (message.key?.fromMe) break

        // Ignorar mensagens de grupo
        if (message.key?.remoteJid?.includes('@g.us')) break

        // Extrair dados da mensagem
        const senderNumber = message.key?.remoteJid?.replace('@s.whatsapp.net', '') || ''
        const instanceName = instance || ''

        // Buscar tenant pela instância
        const tenant = await prisma.tenant.findFirst({
          where: { evolutionInstance: instanceName },
        })

        if (!tenant) {
          console.warn(`[Webhook] Tenant não encontrado para instância: ${instanceName}`)
          break
        }

        // Extrair texto da mensagem (pode vir de diferentes tipos)
        let messageText = ''
        let messageType = 'text'
        let listResponseId = ''
        let buttonResponseId = ''

        const msg = message.message

        if (msg?.conversation) {
          messageText = msg.conversation
        } else if (msg?.extendedTextMessage?.text) {
          messageText = msg.extendedTextMessage.text
        } else if (msg?.listResponseMessage) {
          // Resposta de lista interativa
          messageType = 'list_response'
          listResponseId = msg.listResponseMessage.singleSelectReply?.selectedRowId || ''
          messageText = msg.listResponseMessage.title || listResponseId
        } else if (msg?.buttonsResponseMessage) {
          // Resposta de botão
          messageType = 'button_response'
          buttonResponseId = msg.buttonsResponseMessage.selectedButtonId || ''
          messageText = msg.buttonsResponseMessage.selectedDisplayText || buttonResponseId
        } else if (msg?.templateButtonReplyMessage) {
          buttonResponseId = msg.templateButtonReplyMessage.selectedId || ''
          messageText = buttonResponseId
        } else if (msg?.imageMessage || msg?.videoMessage || msg?.audioMessage) {
          messageType = 'media'
          messageText = msg.imageMessage?.caption || msg.videoMessage?.caption || ''
        } else if (msg?.locationMessage) {
          messageType = 'location'
          messageText = `${msg.locationMessage.degreesLatitude},${msg.locationMessage.degreesLongitude}`
        }

        // Salvar push name do contato
        if (message.pushName && senderNumber) {
          await prisma.customer.updateMany({
            where: {
              tenantId: tenant.id,
              whatsappNumber: senderNumber,
            },
            data: {
              pushName: message.pushName,
              name: message.pushName, // Atualizar nome se ainda não tiver
            },
          })
        }

        // Processar mensagem no motor de conversação
        if (senderNumber && messageText) {
          await handleIncomingMessage(
            tenant.id,
            senderNumber,
            messageText,
            messageType,
            listResponseId,
            buttonResponseId
          )
        }

        break
      }

      // ============================================
      // STATUS DA CONEXÃO
      // ============================================
      case 'connection.update': {
        const instanceName = instance || ''
        const state = data?.state || data?.status

        if (instanceName) {
          await prisma.tenant.updateMany({
            where: { evolutionInstance: instanceName },
            data: {
              whatsappConnected: state === 'open' || state === 'connected',
            },
          })
        }
        break
      }

      // ============================================
      // QR CODE ATUALIZADO (para exibir no painel)
      // ============================================
      case 'qrcode.updated': {
        // Aqui você pode emitir via WebSocket para o painel
        // io.to(`setup_${instance}`).emit('qrcode', data)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Evolution Webhook Error]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
