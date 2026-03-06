import axios, { type AxiosInstance } from 'axios'

/**
 * Service para integração com Evolution API v2
 * Gerencia instâncias WhatsApp, envio de mensagens e webhooks
 */
class EvolutionService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: process.env.EVOLUTION_API_URL,
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.EVOLUTION_API_KEY!,
      },
      timeout: 30000,
    })
  }

  // ============================================
  // INSTÂNCIAS
  // ============================================

  /** Criar nova instância WhatsApp para um tenant */
  async createInstance(instanceName: string) {
    const { data } = await this.api.post('/instance/create', {
      instanceName,
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
      webhookUrl: `${process.env.WEBHOOK_BASE_URL}/evolution`,
    })
    return data
  }

  /** Obter QR Code para conectar WhatsApp */
  async getQrCode(instanceName: string) {
    const { data } = await this.api.get(`/instance/connect/${instanceName}`)
    return data
  }

  /** Status da conexão */
  async getConnectionState(instanceName: string) {
    const { data } = await this.api.get(`/instance/connectionState/${instanceName}`)
    return data
  }

  /** Desconectar instância */
  async logout(instanceName: string) {
    const { data } = await this.api.delete(`/instance/logout/${instanceName}`)
    return data
  }

  /** Deletar instância */
  async deleteInstance(instanceName: string) {
    const { data } = await this.api.delete(`/instance/delete/${instanceName}`)
    return data
  }

  // ============================================
  // MENSAGENS DE TEXTO
  // ============================================

  /** Enviar mensagem de texto simples */
  async sendText(instanceName: string, to: string, text: string) {
    const { data } = await this.api.post(`/message/sendText/${instanceName}`, {
      number: to,
      text,
    })
    return data
  }

  // ============================================
  // MENSAGENS INTERATIVAS (Listas e Botões)
  // ============================================

  /** Enviar lista interativa (ideal para catálogo) */
  async sendList(
    instanceName: string,
    to: string,
    options: {
      title: string
      description: string
      buttonText: string
      footerText?: string
      sections: Array<{
        title: string
        rows: Array<{
          title: string
          description?: string
          rowId: string
        }>
      }>
    }
  ) {
    const { data } = await this.api.post(`/message/sendList/${instanceName}`, {
      number: to,
      title: options.title,
      description: options.description,
      buttonText: options.buttonText,
      footerText: options.footerText || '',
      sections: options.sections,
    })
    return data
  }

  /** Enviar botões de resposta rápida (máx 3 botões) */
  async sendButtons(
    instanceName: string,
    to: string,
    options: {
      title: string
      description: string
      footerText?: string
      buttons: Array<{
        buttonId: string
        buttonText: { displayText: string }
        type: number
      }>
    }
  ) {
    const { data } = await this.api.post(`/message/sendButtons/${instanceName}`, {
      number: to,
      ...options,
    })
    return data
  }

  // ============================================
  // MÍDIA
  // ============================================

  /** Enviar imagem (para QR Code PIX, produtos, etc.) */
  async sendImage(
    instanceName: string,
    to: string,
    imageUrl: string,
    caption?: string
  ) {
    const { data } = await this.api.post(`/message/sendMedia/${instanceName}`, {
      number: to,
      mediatype: 'image',
      media: imageUrl,
      caption: caption || '',
    })
    return data
  }

  /** Enviar imagem em base64 (QR Code PIX gerado) */
  async sendImageBase64(
    instanceName: string,
    to: string,
    base64: string,
    caption?: string
  ) {
    const { data } = await this.api.post(`/message/sendMedia/${instanceName}`, {
      number: to,
      mediatype: 'image',
      media: base64,
      mimetype: 'image/png',
      caption: caption || '',
    })
    return data
  }

  // ============================================
  // LOCALIZAÇÃO
  // ============================================

  /** Enviar localização (para entrega) */
  async sendLocation(
    instanceName: string,
    to: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
  ) {
    const { data } = await this.api.post(`/message/sendLocation/${instanceName}`, {
      number: to,
      name: name || '',
      address: address || '',
      latitude,
      longitude,
    })
    return data
  }

  // ============================================
  // HELPERS
  // ============================================

  /** Formatar número para envio (55XXXXXXXXXXX@s.whatsapp.net) */
  formatNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '')
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned
    }
    return cleaned
  }

  /** Montar mensagem de catálogo dinâmica a partir dos produtos */
  buildCatalogList(
    categories: Array<{
      name: string
      products: Array<{
        id: string
        name: string
        price: number
        description?: string
      }>
    }>
  ) {
    return {
      buttonText: '📋 Ver Cardápio',
      sections: categories.map(cat => ({
        title: cat.name,
        rows: cat.products.map(prod => ({
          title: `${prod.name} - R$ ${prod.price.toFixed(2)}`,
          description: prod.description?.slice(0, 72) || '',
          rowId: `product_${prod.id}`,
        })),
      })),
    }
  }
}

export const evolutionService = new EvolutionService()
export default evolutionService
