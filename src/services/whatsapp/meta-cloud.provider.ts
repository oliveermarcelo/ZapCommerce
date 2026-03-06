import axios, { type AxiosInstance } from 'axios'
import crypto from 'crypto'
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
 * Meta Cloud API Provider (API Oficial)
 * ============================================
 * 
 * Usa a API Cloud do WhatsApp Business Platform (graph.facebook.com)
 * Vantagens: Oficial, estável, sem risco de ban, templates aprovados
 * Desvantagens: Requer aprovação Meta, custo por conversa, setup mais complexo
 * 
 * Ideal para: plano Pro/Premium, estabelecimentos com alto volume
 * 
 * Pré-requisitos:
 *   1. App no Meta Developers (developers.facebook.com)
 *   2. WhatsApp Business Account vinculado
 *   3. Número de telefone verificado
 *   4. Token de acesso permanente
 *   5. Webhook configurado com verify token
 */
export class MetaCloudProvider implements IWhatsAppProvider {
  readonly providerType: WhatsAppProvider = 'meta_cloud'
  private baseUrl = 'https://graph.facebook.com/v20.0'

  private getApi(accessToken: string): AxiosInstance {
    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 30000,
    })
  }

  // Buscar token do tenant no banco
  private async getTokenForInstance(instanceId: string): Promise<{
    accessToken: string
    phoneNumberId: string
    wabaId: string
  }> {
    // instanceId aqui é o phoneNumberId da Meta
    // O token é armazenado encriptado no tenant
    const prisma = (await import('@/lib/prisma')).default
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { metaPhoneNumberId: instanceId },
          { evolutionInstance: instanceId },
        ],
      },
    })

    if (!tenant?.metaAccessToken || !tenant?.metaPhoneNumberId) {
      throw new Error('Meta Cloud API não configurada para este tenant')
    }

    return {
      accessToken: tenant.metaAccessToken,
      phoneNumberId: tenant.metaPhoneNumberId,
      wabaId: tenant.metaWabaId || '',
    }
  }

  // ============================================
  // CONEXÃO / INSTÂNCIA
  // ============================================

  async createInstance(config: {
    instanceId: string
    webhookUrl: string
    phoneNumberId?: string
    accessToken?: string
  }) {
    // Na Meta Cloud API, a "instância" é o Phone Number ID
    // A criação é feita manualmente no painel da Meta
    // Aqui apenas registramos o webhook e validamos o token

    if (!config.phoneNumberId || !config.accessToken) {
      throw new Error('phoneNumberId e accessToken são obrigatórios para Meta Cloud API')
    }

    const api = this.getApi(config.accessToken)

    // Verificar se o número é válido
    const { data: phoneInfo } = await api.get(`/${config.phoneNumberId}`)

    // Registrar webhook (feito via App Dashboard da Meta, não via API)
    // O webhook URL é configurado em Meta Developers > App > WhatsApp > Configuration

    return {
      phoneNumberId: config.phoneNumberId,
      displayName: phoneInfo.verified_name || phoneInfo.display_phone_number,
      phoneNumber: phoneInfo.display_phone_number,
      qualityRating: phoneInfo.quality_rating,
      messagingLimit: phoneInfo.messaging_limit_tier,
    }
  }

  async getConnectionStatus(instanceId: string): Promise<ConnectionStatus> {
    try {
      const { accessToken, phoneNumberId } = await this.getTokenForInstance(instanceId)
      const api = this.getApi(accessToken)
      const { data } = await api.get(`/${phoneNumberId}`, {
        params: { fields: 'verified_name,display_phone_number,quality_rating,status' },
      })

      return {
        connected: data.status !== 'BLOCKED' && data.status !== 'DISCONNECTED',
        phoneNumber: data.display_phone_number,
        displayName: data.verified_name,
      }
    } catch {
      return { connected: false }
    }
  }

  async getQrCode(instanceId: string) {
    // Meta Cloud API não usa QR Code — a conexão é via número verificado
    return {}
  }

  async disconnect(instanceId: string) {
    // Na Meta Cloud, não se "desconecta" — apenas para de usar
    // Para desconectar de verdade, é feito no painel da Meta
  }

  async deleteInstance(instanceId: string) {
    // Apenas limpar dados locais, não deleta na Meta
  }

  // ============================================
  // MENSAGENS
  // ============================================

  async sendText(options: SendTextOptions) {
    const { accessToken, phoneNumberId } = await this.getTokenForInstance(options.instanceId)
    const api = this.getApi(accessToken)

    const { data } = await api.post(`/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(options.to),
      type: 'text',
      text: {
        preview_url: true,
        body: options.text,
      },
    })

    return { messageId: data.messages?.[0]?.id || '' }
  }

  async sendImage(options: SendImageOptions) {
    const { accessToken, phoneNumberId } = await this.getTokenForInstance(options.instanceId)
    const api = this.getApi(accessToken)

    const imagePayload: any = {}

    if (options.imageUrl) {
      imagePayload.link = options.imageUrl
    } else if (options.imageBase64) {
      // Meta Cloud API não aceita base64 diretamente
      // É necessário fazer upload primeiro via /media endpoint
      const mediaId = await this.uploadMediaBase64(api, phoneNumberId, options.imageBase64, 'image/png')
      imagePayload.id = mediaId
    }

    if (options.caption) {
      imagePayload.caption = options.caption
    }

    const { data } = await api.post(`/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(options.to),
      type: 'image',
      image: imagePayload,
    })

    return { messageId: data.messages?.[0]?.id || '' }
  }

  async sendList(options: SendListOptions) {
    const { accessToken, phoneNumberId } = await this.getTokenForInstance(options.instanceId)
    const api = this.getApi(accessToken)

    const { data } = await api.post(`/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(options.to),
      type: 'interactive',
      interactive: {
        type: 'list',
        header: {
          type: 'text',
          text: options.title,
        },
        body: {
          text: options.description,
        },
        footer: options.footerText ? { text: options.footerText } : undefined,
        action: {
          button: options.buttonText,
          sections: options.sections.map(s => ({
            title: s.title,
            rows: s.rows.map(r => ({
              id: r.id,
              title: r.title.slice(0, 24), // Meta limita a 24 chars
              description: r.description?.slice(0, 72) || '',
            })),
          })),
        },
      },
    })

    return { messageId: data.messages?.[0]?.id || '' }
  }

  async sendButtons(options: SendButtonsOptions) {
    const { accessToken, phoneNumberId } = await this.getTokenForInstance(options.instanceId)
    const api = this.getApi(accessToken)

    const { data } = await api.post(`/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(options.to),
      type: 'interactive',
      interactive: {
        type: 'button',
        header: {
          type: 'text',
          text: options.title,
        },
        body: {
          text: options.body,
        },
        footer: options.footerText ? { text: options.footerText } : undefined,
        action: {
          buttons: options.buttons.slice(0, 3).map(b => ({ // Meta permite máx 3
            type: 'reply',
            reply: {
              id: b.id,
              title: b.title.slice(0, 20), // Meta limita a 20 chars
            },
          })),
        },
      },
    })

    return { messageId: data.messages?.[0]?.id || '' }
  }

  async sendLocation(options: SendLocationOptions) {
    const { accessToken, phoneNumberId } = await this.getTokenForInstance(options.instanceId)
    const api = this.getApi(accessToken)

    const { data } = await api.post(`/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(options.to),
      type: 'location',
      location: {
        latitude: options.latitude,
        longitude: options.longitude,
        name: options.name || '',
        address: options.address || '',
      },
    })

    return { messageId: data.messages?.[0]?.id || '' }
  }

  async sendTemplate(options: SendTemplateOptions) {
    const { accessToken, phoneNumberId } = await this.getTokenForInstance(options.instanceId)
    const api = this.getApi(accessToken)

    const { data } = await api.post(`/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(options.to),
      type: 'template',
      template: {
        name: options.templateName,
        language: {
          code: options.languageCode || 'pt_BR',
        },
        components: options.components?.map(comp => ({
          type: comp.type,
          parameters: comp.parameters.map(param => {
            if (param.type === 'text') return { type: 'text', text: param.text }
            if (param.type === 'image') return { type: 'image', image: param.image }
            return param
          }),
        })),
      },
    })

    return { messageId: data.messages?.[0]?.id || '' }
  }

  // ============================================
  // WEBHOOK PARSER
  // ============================================

  parseMessageWebhook(payload: any): WebhookMessage | null {
    // Meta Cloud API webhook structure:
    // { object: "whatsapp_business_account", entry: [{ id, changes: [{ value: { messages: [...] } }] }] }

    if (payload.object !== 'whatsapp_business_account') return null

    const entry = payload.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value?.messages?.[0]) return null

    const msg = value.messages[0]
    const contact = value.contacts?.[0]

    let type: WebhookMessage['type'] = 'unknown'
    let text = ''
    let listReplyId = ''
    let buttonReplyId = ''
    let latitude: number | undefined
    let longitude: number | undefined

    switch (msg.type) {
      case 'text':
        type = 'text'
        text = msg.text?.body || ''
        break

      case 'interactive':
        if (msg.interactive?.type === 'list_reply') {
          type = 'list_reply'
          listReplyId = msg.interactive.list_reply?.id || ''
          text = msg.interactive.list_reply?.title || listReplyId
        } else if (msg.interactive?.type === 'button_reply') {
          type = 'button_reply'
          buttonReplyId = msg.interactive.button_reply?.id || ''
          text = msg.interactive.button_reply?.title || buttonReplyId
        }
        break

      case 'image':
        type = 'image'
        text = msg.image?.caption || ''
        break

      case 'location':
        type = 'location'
        latitude = msg.location?.latitude
        longitude = msg.location?.longitude
        break

      case 'audio':
        type = 'audio'
        break

      case 'video':
        type = 'video'
        text = msg.video?.caption || ''
        break

      case 'document':
        type = 'document'
        break

      case 'button':
        // Template button reply
        type = 'button_reply'
        buttonReplyId = msg.button?.payload || ''
        text = msg.button?.text || buttonReplyId
        break
    }

    return {
      messageId: msg.id || '',
      from: msg.from || '',
      fromName: contact?.profile?.name || undefined,
      timestamp: parseInt(msg.timestamp) || Date.now() / 1000,
      type,
      text: text || undefined,
      listReplyId: listReplyId || undefined,
      buttonReplyId: buttonReplyId || undefined,
      latitude,
      longitude,
      isFromMe: false,
      isGroup: false,
      raw: payload,
    }
  }

  parseConnectionWebhook(payload: any): WebhookConnectionUpdate | null {
    // Meta Cloud API não tem eventos de conexão como Evolution
    // A conexão é gerenciada pela Meta automaticamente
    // Status changes vêm em account_update webhooks

    const entry = payload.entry?.[0]
    const changes = entry?.changes?.[0]

    if (changes?.field === 'account_update') {
      const event = changes.value?.event
      return {
        status: event === 'DISABLED' ? 'disconnected' : 'connected',
        phoneNumber: changes.value?.phone_number,
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
    if (!signature || !process.env.META_APP_SECRET) return false

    const expectedSignature = crypto
      .createHmac('sha256', process.env.META_APP_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex')

    return `sha256=${expectedSignature}` === signature
  }

  // Upload de mídia base64 para a Meta (necessário antes de enviar)
  private async uploadMediaBase64(
    api: AxiosInstance,
    phoneNumberId: string,
    base64: string,
    mimeType: string
  ): Promise<string> {
    // Converter base64 para Buffer
    const buffer = Buffer.from(base64, 'base64')
    const blob = new Blob([buffer], { type: mimeType })

    const formData = new FormData()
    formData.append('messaging_product', 'whatsapp')
    formData.append('file', blob, `upload.${mimeType.split('/')[1]}`)
    formData.append('type', mimeType)

    const { data } = await api.post(`/${phoneNumberId}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return data.id
  }
}

// ============================================
// Webhook Verification (GET endpoint)
// Necessário para Meta verificar o webhook
// ============================================
export function verifyMetaWebhook(
  mode: string | null,
  token: string | null,
  challenge: string | null
): string | null {
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken) {
    return challenge
  }

  return null
}
