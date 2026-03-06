import axios, { type AxiosInstance } from 'axios'
import type {
  IWhatsAppProvider,
  WhatsAppProvider,
  SendTextOptions,
  SendImageOptions,
  SendListOptions,
  SendButtonsOptions,
  SendLocationOptions,
  SendTemplateOptions,
  ConnectionStatus,
  WebhookMessage,
  WebhookConnectionUpdate,
} from './provider.interface'

/**
 * ============================================
 * Evolution API Provider (v2)
 * ============================================
 * 
 * Usa Baileys (WhatsApp Web) para conectar.
 * Vantagens: Gratuito, sem aprovação da Meta, QR Code
 * Desvantagens: Menos estável, risco de ban em volume alto
 * 
 * Ideal para: plano Free/Basic, estabelecimentos menores
 */
export class EvolutionProvider implements IWhatsAppProvider {
  readonly providerType: WhatsAppProvider = 'evolution'
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.EVOLUTION_API_KEY || '',
      },
      timeout: 30000,
    })
  }

  // ============================================
  // CONEXÃO / INSTÂNCIA
  // ============================================

  async createInstance(config: {
    instanceId: string
    webhookUrl: string
  }) {
    const { data } = await this.api.post('/instance/create', {
      instanceName: config.instanceId,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      rejectCall: true,
      msgCall: 'Não aceitamos ligações. Envie uma mensagem!',
      webhookByEvents: true,
      webhookBase64: false,
      webhookEvents: [
        'MESSAGES_UPSERT',
        'CONNECTION_UPDATE',
        'QRCODE_UPDATED',
      ],
      webhookUrl: config.webhookUrl,
    })
    return data
  }

  async getConnectionStatus(instanceId: string): Promise<ConnectionStatus> {
    try {
      const { data } = await this.api.get(`/instance/connectionState/${instanceId}`)
      return {
        connected: data?.state === 'open' || data?.instance?.state === 'open',
        phoneNumber: data?.instance?.owner || undefined,
        displayName: data?.instance?.profileName || undefined,
      }
    } catch {
      return { connected: false }
    }
  }

  async getQrCode(instanceId: string) {
    try {
      const { data } = await this.api.get(`/instance/connect/${instanceId}`)
      return {
        qrCode: data?.base64 || data?.qrcode?.base64,
        qrCodeUrl: data?.code || undefined,
      }
    } catch {
      return {}
    }
  }

  async disconnect(instanceId: string) {
    await this.api.delete(`/instance/logout/${instanceId}`)
  }

  async deleteInstance(instanceId: string) {
    await this.api.delete(`/instance/delete/${instanceId}`)
  }

  // ============================================
  // MENSAGENS
  // ============================================

  async sendText(options: SendTextOptions) {
    const { data } = await this.api.post(`/message/sendText/${options.instanceId}`, {
      number: this.formatPhoneNumber(options.to),
      text: options.text,
    })
    return { messageId: data?.key?.id || data?.messageId || '' }
  }

  async sendImage(options: SendImageOptions) {
    const payload: any = {
      number: this.formatPhoneNumber(options.to),
      mediatype: 'image',
      caption: options.caption || '',
    }

    if (options.imageBase64) {
      payload.media = options.imageBase64
      payload.mimetype = 'image/png'
    } else if (options.imageUrl) {
      payload.media = options.imageUrl
    }

    const { data } = await this.api.post(`/message/sendMedia/${options.instanceId}`, payload)
    return { messageId: data?.key?.id || '' }
  }

  async sendList(options: SendListOptions) {
    const { data } = await this.api.post(`/message/sendList/${options.instanceId}`, {
      number: this.formatPhoneNumber(options.to),
      title: options.title,
      description: options.description,
      buttonText: options.buttonText,
      footerText: options.footerText || '',
      sections: options.sections.map(s => ({
        title: s.title,
        rows: s.rows.map(r => ({
          title: r.title,
          description: r.description || '',
          rowId: r.id,
        })),
      })),
    })
    return { messageId: data?.key?.id || '' }
  }

  async sendButtons(options: SendButtonsOptions) {
    const { data } = await this.api.post(`/message/sendButtons/${options.instanceId}`, {
      number: this.formatPhoneNumber(options.to),
      title: options.title,
      description: options.body,
      footerText: options.footerText || '',
      buttons: options.buttons.map((b, i) => ({
        buttonId: b.id,
        buttonText: { displayText: b.title },
        type: 1,
      })),
    })
    return { messageId: data?.key?.id || '' }
  }

  async sendLocation(options: SendLocationOptions) {
    const { data } = await this.api.post(`/message/sendLocation/${options.instanceId}`, {
      number: this.formatPhoneNumber(options.to),
      name: options.name || '',
      address: options.address || '',
      latitude: options.latitude,
      longitude: options.longitude,
    })
    return { messageId: data?.key?.id || '' }
  }

  async sendTemplate(options: SendTemplateOptions) {
    // Evolution API não tem templates da Meta.
    // Simulamos enviando texto formatado.
    // Em produção, considere alertar que templates não são suportados.
    const text = `[Template: ${options.templateName}]`
    return this.sendText({
      instanceId: options.instanceId,
      to: options.to,
      text,
    })
  }

  // ============================================
  // WEBHOOK PARSER
  // ============================================

  parseMessageWebhook(payload: any): WebhookMessage | null {
    const { event, instance, data } = payload

    if (event !== 'messages.upsert') return null

    const message = data?.message || data
    if (!message?.key) return null

    // Ignorar mensagens próprias e de grupo
    if (message.key.fromMe) return null
    if (message.key.remoteJid?.includes('@g.us')) return null

    const senderNumber = message.key.remoteJid?.replace('@s.whatsapp.net', '') || ''
    const msg = message.message

    let type: WebhookMessage['type'] = 'unknown'
    let text = ''
    let listReplyId = ''
    let buttonReplyId = ''

    if (msg?.conversation) {
      type = 'text'
      text = msg.conversation
    } else if (msg?.extendedTextMessage?.text) {
      type = 'text'
      text = msg.extendedTextMessage.text
    } else if (msg?.listResponseMessage) {
      type = 'list_reply'
      listReplyId = msg.listResponseMessage.singleSelectReply?.selectedRowId || ''
      text = msg.listResponseMessage.title || listReplyId
    } else if (msg?.buttonsResponseMessage) {
      type = 'button_reply'
      buttonReplyId = msg.buttonsResponseMessage.selectedButtonId || ''
      text = msg.buttonsResponseMessage.selectedDisplayText || buttonReplyId
    } else if (msg?.templateButtonReplyMessage) {
      type = 'button_reply'
      buttonReplyId = msg.templateButtonReplyMessage.selectedId || ''
      text = buttonReplyId
    } else if (msg?.imageMessage) {
      type = 'image'
      text = msg.imageMessage.caption || ''
    } else if (msg?.locationMessage) {
      type = 'location'
    } else if (msg?.audioMessage) {
      type = 'audio'
    } else if (msg?.videoMessage) {
      type = 'video'
    } else if (msg?.documentMessage) {
      type = 'document'
    }

    return {
      messageId: message.key.id || '',
      from: senderNumber,
      fromName: message.pushName || undefined,
      timestamp: message.messageTimestamp || Date.now() / 1000,
      type,
      text: text || undefined,
      listReplyId: listReplyId || undefined,
      buttonReplyId: buttonReplyId || undefined,
      latitude: msg?.locationMessage?.degreesLatitude,
      longitude: msg?.locationMessage?.degreesLongitude,
      isFromMe: false,
      isGroup: false,
      raw: payload,
    }
  }

  parseConnectionWebhook(payload: any): WebhookConnectionUpdate | null {
    const { event, data } = payload

    if (event === 'connection.update') {
      const state = data?.state || data?.status
      return {
        status: state === 'open' || state === 'connected'
          ? 'connected'
          : state === 'connecting'
            ? 'connecting'
            : 'disconnected',
        phoneNumber: data?.ownerJid?.replace('@s.whatsapp.net', ''),
      }
    }

    if (event === 'qrcode.updated') {
      return {
        status: 'connecting',
        qrCode: data?.qrcode || data?.base64,
      }
    }

    return null
  }

  // ============================================
  // HELPERS
  // ============================================

  formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '')
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned
    }
    return cleaned
  }

  isWebhookValid(payload: any, signature?: string): boolean {
    // Evolution API usa apikey no header, não HMAC
    // Validação é feita no middleware via apikey
    return true
  }
}
